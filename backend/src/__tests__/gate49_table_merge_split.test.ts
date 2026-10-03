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
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';

describe('--- SHIFT 49 / GATE 49: TABLE MERGE & SPLIT ENGINE (TABLE 3+4 UNIFIED TAB) ---', () => {
  let tenantId: string;
  let otherTenantId: string;
  let client: SpiceHubClient;
  let otherClient: SpiceHubClient;
  let testServerUrl: string;
  let managerToken: string;
  let table3: any;
  let table4: any;
  let table5: any;
  let otherTable: any;
  let testItem: any;
  let managerSocket: ClientSocketType;
  let posSocket: ClientSocketType;
  let table4Token: string = '';
  const userPassword = 'TestPassword123!';
  const managerEmail = `manager_merge_${Date.now()}@spicehub.com`;
  const port = 5143;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }
    const addr = server.address() as any;
    testServerUrl = `http://localhost:${addr.port}`;

    // 1. Setup Main Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Banquet Hotel',
      slug: `grand-banquet-${Date.now()}`,
      contactEmail: `banquet_${Date.now()}@spicehub.com`,
      contactPhone: '9888800049',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Other Tenant
    const otherTenant = await Tenant.create({
      name: 'Isolated Cafe Tenant',
      slug: `isolated-cafe-${Date.now()}`,
      contactEmail: `cafe_${Date.now()}@hotel.com`,
      contactPhone: '9999900049',
      status: 'ACTIVE',
    });
    otherTenantId = otherTenant._id.toString();

    // 3. Create Manager User
    const passwordHash = await argon2.hash(userPassword);
    await User.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'Manager Rohit Sharma',
      email: managerEmail,
      phone: '9876543210',
      passwordHash,
      role: UserRole.MANAGER,
      isActive: true,
      permissions: ['pos:tables:manage', 'pos:orders:create', 'pos:orders:read'],
    });

    // 4. Create Tables for Main Tenant
    table3 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-03',
      section: 'AC_HALL',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });

    table4 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-04',
      section: 'AC_HALL',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });

    table5 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'T-05',
      section: 'GARDEN',
      capacity: 6,
      currentStatus: TableStatus.AVAILABLE,
    });

    otherTable = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(otherTenantId),
      tableNumber: 'OTHER-01',
      section: 'ROOFTOP',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });

    // 5. Create category, station & menu item
    const station = await KitchenStation.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      stationName: 'Curry Station',
      stationCode: 'CRY',
      screenToken: `station_token_${Date.now()}`,
      isActive: true,
    });

    const cat = await MenuCategory.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'Main Courses',
      slug: `main-courses-${Date.now()}`,
      displayOrder: 1,
    });

    testItem = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: cat._id,
      kitchenStationId: station._id,
      name: 'Shahi Paneer Royal',
      description: 'Rich cottage cheese in creamy cashew gravy',
      price: 350,
      basePrice: 350,
      itemCode: 'SP-001',
      foodType: FoodType.VEG,
      isAvailable: true,
    });

    // 6. Init API Clients
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    otherClient = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: otherTenantId,
    });

    // 7. Login Manager
    const loginRes = await client.auth.login({
      email: managerEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    managerToken = loginRes.data.token;
    client.setAuthToken(managerToken);

    // 8. Connect Real Socket.IO Clients
    managerSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    posSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      managerSocket.on('connect', () => {
        managerSocket.emit('join_tenant_room', { hotelId: tenantId });
        checkDone();
      });
      posSocket.on('connect', () => {
        posSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'pos' });
        checkDone();
      });
    });
  });

  afterAll(async () => {
    if (managerSocket && managerSocket.connected) managerSocket.disconnect();
    if (posSocket && posSocket.connected) posSocket.disconnect();

    if (mongoose.connection.readyState !== 0) {
      await Tenant.deleteMany({ _id: { $in: [tenantId, otherTenantId] } });
      await User.deleteMany({ hotelId: { $in: [tenantId, otherTenantId] } });
      await DiningTable.deleteMany({ hotelId: { $in: [tenantId, otherTenantId] } });
      await TableSession.deleteMany({ hotelId: { $in: [tenantId, otherTenantId] } });
      await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantId, otherTenantId] } });
      await MenuItem.deleteMany({ hotelId: tenantId });
      await MenuCategory.deleteMany({ hotelId: tenantId });
    }
  });

  // TEST 1: Seat Table 3 and Table 4 with independent guests initially
  it('1. should seat Table 3 and Table 4 independently with active sessions and place initial order on Table 4', async () => {
    const seat3 = await client.pos.seatTable(table3._id.toString(), 3);
    expect(seat3.success).toBe(true);
    expect(seat3.data.status).toBe(TableStatus.OCCUPIED);

    const seat4 = await client.pos.seatTable(table4._id.toString(), 4);
    expect(seat4.success).toBe(true);
    expect(seat4.data.status).toBe(TableStatus.OCCUPIED);
    table4Token = seat4.data.sessionToken;

    // Place an order on Table 4 before merge
    const orderRes = await client.pos.placeOrder({
      hotelId: tenantId,
      tableSessionId: seat4.data.sessionId,
      items: [
        {
          menuItemId: testItem._id.toString(),
          quantity: 2,
        },
      ],
      idempotencyKey: `idemp-premerge-${Date.now()}`,
    });
    expect(orderRes.success).toBe(true);
  });

  // TEST 2: Real-time event validation on merge
  it('2. should merge Table 4 into Table 3, consolidating capacity and emitting realtime table:merged event', async () => {
    let capturedMergeEvent: any = null;
    let capturedStatusChanged: any = null;

    managerSocket.on('table:merged', (payload) => {
      capturedMergeEvent = payload;
    });

    posSocket.on('table:status_changed', (payload) => {
      if (payload.status === TableStatus.MERGED) {
        capturedStatusChanged = payload;
      }
    });

    const mergeRes = await client.pos.mergeTables({
      primaryTableId: table3._id.toString(),
      secondaryTableIds: [table4._id.toString()],
      mergedBy: 'Manager Rohit',
    });

    expect(mergeRes.success).toBe(true);
    expect(mergeRes.data.combinedCapacity).toBe(8); // 4 + 4 = 8
    expect(mergeRes.data.primaryTable.isMerged).toBe(true);
    expect(mergeRes.data.primaryTable.mergedTableNumbers).toContain('T-04');
    expect(mergeRes.data.secondaryTables[0].status).toBe(TableStatus.MERGED);
    expect(mergeRes.data.secondaryTables[0].mergedIntoTableId).toBe(table3._id.toString());

    // Wait for realtime socket event
    await new Promise((r) => setTimeout(r, 200));

    expect(capturedMergeEvent).not.toBeNull();
    expect(capturedMergeEvent.primaryTableNumber).toBe('T-03');
    expect(capturedMergeEvent.secondaryTableNumbers).toContain('T-04');
    expect(capturedMergeEvent.combinedCapacity).toBe(8);

    expect(capturedStatusChanged).not.toBeNull();
    expect(capturedStatusChanged.tableId).toBe(table4._id.toString());
    expect(capturedStatusChanged.status).toBe(TableStatus.MERGED);
  });

  // TEST 3: Database Verification of Merged State and Order Migration
  it('3. should verify in DB that Table 4 orders migrated to Table 3 session and Table 4 session is closed', async () => {
    const updatedTable3 = await DiningTable.findById(table3._id);
    const updatedTable4 = await DiningTable.findById(table4._id);

    expect(updatedTable3?.isMerged).toBe(true);
    expect(updatedTable3?.combinedCapacity).toBe(8);
    expect(updatedTable3?.mergedTableNumbers).toContain('T-04');

    expect(updatedTable4?.currentStatus).toBe(TableStatus.MERGED);
    expect(updatedTable4?.isMerged).toBe(true);
    expect(updatedTable4?.mergedIntoTableId?.toString()).toBe(table3._id.toString());
    expect(updatedTable4?.activeSessionId?.toString()).toBe(updatedTable3?.activeSessionId?.toString());

    // Verify all active orders for this combined group now point to Table 3 session
    const consolidatedOrders = await RestaurantOrder.find({
      hotelId: tenantId,
      tableSessionId: updatedTable3?.activeSessionId,
    });
    expect(consolidatedOrders.length).toBeGreaterThanOrEqual(1);
    const firstOrder = consolidatedOrders[0];
    expect(firstOrder).toBeDefined();
    if (firstOrder && firstOrder.tableId) {
      expect(firstOrder.tableId.toString()).toBe(table3._id.toString());
    }
  });

  // TEST 4: Scanning Table 4's QR Code routes seamlessly to Table 3's Unified Tab
  it('4. should resolve Table 4 QR scan seamlessly to Table 3 parent session', async () => {
    const qrRes = await client.request<any>('GET', '/api/v1/pos/table/qr-entry', undefined, {
      hotelId: tenantId,
      tableId: table4._id.toString(),
      token: table4Token,
    });

    expect(qrRes.success).toBe(true);
    expect(qrRes.data.tableId).toBe(table3._id.toString()); // Resolved to primary
    expect(qrRes.data.tableNumber).toBe('T-03');
    expect(qrRes.data.originalScannedTableNumber).toBe('T-04');
    expect(qrRes.data.isMerged).toBe(true);
    expect(qrRes.data.mergedTableNumbers).toContain('T-04');
    expect(qrRes.data.combinedCapacity).toBe(8);
  });

  // TEST 5: Subsequent order placed via Table 4 routes directly to unified session
  it('5. should allow placing an order under the unified session from Table 4 guest', async () => {
    const updatedTable3 = await DiningTable.findById(table3._id);

    const orderRes = await client.pos.placeOrder({
      hotelId: tenantId,
      tableSessionId: updatedTable3?.activeSessionId?.toString(),
      items: [
        {
          menuItemId: testItem._id.toString(),
          quantity: 3,
        },
      ],
      idempotencyKey: `idemp-merged-order-${Date.now()}`,
    });

    expect(orderRes.success).toBe(true);
    expect(orderRes.order.tableId!.toString()).toBe(table3._id.toString());
  });

  // TEST 6: Validation: Cannot merge table into itself
  it('6. should reject merge request where primary table is in secondary list (CANNOT_MERGE_SELF)', async () => {
    await expect(
      client.pos.mergeTables({
        primaryTableId: table3._id.toString(),
        secondaryTableIds: [table3._id.toString()],
      })
    ).rejects.toThrow();
  });

  // TEST 7: Validation: Cannot merge already merged table as primary
  it('7. should reject selecting an already merged secondary table as primary', async () => {
    await expect(
      client.pos.mergeTables({
        primaryTableId: table4._id.toString(),
        secondaryTableIds: [table5._id.toString()],
      })
    ).rejects.toThrow();
  });

  // TEST 8: Multi-tenant Isolation: Cannot merge tables across different hotel tenants
  it('8. should prevent merging table from a foreign hotel tenant (SECONDARY_TABLES_NOT_FOUND)', async () => {
    await expect(
      client.pos.mergeTables({
        primaryTableId: table3._id.toString(),
        secondaryTableIds: [otherTable._id.toString()],
      })
    ).rejects.toThrow();
  });

  // TEST 9: Split / Unmerge Table 4 from Table 3
  it('9. should split/unmerge Table 4, restoring Table 4 to AVAILABLE and Table 3 to capacity 4', async () => {
    let capturedUnmergeEvent: any = null;
    let capturedRestoreStatus: any = null;

    managerSocket.on('table:unmerged', (payload) => {
      capturedUnmergeEvent = payload;
    });

    posSocket.on('table:status_changed', (payload) => {
      if (payload.tableId === table4._id.toString() && payload.status === TableStatus.AVAILABLE) {
        capturedRestoreStatus = payload;
      }
    });

    const splitRes = await client.pos.splitTables({
      primaryTableId: table3._id.toString(),
      unmergeTableIds: [table4._id.toString()],
      splitBy: 'Manager Rohit',
    });

    expect(splitRes.success).toBe(true);
    expect(splitRes.data.primaryTable.isMerged).toBe(false);
    expect(splitRes.data.primaryTable.combinedCapacity).toBe(4);
    expect(splitRes.data.unmergedTables[0].status).toBe(TableStatus.AVAILABLE);
    expect(splitRes.data.unmergedTables[0].isMerged).toBe(false);

    // Wait for realtime socket event
    await new Promise((r) => setTimeout(r, 200));

    expect(capturedUnmergeEvent).not.toBeNull();
    expect(capturedUnmergeEvent.primaryTableNumber).toBe('T-03');
    expect(capturedUnmergeEvent.unmergedTableNumbers).toContain('T-04');

    expect(capturedRestoreStatus).not.toBeNull();
    expect(capturedRestoreStatus.status).toBe(TableStatus.AVAILABLE);

    // DB Verification
    const dbTable4 = await DiningTable.findById(table4._id);
    expect(dbTable4?.currentStatus).toBe(TableStatus.AVAILABLE);
    expect(dbTable4?.isMerged).toBe(false);
    expect(dbTable4?.mergedIntoTableId).toBeUndefined();
    expect(dbTable4?.activeSessionId).toBeUndefined();
  });

  // TEST 10: QR Scan on Table 4 after split initiates a new independent session
  it('10. should create a fresh independent session when Table 4 QR is scanned post-split', async () => {
    const postSplitScan = await client.request<any>('GET', '/api/v1/pos/table/qr-entry', undefined, {
      hotelId: tenantId,
      tableId: table4._id.toString(),
    });

    expect(postSplitScan.success).toBe(true);
    expect(postSplitScan.data.tableId).toBe(table4._id.toString());
    expect(postSplitScan.data.tableNumber).toBe('T-04');
    expect(postSplitScan.data.isMerged).toBe(false);
    expect(postSplitScan.data.combinedCapacity).toBe(4);
    expect(postSplitScan.data.sessionId).toBeDefined();
  });
});
