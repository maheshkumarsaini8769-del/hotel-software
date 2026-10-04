import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus, BookingSource, BookingMode } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { GuestProfile } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem } from '../models/FolioLineItem';
import { UserRole } from '../types';

describe('Gate #58: Online Pre-Booking Arrival Check-In Bridge & In-Room Guest Portal Live Hydration', () => {
  let hotelId: Types.ObjectId;
  let receptionistToken: string;
  let room101: any;
  let room102: any;
  let roomType: any;
  let onlinePreBooking: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'Taj Gateway Resort & Spa',
      slug: `taj-gateway-${Date.now()}`,
      contactEmail: `frontdesk-${Date.now()}@tajgateway.com`,
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    hotelId = tenant._id as Types.ObjectId;

    // 2. Setup Receptionist User & JWT
    const receptionist = await User.create({
      hotelId,
      name: 'Priya Nambiar (Front Office Mgr)',
      email: `priya-${Date.now()}@tajgateway.com`,
      phone: '9899911122',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK', 'ROOM_CHECKIN'],
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    receptionistToken = jwt.sign(
      {
        userId: receptionist._id.toString(),
        hotelId: hotelId.toString(),
        role: receptionist.role,
        email: receptionist.email,
        permissions: receptionist.permissions,
      },
      secret,
      { expiresIn: '1h' }
    );

    // 3. Setup Room Type & Physical Rooms
    roomType = await RoomType.create({
      hotelId,
      name: 'Royal Heritage Deluxe Villa',
      code: 'RHDV',
      slug: `royal-villa-${Date.now()}`,
      basePriceOvernight: 3900,
      maxOccupancyAdults: 2,
    });

    room101 = await Room.create({
      hotelId,
      roomNumber: '101',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: 'room-101-hash',
      status: RoomStatus.AVAILABLE,
    });

    room102 = await Room.create({
      hotelId,
      roomNumber: '102',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: 'room-102-hash',
      status: RoomStatus.AVAILABLE,
    });

    // 4. Setup Online Pre-Booking (Booked online 3 days in advance with ₹3,000 pre-paid advance)
    onlinePreBooking = await Booking.create({
      hotelId,
      bookingNumber: `BKG-WEB-${Date.now().toString().slice(-6)}`,
      bookingSource: BookingSource.DIRECT_PUBLIC_WEB,
      bookingMode: BookingMode.OVERNIGHT,
      roomTypeId: roomType._id,
      allocatedRoomId: null, // Null until physical arrival at front desk
      guestName: 'Vikramaditya & Ananya Singhania',
      guestPhone: '9821098765',
      guestEmail: 'vikram.singhania@heritage.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000 * 2), // 2 nights
      guestCountAdults: 2,
      totalTariff: 7800,
      taxAmount: 936,
      grandTotal: 8736,
      advancePaymentAmount: 3000,
      paymentStatus: 'PARTIAL',
      bookingStatus: BookingStatus.CONFIRMED,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: hotelId });
    await User.deleteMany({ hotelId });
    await RoomType.deleteMany({ hotelId });
    await Room.deleteMany({ hotelId });
    await Booking.deleteMany({ hotelId });
    await Stay.deleteMany({ hotelId });
    await GuestProfile.deleteMany({ hotelId });
    await MasterFolio.deleteMany({ hotelId });
    await FolioLineItem.deleteMany({ hotelId });
  });

  it('1. Fetch Expected Arrivals Queue - Displays Online Pre-Bookings with Online Advance Paid Badge', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/expected-arrivals')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);

    const found = res.body.data.find((b: any) => b.bookingNumber === onlinePreBooking.bookingNumber);
    expect(found).toBeDefined();
    expect(found.guestName).toBe('Vikramaditya & Ananya Singhania');
    expect(found.advancePaymentAmount).toBe(3000);
    expect(found.paymentStatus).toBe('PARTIAL');
    expect(found.roomTypeName).toBe('Royal Heritage Deluxe Villa');
  });

  it('2. 1-Click Arrival Check-In - Links Online Pre-Booking, Allocates Physical Room 102 & Credits Online Advance to Master Folio', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        bookingId: onlinePreBooking._id.toString(),
        roomId: room102._id.toString(),
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9821098765',
        guestEmail: 'vikram.singhania@heritage.in',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '8842',
        verifiedByReceptionist: true,
        receptionistNotes: 'VIP Couple Pre-booking verified at Front Desk. Advance of ₹3000 credited from online payment gateway.',
        advancePaid: 0, // No extra collection needed right now
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room.status).toBe(RoomStatus.OCCUPIED);
    expect(res.body.data.stay.isCouple).toBe(true);
    expect(res.body.data.stay.idNumberMasked).toBe('XXXX-XXXX-8842');

    // Verify booking updated
    const updatedBooking = await Booking.findById(onlinePreBooking._id);
    expect(updatedBooking?.bookingStatus).toBe(BookingStatus.CHECKED_IN);
    expect(updatedBooking?.allocatedRoomId?.toString()).toBe(room102._id.toString());

    // Verify MasterFolio credited advance
    expect(res.body.data.folio.advanceCredited).toBe(3000);
    expect(res.body.data.folio.balanceDue).toBe(8736 - 3000); // 5736 due
  });

  it('3. Negative Conflict: Attempting to check-in an already checked-in booking fails with 409', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        bookingId: onlinePreBooking._id.toString(),
        roomId: room101._id.toString(),
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9821098765',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('BOOKING_ALREADY_CHECKED_IN');
  });

  it('4. In-Room Guest Portal (:3004) Hydration API - Returns Live Stay, Wi-Fi Password & Folio with Credited Advance', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/room-stay-details/102')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room.roomNumber).toBe('102');
    expect(res.body.data.stay.guestName).toBe('Vikramaditya & Ananya Singhania');
    expect(res.body.data.stay.wifiPassword).toBe('TajGuest@102');
    expect(res.body.data.stay.isCouple).toBe(true);
    expect(res.body.data.folio.advancePaid).toBe(3000);
    expect(res.body.data.folio.dueAmount).toBe(5736);
    expect(res.body.data.folio.lineItems.length).toBeGreaterThanOrEqual(1);
  });

  it('5. In-Room Dining Service Folio Posting - Adds F&B charge to live stay folio', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/post-inroom-charge')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomNumber: '102',
        department: 'ROOM_SERVICE',
        description: 'In-Room Dining: Paneer Tikka Angara x1, Royal Kesar Pista Lassi x1',
        amount: 440,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.folio.totalFoodAndBeverage).toBe(440);
    expect(res.body.data.folio.dueAmount).toBeGreaterThan(5736); // balance updated with dining charge
  });

  it('6. In-Room Concierge Request - Registers service request on live stay', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/concierge-request')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomNumber: '102',
        requestType: 'EXTRA_TOWELS',
        notes: 'Please provide 2 additional luxury bath sheets',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify stay record has the note
    const activeStay = await Stay.findOne({ roomId: room102._id, stayStatus: StayStatus.ACTIVE });
    expect(activeStay?.receptionistNotes).toContain('EXTRA_TOWELS');
  });
});
