import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, ItemProductionStatus, OrderType } from '../models/RestaurantOrder';
import { UserRole, FoodType } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  KdsHelper,
  KdsStore,
  KitchenKdsChimePattern,
  KdsOrderCardModel,
  KitchenStationModel,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 16 / GATE 16: KITCHEN KDS REAL-TIME DISPLAY & STATION ROUTING ENGINE ---', () => {
  let tenantId: string;
  let otherTenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let chefUser: any;
  let chefToken: string;
  let stationTandoor: any;
  let stationCurry: any;
  let dishTandoor: any;
  let dishCurry: any;
  let order1Tandoor: any;
  let order2Curry: any;
  let order3Combo: any;
  let table1: any;
  let kdsSocket: ClientSocketType;
  let waiterSocket: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const chefEmail = `chef_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5096;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Royal Palace KDS',
      slug: `kds-palace-${Date.now()}`,
      contactEmail: `kds_${Date.now()}@spicehub.com`,
      contactPhone: '9888877711',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // Secondary tenant to test strict isolation
    const otherTenant = await Tenant.create({
      name: 'Other Hotel Kitchen',
      slug: `other-kitchen-${Date.now()}`,
      contactEmail: `other_${Date.now()}@spicehub.com`,
      contactPhone: '9888877722',
      status: 'ACTIVE',
    });
    otherTenantId = otherTenant._id.toString();

    // 2. Setup Chef User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    chefUser = await User.create({
      hotelId: tenant._id,
      name: 'Executive Chef Sanjeev',
      email: chefEmail,
      phone: '9888877712',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    // 3. Setup Kitchen Stations
    stationTandoor = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'TANDOOR',
      screenToken: 'token_tandoor_screen',
      assignedChefIds: [chefUser._id],
      isOnline: true,
    });

    stationCurry = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'CURRY_MAIN',
      screenToken: 'token_curry_screen',
      assignedChefIds: [chefUser._id],
      isOnline: true,
    });

    // Foreign station for isolation test
    await KitchenStation.create({
      hotelId: otherTenant._id,
      stationName: 'BAKERY_ISOLATED',
      screenToken: 'token_foreign_screen',
      isOnline: true,
    });

    // 4. Setup Table & Active Session
    table1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'KDS-01',
      section: 'ROOFTOP',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });

    const session1 = await TableSession.create({
      hotelId: tenant._id,
      tableId: table1._id,
      sessionTokenHash: 'dummy_kds_token_hash',
      status: SessionStatus.ACTIVE,
    });
    table1.activeSessionId = session1._id as mongoose.Types.ObjectId;
    await table1.save();

    // 5. Setup Menu Items
    dishTandoor = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationTandoor._id,
      name: 'Bhatti Da Murgh',
      foodType: FoodType.NON_VEG,
      basePrice: 420,
      isAvailable: true,
    });

    dishCurry = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationCurry._id,
      name: 'Dal Makhani Bukhara',
      foodType: FoodType.VEG,
      basePrice: 320,
      isAvailable: true,
    });

    // 6. Create Distinct Orders
    // Order 1: Only Tandoor
    order1Tandoor = await RestaurantOrder.create({
      hotelId: tenant._id,
      orderNumber: `ORD-TND-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table1._id,
      tableSessionId: session1._id,
      items: [
        {
          menuItemId: dishTandoor._id,
          kitchenStationId: stationTandoor._id,
          name: dishTandoor.name,
          unitPrice: 420,
          quantity: 2,
          subtotal: 840,
          itemStatus: ItemProductionStatus.PENDING,
          specialInstructions: 'Well done, crispy skin',
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      placedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      idempotencyKey: `idem-kds-1-${Date.now()}`,
    });

    // Order 2: Only Curry
    order2Curry = await RestaurantOrder.create({
      hotelId: tenant._id,
      orderNumber: `ORD-CUR-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table1._id,
      tableSessionId: session1._id,
      items: [
        {
          menuItemId: dishCurry._id,
          kitchenStationId: stationCurry._id,
          name: dishCurry.name,
          unitPrice: 320,
          quantity: 1,
          subtotal: 320,
          itemStatus: ItemProductionStatus.PENDING,
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      placedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (Warning)
      idempotencyKey: `idem-kds-2-${Date.now()}`,
    });

    // Order 3: Combo (Both Tandoor + Curry)
    order3Combo = await RestaurantOrder.create({
      hotelId: tenant._id,
      orderNumber: `ORD-CMB-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table1._id,
      tableSessionId: session1._id,
      items: [
        {
          menuItemId: dishTandoor._id,
          kitchenStationId: stationTandoor._id,
          name: dishTandoor.name,
          unitPrice: 420,
          quantity: 1,
          subtotal: 420,
          itemStatus: ItemProductionStatus.PENDING,
        },
        {
          menuItemId: dishCurry._id,
          kitchenStationId: stationCurry._id,
          name: dishCurry.name,
          unitPrice: 320,
          quantity: 1,
          subtotal: 320,
          itemStatus: ItemProductionStatus.PENDING,
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      placedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago (Critical / Late)
      idempotencyKey: `idem-kds-3-${Date.now()}`,
    });

    // 7. Login Chef
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    const loginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: chefEmail, password: userPassword }),
    });
    const loginJson = (await loginRes.json()) as any;
    chefToken = loginJson.data.token;
    client.setAuthToken(chefToken);
    client.setHotelId(tenantId);

    // 8. Connect Real Sockets for Real-Time Notification Verification
    kdsSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    waiterSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const check = () => {
        connectedCount++;
        if (connectedCount === 2) {
          setTimeout(resolve, 100);
        }
      };
      kdsSocket.on('connect', () => {
        kdsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'kds' });
        check();
      });
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'waiters' });
        check();
      });
    });
  });

  afterAll(async () => {
    if (kdsSocket && kdsSocket.connected) kdsSocket.disconnect();
    if (waiterSocket && waiterSocket.connected) waiterSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // TEST 1: Station Retrieval & Multi-Tenant Isolation
  test('1. GET /api/v1/pos/kds/stations returns tenant kitchen stations and isolates other tenants', async () => {
    const res = await client.pos.getKitchenStations();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(2);

    const stationNames = res.data.map((s: any) => s.stationName);
    expect(stationNames).toContain('TANDOOR');
    expect(stationNames).toContain('CURRY_MAIN');
    expect(stationNames).not.toContain('BAKERY_ISOLATED');
  });

  // TEST 2: Active Orders Listing with Station Filtering
  test('2. GET /api/v1/pos/kds/orders retrieves active orders and accurately filters by stationId', async () => {
    // 2.1 Fetch All Active Orders
    const allRes = await client.pos.getKdsOrders();
    expect(allRes.success).toBe(true);
    expect(allRes.data.length).toBe(3);

    // 2.2 Filter by Tandoor Station: should return Order 1 and Order 3
    const tandoorRes = await client.pos.getKdsOrders({ stationId: stationTandoor._id.toString() });
    expect(tandoorRes.success).toBe(true);
    expect(tandoorRes.data.length).toBe(2);
    const tandoorOrderIds = tandoorRes.data.map((o: any) => o._id.toString());
    expect(tandoorOrderIds).toContain(order1Tandoor._id.toString());
    expect(tandoorOrderIds).toContain(order3Combo._id.toString());
    expect(tandoorOrderIds).not.toContain(order2Curry._id.toString());

    // 2.3 Filter by Curry Station: should return Order 2 and Order 3
    const curryRes = await client.pos.getKdsOrders({ stationId: stationCurry._id.toString() });
    expect(curryRes.success).toBe(true);
    expect(curryRes.data.length).toBe(2);
    const curryOrderIds = curryRes.data.map((o: any) => o._id.toString());
    expect(curryOrderIds).toContain(order2Curry._id.toString());
    expect(curryOrderIds).toContain(order3Combo._id.toString());
    expect(curryOrderIds).not.toContain(order1Tandoor._id.toString());
  });

  // TEST 3: Status Transition (PLACED -> PREPARING -> READY) & Real-time Socket Broadcasts
  test('3. PATCH /api/v1/pos/kds/order/:orderId/status updates order status and emits socket events to KDS & Waiters', async () => {
    // Listen for socket events
    const kdsPromise = new Promise<any>((resolve) => {
      kdsSocket.once('order:status_updated', (data) => resolve(data));
    });

    const waiterPromise = new Promise<any>((resolve) => {
      waiterSocket.once('order:ready', (data) => resolve(data));
    });

    // 3.1 Transition to PREPARING
    const prepRes = await client.pos.updateKdsOrderStatus(
      order1Tandoor._id.toString(),
      OverallOrderStatus.PREPARING
    );
    expect(prepRes.success).toBe(true);
    expect(prepRes.data.orderStatus).toBe(OverallOrderStatus.PREPARING);

    // 3.2 Transition to READY (Should trigger waiter notification)
    const readyRes = await client.pos.updateKdsOrderStatus(
      order1Tandoor._id.toString(),
      OverallOrderStatus.READY
    );
    expect(readyRes.success).toBe(true);
    expect(readyRes.data.orderStatus).toBe(OverallOrderStatus.READY);
    expect(readyRes.data.readyAt).toBeDefined();

    // Verify Socket Events
    const kdsEvent = await kdsPromise;
    expect(kdsEvent.orderId).toBe(order1Tandoor._id.toString());

    const waiterEvent = await waiterPromise;
    expect(waiterEvent.orderId).toBe(order1Tandoor._id.toString());
    expect(waiterEvent.orderNumber).toBe(order1Tandoor.orderNumber);
  });

  // TEST 4: Item-Level Production Status & Auto-Aggregation
  test('4. Item-level status updates aggregate to PREPARING and READY automatically', async () => {
    // Order 3 has 2 items: 1 Tandoor, 1 Curry
    const item1Id = order3Combo.items[0]._id ? order3Combo.items[0]._id.toString() : order3Combo.items[0].menuItemId.toString();
    const item2Id = order3Combo.items[1]._id ? order3Combo.items[1]._id.toString() : order3Combo.items[1].menuItemId.toString();

    // Step A: Mark Item 1 READY -> Overall should become PREPARING
    const resA = await client.pos.updateKdsOrderStatus(
      order3Combo._id.toString(),
      ItemProductionStatus.READY,
      item1Id
    );
    expect(resA.success).toBe(true);
    expect(resA.data.orderStatus).toBe(OverallOrderStatus.PREPARING);

    // Step B: Mark Item 2 READY -> Overall should automatically promote to READY
    const resB = await client.pos.updateKdsOrderStatus(
      order3Combo._id.toString(),
      ItemProductionStatus.READY,
      item2Id
    );
    expect(resB.success).toBe(true);
    expect(resB.data.orderStatus).toBe(OverallOrderStatus.READY);
    expect(resB.data.readyAt).toBeDefined();
  });

  // TEST 5: KdsHelper Urgency Categorization & Style Generation
  test('5. KdsHelper calculates elapsed minutes, urgency tiers and visual styles correctly', () => {
    const now = new Date('2026-09-30T12:00:00.000Z');

    // Case A: 5 mins ago (<10m) -> NORMAL
    const dateA = new Date('2026-09-30T11:55:00.000Z');
    const elapsedA = KdsHelper.calculateElapsedMinutes(dateA, now);
    expect(elapsedA).toBe(5);
    expect(KdsHelper.getUrgencyLevel(elapsedA)).toBe('NORMAL');
    const styleA = KdsHelper.getUrgencyStyle('NORMAL');
    expect(styleA.border).toContain('emerald');

    // Case B: 15 mins ago (10-20m) -> WARNING
    const dateB = new Date('2026-09-30T11:45:00.000Z');
    const elapsedB = KdsHelper.calculateElapsedMinutes(dateB, now);
    expect(elapsedB).toBe(15);
    expect(KdsHelper.getUrgencyLevel(elapsedB)).toBe('WARNING');
    const styleB = KdsHelper.getUrgencyStyle('WARNING');
    expect(styleB.border).toContain('amber');

    // Case C: 25 mins ago (>20m) -> CRITICAL
    const dateC = new Date('2026-09-30T11:35:00.000Z');
    const elapsedC = KdsHelper.calculateElapsedMinutes(dateC, now);
    expect(elapsedC).toBe(25);
    expect(KdsHelper.getUrgencyLevel(elapsedC)).toBe('CRITICAL');
    const styleC = KdsHelper.getUrgencyStyle('CRITICAL');
    expect(styleC.border).toContain('rose');
    expect(KdsHelper.formatElapsedTimer(elapsedC)).toBe('25m (LATE)');
  });

  // TEST 6: KdsStore State Management, Audio Chime & Real-time Action Workflow
  test('6. KdsStore triggers kitchen chime, filters by station, and executes state updates', () => {
    let chimeTones: any = null;
    const store = new KdsStore();
    store.registerChimeHandler((tones) => {
      chimeTones = tones;
    });

    const mockStations: KitchenStationModel[] = [
      { id: 'st_tandoor', stationName: 'Tandoor', isOnline: true },
      { id: 'st_curry', stationName: 'Curry', isOnline: true },
    ];
    store.setStations(mockStations);
    expect(store.getStations().length).toBe(2);

    // Dispatch new order
    const mockOrder: KdsOrderCardModel = {
      id: 'ord_101',
      orderNumber: 'ORD-101',
      orderType: 'DINE_IN',
      tableNumber: 'T-04',
      items: [
        {
          menuItemId: 'dish_1',
          name: 'Butter Roti',
          quantity: 4,
          unitPrice: 30,
          subtotal: 120,
          kitchenStationId: 'st_tandoor',
          itemStatus: 'PENDING',
        },
      ],
      orderStatus: 'PLACED',
      placedAt: new Date().toISOString(),
      elapsedMinutes: 0,
      urgencyLevel: 'NORMAL',
    };

    store.handleNewOrder(mockOrder);
    expect(store.getOrders().length).toBe(1);
    expect(chimeTones).toBe(KitchenKdsChimePattern);

    // Test Station Filtering
    store.selectStation('st_tandoor');
    expect(store.getFilteredOrders().length).toBe(1);

    store.selectStation('st_curry');
    expect(store.getFilteredOrders().length).toBe(0);

    // Reset to ALL
    store.selectStation('ALL');
    expect(store.getFilteredOrders().length).toBe(1);

    // Test Optimistic Progression
    store.markOrderPreparing('ord_101');
    expect(store.getOrders()[0].orderStatus).toBe('PREPARING');

    store.markOrderReady('ord_101');
    expect(store.getOrders()[0].orderStatus).toBe('READY');
    expect(store.getOrders()[0].readyAt).toBeDefined();

    store.markOrderServed('ord_101');
    expect(store.getOrders()[0].orderStatus).toBe('SERVED');
    expect(store.getOrders()[0].servedAt).toBeDefined();
  });
});
