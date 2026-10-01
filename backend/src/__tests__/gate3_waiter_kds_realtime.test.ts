import request from 'supertest';
import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { ServiceRequestType, RoutingLevel, ServiceRequestStatus } from '../models/ServiceRequest';
import { UserRole, ShiftStatus } from '../types';

describe('--- SHIFT 3 / GATE 3: SMART WAITER ROUTING & REAL-TIME SOCKET E2E PIPELINE ---', () => {
  let tenantId: string;
  let waiterUser: any;
  let waiterSocket: Socket;
  let kdsSocket: Socket;
  let tableId: string;
  let tableSessionId: string;
  let menuItemId: string;
  let testServerUrl: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const uniqueSlug = `spicehub-luxury-dine-${Date.now()}`;
    const tenant = await Tenant.create({
      name: 'SpiceHub Luxury Suites & Dine',
      slug: uniqueSlug,
      contactEmail: `luxury_${Date.now()}@spicehub.com`,
      contactPhone: '9988776655',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Kitchen Station
    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'CURRY_MAIN',
      screenToken: 'station_curry_token_777',
    });

    // 3. Setup Menu Dish
    const dish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Dal Makhani',
      foodType: FoodType.VEG,
      basePrice: 220,
      isAvailable: true,
    });
    menuItemId = dish._id.toString();

    // 4. Setup On-Duty Assigned Waiter
    waiterUser = await User.create({
      hotelId: tenant._id,
      name: 'Ramesh Waiter',
      email: 'ramesh.waiter@spicehub.com',
      phone: '9811223344',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    // 5. Setup Dining Table T-12 assigned to Ramesh Waiter
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-12',
      section: 'AC_HALL',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: waiterUser._id,
    });
    tableId = table._id.toString();

    // 6. Setup Active Table Session
    const session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'dummy_token_hash_t12',
      status: SessionStatus.ACTIVE,
    });
    tableSessionId = session._id.toString();

    // 7. Start HTTP Server for Real-Time Socket Tests
    const port = 5055;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Connect Virtual Waiter Socket
    waiterSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      waiterSocket.on('connect', () => {
        // Waiter joins his private notification channel
        waiterSocket.emit('join_tenant_room', { hotelId: `waiter_${waiterUser._id}` });
        resolve();
      });
    });

    // Connect Virtual Kitchen KDS Socket
    kdsSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      kdsSocket.on('connect', () => {
        // KDS joins the hotel KDS channel
        kdsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'kds' });
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (waiterSocket) waiterSocket.disconnect();
    if (kdsSocket) kdsSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await KitchenStation.deleteMany({ hotelId: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Customer triggers Water Request ➔ Live alert delivered to Waiter Socket
  test('1. Customer Triggers Water Request ➔ Delivered in Real-Time to Assigned Waiter Socket', async () => {
    let receivedWaiterEvent: any = null;

    // Set up real-time listener on virtual waiter's mobile terminal
    const eventPromise = new Promise<void>((resolve) => {
      waiterSocket.on('request:new', (payload) => {
        receivedWaiterEvent = payload;
        resolve();
      });
    });

    // Customer hits the API from Table T-12
    const res = await request(app)
      .post('/api/v1/requests/create')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.WATER,
        priority: 'NORMAL',
        notes: 'Cold water please',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.routingLevel).toBe(RoutingLevel.ASSIGNED_STAFF);
    expect(res.body.data.assignedUserId).toBe(waiterUser._id.toString());

    // Wait for the Socket.IO event to be delivered to waiter terminal
    await eventPromise;

    expect(receivedWaiterEvent).toBeDefined();
    expect(receivedWaiterEvent.requestType).toBe(ServiceRequestType.WATER);
    expect(receivedWaiterEvent.tableId).toBe(tableId);
  });

  // TEST 2: Customer places food order ➔ Delivered in Real-Time to Kitchen KDS Socket
  test('2. Customer Places Order ➔ Delivered in Real-Time to Kitchen KDS Socket with Audio Chime', async () => {
    let receivedKdsEvent: any = null;

    const kdsPromise = new Promise<void>((resolve) => {
      kdsSocket.on('order:created', (payload) => {
        receivedKdsEvent = payload;
        resolve();
      });
    });

    const res = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-idempotency-key', 'kds_realtime_order_test_key_01')
      .send({
        hotelId: tenantId,
        tableSessionId,
        items: [{ menuItemId, quantity: 1 }],
        cookingInstructions: 'Low spice for chef',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Wait for the Socket.IO event to reach KDS
    await kdsPromise;

    expect(receivedKdsEvent).toBeDefined();
    expect(receivedKdsEvent.items[0].name).toBe('Dal Makhani');
    expect(receivedKdsEvent.orderType).toBe('DINE_IN');
  });

  // TEST 3: Fallback Escalation when assigned waiter is offline
  test('3. When Staff is Unavailable ➔ Request Automatically Escalates to Admin Incident Center', async () => {
    // Put waiter into OFFLINE state
    await User.findByIdAndUpdate(waiterUser._id, { shiftStatus: ShiftStatus.OFFLINE });

    let adminAlarmReceived: any = null;

    // Connect temporary Admin Socket to test the RED ALARM
    const adminSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      adminSocket.on('connect', () => {
        adminSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'admin' });
        resolve();
      });
    });

    const adminPromise = new Promise<void>((resolve) => {
      adminSocket.on('request:escalated', (payload) => {
        adminAlarmReceived = payload;
        resolve();
      });
    });

    const res = await request(app)
      .post('/api/v1/requests/create')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.CALL_WAITER,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.routingLevel).toBe(RoutingLevel.ADMIN_ESCALATION);
    expect(res.body.data.status).toBe(ServiceRequestStatus.ESCALATED_FALLBACK);

    await adminPromise;
    expect(adminAlarmReceived).toBeDefined();
    expect(adminAlarmReceived.message).toContain('IMMEDIATE SUPERVISOR ATTENTION REQUIRED');

    adminSocket.disconnect();
  });
});
