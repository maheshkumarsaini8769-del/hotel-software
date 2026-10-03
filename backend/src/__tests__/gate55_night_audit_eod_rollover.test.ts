import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { NightAuditSession, NightAuditStatus } from '../models/NightAuditSession';

describe('--- SHIFT 55 / GATE 55: NIGHT AUDIT AUTOMATED EOD ROLLOVER & DAY LOCK CERTIFICATE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let adminAUserId: string;
  let adminBUserId: string;
  let testRoomId: Types.ObjectId;
  let testFolioId: Types.ObjectId;
  let testStayId: Types.ObjectId;
  const testAuditDate = '2026-10-15';
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'Taj Gateway Resort EOD',
      slug: `taj-gateway-eod-${Date.now()}`,
      contactEmail: `nightaudit-a-${Date.now()}@taj.com`,
      contactPhone: '+91 98888 77777',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Oberoi Grand Luxury EOD',
      slug: `oberoi-grand-eod-${Date.now()}`,
      contactEmail: `nightaudit-b-${Date.now()}@oberoi.com`,
      contactPhone: '+91 98888 88888',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Admin Users
    const adminA = await User.create({
      hotelId: tenantA._id,
      name: 'Priya Sharma (Night Auditor)',
      email: `priya-auditor-${Date.now()}@taj.com`,
      phone: '+91 91111 66666',
      passwordHash: 'dummy_hash_55',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });
    adminAUserId = adminA._id.toString();

    const adminB = await User.create({
      hotelId: tenantB._id,
      name: 'Amit Roy (Admin B)',
      email: `amit-auditor-${Date.now()}@oberoi.com`,
      phone: '+91 91111 77777',
      passwordHash: 'dummy_hash_55_b',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });
    adminBUserId = adminB._id.toString();

    adminAToken = jwt.sign(
      { userId: adminAUserId, hotelId: tenantAId, role: UserRole.HOTEL_ADMIN, name: adminA.name },
      jwtSecret,
      { expiresIn: '8h' }
    );

    adminBToken = jwt.sign(
      { userId: adminBUserId, hotelId: tenantBId, role: UserRole.HOTEL_ADMIN, name: adminB.name },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // 3. Create RoomType and Room in Tenant A
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Royal Heritage Suite',
      code: 'RHS',
      basePriceOvernight: 5000,
      maxOccupancy: 3,
    });

    const room = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '401',
      floorNumber: 4,
      roomTypeId: roomType._id,
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: `hash_401_${Date.now()}`,
    });
    testRoomId = room._id as Types.ObjectId;

    // 4. Create MasterFolio and Active Stay
    testStayId = new Types.ObjectId();
    const testBookingId = new Types.ObjectId();

    const masterFolio = await MasterFolio.create({
      hotelId: tenantA._id,
      stayId: testStayId,
      bookingId: testBookingId,
      roomId: testRoomId,
      folioNumber: `FOL-401-${Date.now().toString().slice(-4)}`,
      folioStatus: 'OPEN',
      totalRoomTariff: 0,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 0,
      advancePaid: 0,
      netAmountPayable: 0,
      paidAmount: 0,
      dueAmount: 0,
    });
    testFolioId = masterFolio._id as Types.ObjectId;

    await Stay.create({
      _id: testStayId,
      hotelId: tenantA._id,
      bookingId: testBookingId,
      roomId: testRoomId,
      masterFolioId: testFolioId,
      checkInTimestamp: new Date(Date.now() - 6 * 3600000),
      expectedCheckOutTimestamp: new Date(Date.now() + 24 * 3600000),
      stayStatus: StayStatus.ACTIVE,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ _id: { $in: [adminAUserId, adminBUserId] } });
    await Room.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Stay.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await NightAuditSession.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Security Gate
  // ---------------------------------------------------------------------------
  it('TEST 1: Security - Rejects unauthenticated request without token', async () => {
    const res = await request(app)
      .post('/api/v1/night-audit/run')
      .send({ auditDate: testAuditDate });

    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Pre-Audit Telemetry
  // ---------------------------------------------------------------------------
  it('TEST 2: Pre-Audit Status - Accurately reports active in-house stays and occupancy rate', async () => {
    const res = await request(app)
      .get('/api/v1/night-audit/pre-audit-status')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.occupiedRooms).toBe(1);
    expect(res.body.data.occupancyRate).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Night Audit Execution & Room Tariff Auto-Posting
  // ---------------------------------------------------------------------------
  it('TEST 3: Execution & Auto-Post - Charges room tariff (₹5000 + 12% GST = ₹5600) to folio, advances date, and generates Day Lock Certificate', async () => {
    const res = await request(app)
      .post('/api/v1/night-audit/run')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        auditDate: testAuditDate,
        notes: 'End of Day Business Rollover and Day Lock verification',
        performedByUserName: 'Priya Sharma (Night Auditor)',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.auditDate).toBe(testAuditDate);
    expect(res.body.data.nextBusinessDate).toBe('2026-10-16');
    expect(res.body.data.dayLockCertificateNumber).toMatch(/^CERT-EOD-/);
    expect(res.body.data.isDayClosed).toBe(true);
    expect(res.body.data.status).toBe(NightAuditStatus.COMPLETED);
    expect(res.body.data.totalRoomRevenue).toBe(5000);
    expect(res.body.data.roomsAutoPostedCount).toBe(1);

    // Verify MasterFolio was charged
    const updatedFolio = await MasterFolio.findById(testFolioId);
    expect(updatedFolio?.totalRoomTariff).toBe(5000);
    expect(updatedFolio?.totalTaxes).toBe(600); // 12% of 5000
    expect(updatedFolio?.netAmountPayable).toBe(5600);

    // Verify FolioLineItem was persisted
    const lineItem = await FolioLineItem.findOne({
      folioId: testFolioId,
      department: DepartmentType.ROOM_RENT,
    });
    expect(lineItem).not.toBeNull();
    expect(lineItem?.rate).toBe(5000);
    expect(lineItem?.taxAmount).toBe(600);
    expect(lineItem?.netAmount).toBe(5600);
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Idempotency & Conflict Guard
  // ---------------------------------------------------------------------------
  it('TEST 4: Idempotency - Prevents double execution and returns 409 Conflict for already locked date', async () => {
    const res = await request(app)
      .post('/api/v1/night-audit/run')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        auditDate: testAuditDate,
        notes: 'Duplicate execution attempt',
      });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('AUDIT_ALREADY_COMPLETED');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Multi-Tenant Ledger Isolation
  // ---------------------------------------------------------------------------
  it('TEST 5: Multi-Tenant Isolation - Tenant B cannot see Tenant A audit sessions or folios', async () => {
    const res = await request(app)
      .get('/api/v1/night-audit/history')
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Tenant B has 0 completed audits
  });
});
