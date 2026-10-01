import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem } from '../models/MenuItem';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { UserRole, FoodType, TableStatus } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  FloorLayoutHelper,
  FloorPlanStore,
  LiveTableCardModel,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 12 / GATE 12: RESTAURANT POS VISUAL FLOOR PLAN & LIVE TABLE GRID ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let socketClient: Socket;
  let tableMain1: any;
  let tableMain2: any;
  let tableAc1: any;
  let tableGarden1: any;
  const userPassword = 'TestPassword123!';
  const userEmail = `pos_admin_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5092;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `pos-lounge-${Date.now()}`,
      contactEmail: `pos_${Date.now()}@spicehub.com`,
      contactPhone: '9888844422',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Admin User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    const user = await User.create({
      hotelId: tenant._id,
      name: 'POS Floor Manager',
      email: userEmail,
      phone: '9888844421',
      passwordHash: hash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    // 3. Setup Tables across multiple sections
    tableMain1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'M-1',
      section: 'MAIN_HALL',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      coordinates: { x: 1, y: 1 },
    });

    tableMain2 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'M-2',
      section: 'MAIN_HALL',
      capacity: 2,
      currentStatus: TableStatus.DIRTY,
      coordinates: { x: 2, y: 1 },
    });

    tableAc1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'AC-1',
      section: 'AC_HALL',
      capacity: 6,
      currentStatus: TableStatus.AVAILABLE,
      coordinates: { x: 1, y: 2 },
    });

    tableGarden1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'G-1',
      section: 'GARDEN',
      capacity: 8,
      currentStatus: TableStatus.RESERVED,
      coordinates: { x: 3, y: 2 },
    });

    // 4. Initialize SpiceHubClient and authenticate
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: userEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    client.setAuthToken(loginRes.data.token);

    // 5. Connect Socket Client and join tenant global room
    socketClient = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      socketClient.on('connect', () => {
        socketClient.emit('join_tenant_room', { hotelId: tenantId });
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Retrieve All Dining Tables via POS Floor Plan API
  test('1. POS Floor Plan API returns all tables for the tenant with coordinates and formatted status', async () => {
    const res = await client.pos.getTables();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(4);

    const m1 = res.data.find((t) => t.tableNumber === 'M-1');
    expect(m1).toBeDefined();
    expect(m1.section).toBe('MAIN_HALL');
    expect(m1.capacity).toBe(4);
    expect(m1.currentStatus).toBe(TableStatus.AVAILABLE);
    expect(m1.position).toEqual({ x: 1, y: 1 });
  });

  // TEST 2: Section and Status Filtering via POS API
  test('2. POS Floor Plan API filters correctly by section and table status', async () => {
    const acHallRes = await client.pos.getTables({ section: 'AC_HALL' });
    expect(acHallRes.success).toBe(true);
    expect(acHallRes.data.length).toBe(1);
    expect(acHallRes.data[0].tableNumber).toBe('AC-1');

    const availableRes = await client.pos.getTables({ status: TableStatus.AVAILABLE });
    expect(availableRes.success).toBe(true);
    expect(availableRes.data.length).toBe(2); // M-1 and AC-1
    const tableNumbers = availableRes.data.map((t) => t.tableNumber);
    expect(tableNumbers).toContain('M-1');
    expect(tableNumbers).toContain('AC-1');
  });

  // TEST 3: FloorLayoutHelper Stats, Grouping and Formatters
  test('3. FloorLayoutHelper accurately computes section summary stats, group maps, and elapsed time', () => {
    const sampleTables: LiveTableCardModel[] = [
      { id: '1', tableNumber: '1', section: 'MAIN', capacity: 4, currentStatus: TableStatus.AVAILABLE },
      { id: '2', tableNumber: '2', section: 'MAIN', capacity: 2, currentStatus: TableStatus.OCCUPIED, activeOrderTotal: 1200 },
      { id: '3', tableNumber: '3', section: 'AC', capacity: 4, currentStatus: TableStatus.BILLING, activeOrderTotal: 850 },
      { id: '4', tableNumber: '4', section: 'AC', capacity: 6, currentStatus: TableStatus.DIRTY },
      { id: '5', tableNumber: '5', section: 'GARDEN', capacity: 4, currentStatus: TableStatus.RESERVED },
    ];

    const stats = FloorLayoutHelper.calculateSectionStats(sampleTables);
    expect(stats.total).toBe(5);
    expect(stats.available).toBe(1);
    expect(stats.occupied).toBe(1);
    expect(stats.billing).toBe(1);
    expect(stats.dirty).toBe(1);
    expect(stats.reserved).toBe(1);
    expect(stats.activeRevenue).toBe(2050); // 1200 + 850
    expect(stats.occupancyRate).toBe(40); // 2 occupied/billing out of 5 = 40%

    // Grouping
    const grouped = FloorLayoutHelper.groupBySection(sampleTables);
    expect(Object.keys(grouped)).toEqual(['MAIN', 'AC', 'GARDEN']);
    expect(grouped['MAIN'].length).toBe(2);

    // Elapsed formatting
    expect(FloorLayoutHelper.formatElapsedTime(0)).toBe('Just seated');
    expect(FloorLayoutHelper.formatElapsedTime(45)).toBe('45m');
    expect(FloorLayoutHelper.formatElapsedTime(95)).toBe('1h 35m');
  });

  // TEST 4: FloorPlanStore Reactive State Management & Filtering
  test('4. FloorPlanStore filters tables, emits to subscribers, and mutates table statuses', () => {
    const store = new FloorPlanStore([
      { id: 't1', tableNumber: 'T-1', section: 'MAIN', capacity: 4, currentStatus: TableStatus.AVAILABLE },
      { id: 't2', tableNumber: 'T-2', section: 'AC', capacity: 2, currentStatus: TableStatus.DIRTY },
    ]);

    let notificationCount = 0;
    let lastTables: LiveTableCardModel[] = [];

    const unsubscribe = store.subscribe((tables) => {
      notificationCount++;
      lastTables = tables;
    });

    // Filter change
    store.setFilters({ section: 'MAIN' });
    expect(notificationCount).toBe(1);
    expect(lastTables.length).toBe(1);
    expect(lastTables[0].tableNumber).toBe('T-1');

    // Quick action: mark dirty
    store.setFilters({ section: 'ALL' });
    store.markDirty('t1');
    expect(store.getTable('t1')?.currentStatus).toBe(TableStatus.DIRTY);

    // Quick action: mark available
    store.markAvailable('t1');
    expect(store.getTable('t1')?.currentStatus).toBe(TableStatus.AVAILABLE);

    unsubscribe();
  });

  // TEST 5: Manual Walk-In Seating with Real-Time Socket.IO Broadcast
  test('5. POST /pos/tables/:id/seat starts active session, sets OCCUPIED, and broadcasts socket event', async () => {
    let socketEventReceived: any = null;

    const socketPromise = new Promise<void>((resolve) => {
      socketClient.once('table:status_changed', (payload) => {
        socketEventReceived = payload;
        resolve();
      });
    });

    const seatRes = await client.pos.seatTable(tableMain1._id.toString(), 4);
    expect(seatRes.success).toBe(true);
    expect(seatRes.data.status).toBe(TableStatus.OCCUPIED);
    expect(seatRes.data.sessionId).toBeDefined();
    expect(seatRes.data.sessionToken).toBeDefined();

    // Await real-time broadcast
    await socketPromise;
    expect(socketEventReceived).toBeDefined();
    expect(socketEventReceived.tableId).toBe(tableMain1._id.toString());
    expect(socketEventReceived.status).toBe(TableStatus.OCCUPIED);
    expect(socketEventReceived.sessionId).toBe(seatRes.data.sessionId);

    // Verify DB persistence
    const updatedTable = await DiningTable.findById(tableMain1._id);
    expect(updatedTable?.currentStatus).toBe(TableStatus.OCCUPIED);
    expect(updatedTable?.activeSessionId?.toString()).toBe(seatRes.data.sessionId);
  });

  // TEST 6: Table Status Transition & Busser Cleaning Cycle with Socket Broadcast
  test('6. PATCH /pos/tables/:id/status transitions through BILLING -> DIRTY -> AVAILABLE and notifies sockets', async () => {
    // 1. Transition to BILLING
    const billingPromise = new Promise<any>((resolve) => {
      socketClient.once('table:status_changed', resolve);
    });
    const billRes = await client.pos.updateTableStatus(tableMain1._id.toString(), TableStatus.BILLING);
    expect(billRes.success).toBe(true);
    expect(billRes.data.status).toBe(TableStatus.BILLING);
    const billEvent = await billingPromise;
    expect(billEvent.status).toBe(TableStatus.BILLING);

    // 2. Transition to DIRTY
    const dirtyPromise = new Promise<any>((resolve) => {
      socketClient.once('table:status_changed', resolve);
    });
    const dirtyRes = await client.pos.updateTableStatus(tableMain1._id.toString(), TableStatus.DIRTY);
    expect(dirtyRes.success).toBe(true);
    expect(dirtyRes.data.status).toBe(TableStatus.DIRTY);
    const dirtyEvent = await dirtyPromise;
    expect(dirtyEvent.status).toBe(TableStatus.DIRTY);

    // 3. Transition to AVAILABLE (clears session in DB)
    const availPromise = new Promise<any>((resolve) => {
      socketClient.once('table:status_changed', resolve);
    });
    const availRes = await client.pos.updateTableStatus(tableMain1._id.toString(), TableStatus.AVAILABLE);
    expect(availRes.success).toBe(true);
    expect(availRes.data.status).toBe(TableStatus.AVAILABLE);
    const availEvent = await availPromise;
    expect(availEvent.status).toBe(TableStatus.AVAILABLE);

    const clearedTable = await DiningTable.findById(tableMain1._id);
    expect(clearedTable?.currentStatus).toBe(TableStatus.AVAILABLE);
    expect(clearedTable?.activeSessionId).toBeUndefined();
  });

  // TEST 7: Active Order Total Computed & Reflected on Floor Plan Table Card
  test('7. Active order placed on occupied table automatically sums into activeOrderTotal on table card', async () => {
    // 1. Seat AC-1 table
    const seatRes = await client.pos.seatTable(tableAc1._id.toString(), 2);
    const sessionId = seatRes.data.sessionId;

    const stationId = new mongoose.Types.ObjectId();

    // 2. Create MenuItem
    const dish = await MenuItem.create({
      hotelId: tenantId,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationId,
      name: 'Paneer Butter Masala',
      foodType: FoodType.VEG,
      basePrice: 350,
      isAvailable: true,
    });

    // 3. Create active Order for this table session
    await RestaurantOrder.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableSessionId: new mongoose.Types.ObjectId(sessionId),
      tableId: tableAc1._id,
      orderType: OrderType.DINE_IN,
      orderNumber: `ORD-${Date.now()}`,
      idempotencyKey: `idemp_${Date.now()}`,
      items: [
        {
          menuItemId: dish._id,
          kitchenStationId: stationId,
          name: dish.name,
          quantity: 2,
          unitPrice: 350,
          subtotal: 700,
        },
      ],
      orderStatus: OverallOrderStatus.PREPARING,
      placedAt: new Date(),
    });

    // 4. Fetch tables via Floor Plan API
    const tablesRes = await client.pos.getTables();
    const ac1Card = tablesRes.data.find((t) => t.id === tableAc1._id.toString());
    expect(ac1Card).toBeDefined();
    expect(ac1Card.currentStatus).toBe(TableStatus.OCCUPIED);
    expect(ac1Card.activeOrderTotal).toBe(700);
    expect(ac1Card.activeItemsCount).toBe(2);
    expect(ac1Card.sessionStartTime).toBeDefined();

    // 5. Store reactive order update simulation
    const store = new FloorPlanStore(tablesRes.data);
    store.handleOrderCreated({
      tableId: tableAc1._id.toString(),
      totalAmount: 250,
      itemCount: 1,
    });
    const updatedStoreTable = store.getTable(tableAc1._id.toString());
    expect(updatedStoreTable?.activeOrderTotal).toBe(950); // 700 + 250
    expect(updatedStoreTable?.activeItemsCount).toBe(3); // 2 + 1
  });
});

