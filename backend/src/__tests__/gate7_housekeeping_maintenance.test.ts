import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../models/HousekeepingTask';
import { LinenInventory, LinenItemType } from '../models/LinenInventory';
import { LostAndFound, LostAndFoundStatus, LostAndFoundCategory } from '../models/LostAndFound';
import { HotelAsset, AssetStatus, AssetCategory } from '../models/HotelAsset';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../models/MaintenanceRequest';
import { UserRole } from '../types';

describe('--- SHIFT 7 / GATE 7: HOUSEKEEPING & MAINTENANCE OPERATIONS TESTS ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let supervisorToken: string;
  let attendantToken: string;
  let technicianToken: string;
  let tenantBToken: string;
  let roomId: string;
  let attendantId: string;
  let technicianId: string;
  let attendantSocket: Socket;
  let testServerUrl: string;
  let createdTaskId: string;
  let createdAssetId: string;
  let createdTicketId: string;
  let createdLostItemId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Spin up test server for live socket event tests
    const port = 5087;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace',
      slug: `palace-${Date.now()}`,
      contactEmail: `palace_${Date.now()}@spicehub.com`,
      contactPhone: '9888877771',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (for multi-tenant isolation testing)
    const tenantB = await Tenant.create({
      name: 'Rival Hotel Resort',
      slug: `rival-${Date.now()}`,
      contactEmail: `rival_${Date.now()}@spicehub.com`,
      contactPhone: '9888877772',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Users for Tenant A
    const supervisor = await User.create({
      hotelId: tenantA._id,
      name: 'Chief Housekeeper Elena',
      email: `elena_${Date.now()}@palace.com`,
      phone: '9888877711',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const attendant = await User.create({
      hotelId: tenantA._id,
      name: 'Attendant Carlos',
      email: `carlos_${Date.now()}@palace.com`,
      phone: '9888877712',
      passwordHash: 'dummy_hash',
      role: UserRole.HOUSEKEEPING,
      isActive: true,
    });
    attendantId = attendant._id.toString();

    const technician = await User.create({
      hotelId: tenantA._id,
      name: 'Technician Dave',
      email: `dave_${Date.now()}@palace.com`,
      phone: '9888877713',
      passwordHash: 'dummy_hash',
      role: UserRole.MAINTENANCE,
      isActive: true,
    });
    technicianId = technician._id.toString();

    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Manager Bob',
      email: `bob_${Date.now()}@rival.com`,
      phone: '9888877714',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

    supervisorToken = jwt.sign(
      { userId: supervisor._id.toString(), hotelId: tenantAId, role: supervisor.role, email: supervisor.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    attendantToken = jwt.sign(
      { userId: attendantId, hotelId: tenantAId, role: attendant.role, email: attendant.email, permissions: ['HOUSEKEEPING'] },
      secret,
      { expiresIn: '1h' }
    );

    technicianToken = jwt.sign(
      { userId: technicianId, hotelId: tenantAId, role: technician.role, email: technician.email, permissions: ['MAINTENANCE'] },
      secret,
      { expiresIn: '1h' }
    );

    tenantBToken = jwt.sign(
      { userId: rivalUser._id.toString(), hotelId: tenantBId, role: rivalUser.role, email: rivalUser.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    // Setup Room Type & Room 101
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Presidential Suite',
      code: 'PRS',
      basePriceOvernight: 15000,
      totalRoomsCount: 1,
      isActive: true,
    });

    const room = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '101',
      roomTypeId: roomType._id,
      floorNumber: 1,
      wing: 'North Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'permanent_qr_hash_room_101',
    });
    roomId = room._id.toString();

    // Connect attendant live socket
    attendantSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => attendantSocket.on('connect', () => resolve()));
    attendantSocket.emit('join_tenant_room', { hotelId: `attendant_${attendantId}` });
  });

  afterAll(async () => {
    if (attendantSocket) attendantSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: tenantAId });
    await Room.deleteMany({ hotelId: tenantAId });
    await HousekeepingTask.deleteMany({ hotelId: tenantAId });
    await LinenInventory.deleteMany({ hotelId: tenantAId });
    await LostAndFound.deleteMany({ hotelId: tenantAId });
    await HotelAsset.deleteMany({ hotelId: tenantAId });
    await MaintenanceRequest.deleteMany({ hotelId: tenantAId });
    await mongoose.connection.close();
  });

  // TEST 1: Task Creation, Attendant Assignment & Real-Time Socket Notification
  test('1. Create Housekeeping Task, Room shifts to DIRTY, and Live Socket Assignment Dispatched', async () => {
    const socketEventPromise = new Promise<any>((resolve) => {
      attendantSocket.on('housekeeping:task_assigned', (data) => resolve(data));
    });

    const res = await request(app)
      .post('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        roomId,
        taskType: HousekeepingTaskType.CHECKOUT_CLEAN,
        priority: 'HIGH',
        assignedAttendantId: attendantId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.task.status).toBe(HousekeepingTaskStatus.PENDING);
    expect(res.body.task.checklist.length).toBeGreaterThan(0);
    createdTaskId = res.body.task._id;

    // Verify room status transitioned to DIRTY
    const updatedRoom = await Room.findById(roomId);
    expect(updatedRoom?.status).toBe(RoomStatus.DIRTY);

    // Verify attendant received live push event
    const socketData = await socketEventPromise;
    expect(socketData.taskId).toBe(createdTaskId);
    expect(socketData.roomNumber).toBe('101');
    expect(socketData.priority).toBe('HIGH');
  });

  // TEST 2: Attendant Cleaning Lifecycle: Start Cleaning -> Complete Cleaning -> Move to INSPECTION
  test('2. Attendant starts cleaning (Room moves to CLEANING) and completes checklist (moves to INSPECTION)', async () => {
    // 2a. Start Cleaning
    const startRes = await request(app)
      .put(`/api/v1/housekeeping/tasks/${createdTaskId}/start`)
      .set('Authorization', `Bearer ${attendantToken}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.task.status).toBe(HousekeepingTaskStatus.IN_PROGRESS);
    expect(startRes.body.roomStatus).toBe(RoomStatus.CLEANING);

    let roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.CLEANING);

    // 2b. Complete Cleaning with checklist items checked
    const completeRes = await request(app)
      .put(`/api/v1/housekeeping/tasks/${createdTaskId}/complete`)
      .set('Authorization', `Bearer ${attendantToken}`)
      .send({
        completedChecklist: [
          { taskName: 'Strip bedding and replace linens', isDone: true },
          { taskName: 'Disinfect bathroom and replenish towels', isDone: true },
          { taskName: 'Dust surfaces and vacuum carpet', isDone: true },
          { taskName: 'Restock guest amenities and mini bar', isDone: true },
          { taskName: 'Sanitize high-touch surfaces', isDone: true },
        ],
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.task.status).toBe(HousekeepingTaskStatus.COMPLETED);
    expect(completeRes.body.roomStatus).toBe(RoomStatus.INSPECTION);

    roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.INSPECTION);
  });

  // TEST 3: Supervisor Inspection: Fail (reverts room to DIRTY) vs Pass (advances room to AVAILABLE)
  test('3. Supervisor Inspection: Rejecting fails to DIRTY; Approving restores room to AVAILABLE', async () => {
    // 3a. Supervisor Fails the inspection (dust found)
    const failRes = await request(app)
      .put(`/api/v1/housekeeping/tasks/${createdTaskId}/inspect`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        isApproved: false,
        notes: 'Mirrors streaked and bathroom counter wet. Needs rework.',
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_FAILED);
    expect(failRes.body.roomStatus).toBe(RoomStatus.DIRTY);

    let roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.DIRTY);

    // 3b. Create re-clean task, fast-forward to completion
    const reTaskRes = await request(app)
      .post('/api/v1/housekeeping/tasks')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        roomId,
        taskType: HousekeepingTaskType.STAYOVER_CLEAN,
        priority: 'URGENT',
        assignedAttendantId: attendantId,
      });
    const reTaskId = reTaskRes.body.task._id;

    await request(app).put(`/api/v1/housekeeping/tasks/${reTaskId}/start`).set('Authorization', `Bearer ${attendantToken}`);
    await request(app).put(`/api/v1/housekeeping/tasks/${reTaskId}/complete`).set('Authorization', `Bearer ${attendantToken}`);

    // 3c. Supervisor Inspects and Approves
    const passRes = await request(app)
      .put(`/api/v1/housekeeping/tasks/${reTaskId}/inspect`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        isApproved: true,
        notes: 'Room pristine and fully sanitized. Ready for guest check-in.',
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_PASSED);
    expect(passRes.body.roomStatus).toBe(RoomStatus.AVAILABLE);

    roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.AVAILABLE);
  });

  // TEST 4: Housekeeping Matrix Board Overview
  test('4. Housekeeping Board Matrix provides real-time room status, floor, and attendant task', async () => {
    const res = await request(app)
      .get('/api/v1/housekeeping/board')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.board)).toBe(true);
    const room101Item = res.body.board.find((b: any) => b.roomNumber === '101');
    expect(room101Item).toBeDefined();
    expect(room101Item.floorNumber).toBe(1);
    expect(room101Item.status).toBe(RoomStatus.AVAILABLE);
  });

  // TEST 5: Comprehensive Linen Inventory Cycle & Overdraw Prevention
  test('5. Linen Inventory Lifecycle: Restock -> Issue -> Prevent Overdraw -> Laundry Cycle -> Damaged audit', async () => {
    // 5a. Initial Restock of 100 King Bedsheets
    const restockRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'RESTOCKED',
        quantity: 100,
        notes: 'Initial bulk order from textile vendor',
      });

    expect(restockRes.status).toBe(200);
    expect(restockRes.body.linen.totalStock).toBe(100);
    expect(restockRes.body.linen.availableClean).toBe(100);

    // 5b. Issue 40 Sheets to guest rooms
    const issueRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'ISSUED_TO_ROOMS',
        quantity: 40,
      });

    expect(issueRes.status).toBe(200);
    expect(issueRes.body.linen.availableClean).toBe(60);
    expect(issueRes.body.linen.inRooms).toBe(40);

    // 5c. Prevent Overdraw (Attempting to issue 70 when only 60 clean remain)
    const overdrawRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'ISSUED_TO_ROOMS',
        quantity: 70,
      });

    expect(overdrawRes.status).toBe(400);
    expect(overdrawRes.body.errorCode).toBe('INSUFFICIENT_CLEAN_STOCK');

    // 5d. Send 30 soiled sheets from rooms to laundry
    const laundryRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'SENT_TO_LAUNDRY',
        quantity: 30,
      });

    expect(laundryRes.status).toBe(200);
    expect(laundryRes.body.linen.inRooms).toBe(10);
    expect(laundryRes.body.linen.inLaundry).toBe(30);

    // 5e. Return 25 washed clean sheets from laundry
    const returnRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'RETURNED_FROM_LAUNDRY',
        quantity: 25,
      });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.linen.inLaundry).toBe(5);
    expect(returnRes.body.linen.availableClean).toBe(85);

    // 5f. Mark 3 sheets as torn / permanently damaged
    const damageRes = await request(app)
      .post('/api/v1/housekeeping/linen/transaction')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        itemType: LinenItemType.BEDSHEET_KING,
        action: 'MARKED_DAMAGED',
        quantity: 3,
        notes: 'Severe tear during wash cycle',
      });

    expect(damageRes.status).toBe(200);
    expect(damageRes.body.linen.damaged).toBe(3);
    expect(damageRes.body.linen.availableClean).toBe(82);
    expect(damageRes.body.linen.totalStock).toBe(97); // decremented damaged from total
  });

  // TEST 6: Lost & Found: Logging, Searching, Claim Verification & Anti-Double Claim
  test('6. Lost & Found: Logging valuable, Guest ID claim verification, and anti-double claim defense', async () => {
    // 6a. Attendant logs found item in Room 101
    const logRes = await request(app)
      .post('/api/v1/housekeeping/lost-and-found')
      .set('Authorization', `Bearer ${attendantToken}`)
      .send({
        description: 'Apple iPad Pro 11-inch with silver case',
        category: LostAndFoundCategory.ELECTRONICS,
        foundLocation: 'Room 101 bedside table drawer',
        roomId,
        storageLocation: 'Front Office Safe #3',
      });

    expect(logRes.status).toBe(201);
    expect(logRes.body.success).toBe(true);
    expect(logRes.body.item.trackingNumber).toMatch(/^LF-/);
    expect(logRes.body.item.status).toBe(LostAndFoundStatus.LOGGED);
    createdLostItemId = logRes.body.item._id;

    // 6b. Search items by filter
    const listRes = await request(app)
      .get('/api/v1/housekeeping/lost-and-found?category=ELECTRONICS')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);

    // 6c. Guest claims item with KYC proof
    const claimRes = await request(app)
      .put(`/api/v1/housekeeping/lost-and-found/${createdLostItemId}/claim`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        claimantName: 'Alexander Wright',
        contactNumber: '+1-555-893-2001',
        idProof: 'PASSPORT-A98765432',
        notes: 'Verified device unlock passcode matched on site',
      });

    expect(claimRes.status).toBe(200);
    expect([LostAndFoundStatus.CLAIMED, LostAndFoundStatus.CLAIMED_IN_PERSON]).toContain(claimRes.body.item.status);
    expect(claimRes.body.item.claimedBy.claimantName).toBe('Alexander Wright');

    // 6d. Prevent re-claiming already claimed item
    const doubleClaimRes = await request(app)
      .put(`/api/v1/housekeeping/lost-and-found/${createdLostItemId}/claim`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        claimantName: 'Impostor John',
        contactNumber: '+1-555-000-0000',
        idProof: 'FAKE-ID-999',
      });

    expect(doubleClaimRes.status).toBe(400);
    expect(doubleClaimRes.body.errorCode).toBe('ALREADY_CLAIMED');
  });

  // TEST 7: Asset Management, SLA Maintenance Ticket, Room Blocking & Auto-Inspection Trigger
  test('7. Asset registration, High-Priority ticket blocks room to OUT_OF_SERVICE, parts/costs logged, and room released to Housekeeping upon resolution', async () => {
    // 7a. Register HVAC Asset
    const assetRes = await request(app)
      .post('/api/v1/maintenance/assets')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        assetCode: 'HVAC-AC-101',
        name: 'Daikin 2.0 Ton Inverter AC',
        category: AssetCategory.HVAC,
        roomId,
        locationArea: 'Room 101 Master Bedroom',
        serialNumber: 'DK-2026-99881',
      });

    expect(assetRes.status).toBe(201);
    expect(assetRes.body.asset.status).toBe(AssetStatus.OPERATIONAL);
    createdAssetId = assetRes.body.asset._id;

    // 7b. Create Emergency Maintenance Ticket that BLOCKS the room
    const ticketRes = await request(app)
      .post('/api/v1/maintenance/tickets')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        title: 'AC Refrigerant Leak & Heavy Water Dripping',
        description: 'Water dripping onto carpet from indoor AC unit; compressor overheating',
        category: 'HVAC',
        priority: MaintenancePriority.HIGH, // 6h SLA
        assetId: createdAssetId,
        roomId,
        blocksRoom: true,
      });

    expect(ticketRes.status).toBe(201);
    expect(ticketRes.body.ticket.blocksRoom).toBe(true);
    expect(ticketRes.body.ticket.slaHours).toBe(6);
    createdTicketId = ticketRes.body.ticket._id;

    // Verify Room status automatically switched to OUT_OF_SERVICE!
    let roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.OUT_OF_SERVICE);

    // Verify Asset status automatically switched to NEEDS_REPAIR!
    let assetDoc = await HotelAsset.findById(createdAssetId);
    expect(assetDoc?.status).toBe(AssetStatus.NEEDS_REPAIR);

    // 7c. Assign technician & Log spare parts used
    await request(app)
      .put(`/api/v1/maintenance/tickets/${createdTicketId}/assign`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ technicianId });

    const progressRes = await request(app)
      .put(`/api/v1/maintenance/tickets/${createdTicketId}/progress`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        status: MaintenanceStatus.IN_PROGRESS,
        partsUsed: [
          { partName: 'R32 Refrigerant Gas Refill', cost: 1200, quantity: 1 },
          { partName: 'Drain Pipe Copper Joint', cost: 350, quantity: 2 },
        ],
      });

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.ticket.status).toBe(MaintenanceStatus.IN_PROGRESS);
    expect(progressRes.body.ticket.totalCost).toBe(1200 + 700); // 1900

    // 7d. Resolve ticket
    const resolveRes = await request(app)
      .put(`/api/v1/maintenance/tickets/${createdTicketId}/resolve`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        resolutionNotes: 'Replaced leaking drain joint, vacuumed coil, refilled gas to optimal PSI. Tested 16C cooling successfully.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.ticket.status).toBe(MaintenanceStatus.RESOLVED);

    // Room must now be released from OUT_OF_SERVICE to DIRTY for Housekeeping
    roomDoc = await Room.findById(roomId);
    expect(roomDoc?.status).toBe(RoomStatus.DIRTY);

    // Asset must be restored to OPERATIONAL
    assetDoc = await HotelAsset.findById(createdAssetId);
    expect(assetDoc?.status).toBe(AssetStatus.OPERATIONAL);

    // Automatic Housekeeping INSPECTION_ONLY task was created for Room 101!
    const autoHkTask = await HousekeepingTask.findOne({
      hotelId: tenantAId,
      roomId,
      taskType: HousekeepingTaskType.INSPECTION_ONLY,
    });
    expect(autoHkTask).toBeDefined();
    expect(autoHkTask?.priority).toBe('HIGH');
  });

  // TEST 8: Maintenance Dashboard & SLA Analytics
  test('8. Maintenance Dashboard accurately reports total tickets, overdue SLA, and repair costs', async () => {
    const dashRes = await request(app)
      .get('/api/v1/maintenance/dashboard')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(dashRes.body.summary.totalTickets).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.summary.totalRepairExpenses).toBe(1900);
    expect(dashRes.body.summary.resolvedCount).toBeGreaterThanOrEqual(1);
  });

  // TEST 9: Multi-Tenant Boundary Security
  test('9. Tenant Isolation: Rival Hotel Manager cannot view or modify Tenant A tasks or tickets', async () => {
    // Attempt to inspect Tenant A's task with Tenant B's token
    const crossInspectRes = await request(app)
      .put(`/api/v1/housekeeping/tasks/${createdTaskId}/inspect`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ isApproved: true });

    expect(crossInspectRes.status).toBe(404);
    expect(crossInspectRes.body.errorCode).toBe('TASK_NOT_FOUND');

    // Attempt to resolve Tenant A's maintenance ticket with Tenant B's token
    const crossTicketRes = await request(app)
      .put(`/api/v1/maintenance/tickets/${createdTicketId}/resolve`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ resolutionNotes: 'Malicious resolution' });

    expect(crossTicketRes.status).toBe(404);
    expect(crossTicketRes.body.errorCode).toBe('TICKET_NOT_FOUND');
  });
});
