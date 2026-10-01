import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { RestaurantBill } from '../models/RestaurantBill';
import { NightAuditSession, NightAuditStatus } from '../models/NightAuditSession';
import { UserRole } from '../types';

describe('--- SHIFT 31 / GATE 31: DAILY NIGHT AUDIT, REVENUE MANAGER & BUSINESS DATE ROLLOVER ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let nightAuditorToken: string;
  let competitorToken: string;
  let auditSessionAId: string;
  let roomAId: string;
  let roomTypeId: string;
  let stayAId: string;
  let masterFolioAId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5111;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A (Grand Palace Hotel)
    const tenantA = await Tenant.create({
      name: 'The Grand Imperial Heritage Hotel',
      slug: `grand-imperial-${Date.now()}`,
      contactEmail: `audit_${Date.now()}@grandimperial.com`,
      contactPhone: '9822200001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Hotel)
    const tenantB = await Tenant.create({
      name: 'Rival Star Residency',
      slug: `rival-residency-${Date.now()}`,
      contactEmail: `audit_rival_${Date.now()}@rival.com`,
      contactPhone: '9822200002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. Night Auditor User for Tenant A
    const auditorUser = await User.create({
      tenantId: tenantA._id,
      hotelId: tenantA._id,
      name: 'Vikram Joshi (Night Auditor)',
      email: `vikram_${Date.now()}@grandimperial.com`,
      phone: '9822200003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    nightAuditorToken = jwt.sign(
      {
        userId: auditorUser._id.toString(),
        role: UserRole.MANAGER,
        hotelId: tenantAId,
        tenantId: tenantAId,
        email: auditorUser.email,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // 4. Competitor Auditor for Tenant B
    const competitorUser = await User.create({
      tenantId: tenantB._id,
      hotelId: tenantB._id,
      name: 'Suresh Verma (Rival Auditor)',
      email: `suresh_${Date.now()}@rival.com`,
      phone: '9822200004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    competitorToken = jwt.sign(
      {
        userId: competitorUser._id.toString(),
        role: UserRole.MANAGER,
        hotelId: tenantBId,
        tenantId: tenantBId,
        email: competitorUser.email,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // 5. Seed Room Type & Physical Rooms for Tenant A
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Royal Heritage Suite',
      code: `RHS-${Date.now().toString().slice(-4)}`,
      baseCapacityAdults: 2,
      baseCapacityChildren: 1,
      maxCapacity: 3,
      basePriceOvernight: 5000,
      amenities: ['Wi-Fi', 'Jacuzzi', 'Balcony'],
      images: ['suite.jpg'],
      totalRoomsCount: 10,
      isActive: true,
    });
    roomTypeId = roomType._id.toString();

    // Create 4 rooms (1 will be occupied, 3 vacant)
    const roomA = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '101',
      roomTypeId: roomType._id,
      floorNumber: 1,
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'room_101_hash',
    });
    roomAId = roomA._id.toString();

    await Room.create([
      {
        hotelId: tenantA._id,
        roomNumber: '102',
        roomTypeId: roomType._id,
        floorNumber: 1,
        status: RoomStatus.AVAILABLE,
        permanentQrCodeHash: 'room_102_hash',
      },
      {
        hotelId: tenantA._id,
        roomNumber: '103',
        roomTypeId: roomType._id,
        floorNumber: 1,
        status: RoomStatus.AVAILABLE,
        permanentQrCodeHash: 'room_103_hash',
      },
      {
        hotelId: tenantA._id,
        roomNumber: '104',
        roomTypeId: roomType._id,
        floorNumber: 1,
        status: RoomStatus.DIRTY,
        permanentQrCodeHash: 'room_104_hash',
      },
    ]);

    // 6. Setup In-House Active Stay & Master Folio for Room 101
    const dummyBookingId = new Types.ObjectId();
    const stayA = await Stay.create({
      hotelId: tenantA._id,
      bookingId: dummyBookingId,
      roomId: roomA._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
      stayStatus: StayStatus.ACTIVE,
    });
    stayAId = stayA._id.toString();

    const masterFolioA = await MasterFolio.create({
      hotelId: tenantA._id,
      stayId: stayA._id,
      bookingId: dummyBookingId,
      roomId: roomA._id,
      folioNumber: `FOL-IMP-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 0,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalTaxes: 0,
      advancePaid: 0,
      netAmountPayable: 0,
      paidAmount: 0,
      dueAmount: 0,
      folioStatus: 'OPEN',
    });
    masterFolioAId = masterFolioA._id.toString();

    stayA.masterFolioId = masterFolioA._id;
    await stayA.save();

    // 7. Seed F&B Order and Paid Bill for Today's Revenue Rollup
    await RestaurantBill.create({
      hotelId: tenantA._id,
      billNumber: `BILL-${Date.now().toString().slice(-4)}`,
      orderIds: [],
      subTotal: 2000,
      discountAmount: 0,
      taxBreakup: [{ taxName: 'GST', rate: 5, amount: 100 }],
      totalTax: 100, // 5% GST on F&B
      serviceCharge: 0,
      grandTotal: 2100,
      roundOff: 0,
      paidAmount: 2100,
      dueAmount: 0,
      billStatus: 'PAID',
      settledAt: new Date('2026-10-15T14:30:00.000Z'),
      isSnapshotLocked: true,
    });

    // Seed one active late diner order in kitchen
    await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: `ORD-LATE-${Date.now().toString().slice(-4)}`,
      orderType: 'DINE_IN',
      items: [
        {
          menuItemId: new Types.ObjectId(),
          kitchenStationId: new Types.ObjectId(),
          name: 'Butter Naan',
          unitPrice: 80,
          quantity: 2,
          subtotal: 160,
          itemStatus: 'PREPARING',
        },
      ],
      orderStatus: 'PREPARING',
      placedAt: new Date(),
      idempotencyKey: `idem-late-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await Room.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Stay.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await NightAuditSession.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  });

  it('1. GET /api/v1/night-audit/pre-audit-status returns live occupancy and readiness metrics', async () => {
    const res = await request(app)
      .get('/api/v1/night-audit/pre-audit-status')
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRooms).toBe(4);
    expect(res.body.data.occupiedRooms).toBe(1);
    expect(res.body.data.vacantRooms).toBe(3);
    expect(res.body.data.occupancyRate).toBe(25); // 1 out of 4 = 25%
    expect(res.body.data.unpostedOrdersCount).toBe(1); // 1 active late order in kitchen
    expect(res.body.data.currentBusinessDate).toBeDefined();
  });

  it('2. POST /api/v1/night-audit/run executes audit, auto-posts room tariff (12% GST) and advances date', async () => {
    const auditPayload = {
      auditDate: '2026-10-15',
      notes: 'Midweek Business Day Close & Room Revenue Sweep',
      performedByUserName: 'Vikram Joshi (Night Auditor)',
    };

    const res = await request(app)
      .post('/api/v1/night-audit/run')
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId)
      .send(auditPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.auditDate).toBe('2026-10-15');
    expect(res.body.data.nextBusinessDate).toBe('2026-10-16');
    expect(res.body.data.status).toBe(NightAuditStatus.COMPLETED);
    expect(res.body.data.totalRoomRevenue).toBe(5000);
    expect(res.body.data.totalFoodAndBeverageRevenue).toBe(2000);
    expect(res.body.data.roomsAutoPostedCount).toBe(1);
    expect(res.body.data.averageDailyRate).toBe(5000); // 5000 / 1 occupied room
    expect(res.body.data.revPAR).toBe(1250); // 5000 / 4 total available rooms
    expect(res.body.data.isDayClosed).toBe(true);

    auditSessionAId = res.body.data._id;

    // Verify MasterFolio has been auto-posted with room tariff + 12% GST
    const updatedFolio = await MasterFolio.findById(masterFolioAId);
    expect(updatedFolio?.totalRoomTariff).toBe(5000);
    expect(updatedFolio?.totalTaxes).toBe(600); // 12% of 5000 = 600
    expect(updatedFolio?.netAmountPayable).toBe(5600);
    expect(updatedFolio?.dueAmount).toBe(5600);

    // Verify FolioLineItem exists
    const lineItem = await FolioLineItem.findOne({
      folioId: masterFolioAId,
      department: DepartmentType.ROOM_RENT,
    });
    expect(lineItem).toBeDefined();
    expect(lineItem?.rate).toBe(5000);
    expect(lineItem?.taxAmount).toBe(600);
    expect(lineItem?.netAmount).toBe(5600);
  });

  it('3. POST /api/v1/night-audit/run rejects duplicate execution for already closed business date (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/night-audit/run')
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        auditDate: '2026-10-15',
        notes: 'Attempting to re-close already closed day',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('AUDIT_ALREADY_COMPLETED');
  });

  it('4. GET /api/v1/night-audit/history retrieves completed audit sessions sorted descending', async () => {
    const res = await request(app)
      .get('/api/v1/night-audit/history')
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].auditDate).toBe('2026-10-15');
    expect(res.body.data[0].nextBusinessDate).toBe('2026-10-16');
  });

  it('5. GET /api/v1/night-audit/reports/:id retrieves specific audit report by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/night-audit/reports/${auditSessionAId}`)
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(auditSessionAId);
    expect(res.body.data.occupancyRate).toBe(25);
    expect(res.body.data.revPAR).toBe(1250);
  });

  it('6. GET /api/v1/night-audit/reports/:id returns 404 for invalid or non-existent audit ID', async () => {
    const nonExistentId = new Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/v1/night-audit/reports/${nonExistentId}`)
      .set('Authorization', `Bearer ${nightAuditorToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('7. Strict Multi-Tenant Isolation: Competitor cannot access Tenant A audit session or reports', async () => {
    const res = await request(app)
      .get(`/api/v1/night-audit/reports/${auditSessionAId}`)
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify competitor history is completely empty
    const competitorHistoryRes = await request(app)
      .get('/api/v1/night-audit/history')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(competitorHistoryRes.status).toBe(200);
    expect(competitorHistoryRes.body.data.length).toBe(0);
  });
});
