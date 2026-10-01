import mongoose from 'mongoose';
import argon2 from 'argon2';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';

describe('--- SHIFT 49 / GATE 49: ULTRA-DEEP CONCURRENCY & MULTI-TABLE MERGE DRILL ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let adminToken: string;
  let t10: any;
  let t11: any;
  let t12: any;
  let testItemBiryani: any;
  let testItemKebab: any;
  let posSocket: ClientSocketType;
  let waiterSocket: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const adminEmail = `admin_drill_${Date.now()}@spicehub.com`;
  const port = 5144;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Royal Dynasty Drill',
      slug: `dynasty-drill-${Date.now()}`,
      contactEmail: `dynasty_${Date.now()}@spicehub.com`,
      contactPhone: '9888800050',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Admin User
    const passwordHash = await argon2.hash(userPassword);
    await User.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'General Manager drill',
      email: adminEmail,
      phone: '9988776655',
      passwordHash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
      permissions: ['pos:tables:manage', 'pos:orders:create', 'billing:manage'],
    });

    // 3. Create Tables: Table 10 (Cap 6), Table 11 (Cap 6), Table 12 (Cap 6) -> Total 18 Pax
    t10 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-10',
      section: 'BANQUET_LAWN',
      capacity: 6,
      currentStatus: TableStatus.AVAILABLE,
    });

    t11 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-11',
      section: 'BANQUET_LAWN',
      capacity: 6,
      currentStatus: TableStatus.AVAILABLE,
    });

    t12 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-12',
      section: 'BANQUET_LAWN',
      capacity: 6,
      currentStatus: TableStatus.AVAILABLE,
    });

    // 4. Setup Kitchen Station & Menu Items
    const station = await KitchenStation.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      stationName: 'Biryani & Kebab Station',
      stationCode: 'BKS',
      screenToken: `bks_token_${Date.now()}`,
      isActive: true,
    });

    const category = await MenuCategory.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'Awadhi Delicacies',
      slug: `awadhi-${Date.now()}`,
      displayOrder: 1,
    });

    testItemBiryani = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Dum Pukht Biryani',
      itemCode: 'BKS-101',
      foodType: FoodType.NON_VEG,
      basePrice: 550,
      price: 550,
      isAvailable: true,
    });

    testItemKebab = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Galouti Kebab Melt',
      itemCode: 'BKS-102',
      foodType: FoodType.NON_VEG,
      basePrice: 420,
      price: 420,
      isAvailable: true,
    });

    // 5. Init Client & Login
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: adminEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    adminToken = loginRes.data.token;
    client.setAuthToken(adminToken);

    // 6. Connect Real Sockets
    posSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    waiterSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      posSocket.on('connect', () => {
        posSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'pos' });
        checkDone();
      });
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'waiters' });
        checkDone();
      });
    });
  });

  afterAll(async () => {
    if (posSocket && posSocket.connected) posSocket.disconnect();
    if (waiterSocket && waiterSocket.connected) waiterSocket.disconnect();

    if (mongoose.connection.readyState !== 0) {
      await Tenant.deleteMany({ _id: tenantId });
      await User.deleteMany({ hotelId: tenantId });
      await DiningTable.deleteMany({ hotelId: tenantId });
      await TableSession.deleteMany({ hotelId: tenantId });
      await RestaurantOrder.deleteMany({ hotelId: tenantId });
      await MenuItem.deleteMany({ hotelId: tenantId });
      await MenuCategory.deleteMany({ hotelId: tenantId });
      await KitchenStation.deleteMany({ hotelId: tenantId });
      await mongoose.disconnect();
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // DRILL 1: Multi-Table Merge: Table 10 (Primary) + Table 11 + Table 12 -> 18 Pax Mega Banquet Tab
  it('1. should merge 3 tables simultaneously into an 18-pax mega unified tab', async () => {
    const mergeRes = await client.pos.mergeTables({
      primaryTableId: t10._id.toString(),
      secondaryTableIds: [t11._id.toString(), t12._id.toString()],
      mergedBy: 'GM Banquet',
    });

    expect(mergeRes.success).toBe(true);
    expect(mergeRes.data.combinedCapacity).toBe(18); // 6 + 6 + 6 = 18
    expect(mergeRes.data.primaryTable.mergedTableNumbers).toEqual(expect.arrayContaining(['T-11', 'T-12']));
    expect(mergeRes.data.secondaryTables.length).toBe(2);

    for (const sec of mergeRes.data.secondaryTables) {
      expect(sec.status).toBe(TableStatus.MERGED);
      expect(sec.mergedIntoTableId).toBe(t10._id.toString());
    }
  });

  // DRILL 2: Concurrency Stress Test: 5 simultaneous merge attempts on already merged tables
  it('2. should handle 5 simultaneous merge requests concurrently with rock-solid consistency', async () => {
    const concurrentRequests = Array.from({ length: 5 }).map(() =>
      client.pos
        .mergeTables({
          primaryTableId: t10._id.toString(),
          secondaryTableIds: [t11._id.toString()],
          mergedBy: 'Concurrent Operator',
        })
        .catch((err) => ({ error: err.message }))
    );

    const results = await Promise.all(concurrentRequests);
    expect(results.length).toBe(5);

    // Verify DB integrity is never corrupted
    const freshT10 = await DiningTable.findById(t10._id);
    expect(freshT10?.combinedCapacity).toBe(18);
    expect(freshT10?.mergedTableIds?.length).toBe(2);
  });

  // DRILL 3: Place orders through secondary table QR scans and verify aggregation into primary tab
  it('3. should aggregate orders placed from all 3 physical table QR entries into unified primary session', async () => {
    // Scan T-10 QR
    const qr10 = await client.request<any>('GET', '/api/v1/pos/table/qr-entry', undefined, {
      hotelId: tenantId,
      tableId: t10._id.toString(),
    });
    // Scan T-11 QR (Secondary)
    const qr11 = await client.request<any>('GET', '/api/v1/pos/table/qr-entry', undefined, {
      hotelId: tenantId,
      tableId: t11._id.toString(),
    });
    // Scan T-12 QR (Secondary)
    const qr12 = await client.request<any>('GET', '/api/v1/pos/table/qr-entry', undefined, {
      hotelId: tenantId,
      tableId: t12._id.toString(),
    });

    // All should point to the exact same parent sessionId
    expect(qr11.data.sessionId).toBe(qr10.data.sessionId);
    expect(qr12.data.sessionId).toBe(qr10.data.sessionId);

    // Place order from T-11 guest
    const order1 = await client.pos.placeOrder({
      hotelId: tenantId,
      tableSessionId: qr11.data.sessionId,
      items: [{ menuItemId: testItemBiryani._id.toString(), quantity: 4 }],
      idempotencyKey: `idemp-drill-order-1-${Date.now()}`,
    });
    expect(order1.success).toBe(true);

    // Place order from T-12 guest
    const order2 = await client.pos.placeOrder({
      hotelId: tenantId,
      tableSessionId: qr12.data.sessionId,
      items: [{ menuItemId: testItemKebab._id.toString(), quantity: 3 }],
      idempotencyKey: `idemp-drill-order-2-${Date.now()}`,
    });
    expect(order2.success).toBe(true);

    // Verify primary session contains both orders
    const allGroupOrders = await RestaurantOrder.find({
      hotelId: tenantId,
      tableSessionId: qr10.data.sessionId,
    });
    expect(allGroupOrders.length).toBe(2);
  });

  // DRILL 4: Partial Unmerge: Split Table 12 out, leaving Table 10 and Table 11 merged (12 Pax)
  it('4. should partially unmerge Table 12, accurately shrinking capacity to 12 and restoring Table 12 to AVAILABLE', async () => {
    let capturedPartialSplit: any = null;
    waiterSocket.on('table:unmerged', (payload) => {
      capturedPartialSplit = payload;
    });

    const partialSplitRes = await client.pos.splitTables({
      primaryTableId: t10._id.toString(),
      unmergeTableIds: [t12._id.toString()],
      splitBy: 'Captain Partial Split',
    });

    expect(partialSplitRes.success).toBe(true);
    expect(partialSplitRes.data.primaryTable.isMerged).toBe(true);
    expect(partialSplitRes.data.primaryTable.combinedCapacity).toBe(12); // 6 + 6 = 12
    expect(partialSplitRes.data.primaryTable.mergedTableNumbers).toEqual(['T-11']);
    expect(partialSplitRes.data.unmergedTables[0].tableNumber).toBe('T-12');
    expect(partialSplitRes.data.unmergedTables[0].status).toBe(TableStatus.AVAILABLE);

    await new Promise((r) => setTimeout(r, 200));
    expect(capturedPartialSplit).not.toBeNull();
    expect(capturedPartialSplit.unmergedTableNumbers).toContain('T-12');
    expect(capturedPartialSplit.remainingMergedTableIds.length).toBe(1);

    // Verify T-12 is independently available in DB
    const freshT12 = await DiningTable.findById(t12._id);
    expect(freshT12?.currentStatus).toBe(TableStatus.AVAILABLE);
    expect(freshT12?.isMerged).toBe(false);
  });

  // DRILL 5: Complete Unmerge: Split Table 11 out, returning Table 10 to standard 6-pax table
  it('5. should unmerge remaining Table 11, fully restoring Table 10 to independent capacity 6', async () => {
    const finalSplitRes = await client.pos.splitTables({
      primaryTableId: t10._id.toString(),
      unmergeTableIds: [t11._id.toString()],
      splitBy: 'Captain Final Split',
    });

    expect(finalSplitRes.success).toBe(true);
    expect(finalSplitRes.data.primaryTable.isMerged).toBe(false);
    expect(finalSplitRes.data.primaryTable.combinedCapacity).toBe(6);
    expect(finalSplitRes.data.primaryTable.mergedTableNumbers).toEqual([]);
    expect(finalSplitRes.data.remainingMergedTableIds).toEqual([]);

    // DB Verification
    const freshT10 = await DiningTable.findById(t10._id);
    expect(freshT10?.isMerged).toBe(false);
    expect(freshT10?.combinedCapacity).toBe(6);
    expect(freshT10?.mergedTableIds).toEqual([]);

    const freshT11 = await DiningTable.findById(t11._id);
    expect(freshT11?.currentStatus).toBe(TableStatus.AVAILABLE);
    expect(freshT11?.isMerged).toBe(false);
    expect(freshT11?.activeSessionId).toBeUndefined();
  });
});
