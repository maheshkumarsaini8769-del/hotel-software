import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { UserRole, ShiftStatus } from '../types';

describe('--- SHIFT 5 / GATE 5: HOTEL PMS, ROOM BOOKING & FRONT DESK CHECK-IN TESTS ---', () => {
  let tenantId: string;
  let receptionistUser: any;
  let receptionistToken: string;
  let roomTypeId: string;
  let physicalRoomId: string;
  let confirmedBookingId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const uniqueSlug = `hotel-pms-resort-${Date.now()}`;
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Palace Resort & Spa',
      slug: uniqueSlug,
      contactEmail: `pms_${Date.now()}@spicehub.com`,
      contactPhone: '9777788888',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    receptionistUser = await User.create({
      hotelId: tenant._id,
      name: 'Priya Receptionist',
      email: `priya_${Date.now()}@spicehub.com`,
      phone: '9866655544',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    receptionistToken = jwt.sign(
      {
        userId: receptionistUser._id.toString(),
        hotelId: tenantId,
        role: receptionistUser.role,
        email: receptionistUser.email,
        permissions: ['PMS_FRONT_DESK'],
      },
      secret,
      { expiresIn: '1h' }
    );

    // Setup Room Type: Deluxe Room (Base: 4,000 / night -> 12% GST)
    const roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Deluxe Room',
      code: 'DLX',
      basePriceOvernight: 4000,
      totalRoomsCount: 1, // Only 1 physical room exists for overbooking race test!
      isActive: true,
    });
    roomTypeId = roomType._id.toString();

    // Setup Physical Room #204
    const room = await Room.create({
      hotelId: tenant._id,
      roomNumber: '204',
      roomTypeId: roomType._id,
      floorNumber: 2,
      wing: 'East Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'permanent_qr_hash_room_204',
    });
    physicalRoomId = room._id.toString();
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: tenantId });
    await RoomType.deleteMany({ hotelId: tenantId });
    await Room.deleteMany({ hotelId: tenantId });
    await Booking.deleteMany({ hotelId: tenantId });
    await Stay.deleteMany({ hotelId: tenantId });
    await MasterFolio.deleteMany({ hotelId: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Public Room Availability Search with Authoritative Dynamic GST (12% for <= 7500)
  test('1. Search Live Room Availability with Authoritative 12% GST Calculation', async () => {
    const checkIn = '2026-10-15';
    const checkOut = '2026-10-17'; // 2 Nights

    const res = await request(app).get(
      `/api/v1/pms/rooms/search?hotelId=${tenantId}&checkInDate=${checkIn}&checkOutDate=${checkOut}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);

    const result = res.body.data[0];
    expect(result.nights).toBe(2);
    expect(result.baseTariff).toBe(8000); // 4000 * 2
    expect(result.gstRate).toBe(12); // Under 7,500 threshold
    expect(result.taxAmount).toBe(960); // 8000 * 12%
    expect(result.grandTotal).toBe(8960);
    expect(result.availableRooms).toBe(1);
    expect(result.isSoldOut).toBe(false);
  });

  // TEST 2: Public Direct Room Booking (allocatedRoomId MUST be null)
  test('2. Public Booking Generates 8-Digit ID and Keeps allocatedRoomId NULL until Check-In', async () => {
    const res = await request(app).post('/api/v1/pms/bookings/create').send({
      hotelId: tenantId,
      roomTypeId,
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-17',
      guestName: 'Sunil Verma',
      guestPhone: '9811122233',
      guestEmail: 'sunil.verma@example.com',
      guestCountAdults: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingNumber).toMatch(/^BK-[A-F0-9]{8}$/); // Unguessable random 8-digit
    expect(res.body.data.grandTotal).toBe(8960);

    // CRITICAL ARCHITECTURE RULE VERIFICATION:
    expect(res.body.data.allocatedRoomId).toBeNull();

    confirmedBookingId = res.body.data.bookingId;
  });

  // TEST 3: Overbooking Protection - Rejects Booking When Room Type Inventory is 0
  test('3. Overbooking Blocker Rejects Second Booking When Room Inventory is Exhausted', async () => {
    const res = await request(app).post('/api/v1/pms/bookings/create').send({
      hotelId: tenantId,
      roomTypeId,
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-17', // Same dates as above
      guestName: 'Another Guest',
      guestPhone: '9922233344',
      guestEmail: 'another@example.com',
    });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('ROOM_SOLD_OUT');
  });

  // TEST 4: Front Desk Reception Check-In (Assigns Physical Room 204 & Opens Master Folio)
  test('4. Reception Check-In Allots Physical Room #204, Creates Stay, and Opens Master Folio', async () => {
    const res = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: confirmedBookingId,
        physicalRoomId,
        idProofType: 'AADHAAR',
        idProofNumber: '4455-6677-8899',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('204');
    expect(res.body.data.folioNumber).toContain('FOLIO-204-');
    expect(res.body.data.status).toBe(RoomStatus.OCCUPIED);

    // Verify Database Entities Integrity
    const booking = await Booking.findById(confirmedBookingId);
    expect(booking?.bookingStatus).toBe(BookingStatus.CHECKED_IN);
    expect(booking?.allocatedRoomId?.toString()).toBe(physicalRoomId); // Room allocated!

    const stay = await Stay.findOne({ bookingId: confirmedBookingId });
    expect(stay).toBeDefined();
    expect(stay?.stayStatus).toBe(StayStatus.ACTIVE);
    expect(stay?.roomId.toString()).toBe(physicalRoomId);

    const folio = await MasterFolio.findOne({ stayId: stay?._id });
    expect(folio).toBeDefined();
    expect(folio?.folioStatus).toBe('OPEN');
    expect(folio?.totalRoomTariff).toBe(8000);
    expect(folio?.advancePaid).toBe(8960); // Paid in advance
    expect(folio?.netAmountPayable).toBe(0); // Balanced

    const physicalRoom = await Room.findById(physicalRoomId);
    expect(physicalRoom?.status).toBe(RoomStatus.OCCUPIED);
    expect(physicalRoom?.currentStayId?.toString()).toBe(stay?._id.toString());
  });

  // TEST 5: Cannot Check In to a Room That is Not AVAILABLE
  test('5. Rejects Check-In Attempt to Already Occupied or Dirty Room', async () => {
    // Attempt checking in to Room 204 again (which is already OCCUPIED from test 4)
    const fakeBooking = await Booking.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      bookingNumber: 'BK-FAKE-01',
      guestName: 'Fake Guest',
      guestPhone: '9999999999',
      guestEmail: 'fake@guest.com',
      checkInDate: new Date(),
      checkOutDate: new Date(),
      roomTypeId: new mongoose.Types.ObjectId(roomTypeId),
      totalTariff: 4000,
      taxAmount: 480,
      grandTotal: 4480,
      bookingStatus: BookingStatus.CONFIRMED,
    });

    const res = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: fakeBooking._id,
        physicalRoomId, // Room 204 is OCCUPIED
      });

    expect([400, 409]).toContain(res.status);
    expect(res.body.errorCode).toBe('ROOM_NOT_AVAILABLE');
  });
});
