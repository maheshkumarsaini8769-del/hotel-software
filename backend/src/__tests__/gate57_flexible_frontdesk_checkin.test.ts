import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { GuestProfile } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
import { UserRole } from '../types';

describe('Gate #57: Flexible Front Desk Check-in, Couple Aadhaar & Guest Stay History', () => {
  let hotelId: Types.ObjectId;
  let receptionistToken: string;
  let room101: any;
  let room102: any;
  let roomType: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'Taj Palace Test Hotel',
      slug: `taj-test-${Date.now()}`,
      contactEmail: `frontdesk-${Date.now()}@tajtest.com`,
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    hotelId = tenant._id as Types.ObjectId;

    // 2. Setup Receptionist User
    const receptionist = await User.create({
      hotelId,
      name: 'Sunita Sharma (Front Desk)',
      email: `sunita-${Date.now()}@tajtest.com`,
      phone: '9899900010',
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

    // 3. Setup Room Type & Rooms
    roomType = await RoomType.create({
      hotelId,
      name: 'Royal Heritage Deluxe',
      code: 'RDLX',
      slug: 'royal-deluxe',
      basePriceOvernight: 4500,
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
  });

  it('1. Quick 1-Click Check-In without documents (Direct Walk-in / Skip Documents)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomId: room101._id.toString(),
        guestName: 'Arjun Verma',
        guestPhone: '9811223344',
        guestEmail: 'arjun@example.com',
        skipDocuments: true,
        advancePaid: 2000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room.status).toBe(RoomStatus.OCCUPIED);
    expect(res.body.data.stay.verificationMode).toBe('NONE');
    expect(res.body.data.stay.verifiedByReceptionist).toBe(false);
    expect(res.body.data.guestProfile.totalVisits).toBe(1);

    // Verify room status in DB
    const updatedRoom = await Room.findById(room101._id);
    expect(updatedRoom?.status).toBe(RoomStatus.OCCUPIED);
  });

  it('2. Negative Conflict: Attempt to check-in to an already occupied room fails with 409', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomId: room101._id.toString(), // Room 101 is already occupied by Arjun Verma
        guestName: 'Rohan Mehra',
        guestPhone: '9822334455',
        skipDocuments: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ROOM_ALREADY_OCCUPIED');
  });

  it('3. Couple Check-In with Aadhaar Verification on Room 102', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomId: room102._id.toString(),
        guestName: 'Karan Kapoor & Neha Kapoor',
        guestPhone: '9833445566',
        guestEmail: 'karan.kapoor@example.com',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '9845', // Last 4 digits entered by receptionist
        verifiedByReceptionist: true,
        receptionistNotes: 'Couple Aadhaar card physically checked & verified by Front Desk Sunita',
        advancePaid: 4500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stay.isCouple).toBe(true);
    expect(res.body.data.stay.verificationMode).toBe('AADHAAR');
    expect(res.body.data.stay.idNumberMasked).toBe('XXXX-XXXX-9845');
    expect(res.body.data.stay.verifiedByReceptionist).toBe(true);
    expect(res.body.data.guestProfile.isVerified).toBe(true);
    expect(res.body.data.guestProfile.idNumberMasked).toBe('XXXX-XXXX-9845');
  });

  it('4. Returning Guest Stay History Tracking (Arjun Verma visits again)', async () => {
    // Checkout Room 101 first so Arjun can check in again
    await Stay.updateMany({ roomId: room101._id }, { stayStatus: StayStatus.CHECKED_OUT });
    await Room.findByIdAndUpdate(room101._id, { status: RoomStatus.AVAILABLE });

    // Arjun visits again
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        roomId: room101._id.toString(),
        guestName: 'Arjun Verma',
        guestPhone: '9811223344', // Same phone number
        skipDocuments: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.guestProfile.totalVisits).toBe(2); // Automatically incremented to 2!
  });

  it('5. Search Guest Stay History by Phone number', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/guest-history?phone=9811223344')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toBe('Arjun Verma');
    expect(res.body.data[0].totalVisits).toBe(2);
    expect(res.body.data[0].pastStays.length).toBe(2);
  });

  it('6. Fetch Active In-House Guests Directory', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/active-stays')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);

    const coupleStay = res.body.data.find((g: any) => g.isCouple === true);
    expect(coupleStay).toBeDefined();
    expect(coupleStay.idNumberMasked).toBe('XXXX-XXXX-9845');
    expect(coupleStay.verifiedByReceptionist).toBe(true);
  });
});
