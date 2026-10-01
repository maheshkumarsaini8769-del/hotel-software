import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../models/HousekeepingTask';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../models/MaintenanceRequest';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  HousekeepingHelper,
  HousekeepingStore,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 19 / GATE 19: HOUSEKEEPING MOBILE OPERATIONS & ROOM TURNAROUND BOARD ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let room401: any;
  let room402: any;
  let room403: any;
  let stay401: any;
  let folio401: any;
  let attendantUser: any;
  let supervisorUser: any;
  let housekeepingSocket: ClientSocketType;
  let maintenanceSocket: ClientSocketType;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5099;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Palace & Spa',
      slug: `grand-palace-${Date.now()}`,
      contactEmail: `palace_${Date.now()}@spicehub.com`,
      contactPhone: '9877700022',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Staff: Attendant (Hybrid Waiter/Housekeeper) and Supervisor
    // 2. Setup Staff: Attendant and Supervisor
    const argon2 = require('argon2');
    const userPassword = 'Password123!';
    const hash = await argon2.hash(userPassword);

    attendantUser = await User.create({
      hotelId: tenant._id,
      name: 'Ramesh Attendant',
      email: `attendant_${Date.now()}@spicehub.com`,
      passwordHash: hash,
      role: UserRole.HOUSEKEEPING,
      phone: '9811122233',
    });

    const supervisorEmail = `supervisor_${Date.now()}@spicehub.com`;
    supervisorUser = await User.create({
      hotelId: tenant._id,
      name: 'Vikram Supervisor',
      email: supervisorEmail,
      passwordHash: hash,
      role: UserRole.MANAGER,
      phone: '9811122244',
    });

    // 3. Setup Room Type & Rooms
    const deluxeSuite = await RoomType.create({
      hotelId: tenant._id,
      name: 'Presidential Royal Suite',
      code: 'PRS',
      basePriceOvernight: 12000,
      baseCapacityAdults: 2,
      maxCapacity: 4,
    });

    room401 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '401',
      floorNumber: 4,
      roomTypeId: deluxeSuite._id,
      status: RoomStatus.DIRTY,
      currentPrice: 12000,
      permanentQrCodeHash: 'qr_hash_401',
    });

    room402 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '402',
      floorNumber: 4,
      roomTypeId: deluxeSuite._id,
      status: RoomStatus.DIRTY,
      currentPrice: 12000,
      permanentQrCodeHash: 'qr_hash_402',
    });

    room403 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '403',
      floorNumber: 4,
      roomTypeId: deluxeSuite._id,
      status: RoomStatus.AVAILABLE,
      currentPrice: 12000,
      permanentQrCodeHash: 'qr_hash_403',
    });

    // 4. Setup Active Stay and MasterFolio for Room 401
    const booking = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: `BK401${Date.now().toString().slice(-4)}`,
      bookingSource: 'DIRECT_PUBLIC_WEB',
      guestName: 'Aditya Singhania',
      guestPhone: '9822233344',
      guestEmail: 'aditya.s@example.com',
      roomTypeId: deluxeSuite._id,
      allocatedRoomId: room401._id,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      totalTariff: 12000,
      taxAmount: 1440,
      grandTotal: 13440,
      advancePaymentAmount: 3000,
      paymentStatus: 'PARTIAL',
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    folio401 = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: new mongoose.Types.ObjectId(),
      bookingId: booking._id,
      roomId: room401._id,
      folioNumber: `FOL-401-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 12000,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 1440,
      advancePaid: 3000,
      netAmountPayable: 13440,
      paidAmount: 3000,
      dueAmount: 10440,
      folioStatus: 'OPEN',
    });

    const dummyGuestId = new mongoose.Types.ObjectId();
    stay401 = await Stay.create({
      hotelId: tenant._id,
      bookingId: booking._id,
      guestId: dummyGuestId,
      roomId: room401._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000),
      stayStatus: StayStatus.ACTIVE,
      masterFolioId: folio401._id,
    });

    folio401.stayId = stay401._id;
    await folio401.save();

    // 5. Initialize ApiClient & Login to obtain JWT
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    const loginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: supervisorEmail, password: userPassword }),
    });
    const loginJson = (await loginRes.json()) as any;
    const token = loginJson.data?.token || loginJson.token;
    client.setAuthToken(token);
    client.setHotelId(tenantId);

    // 6. Connect Socket clients for real-time validation
    await new Promise<void>((resolve) => {
      housekeepingSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
      maintenanceSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) {
          housekeepingSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'housekeeping' });
          maintenanceSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'maintenance' });
          resolve();
        }
      };
      housekeepingSocket.on('connect', onConnect);
      maintenanceSocket.on('connect', onConnect);
    });
  }, 35000);

  afterAll(async () => {
    if (housekeepingSocket) housekeepingSocket.disconnect();
    if (maintenanceSocket) maintenanceSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
  });

  // TEST 1: Housekeeping Board Retrieval & SLA Tracking
  it('TEST 1: Should retrieve live housekeeping board with SLA metrics and summary counters', async () => {
    // Create initial task for Room 401
    const task401 = await client.housekeeping.createTask({
      roomId: room401._id.toString(),
      taskType: 'CHECKOUT_CLEAN',
      priority: 'HIGH',
      assignedAttendantId: attendantUser._id.toString(),
    });

    expect(task401.success).toBe(true);
    expect(task401.task).toBeDefined();
    expect(task401.task.roomId).toBe(room401._id.toString());

    // Fetch Board
    const boardRes = await client.housekeeping.getBoard();
    expect(boardRes.success).toBe(true);
    expect(boardRes.count).toBeGreaterThanOrEqual(3);
    expect(boardRes.summary).toBeDefined();
    expect(boardRes.summary.total).toBeGreaterThanOrEqual(3);
    expect(boardRes.summary.clean).toBeGreaterThanOrEqual(1); // Room 403

    // Find Room 401 in board
    const boardRoom401 = boardRes.board.find((r) => r.roomId === room401._id.toString());
    expect(boardRoom401).toBeDefined();
    expect(boardRoom401.status).toBe(RoomStatus.DIRTY);
    expect(boardRoom401.activeTask).toBeDefined();
    expect(boardRoom401.activeTask.assignedAttendantId._id).toBe(attendantUser._id.toString());
    expect(boardRoom401.sla).toBeDefined();
    expect(boardRoom401.sla.targetMinutes).toBe(25);
    expect(boardRoom401.guestInfo).toBeDefined();
    expect(boardRoom401.guestInfo.stayId).toBe(stay401._id.toString());
  });

  // TEST 2: Start Cleaning & Timer Transition
  it('TEST 2: Should transition room from DIRTY to CLEANING and record startedAt timestamp', async () => {
    // Find task for 401
    const task = await HousekeepingTask.findOne({ roomId: room401._id, hotelId: tenantId });
    expect(task).toBeDefined();

    const startRes = await client.housekeeping.startCleaning(task!._id.toString());
    expect(startRes.success).toBe(true);
    expect(startRes.roomStatus).toBe(RoomStatus.CLEANING);
    expect(startRes.task.status).toBe(HousekeepingTaskStatus.IN_PROGRESS);
    expect(startRes.task.startedAt).toBeDefined();

    // Verify Room model updated
    const updatedRoom = await Room.findById(room401._id);
    expect(updatedRoom?.status).toBe(RoomStatus.CLEANING);
  });

  // TEST 3: Complete Cleaning with Minibar Consumption Audit & Eco-Linen Choice
  it('TEST 3: Should complete cleaning, auto-post Minibar consumption to MasterFolio, and move room to INSPECTION', async () => {
    const task = await HousekeepingTask.findOne({ roomId: room401._id, hotelId: tenantId });

    // Attendant audits minibar: Guest consumed 2 Perrier waters (@250) + 1 Belgian Chocolate (@350) = 850
    const minibarItems = [
      { name: 'Perrier Sparkling Water', quantity: 2, rate: 250 },
      { name: 'Belgian Dark Chocolate', quantity: 1, rate: 350 },
    ];

    const completedChecklist = [
      { taskName: 'Strip bedding and replace linens', isDone: true },
      { taskName: 'Disinfect bathroom and replenish towels', isDone: true },
      { taskName: 'Dust surfaces and vacuum carpet', isDone: true },
      { taskName: 'Restock guest amenities and mini bar', isDone: true },
      { taskName: 'Sanitize high-touch surfaces', isDone: true },
    ];

    const completeRes = await client.housekeeping.completeCleaning(task!._id.toString(), {
      completedChecklist,
      minibarItems,
      linenAction: 'TUCK_IN',
      notes: 'Bed tucked in eco style, minibar restocked with fresh batch.',
    });

    expect(completeRes.success).toBe(true);
    expect(completeRes.roomStatus).toBe(RoomStatus.INSPECTION);
    expect(completeRes.minibarSummary?.totalCharged).toBe(850);
    expect(completeRes.minibarSummary?.itemsCount).toBe(2);
    expect(completeRes.linenAction).toBe('TUCK_IN');

    // Verify FolioLineItem was persisted with DepartmentType.MINIBAR
    const lineItems = await FolioLineItem.find({ folioId: folio401._id, department: DepartmentType.MINIBAR });
    expect(lineItems.length).toBe(2);
    const totalLineItems = lineItems.reduce((acc, curr) => acc + curr.netAmount, 0);
    expect(totalLineItems).toBe(850);

    // Verify MasterFolio was incremented
    const updatedFolio = await MasterFolio.findById(folio401._id);
    expect(updatedFolio?.totalPaidServices).toBe(850);
    expect(updatedFolio?.netAmountPayable).toBe(13440 + 850);
    expect(updatedFolio?.dueAmount).toBe(10440 + 850);
  });

  // TEST 4: Escalate Maintenance (Attendant reports room defect)
  it('TEST 4: Should escalate urgent maintenance, create ticket, and lock room OUT_OF_SERVICE', async () => {
    // Create task for Room 402
    const task402Res = await client.housekeeping.createTask({
      roomId: room402._id.toString(),
      taskType: 'CHECKOUT_CLEAN',
    });
    const taskId = task402Res.task._id;

    // Attendant spots broken AC
    const escalateRes = await client.housekeeping.escalateMaintenance(taskId, {
      category: 'HVAC',
      title: 'AC Compressor Tripping and Making Loud Noise',
      description: 'Room 402 AC stops cooling after 5 minutes and trips circuit breaker in master box.',
      priority: 'HIGH',
      blocksRoom: true,
    });

    expect(escalateRes.success).toBe(true);
    expect(escalateRes.roomStatus).toBe(RoomStatus.OUT_OF_SERVICE);
    expect(escalateRes.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_FAILED);
    expect(escalateRes.maintenanceTicket).toBeDefined();
    expect(escalateRes.maintenanceTicket.ticketNumber).toMatch(/^MNT-/);
    expect(escalateRes.maintenanceTicket.category).toBe('HVAC');
    expect(escalateRes.maintenanceTicket.priority).toBe('HIGH');
    expect(escalateRes.maintenanceTicket.blocksRoom).toBe(true);

    // Verify Room 402 in DB
    const room = await Room.findById(room402._id);
    expect(room?.status).toBe(RoomStatus.OUT_OF_SERVICE);

    // Verify MaintenanceRequest in DB
    const ticket = await MaintenanceRequest.findOne({ ticketNumber: escalateRes.maintenanceTicket.ticketNumber });
    expect(ticket).toBeDefined();
    expect(ticket?.roomId?.toString()).toBe(room402._id.toString());
  });

  // TEST 5: Supervisor Inspection (Pass and Reject Flow)
  it('TEST 5: Should allow supervisor to approve room 401 (AVAILABLE) and reject another (DIRTY)', async () => {
    // Room 401 is in INSPECTION state
    const task401 = await HousekeepingTask.findOne({ roomId: room401._id, hotelId: tenantId });
    expect(task401).toBeDefined();

    // 5a: Supervisor approves Room 401
    const approveRes = await client.housekeeping.inspectTask(
      task401!._id.toString(),
      true,
      'Pristine suite quality, fragrance and towels perfect. Ready for guest check-in.'
    );

    expect(approveRes.success).toBe(true);
    expect(approveRes.roomStatus).toBe(RoomStatus.AVAILABLE);
    expect(approveRes.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_PASSED);

    const roomAfterApprove = await Room.findById(room401._id);
    expect(roomAfterApprove?.status).toBe(RoomStatus.AVAILABLE);

    // 5b: Rejection scenario on a new task
    const testTask = await HousekeepingTask.create({
      hotelId: tenantId,
      roomId: room403._id,
      taskType: HousekeepingTaskType.STAYOVER_CLEAN,
      status: HousekeepingTaskStatus.COMPLETED,
      checklist: [{ taskName: 'Dusting', isDone: true }],
    });
    room403.status = RoomStatus.INSPECTION;
    await room403.save();

    const rejectRes = await client.housekeeping.inspectTask(
      testTask._id.toString(),
      false,
      'Dust found on bedside table, mirror has smudges. Please re-clean.'
    );

    expect(rejectRes.success).toBe(true);
    expect(rejectRes.roomStatus).toBe(RoomStatus.DIRTY);
    expect(rejectRes.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_FAILED);

    const roomAfterReject = await Room.findById(room403._id);
    expect(roomAfterReject?.status).toBe(RoomStatus.DIRTY);
  });

  // TEST 6: HousekeepingHelper Math & Domain Calculation Tests
  it('TEST 6: Should correctly compute SLA badges, eco-water savings, and minibar billings', () => {
    // SLA calculation: On Track
    const slaOnTrack = HousekeepingHelper.calculateSlaStatus(10, 25);
    expect(slaOnTrack.severity).toBe('ON_TRACK');

    // SLA calculation: Warning (>70% time elapsed)
    const slaWarning = HousekeepingHelper.calculateSlaStatus(19, 25);
    expect(slaWarning.severity).toBe('WARNING');

    // SLA calculation: Breached (>100% time elapsed)
    const slaBreached = HousekeepingHelper.calculateSlaStatus(30, 25);
    expect(slaBreached.severity).toBe('BREACHED');
    expect(slaBreached.label).toContain('Breached');

    // Eco Water Savings: 4 rooms with tuck-in bed tidy
    const ecoSavings = HousekeepingHelper.calculateEcoWaterSaved(4);
    expect(ecoSavings.liters).toBe(140); // 4 * 35L
    expect(ecoSavings.kwhSaved).toBe(3.2);

    // Minibar pricing math
    const items = [
      { id: '1', name: 'Water', rate: 250, quantity: 2 },
      { id: '2', name: 'Drink', rate: 300, quantity: 3 },
    ];
    const total = HousekeepingHelper.calculateMinibarTotal(items);
    expect(total).toBe(2 * 250 + 3 * 300); // 1400

    // Turnaround Progress steps
    const progDirty = HousekeepingHelper.getTurnaroundProgress(RoomStatus.DIRTY);
    expect(progDirty.percentage).toBe(25);
    const progClean = HousekeepingHelper.getTurnaroundProgress(RoomStatus.AVAILABLE);
    expect(progClean.percentage).toBe(100);
  });

  // TEST 7: HousekeepingStore Reactive State Simulation
  it('TEST 7: Should manage reactive UI state, modal workflows, minibar quantities, and filters', () => {
    const store = new HousekeepingStore();

    let notificationCount = 0;
    const unsubscribe = store.subscribe(() => {
      notificationCount++;
    });

    const mockRooms: any[] = [
      {
        roomId: 'r1',
        roomNumber: '101',
        floorNumber: 1,
        status: RoomStatus.DIRTY,
        activeTask: null,
        guestInfo: null,
        sla: { targetMinutes: 25, elapsedMinutes: 5, isBreached: false },
      },
      {
        roomId: 'r2',
        roomNumber: '201',
        floorNumber: 2,
        status: RoomStatus.AVAILABLE,
        activeTask: null,
        guestInfo: null,
        sla: { targetMinutes: 25, elapsedMinutes: 0, isBreached: false },
      },
    ];

    store.setBoardData(mockRooms);
    expect(store.getSummary().dirty).toBe(1);
    expect(store.getSummary().clean).toBe(1);
    expect(store.getFloors()).toEqual([1, 2]);

    // Floor Filter
    store.filterByFloor(2);
    expect(store.getFilteredRooms().length).toBe(1);
    expect(store.getFilteredRooms()[0].roomNumber).toBe('201');

    // Status Filter
    store.filterByFloor('ALL');
    store.filterByStatus(RoomStatus.DIRTY);
    expect(store.getFilteredRooms().length).toBe(1);
    expect(store.getFilteredRooms()[0].roomNumber).toBe('101');

    store.filterByStatus('ALL');

    // Attendant Modal Workflow
    store.openAttendantModal(mockRooms[0]);
    expect(store.isAttendantModalActive()).toBe(true);
    expect(store.getSelectedRoom()?.roomNumber).toBe('101');

    // Toggle checklist item
    expect(store.getActiveChecklist()[0].isDone).toBe(false);
    store.toggleChecklistItem(0);
    expect(store.getActiveChecklist()[0].isDone).toBe(true);

    // Update minibar
    const firstMinibar = store.getActiveMinibarAudit()[0];
    store.updateMinibarQuantity(firstMinibar.id, 2);
    expect(store.getActiveMinibarAudit()[0].quantity).toBe(2);
    expect(store.getMinibarAuditTotal()).toBe(firstMinibar.rate * 2);

    // Eco Linen selection
    store.setLinenAction('TUCK_IN');
    expect(store.getActiveLinenAction()).toBe('TUCK_IN');
    expect(store.getEcoWaterSavings().liters).toBe(35);

    store.closeAttendantModal();
    expect(store.isAttendantModalActive()).toBe(false);

    // Maintenance Modal Workflow
    store.openMaintenanceModal(mockRooms[0]);
    expect(store.isMaintenanceModalActive()).toBe(true);
    store.updateMaintenanceDraft({ title: 'Leaking pipe', category: 'PLUMBING' });
    expect(store.getMaintenanceDraft().title).toBe('Leaking pipe');
    expect(store.getMaintenanceDraft().category).toBe('PLUMBING');
    store.closeMaintenanceModal();

    expect(notificationCount).toBeGreaterThan(5);
    unsubscribe();
  });
});
