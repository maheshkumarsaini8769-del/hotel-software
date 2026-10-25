import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { Booking, BookingSource, BookingMode, BookingStatus } from '../models/Booking';
import { GuestProfile } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';

describe('--- SHIFT 74 / GATE 74: NON-DEMO REAL ROOM STAY PROCESS, RESIDENT VERIFICATION & KYC ROOM CATALOG WORKFLOW ---', () => {
  let hotelId: string;
  let deluxeRoomType: any;
  let residentRoom: any;
  let vacantRoom: any;
  let activeStay: any;
  let guestProfile: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create a real Hotel Tenant
    const tenant = await Tenant.create({
      name: 'Taj Palace Luxury Suites',
      slug: `taj-palace-${Date.now()}`,
      contactEmail: `frontdesk-${Date.now()}@tajpalace.com`,
      contactPhone: '9820011223',
      gstin: '27AAAAA0000A1Z5',
      status: 'ACTIVE',
      currency: 'INR',
      city: 'Mumbai',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      enabledPortals: ['admin', 'customer', 'guest', 'waiter', 'cashier', 'kds', 'pms'],
    });
    hotelId = (tenant._id as Types.ObjectId).toString();

    // 2. Create Room Type
    deluxeRoomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Executive Deluxe Suite',
      code: 'EDLX',
      basePriceOvernight: 4500,
      baseCapacityAdults: 2,
      maxCapacity: 3,
      amenities: ['King Size Bed', 'City View Balcony', 'High-Speed Wi-Fi', 'Smart TV', 'Attached Bath'],
    });

    // 3. Create Resident Guest Profile & Room 201 (Occupied by Resident Guest)
    guestProfile = await GuestProfile.create({
      hotelId: tenant._id,
      name: 'Vikram Malhotra',
      phone: '9820011223',
      email: 'vikram.malhotra@spicehub.com',
      totalVisits: 2,
      vipStatus: false,
    });

    residentRoom = await Room.create({
      hotelId: tenant._id,
      roomNumber: '201',
      floorNumber: 2,
      wing: 'East Wing',
      roomTypeId: deluxeRoomType._id,
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'hash-room-201',
    });

    // Create Booking and Active Stay for Room 201
    const checkIn = new Date();
    const checkOut = new Date(Date.now() + 2 * 86400000);
    const booking = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: `BK-TEST-${Date.now()}`,
      bookingSource: BookingSource.WALK_IN,
      bookingMode: BookingMode.OVERNIGHT,
      roomTypeId: deluxeRoomType._id,
      allocatedRoomId: residentRoom._id,
      guestName: guestProfile.name,
      guestPhone: guestProfile.phone,
      guestEmail: guestProfile.email,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalTariff: 9000,
      taxAmount: 1080,
      grandTotal: 10080,
      advancePaymentAmount: 10080,
      paymentStatus: 'PAID',
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    const stayId = new Types.ObjectId();
    const masterFolio = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: stayId,
      bookingId: booking._id,
      roomId: residentRoom._id,
      folioNumber: `FOLIO-201-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 9000,
      totalFoodAndBeverage: 0,
      totalTaxes: 1080,
      advancePaid: 10080,
      paidAmount: 10080,
      netAmountPayable: 10080,
      dueAmount: 0,
      folioStatus: 'OPEN',
    });

    activeStay = await Stay.create({
      _id: stayId,
      hotelId: tenant._id,
      bookingId: booking._id,
      roomId: residentRoom._id,
      guestId: guestProfile._id,
      masterFolioId: masterFolio._id,
      checkInTimestamp: checkIn,
      expectedCheckOutTimestamp: checkOut,
      stayStatus: StayStatus.ACTIVE,
    });

    residentRoom.currentStayId = activeStay._id;
    await residentRoom.save();

    // 4. Create Vacant Available Room 202 (Ready for Catalog Booking)
    vacantRoom = await Room.create({
      hotelId: tenant._id,
      roomNumber: '202',
      floorNumber: 2,
      wing: 'East Wing',
      roomTypeId: deluxeRoomType._id,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'hash-room-202',
    });
  });

  afterAll(async () => {
    if (hotelId) {
      await Tenant.deleteOne({ _id: hotelId });
      await Room.deleteMany({ hotelId });
      await RoomType.deleteMany({ hotelId });
      await Stay.deleteMany({ hotelId });
      await Booking.deleteMany({ hotelId });
      await GuestProfile.deleteMany({ hotelId });
      await MasterFolio.deleteMany({ hotelId });
    }
  });

  // TEST 1: Resident Guest Verification with Valid Room Number & Registered Phone Number
  it('1. Resident Guest can verify their active stay by Room Number and Registered Mobile Number', async () => {
    const res = await request(app)
      .post('/api/v1/guest-portal/stay/verify-resident')
      .send({
        hotelId,
        roomNumber: '201',
        guestPhone: '9820011223',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.roomNumber).toBe('201');
    expect(res.body.data.guestName).toBe('Vikram Malhotra');
    expect(res.body.data.sessionToken).toBeDefined();
    expect(typeof res.body.data.sessionToken).toBe('string');
    expect(res.body.data.waiterEnabled).toBe(true);
  });

  // TEST 2: Reject Resident Guest Verification if Phone Number Mismatches
  it('2. Resident verification rejects with PHONE_MISMATCH if mobile does not match check-in record', async () => {
    const res = await request(app)
      .post('/api/v1/guest-portal/stay/verify-resident')
      .send({
        hotelId,
        roomNumber: '201',
        guestPhone: '9999999999', // Incorrect phone
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('PHONE_MISMATCH');
    expect(res.body.message).toContain('mobile number entered does not match');
  });

  // TEST 3: Reject Resident Guest Verification if Room Has No Active Check-In
  it('3. Resident verification returns NO_ACTIVE_STAY if the room is vacant/unoccupied', async () => {
    const res = await request(app)
      .post('/api/v1/guest-portal/stay/verify-resident')
      .send({
        hotelId,
        roomNumber: '202', // Vacant room
        guestPhone: '9820011223',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NO_ACTIVE_STAY');
    expect(res.body.redirectAction).toBe('PUBLIC_BOOKING_OR_RECEPTION');
  });

  // TEST 4: Fetch Real Room Catalog with Live Availability Matrix (No Dummy Data)
  it('4. Guest Room Catalog returns real hotel rooms with live status badges and accurate pricing', async () => {
    const res = await request(app)
      .get(`/api/v1/guest-portal/rooms/catalog?hotelId=${hotelId}`)
      .set('x-hotel-id', hotelId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rooms).toHaveLength(2);

    const room201 = res.body.data.rooms.find((r: any) => r.roomNumber === '201');
    const room202 = res.body.data.rooms.find((r: any) => r.roomNumber === '202');

    expect(room201).toBeDefined();
    expect(room201.displayStatus).toBe('OCCUPIED');
    expect(room201.isBookable).toBe(false);

    expect(room202).toBeDefined();
    expect(room202.displayStatus).toBe('AVAILABLE');
    expect(room202.isBookable).toBe(true);
    expect(room202.roomType.basePriceOvernight).toBe(4500);
    expect(res.body.data.counts.total).toBe(2);
    expect(res.body.data.counts.available).toBe(1);
    expect(res.body.data.counts.occupied).toBe(1);
  });

  // TEST 5: Real Room Booking & Instant Aadhaar KYC Check-In Flow
  it('5. Guests can book an available room with Aadhaar KYC and immediately receive stay token', async () => {
    const checkIn = new Date().toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const bookRes = await request(app)
      .post('/api/v1/guest-portal/rooms/book-and-checkin')
      .set('x-hotel-id', hotelId)
      .send({
        hotelId,
        roomId: vacantRoom._id.toString(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName: 'Ananya Sharma',
        guestPhone: '9876543210',
        guestEmail: 'ananya.sharma@example.com',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '1234 5678 9012',
        advancePaid: 5040,
        deviceLocation: {
          latitude: 19.076,
          longitude: 72.8777,
          distanceKm: 0.2,
          isRemote: false,
        },
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.data.roomNumber).toBe('202');
    expect(bookRes.body.data.guestName).toBe('Ananya Sharma');
    expect(bookRes.body.data.sessionToken).toBeDefined();

    // Verify room 202 is now OCCUPIED in database
    const updatedRoom202 = await Room.findById(vacantRoom._id);
    expect(updatedRoom202?.status).toBe(RoomStatus.OCCUPIED);
    expect(updatedRoom202?.currentStayId).toBeDefined();

    // Now Ananya can also verify her stay via Resident Stay Verification!
    const verifyRes = await request(app)
      .post('/api/v1/guest-portal/stay/verify-resident')
      .send({
        hotelId,
        roomNumber: '202',
        guestPhone: '9876543210',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.roomNumber).toBe('202');
    expect(verifyRes.body.data.guestName).toBe('Ananya Sharma');
  });

  // TEST 6: Prevent Double Booking of Already Occupied Room
  it('6. Attempting to book an already occupied room is strictly rejected with 409 ROOM_NOT_AVAILABLE', async () => {
    const bookRes = await request(app)
      .post('/api/v1/guest-portal/rooms/book-and-checkin')
      .set('x-hotel-id', hotelId)
      .send({
        hotelId,
        roomId: vacantRoom._id.toString(), // Room 202 is now OCCUPIED
        guestName: 'Duplicate Guest',
        guestPhone: '9111222333',
        idType: 'AADHAAR',
        idNumber: '9999 8888 7777',
      });

    expect(bookRes.status).toBe(409);
    expect(bookRes.body.success).toBe(false);
    expect(bookRes.body.errorCode).toBe('ROOM_NOT_AVAILABLE');
  });
});
