import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { UserRole, ShiftStatus, RequestType } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  WaiterStore,
  WaiterAlertChimePattern,
  ToneConfig,
  WaiterRequestLifecycle,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 13 / GATE 13: WAITER MOBILE PWA APP & LIVE CHIME SERVICE ENGINE ---', () => {
  let tenantId: string;
  let waiterUser: any;
  let waiterId: string;
  let waiterToken: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let waiterSocket: Socket;
  let tableId: string;
  let sessionId: string;
  const userPassword = 'TestPassword123!';
  const waiterEmail = `waiter_pwa_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5093;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `waiter-lounge-${Date.now()}`,
      contactEmail: `lounge_${Date.now()}@spicehub.com`,
      contactPhone: '9888833311',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Waiter User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    waiterUser = await User.create({
      hotelId: tenant._id,
      name: 'Deepak Waiter',
      email: waiterEmail,
      phone: '9888833310',
      passwordHash: hash,
      role: UserRole.WAITER,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    waiterId = waiterUser._id.toString();

    // 3. Setup Table assigned to this Waiter
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'W-1',
      section: 'AC_HALL',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: waiterUser._id,
    });
    tableId = table._id.toString();

    const session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'dummy_waiter_hash_1',
      status: SessionStatus.ACTIVE,
    });
    sessionId = session._id.toString();
    table.activeSessionId = session._id as mongoose.Types.ObjectId;
    await table.save();

    // 4. Initialize SpiceHubClient and authenticate as Waiter
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: waiterEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    waiterToken = loginRes.data.token;
    client.setAuthToken(waiterToken);

    // 5. Connect Waiter Private Socket.IO Channel
    waiterSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: `waiter_${waiterId}` });
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (waiterSocket && waiterSocket.connected) {
      waiterSocket.disconnect();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await ServiceRequest.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Waiter Shift Status Toggle
  test('1. Waiter can toggle shift status between ON_DUTY, BUSY, and OFFLINE via API', async () => {
    const busyRes = await client.requests.updateShiftStatus(ShiftStatus.BUSY);
    expect(busyRes.success).toBe(true);
    expect(busyRes.data.shiftStatus).toBe(ShiftStatus.BUSY);

    const dbUserBusy = await User.findById(waiterId);
    expect(dbUserBusy?.shiftStatus).toBe(ShiftStatus.BUSY);

    // Switch back to ON_DUTY
    const dutyRes = await client.requests.updateShiftStatus(ShiftStatus.ON_DUTY);
    expect(dutyRes.success).toBe(true);
    expect(dutyRes.data.shiftStatus).toBe(ShiftStatus.ON_DUTY);

    const dbUserDuty = await User.findById(waiterId);
    expect(dbUserDuty?.shiftStatus).toBe(ShiftStatus.ON_DUTY);
  });

  // TEST 2: Real-time Service Request Routing and Audio Chime Synthesizer Trigger
  test('2. Customer triggers service request -> routed to waiter socket & triggers audio chime pattern in WaiterStore', async () => {
    let chimeTonesReceived: ToneConfig[] | null = null;

    const store = new WaiterStore({
      userId: waiterId,
      name: 'Deepak Waiter',
      hotelId: tenantId,
      shiftStatus: ShiftStatus.ON_DUTY,
      activeRequestsCount: 0,
    });

    store.registerChimeHandler((tones) => {
      chimeTonesReceived = tones;
    });

    // Setup socket listener on waiter channel
    const socketPromise = new Promise<any>((resolve) => {
      waiterSocket.once('request:new', resolve);
    });

    // Customer places water request
    const createRes = await client.requests.create({
      hotelId: tenantId,
      tableId,
      tableSessionId: sessionId,
      requestType: RequestType.WATER,
      priority: 'HIGH',
      notes: 'Please bring cold water with lemon',
    });

    expect(createRes.success).toBe(true);

    const socketPayload = await socketPromise;
    expect(socketPayload).toBeDefined();
    expect(socketPayload.requestType).toBe(RequestType.WATER);
    expect(socketPayload.tableId).toBe(tableId);

    // Pass socket event to store
    store.handleNewRequest({
      id: socketPayload.requestId.toString(),
      requestType: socketPayload.requestType,
      status: WaiterRequestLifecycle.ASSIGNED,
      tableId: socketPayload.tableId,
      createdAt: new Date().toISOString(),
      notes: 'Please bring cold water with lemon',
    });

    // Verify audio chime triggered
    expect(chimeTonesReceived).toBeDefined();
    expect(chimeTonesReceived).toEqual(WaiterAlertChimePattern);
    expect(store.getActiveRequests().length).toBe(1);
  });

  // TEST 3: 1-Tap Acknowledge Action & Real-Time Status Broadcast
  test('3. 1-Tap Acknowledge sets request to ACCEPTED, updates DB and notifies customer & waiter socket', async () => {
    const pendingReq = await ServiceRequest.findOne({ hotelId: tenantId, status: ServiceRequestStatus.ASSIGNED });
    expect(pendingReq).toBeDefined();
    const requestId = pendingReq!._id.toString();

    const socketPromise = new Promise<any>((resolve) => {
      waiterSocket.once('request:status_updated', resolve);
    });

    const acceptRes = await client.requests.accept(requestId);
    expect(acceptRes.success).toBe(true);

    const socketEvent = await socketPromise;
    expect(socketEvent).toBeDefined();
    expect(socketEvent.status).toBe(ServiceRequestStatus.ACCEPTED);
    expect(socketEvent.assignedUserId).toBe(waiterId);

    const dbReq = await ServiceRequest.findById(requestId);
    expect(dbReq?.status).toBe(ServiceRequestStatus.ACCEPTED);
    expect(dbReq?.acceptedAt).toBeDefined();
  });

  // TEST 4: 1-Tap Fulfill Action & Completion
  test('4. 1-Tap Fulfill sets request to COMPLETED and decrements active calls count', async () => {
    const acceptedReq = await ServiceRequest.findOne({ hotelId: tenantId, status: ServiceRequestStatus.ACCEPTED });
    expect(acceptedReq).toBeDefined();
    const requestId = acceptedReq!._id.toString();

    const socketPromise = new Promise<any>((resolve) => {
      waiterSocket.once('request:status_updated', resolve);
    });

    const completeRes = await client.requests.complete(requestId);
    expect(completeRes.success).toBe(true);

    const socketEvent = await socketPromise;
    expect(socketEvent.status).toBe(ServiceRequestStatus.COMPLETED);

    const dbReq = await ServiceRequest.findById(requestId);
    expect(dbReq?.status).toBe(ServiceRequestStatus.COMPLETED);
    expect(dbReq?.completedAt).toBeDefined();
  });

  // TEST 5: Waiter Assigned Requests Directory Query
  test('5. GET /api/v1/requests/waiter/assigned returns populated table number and section details', async () => {
    // Create fresh request
    await client.requests.create({
      hotelId: tenantId,
      tableId,
      tableSessionId: sessionId,
      requestType: RequestType.BILL,
      notes: 'Split bill requested',
    });

    const assignedRes = await client.requests.getWaiterRequests();
    expect(assignedRes.success).toBe(true);
    expect(Array.isArray(assignedRes.data)).toBe(true);
    expect(assignedRes.data.length).toBeGreaterThan(0);

    const billReq = assignedRes.data.find((r) => r.requestType === RequestType.BILL);
    expect(billReq).toBeDefined();
    expect(billReq.tableNumber).toBe('W-1');
    expect(billReq.section).toBe('AC_HALL');
  });

  // TEST 6: WaiterStore Draft KOT Punching Logic
  test('6. WaiterStore manages draft KOT creation, item quantities, and subtotal calculation', () => {
    const store = new WaiterStore({
      userId: waiterId,
      name: 'Deepak Waiter',
      hotelId: tenantId,
      shiftStatus: ShiftStatus.ON_DUTY,
      activeRequestsCount: 0,
    });

    expect(store.getDraftKot()).toBeNull();

    // Initialize KOT
    store.initDraftKot(tableId, sessionId, 'W-1');
    expect(store.getDraftKot()).toBeDefined();
    expect(store.getDraftKot()?.tableNumber).toBe('W-1');

    // Add dishes
    store.addItemToKot({
      menuItemId: 'dish_1',
      name: 'Paneer Tikka',
      unitPrice: 280,
      quantity: 2,
    });

    store.addItemToKot({
      menuItemId: 'dish_2',
      name: 'Garlic Naan',
      unitPrice: 60,
      quantity: 3,
    });

    expect(store.getDraftKot()?.items.length).toBe(2);
    // 280*2 + 60*3 = 560 + 180 = 740
    expect(store.calculateDraftKotSubtotal()).toBe(740);

    // Step quantity down
    store.updateKotItemQuantity('dish_2', -1);
    expect(store.getDraftKot()?.items.find((i) => i.menuItemId === 'dish_2')?.quantity).toBe(2);
    // 280*2 + 60*2 = 560 + 120 = 680
    expect(store.calculateDraftKotSubtotal()).toBe(680);

    // Clear KOT
    store.clearDraftKot();
    expect(store.getDraftKot()).toBeNull();
  });
});
