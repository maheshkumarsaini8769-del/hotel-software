import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { User } from '../models/User';
import { UserRole } from '../types';

describe('Gate #62: Housekeeping Turnaround Execution, Room Inspection Checklist & Instant Ready Status Pipeline', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let attendantUser: any;
  let roomTypeA: any;
  let room102: any;
  let room103: any;
  let activeStayId: string = '';
  let activeFolioId: string = '';
  let turnaroundTaskId: string = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A (SpiceHub Luxury Palace)
    const tenantA = await Tenant.create({
      name: 'SpiceHub Luxury Palace & Spa',
      slug: `luxury-turnaround-a-${Date.now()}`,
      contactEmail: `hotel_turnaround_a_${Date.now()}@spicehub.in`,
      contactPhone: '9811188220',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Heritage Hotel',
      slug: `rival-turnaround-b-${Date.now()}`,
      contactEmail: `rival_turnaround_b_${Date.now()}@spicehub.in`,
      contactPhone: '9811188221',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    // 3. Create Housekeeping Attendant Staff for Tenant A
    attendantUser = await User.create({
      hotelId: hotelIdA,
      name: 'Sunita Sharma (Executive Attendant)',
      email: `sunita_${Date.now()}@spicehub.in`,
      phone: '9876543210',
      role: UserRole.HOUSEKEEPING,
      passwordHash: 'dummy_hash_for_testing',
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    tokenA = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdA.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );
    tokenB = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdB.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );

    // 4. Create Room Type & Physical Rooms for Tenant A
    roomTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Royal Heritage Deluxe',
      code: 'RHD',
      slug: `rhd-${Date.now()}`,
      basePriceOvernight: 6500,
      maxOccupancyAdults: 3,
      amenities: ['Wi-Fi 6', '4K Smart TV', 'Italian Marble Bath', 'Minibar'],
    });

    room102 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '102',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_room_102_turnaround',
    });

    room103 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '103',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.DIRTY,
      permanentQrCodeHash: 'qr_hash_room_103_turnaround',
    });

    // 5. Check-In Room 102 & then perform departure checkout to spawn Checkout Clean task
    const checkInRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomId: room102._id.toString(),
        guestName: 'Arjun Verma & Ananya Verma',
        guestPhone: '9812345678',
        guestEmail: 'arjun.verma@spicehub.in',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '9988-7766-5544',
        verifiedByReceptionist: true,
        advancePaid: 3000,
      });

    expect(checkInRes.status).toBe(201);
    activeStayId = checkInRes.body.data.stayId;
    activeFolioId = checkInRes.body.data.folioId;

    // Settle & Check out Room 102 (Shift 61 Departure)
    const checkoutRes = await request(app)
      .post('/api/v1/pms/frontdesk/settle-and-checkout')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        roomNumber: '102',
        paymentMode: 'UPI',
        transactionRef: 'UPI-TURNAROUND-SETUP-01',
        isKeycardReturned: true,
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.data.roomStatus).toBe(RoomStatus.DIRTY);
    turnaroundTaskId = checkoutRes.body.data.housekeepingTaskId;
    expect(turnaroundTaskId).toBeDefined();
  });

  afterAll(async () => {
    await HousekeepingTask.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Stay.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await RoomType.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await User.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
    await mongoose.connection.close();
  });

  // TEST 1: Turnaround Queue Hydration
  it('1. Fetch Housekeeping Turnaround Queue - Returns Room 102 with 30-min SLA & 6-Point Checklist Template', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/turnaround-queue')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.totalPending).toBeGreaterThanOrEqual(1);

    const task102 = res.body.data.find((item: any) => item.room?.roomNumber === '102');
    expect(task102).toBeDefined();
    expect(task102.room.status).toBe(RoomStatus.DIRTY);
    expect(task102.taskType).toBe(HousekeepingTaskType.CHECKOUT_CLEAN);
    expect(task102.priority).toBe('HIGH');
    expect(task102.status).toBe(HousekeepingTaskStatus.PENDING);
    expect(task102.slaTargetMinutes).toBe(30);
    expect(task102.slaRemainingMinutes).toBeLessThanOrEqual(30);
    expect(task102.checklist.length).toBeGreaterThanOrEqual(5);
  });

  // TEST 2: Assign Attendant & Transition to CLEANING
  it('2. Assign Attendant to Room 102 - Transitions Task to IN_PROGRESS & Room to CLEANING', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/assign-attendant')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        taskId: turnaroundTaskId,
        attendantId: attendantUser._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('102');
    expect(res.body.data.roomStatus).toBe(RoomStatus.CLEANING);
    expect(res.body.data.taskStatus).toBe(HousekeepingTaskStatus.IN_PROGRESS);
    expect(res.body.data.assignedAttendant.name).toContain('Sunita Sharma');

    // Verify DB State
    const updatedRoom = await Room.findById(room102._id);
    expect(updatedRoom?.status).toBe(RoomStatus.CLEANING);

    const updatedTask = await HousekeepingTask.findById(turnaroundTaskId);
    expect(updatedTask?.status).toBe(HousekeepingTaskStatus.IN_PROGRESS);
    expect(updatedTask?.startedAt).toBeDefined();
  });

  // TEST 3: Attendant Completes 6-Point Inspection Checklist
  it('3. Submit 6-Point Inspection Checklist - Advances Task to COMPLETED & Room to INSPECTION', async () => {
    const customChecklist = [
      { taskName: 'Strip & sanitize bed linens, duvet and pillows', isDone: true },
      { taskName: 'Deep scrub bathroom, disinfect fixtures & restock luxury toiletries', isDone: true },
      { taskName: 'Vacuum carpet & sanitize all touch surfaces (remotes, switches)', isDone: true },
      { taskName: 'Audit & replenish minibar, glassware and complimentary bottled water', isDone: true },
      { taskName: 'Inspect electricals, AC thermostat and TV connectivity', isDone: true },
      { taskName: 'Verify RFID keycard reader & seal room with door safety band', isDone: true },
    ];

    const res = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/submit-checklist')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        taskId: turnaroundTaskId,
        checklist: customChecklist,
        attendantNotes: 'Deep turnaround completed thoroughly. All 6 points verified and sealed.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('102');
    expect(res.body.data.roomStatus).toBe(RoomStatus.INSPECTION);
    expect(res.body.data.taskStatus).toBe(HousekeepingTaskStatus.COMPLETED);
    expect(res.body.data.checklist.every((c: any) => c.isDone)).toBe(true);
    expect(res.body.data.completedAt).toBeDefined();

    // Verify DB State
    const updatedRoom = await Room.findById(room102._id);
    expect(updatedRoom?.status).toBe(RoomStatus.INSPECTION);
  });

  // TEST 4: Supervisor 1-Tap "Instant Ready" Approval & Release to AVAILABLE
  it('4. Supervisor 1-Tap Instant Ready Approval - Releases Room 102 to AVAILABLE and logs turnaround SLA', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/approve-ready')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        taskId: turnaroundTaskId,
        supervisorNotes: 'Executive Housekeeper inspected: Pristine luxury standard certified.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('102');
    expect(res.body.data.roomStatus).toBe(RoomStatus.AVAILABLE);
    expect(res.body.data.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_PASSED);
    expect(res.body.data.turnaroundMinutes).toBeGreaterThanOrEqual(1);

    // Verify DB State: Room 102 must be AVAILABLE and currentStayId detached
    const releasedRoom = await Room.findById(room102._id);
    expect(releasedRoom?.status).toBe(RoomStatus.AVAILABLE);
    expect(releasedRoom?.currentStayId).toBeUndefined();

    // Verify Room 102 now appears in Front Desk Available Rooms pool
    const availableRes = await request(app)
      .get('/api/v1/pms/frontdesk/available-rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(availableRes.status).toBe(200);
    const available102 = availableRes.body.data.find((r: any) => r.roomNumber === '102');
    expect(available102).toBeDefined();
    expect(available102.status).toBe(RoomStatus.AVAILABLE);
  });

  // TEST 5: Supervisor Re-Clean Quality Failure Flow
  it('5. Supervisor Rejection / Quality Check Failure - Reverts Room to DIRTY for re-cleaning', async () => {
    // Create task for Room 103
    const task103 = await HousekeepingTask.create({
      hotelId: hotelIdA,
      roomId: room103._id,
      taskType: HousekeepingTaskType.CHECKOUT_CLEAN,
      priority: 'HIGH',
      status: HousekeepingTaskStatus.COMPLETED,
      checklist: [{ taskName: 'General clean', isDone: true }],
    });

    const res = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/reject-reclean')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        taskId: task103._id.toString(),
        rejectionReason: 'Bathroom mirror smudged and extra towel omitted.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomStatus).toBe(RoomStatus.DIRTY);
    expect(res.body.data.taskStatus).toBe(HousekeepingTaskStatus.INSPECTED_FAILED);
    expect(res.body.data.rejectionReason).toContain('Bathroom mirror smudged');

    // Verify DB State
    const updatedRoom103 = await Room.findById(room103._id);
    expect(updatedRoom103?.status).toBe(RoomStatus.DIRTY);
  });

  // TEST 6: Multi-Tenant Security & Tenant Isolation
  it('6. Strict Multi-Tenant Isolation - Tenant B cannot query or approve Tenant A turnaround tasks', async () => {
    // Tenant B attempts to fetch turnaround queue of Tenant A
    const resQueue = await request(app)
      .get('/api/v1/pms/frontdesk/turnaround-queue')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString());

    expect(resQueue.status).toBe(200);
    // Tenant B queue should NOT contain Tenant A's Room 102
    const leakedItem = resQueue.body.data.find((item: any) => item.room?.roomNumber === '102');
    expect(leakedItem).toBeUndefined();

    // Tenant B attempts to approve Tenant A's task
    const resApprove = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/approve-ready')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString())
      .send({
        taskId: turnaroundTaskId,
        supervisorNotes: 'Malicious unauthorized inspection attempt',
      });

    expect(resApprove.status).toBe(404);
    expect(resApprove.body.errorCode).toBe('TASK_NOT_FOUND');
  });

  // TEST 7: Idempotency & Conflict Safety on Already Released Room
  it('7. Idempotency & Double Approval Protection - Re-approving already released task safely returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/turnaround/approve-ready')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        taskId: turnaroundTaskId,
        supervisorNotes: 'Duplicate release attempt',
      });

    // Already marked INSPECTED_PASSED so no longer in [COMPLETED, IN_PROGRESS]
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('TASK_NOT_FOUND');
  });
});
