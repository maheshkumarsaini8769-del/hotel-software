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
import { ServiceRequest, ServiceRequestType, RoutingLevel, ServiceRequestStatus } from '../models/ServiceRequest';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { UserRole, ShiftStatus } from '../types';

describe('--- DEEP RIGOROUS TESTING DRILL: CONCURRENCY, NETWORK DROPS, INJECTIONS & STRESS ---', () => {
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

    const uniqueSlug = `deep-stress-tenant-${Date.now()}`;
    const tenant = await Tenant.create({
      name: 'SpiceHub Deep Stress Hotel',
      slug: uniqueSlug,
      contactEmail: `stress_${Date.now()}@spicehub.com`,
      contactPhone: '9988776655',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'MAIN_HOT_KITCHEN',
      screenToken: 'station_stress_token_111',
    });

    const dish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Butter Chicken Special',
      foodType: FoodType.NON_VEG,
      basePrice: 350,
      isAvailable: true,
    });
    menuItemId = dish._id.toString();

    waiterUser = await User.create({
      hotelId: tenant._id,
      name: 'Suresh Senior Waiter',
      email: `suresh_${Date.now()}@spicehub.com`,
      phone: '9822334455',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-99',
      section: 'VIP_GARDEN',
      capacity: 6,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: waiterUser._id,
    });
    tableId = table._id.toString();

    const session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'stress_session_token_hash_99',
      status: SessionStatus.ACTIVE,
    });
    tableSessionId = session._id.toString();

    const port = 5088;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    waiterSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: `waiter_${waiterUser._id}` });
        resolve();
      });
    });

    kdsSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      kdsSocket.on('connect', () => {
        kdsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'kds' });
        resolve();
      });
    });
  }, 30000);

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
    await ServiceRequest.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Concurrency Storm - 20 Simultaneous Duplicate Orders with Same Idempotency Key
  test('DRILL 1: Concurrency Storm - 20 Simultaneous Clicks with Same Idempotency Key Result in Exactly 1 Order', async () => {
    const stormKey = `storm_idempotency_key_${Date.now()}`;
    const initialSession = await TableSession.findById(tableSessionId);
    const initialAmount = initialSession?.totalAmount || 0;

    // Fire 20 parallel requests at the exact same millisecond
    const requests = Array.from({ length: 20 }).map(() =>
      request(app)
        .post('/api/v1/pos/orders/place')
        .set('x-idempotency-key', stormKey)
        .send({
          hotelId: tenantId,
          tableSessionId,
          items: [{ menuItemId, quantity: 1 }],
          cookingInstructions: 'Concurrent storm test order',
        })
    );

    const responses = await Promise.all(requests);

    // Every response should succeed (status 200 or 201)
    responses.forEach((res) => {
      expect([200, 201]).toContain(res.status);
    });

    // Exactly one order must exist in DB with this idempotency key
    const orderCount = await RestaurantOrder.countDocuments({
      hotelId: tenantId,
      idempotencyKey: stormKey,
    });
    expect(orderCount).toBe(1);

    // Total session amount must increase by exactly 1 dish price (350), NOT 20 * 350
    const updatedSession = await TableSession.findById(tableSessionId);
    expect(updatedSession?.totalAmount).toBe(initialAmount + 350);
  }, 25000);

  // TEST 2: Network Drop & Disconnect Simulation
  test('DRILL 2: Network Drop Simulation - Waiter Disconnects and Later Reconnects Without Losing System Integrity', async () => {
    // 1. Waiter's internet cuts off
    waiterSocket.disconnect();
    expect(waiterSocket.connected).toBe(false);

    // 2. Customer triggers an urgent assistance request while waiter is disconnected
    const res = await request(app)
      .post('/api/v1/requests/create')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.ASSISTANCE,
        priority: 'URGENT',
        notes: 'Medical/Spill assistance needed',
      });

    expect(res.status).toBe(201);
    const createdRequestId = res.body.data._id;

    // Database still persists the request accurately
    const dbReq = await ServiceRequest.findById(createdRequestId);
    expect(dbReq).toBeDefined();
    expect(dbReq?.requestType).toBe(ServiceRequestType.ASSISTANCE);

    // 3. Waiter's device recovers internet and reconnects
    waiterSocket.connect();
    await new Promise<void>((resolve) => {
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: `waiter_${waiterUser._id}` });
        resolve();
      });
    });

    expect(waiterSocket.connected).toBe(true);

    // 4. Waiter queries open requests to resync after reconnect
    const openRequests = await ServiceRequest.find({
      hotelId: tenantId,
      assignedUserId: waiterUser._id,
      status: { $in: [ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.ACCEPTED] },
    });

    expect(openRequests.length).toBeGreaterThanOrEqual(1);
    const found = openRequests.some((r) => r._id.toString() === createdRequestId);
    expect(found).toBe(true);
  }, 25000);

  // TEST 3: NoSQL Injection & Malicious Payload Penetration
  test('DRILL 3: Security Penetration - NoSQL Injection Attacks Are Defended', async () => {
    // Attempt login with NoSQL injection payload: { $ne: null }
    const maliciousLogin = await request(app).post('/api/v1/auth/login').send({
      email: { $ne: 'null' },
      password: { $ne: 'null' },
    });

    // Must be rejected with 400 or 401, never allow bypass
    expect([400, 401]).toContain(maliciousLogin.status);
    expect(maliciousLogin.body.data?.token).toBeUndefined();

    // Attempt accessing table QR with invalid non-hex ObjectId
    const maliciousQR = await request(app)
      .get(`/api/v1/pos/table/qr-entry?hotelId=${tenantId}&tableId=admin' OR 1=1--`)
      .send();

    expect([400, 500]).toContain(maliciousQR.status);
    expect(maliciousQR.body.data?.sessionToken).toBeUndefined();
  }, 15000);

  // TEST 4: High-Volume Burst Load - 50 Rapid Service Requests
  test('DRILL 4: Burst Load - 50 Rapid Service Requests Processed Reliably', async () => {
    const burstPromises = Array.from({ length: 50 }).map((_, index) =>
      request(app)
        .post('/api/v1/requests/create')
        .send({
          hotelId: tenantId,
          tableId,
          tableSessionId,
          requestType: index % 2 === 0 ? ServiceRequestType.WATER : ServiceRequestType.CUTLERY,
          notes: `Burst request #${index + 1}`,
        })
    );

    const responses = await Promise.all(burstPromises);

    // Every single burst request must be handled without crash (201 Created)
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    const totalCreated = await ServiceRequest.countDocuments({
      hotelId: tenantId,
      tableSessionId,
    });
    expect(totalCreated).toBeGreaterThanOrEqual(50);
  }, 30000);

  // TEST 5: Negative Numbers & Financial Boundary Test
  test('DRILL 5: Financial Boundary - Negative Quantities & Zero-Item Orders Blocked', async () => {
    // Attempt placing order with negative quantity: -5
    const negRes = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-idempotency-key', `neg_order_${Date.now()}`)
      .send({
        hotelId: tenantId,
        tableSessionId,
        items: [{ menuItemId, quantity: -5 }],
      });

    // Mongoose schema min: 1 constraint must trigger failure
    expect([400, 500]).toContain(negRes.status);

    // Attempt placing order without any items
    const emptyRes = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-idempotency-key', `empty_order_${Date.now()}`)
      .send({
        hotelId: tenantId,
        tableSessionId,
        items: [],
      });

    expect([400, 500]).toContain(emptyRes.status);
  }, 15000);
});
