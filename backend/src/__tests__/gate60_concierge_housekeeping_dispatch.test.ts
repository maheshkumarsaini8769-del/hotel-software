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
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { ServiceRequest, ServiceRequestStatus, ServiceRequestType, ServiceRequestPriority } from '../models/ServiceRequest';
import { UserRole } from '../types';

describe('Gate #60: Real-Time In-Room Digital Concierge, Housekeeping Dispatch & Folio Billing Loop', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let receptionistTokenA: string;
  let receptionistTokenB: string;
  let room102: any;
  let masterFolioA: any;
  let stayA: any;
  let standardRequestId: string;
  let laundryRequestId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'Hotel Taj Gateway & Luxury Suites',
      slug: `taj-gateway-shift60-${Date.now()}`,
      contactEmail: `frontdesk-60-${Date.now()}@tajgateway.com`,
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Setup Tenant B (Isolation Check)
    const tenantB = await Tenant.create({
      name: 'The Oberoi Grandeur Resort',
      slug: `oberoi-grandeur-shift60-${Date.now()}`,
      contactEmail: `frontdesk-60b-${Date.now()}@oberoi.com`,
      contactPhone: '9811122233',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    // 3. Receptionist User A & B
    const receptionistA = await User.create({
      hotelId: hotelIdA,
      name: 'Priya Sharma (Concierge Supervisor)',
      email: `priya-60-${Date.now()}@tajgateway.com`,
      phone: '9822233344',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK', 'ROOM_CHECKIN'],
    });

    const receptionistB = await User.create({
      hotelId: hotelIdB,
      name: 'Karan Mehra (Front Desk)',
      email: `karan-60-${Date.now()}@oberoi.com`,
      phone: '9844455566',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK'],
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    receptionistTokenA = jwt.sign(
      {
        userId: receptionistA._id.toString(),
        hotelId: hotelIdA.toString(),
        role: receptionistA.role,
        permissions: receptionistA.permissions,
      },
      secret,
      { expiresIn: '8h' }
    );

    receptionistTokenB = jwt.sign(
      {
        userId: receptionistB._id.toString(),
        hotelId: hotelIdB.toString(),
        role: receptionistB.role,
        permissions: receptionistB.permissions,
      },
      secret,
      { expiresIn: '8h' }
    );

    // 4. Setup Room Type & Room 102
    const roomType = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Royal Heritage Suite',
      code: `RHS-60-${Date.now()}`,
      slug: `rhs-60-${Date.now()}`,
      basePriceOvernight: 8500,
      maxOccupancyAdults: 3,
      amenities: ['Wi-Fi', 'King Bed', 'Jacuzzi', 'Pillow Menu'],
    });

    room102 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '102',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: `room-102-hash-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });

    // 5. Setup Booking
    const bookingA = await Booking.create({
      hotelId: hotelIdA,
      bookingNumber: `BKG-60-${Date.now().toString().slice(-6)}`,
      bookingSource: BookingSource.DIRECT_PUBLIC_WEB,
      bookingMode: BookingMode.OVERNIGHT,
      roomTypeId: roomType._id,
      guestName: 'Vikramaditya & Ananya Singhania',
      guestPhone: '9876543210',
      guestEmail: 'vikram.singhania@heritage.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000 * 2),
      guestCountAdults: 2,
      totalTariff: 17000,
      taxAmount: 2040,
      grandTotal: 19040,
      advancePaymentAmount: 3000,
      paymentStatus: 'PARTIAL',
      bookingStatus: BookingStatus.CONFIRMED,
    });

    // 6. Perform Check-In via PMS Front Desk API
    const checkinRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        bookingId: bookingA._id.toString(),
        roomId: room102._id.toString(),
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9876543210',
        guestEmail: 'vikram.singhania@heritage.in',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '8921',
        verifiedByReceptionist: true,
        receptionistNotes: 'Checked in at front desk terminal',
      });

    expect(checkinRes.status).toBe(201);
    stayA = await Stay.findOne({ hotelId: hotelIdA, roomId: room102._id, stayStatus: StayStatus.ACTIVE });
    masterFolioA = await MasterFolio.findById(stayA?.masterFolioId);
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
    await User.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Stay.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await ServiceRequest.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
  });

  // TEST 1
  it('1. Submit Complimentary Concierge Request (Extra Bath Towels & Pillows) for Room 102', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/concierge-request')
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        roomNumber: '102',
        requestType: 'TOWEL_REPLENISH',
        notes: '2 Extra bath towels and plush down pillows please',
        priority: 'NORMAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request).toBeDefined();
    expect(res.body.data.request.roomNumber).toBe('102');
    expect(res.body.data.request.requestType).toBe(ServiceRequestType.TOWEL_REPLENISH);
    expect(res.body.data.request.status).toBe(ServiceRequestStatus.CREATED);
    expect(res.body.data.request.isBillable).toBe(false);

    standardRequestId = res.body.data.request.requestId;

    // Verify DB entry
    const savedDoc = await ServiceRequest.findById(standardRequestId);
    expect(savedDoc).not.toBeNull();
    expect(savedDoc?.sourceType).toBe('HOTEL_STAY');
    expect(savedDoc?.roomId?.toString()).toBe(room102._id.toString());
  });

  // TEST 2
  it('2. Submit Billable In-Room Service (Express Laundry Wash & Fold - ₹350) and verify atomic Folio posting', async () => {
    const priorDue = masterFolioA.dueAmount;

    const res = await request(app)
      .post('/api/v1/pms/frontdesk/concierge-request')
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        roomNumber: '102',
        requestType: 'LAUNDRY',
        notes: 'Express 4-hour laundry wash and fold bag',
        priority: 'HIGH',
        isBillable: true,
        billableAmount: 350,
        billableDescription: 'Express Laundry Wash & Fold Service (Bag of 5 items)',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.isBillable).toBe(true);
    expect(res.body.data.request.billableAmount).toBe(350);
    expect(res.body.data.folio).toBeDefined();

    laundryRequestId = res.body.data.request.requestId;

    // Verify Folio and LineItem in Database
    const updatedFolio = await MasterFolio.findById(masterFolioA._id);
    expect(updatedFolio?.totalLaundry).toBe(350);
    // ₹350 + 5% GST (₹18) = ₹368
    const expectedNetIncrease = 350 + Math.round(350 * 0.05);
    expect(updatedFolio?.dueAmount).toBe(priorDue + expectedNetIncrease);

    const lineItem = await FolioLineItem.findOne({
      hotelId: hotelIdA,
      folioId: masterFolioA._id,
      department: DepartmentType.LAUNDRY,
    });
    expect(lineItem).not.toBeNull();
    expect(lineItem?.rate).toBe(350);
    expect(lineItem?.netAmount).toBe(expectedNetIncrease);
  });

  // TEST 3
  it('3. Fetch Front Desk Concierge Desk Queue - returns live pending requests with SLA & Room 102 details', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/concierge-requests')
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);

    const requests = res.body.data;
    const towelReq = requests.find((r: any) => r.id === standardRequestId);
    const laundryReq = requests.find((r: any) => r.id === laundryRequestId);

    expect(towelReq).toBeDefined();
    expect(towelReq.roomNumber).toBe('102');
    expect(towelReq.status).toBe(ServiceRequestStatus.CREATED);

    expect(laundryReq).toBeDefined();
    expect(laundryReq.isBillable).toBe(true);
    expect(laundryReq.billableAmount).toBe(350);
  });

  // TEST 4
  it('4. Assign Housekeeping Attendant (Sunita Sharma) - updates status to ASSIGNED', async () => {
    const res = await request(app)
      .patch(`/api/v1/pms/frontdesk/concierge-request/${standardRequestId}/status`)
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        status: ServiceRequestStatus.ASSIGNED,
        assignedStaffName: 'Sunita Sharma (Housekeeping Brigade)',
        notes: 'Sunita assigned - delivering towels to Room 102',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ServiceRequestStatus.ASSIGNED);
    expect(res.body.data.assignedStaffName).toBe('Sunita Sharma (Housekeeping Brigade)');
    expect(res.body.data.acceptedAt).toBeDefined();

    // Verify in DB
    const doc = await ServiceRequest.findById(standardRequestId);
    expect(doc?.status).toBe(ServiceRequestStatus.ASSIGNED);
    expect(doc?.assignedStaffName).toBe('Sunita Sharma (Housekeeping Brigade)');
  });

  // TEST 5
  it('5. Attendant fulfills service - updates status to COMPLETED with completedAt timestamp', async () => {
    const res = await request(app)
      .patch(`/api/v1/pms/frontdesk/concierge-request/${standardRequestId}/status`)
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        status: ServiceRequestStatus.COMPLETED,
        notes: 'Towels and extra pillows placed in Room 102 with compliments',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ServiceRequestStatus.COMPLETED);
    expect(res.body.data.completedAt).toBeDefined();

    const doc = await ServiceRequest.findById(standardRequestId);
    expect(doc?.status).toBe(ServiceRequestStatus.COMPLETED);
    expect(doc?.completedAt).not.toBeNull();
  });

  // TEST 6
  it('6. Hydrate In-Room Guest Portal Requests (:3004/?room=102) - returns live status history', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/concierge-requests/102')
      .set('Authorization', `Bearer ${receptionistTokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);

    const completedTowel = res.body.data.find((r: any) => r.id === standardRequestId);
    expect(completedTowel).toBeDefined();
    expect(completedTowel.status).toBe(ServiceRequestStatus.COMPLETED);
    expect(completedTowel.assignedStaffName).toBe('Sunita Sharma (Housekeeping Brigade)');

    const pendingLaundry = res.body.data.find((r: any) => r.id === laundryRequestId);
    expect(pendingLaundry).toBeDefined();
    expect(pendingLaundry.isBillable).toBe(true);
    expect(pendingLaundry.billableAmount).toBe(350);
  });

  // TEST 7
  it('7. Negative & Isolation: Tenant B cannot access or modify Tenant A concierge requests', async () => {
    // Attempt to access Tenant A's request with Tenant B token
    const fetchRes = await request(app)
      .get('/api/v1/pms/frontdesk/concierge-requests')
      .set('Authorization', `Bearer ${receptionistTokenB}`)
      .set('x-hotel-id', hotelIdB.toString());

    expect(fetchRes.status).toBe(200);
    // Should NOT contain Tenant A's requests
    const tenantBRequests = fetchRes.body.data || [];
    const leaked = tenantBRequests.find((r: any) => r.id === standardRequestId || r.id === laundryRequestId);
    expect(leaked).toBeUndefined();

    // Attempt to mutate Tenant A's request using Tenant B credentials
    const mutateRes = await request(app)
      .patch(`/api/v1/pms/frontdesk/concierge-request/${standardRequestId}/status`)
      .set('Authorization', `Bearer ${receptionistTokenB}`)
      .set('x-hotel-id', hotelIdB.toString())
      .send({ status: ServiceRequestStatus.CANCELLED });

    expect(mutateRes.status).toBe(404);
  });
});
