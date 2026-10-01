import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import {
  StaffShiftRoster,
  ShiftType,
  StaffDepartment,
  RosterStatus,
} from '../models/StaffShiftRoster';
import {
  StaffAttendanceLog,
  AttendanceStatus,
} from '../models/StaffAttendanceLog';
import {
  TipPoolSession,
  TipPoolStatus,
} from '../models/TipPoolSession';
import { UserRole } from '../types';

describe('--- SHIFT 29 / GATE 29: STAFF SHIFT ROSTER, ATTENDANCE & TIP POOL DISTRIBUTION ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let hrManagerToken: string;
  let waiterToken: string;
  let rivalToken: string;
  let waiterUserId: string;
  let chefUserId: string;
  let tipSessionId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5109;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'The Leela Palace Bangalore',
      slug: `leela-palace-${Date.now()}`,
      contactEmail: `leela_hr_${Date.now()}@spicehub.com`,
      contactPhone: '9899900001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Heritage Hotel',
      slug: `rival-heritage-${Date.now()}`,
      contactEmail: `rival_hr_${Date.now()}@spicehub.com`,
      contactPhone: '9899900002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. HR Manager User for Tenant A
    const hrManager = await User.create({
      hotelId: tenantA._id,
      name: 'HR Director Anita Roy',
      email: `hr_${Date.now()}@leela.com`,
      phone: '9899900003',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    hrManagerToken = jwt.sign(
      {
        userId: hrManager._id.toString(),
        hotelId: tenantAId,
        role: UserRole.HOTEL_ADMIN,
        email: hrManager.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Staff Member: Waiter (FOH)
    const waiter = await User.create({
      hotelId: tenantA._id,
      name: 'Rohan Joshi',
      email: `rohan_${Date.now()}@leela.com`,
      phone: '9899900004',
      passwordHash: 'dummy_hash',
      pinCodeHash: '1234', // PIN for attendance terminal
      role: UserRole.WAITER,
      isActive: true,
    });
    waiterUserId = waiter._id.toString();

    waiterToken = jwt.sign(
      {
        userId: waiterUserId,
        hotelId: tenantAId,
        role: UserRole.WAITER,
        email: waiter.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Staff Member: Chef (BOH)
    const chef = await User.create({
      hotelId: tenantA._id,
      name: 'Chef Vikas Khanna',
      email: `vikas_${Date.now()}@leela.com`,
      phone: '9899900005',
      passwordHash: 'dummy_hash',
      pinCodeHash: '5678', // PIN
      role: UserRole.CHEF,
      isActive: true,
    });
    chefUserId = chef._id.toString();

    // 6. Competitor User for Tenant B
    const rival = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Ops Manager',
      email: `ops_${Date.now()}@rival.com`,
      phone: '9899900006',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    rivalToken = jwt.sign(
      {
        userId: rival._id.toString(),
        hotelId: tenantBId,
        role: UserRole.MANAGER,
        email: rival.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await StaffShiftRoster.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await StaffAttendanceLog.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await TipPoolSession.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. POST /api/v1/staff-roster/schedules: Bulk schedule shift rosters for FOH & BOH staff', async () => {
    const startTime = Date.now();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const payload = {
      schedules: [
        {
          userId: waiterUserId,
          staffName: 'Rohan Joshi',
          department: StaffDepartment.FRONT_OF_HOUSE_SERVICE,
          shiftDate: todayStr,
          shiftType: ShiftType.MORNING_OPENING,
          plannedStartTime: '08:00',
          plannedEndTime: '16:30',
          plannedHours: 8.5,
          notes: 'Main Dining Floor Captain Area A',
        },
        {
          userId: chefUserId,
          staffName: 'Chef Vikas Khanna',
          department: StaffDepartment.KITCHEN_CULINARY,
          shiftDate: todayStr,
          shiftType: ShiftType.EVENING_DINNER,
          plannedStartTime: '15:00',
          plannedEndTime: '23:30',
          plannedHours: 8.5,
          notes: 'Hot Line Pan-Asian Station',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/staff-roster/schedules')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] POST Bulk Shift Roster Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.schedules.length).toBe(2);
    expect(res.body.schedules[0].status).toBe(RosterStatus.SCHEDULED);
    expect(res.body.schedules[0].department).toBe(StaffDepartment.FRONT_OF_HOUSE_SERVICE);
  });

  // TEST 2
  it('2. GET /api/v1/staff-roster/schedules: Retrieve scheduled shifts with department filter', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/staff-roster/schedules')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .query({ department: StaffDepartment.FRONT_OF_HOUSE_SERVICE });

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] GET Filtered Roster Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.schedules.length).toBe(1);
    expect(res.body.schedules[0].staffName).toBe('Rohan Joshi');
  });

  // TEST 3
  it('3. POST /api/v1/staff-roster/attendance/clock-in: Staff member clocks in via PIN terminal', async () => {
    const startTime = Date.now();

    const payload = {
      staffPin: '1234',
    };

    const res = await request(app)
      .post('/api/v1/staff-roster/attendance/clock-in')
      .set('Authorization', `Bearer ${waiterToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] POST PIN Clock-In Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.log.staffName).toBe('Rohan Joshi');
    expect(res.body.log.department).toBe(StaffDepartment.FRONT_OF_HOUSE_SERVICE);
    expect(res.body.log.clockInTime).toBeDefined();

    // Roster should now be marked ACTIVE
    const updatedRoster = await StaffShiftRoster.findOne({ userId: waiterUserId });
    expect(updatedRoster?.status).toBe(RosterStatus.ACTIVE);
  });

  // TEST 4
  it('4. POST /api/v1/staff-roster/attendance/clock-in: Prevent duplicate clock-in while on active shift', async () => {
    const res = await request(app)
      .post('/api/v1/staff-roster/attendance/clock-in')
      .set('Authorization', `Bearer ${waiterToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ staffPin: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ALREADY_CLOCKED_IN');
  });

  // TEST 5
  it('5. POST /api/v1/staff-roster/attendance/clock-out: Staff clocks out and calculates hours worked', async () => {
    const startTime = Date.now();

    // Simulate clock-in was 8.5 hours ago to test hours calculation
    const eightHoursAgo = new Date(Date.now() - 8.5 * 60 * 60 * 1000);
    await StaffAttendanceLog.updateOne(
      { userId: new mongoose.Types.ObjectId(waiterUserId), clockOutTime: { $exists: false } },
      { clockInTime: eightHoursAgo }
    );

    const res = await request(app)
      .post('/api/v1/staff-roster/attendance/clock-out')
      .set('Authorization', `Bearer ${waiterToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ userId: waiterUserId });

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] POST Clock-Out Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.log.clockOutTime).toBeDefined();
    expect(res.body.log.totalHoursWorked).toBeCloseTo(8.5, 0.5);
    expect(res.body.log.overtimeMinutes).toBeGreaterThanOrEqual(30);

    // Roster should now be COMPLETED
    const roster = await StaffShiftRoster.findOne({ userId: waiterUserId });
    expect(roster?.status).toBe(RosterStatus.COMPLETED);
  });

  // TEST 6
  it('6. GET /api/v1/staff-roster/attendance/logs: Retrieve attendance audit logs with KPIs', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/staff-roster/attendance/logs')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-hotel-id', tenantAId);

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] GET Attendance Logs Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.metrics.totalLogsCount).toBe(1);
    expect(res.body.metrics.completedShiftsCount).toBe(1);
    expect(res.body.metrics.totalHoursLogged).toBeGreaterThan(0);
  });

  // TEST 7
  it('7. POST /api/v1/staff-roster/tips/sessions: Generate Daily Tip Pool with 60% FOH / 40% BOH hours-weighted split', async () => {
    const startTime = Date.now();

    // Pool of ₹10,000
    // FOH (60%) = ₹6,000. Waiter 1 (8h) + Waiter 2 (4h) = 12h. Rate = 6000/12 = 500/hr.
    // Waiter 1 receives: 8 * 500 = ₹4,000. Waiter 2 receives: 4 * 500 = ₹2,000.
    // BOH (40%) = ₹4,000. Chef 1 (8h) = 8h. Rate = 4000/8 = 500/hr.
    // Chef 1 receives: 8 * 500 = ₹4,000.
    const payload = {
      totalTipsCollected: 10000,
      fohPercentage: 60,
      bohPercentage: 40,
      notes: 'Saturday Banquet & Dining Room Gratuity',
      customStaffHours: [
        {
          userId: waiterUserId,
          staffName: 'Rohan Joshi (FOH Captain)',
          department: StaffDepartment.FRONT_OF_HOUSE_SERVICE,
          hoursWorked: 8,
        },
        {
          userId: new mongoose.Types.ObjectId(),
          staffName: 'Pooja Sharma (FOH Steward)',
          department: StaffDepartment.FRONT_OF_HOUSE_SERVICE,
          hoursWorked: 4,
        },
        {
          userId: chefUserId,
          staffName: 'Chef Vikas Khanna (BOH)',
          department: StaffDepartment.KITCHEN_CULINARY,
          hoursWorked: 8,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/staff-roster/tips/sessions')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] POST Tip Pool Session Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.session.totalTipsCollected).toBe(10000);
    expect(res.body.session.fohPoolAmount).toBe(6000);
    expect(res.body.session.bohPoolAmount).toBe(4000);
    expect(res.body.session.payouts.length).toBe(3);

    // Verify mathematical split
    const waiter1 = res.body.session.payouts.find((p: any) => p.staffName.includes('Rohan'));
    expect(waiter1.tipShareAmount).toBe(4000);

    const waiter2 = res.body.session.payouts.find((p: any) => p.staffName.includes('Pooja'));
    expect(waiter2.tipShareAmount).toBe(2000);

    const chef1 = res.body.session.payouts.find((p: any) => p.staffName.includes('Vikas'));
    expect(chef1.tipShareAmount).toBe(4000);

    tipSessionId = res.body.session._id;
  });

  // TEST 8
  it('8. PATCH /api/v1/staff-roster/tips/sessions/:sessionId/approve: General Manager approves tip disbursement', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .patch(`/api/v1/staff-roster/tips/sessions/${tipSessionId}/approve`)
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({});

    const latency = Date.now() - startTime;
    console.log(`[Gate 29 Deep Network Test] PATCH Approve Tip Pool Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe(TipPoolStatus.APPROVED);
    expect(res.body.session.payouts[0].payoutStatus).toBe('APPROVED');
  });

  // TEST 9
  it('9. Strict Multi-Tenant Isolation: Competitor cannot view rosters, clock staff, or access tip pools', async () => {
    // Competitor attempts to view Tenant A's rosters
    const schedRes = await request(app)
      .get('/api/v1/staff-roster/schedules')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(schedRes.status).toBe(200);
    expect(schedRes.body.schedules.length).toBe(0);

    // Competitor attempts to approve Tenant A's tip pool
    const approveRes = await request(app)
      .patch(`/api/v1/staff-roster/tips/sessions/${tipSessionId}/approve`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId)
      .send({});

    expect(approveRes.status).toBe(404);
    expect(approveRes.body.success).toBe(false);
    expect(approveRes.body.errorCode).toBe('SESSION_NOT_FOUND');
  });
});
