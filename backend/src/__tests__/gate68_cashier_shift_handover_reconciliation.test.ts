import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { CashierShiftFloat, CashierShiftStatus, ShiftType, DiscrepancyStatus } from '../models/CashierShiftFloat';
import { UserRole } from '../types';

describe('Gate #68: Front Desk Cashier Shift Handover, Float Balancing & Physical Cash Drawer Reconciliation', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let cashierAId: Types.ObjectId;
  let incomingCashierAId: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  const jwtSecret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace Luxury',
      slug: `grand-palace-68a-${Date.now()}`,
      contactEmail: `hotel_68a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199380',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Suites',
      slug: `rival-68b-${Date.now()}`,
      contactEmail: `rival_68b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199381',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    cashierAId = new Types.ObjectId();
    incomingCashierAId = new Types.ObjectId();

    tokenA = jwt.sign(
      {
        userId: cashierAId.toString(),
        hotelId: hotelIdA.toString(),
        role: UserRole.HOTEL_ADMIN,
        name: 'Morning Receptionist Ananya',
        email: 'ananya@spicehubgrand.com',
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    tokenB = jwt.sign(
      {
        userId: new Types.ObjectId().toString(),
        hotelId: hotelIdB.toString(),
        role: UserRole.HOTEL_ADMIN,
        name: 'Rival Receptionist Vikram',
        email: 'vikram@rivalsuites.com',
      },
      jwtSecret,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  // TEST 1: Open Cashier Shift with float and shiftType
  it('1. POST /api/v1/pms/cashier/shift/open - Successfully opens a front desk cashier shift with float', async () => {
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/open')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        openingFloat: 5000,
        shiftType: ShiftType.MORNING,
        terminalId: 'FD_COUNTER_01',
        cashierId: cashierAId,
        cashierName: 'Morning Receptionist Ananya',
        notes: 'Opening morning shift with standard ₹5,000 drawer float.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.shiftNumber).toMatch(/^FD-SFT-/);
    expect(res.body.data.openingFloat).toBe(5000);
    expect(res.body.data.expectedCashInDrawer).toBe(5000);
    expect(res.body.data.status).toBe(CashierShiftStatus.OPEN);
    expect(res.body.data.terminalId).toBe('FD_COUNTER_01');
  });

  // TEST 2: Idempotent open shift
  it('2. POST /api/v1/pms/cashier/shift/open - Idempotently returns existing active shift if already open', async () => {
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/open')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        openingFloat: 5000,
        shiftType: ShiftType.MORNING,
        terminalId: 'FD_COUNTER_01',
        cashierId: cashierAId,
        cashierName: 'Morning Receptionist Ananya',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Active cashier shift already open');
    expect(res.body.data.status).toBe(CashierShiftStatus.OPEN);
  });

  // TEST 3: Active Shift Inspection
  it('3. GET /api/v1/pms/cashier/shift/active - Retrieves current open cashier shift with live drawer status', async () => {
    const res = await request(app)
      .get('/api/v1/pms/cashier/shift/active?terminalId=FD_COUNTER_01')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe(CashierShiftStatus.OPEN);
    expect(res.body.data.cashierName).toBe('Morning Receptionist Ananya');
    expect(res.body.data.expectedCashInDrawer).toBe(5000);
  });

  // TEST 4: Reconcile Physical Denominations (Exact Match)
  it('4. POST /api/v1/pms/cashier/shift/reconcile - Calculates physical denomination tally and checks exact balance', async () => {
    const activeShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.OPEN });
    expect(activeShift).toBeDefined();

    // Drawer has expected 5000:
    // Physical count: 6x ₹500 (3000) + 6x ₹200 (1200) + 5x ₹100 (500) + 5x ₹50 (250) + 2x ₹20 (40) + 1x ₹10 (10) = 5000
    // Allocation: Safe Drop 0, Retained Float 5000
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/reconcile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: activeShift!._id,
        denominationBreakdown: {
          count500: 6,
          count200: 6,
          count100: 5,
          count50: 5,
          count20: 2,
          count10: 1,
          coins: 0,
        },
        safeDropAmount: 0,
        closingFloatRetained: 5000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.actualCashCounted).toBe(5000);
    expect(res.body.data.cashVariance).toBe(0);
    expect(res.body.data.discrepancyStatus).toBe(DiscrepancyStatus.NONE);
    expect(res.body.data.supervisorPinRequired).toBe(false);
  });

  // TEST 5: Allocation Mismatch Rejection
  it('5. POST /api/v1/pms/cashier/shift/reconcile - Rejects when safe drop + retained float != total counted cash', async () => {
    const activeShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.OPEN });

    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/reconcile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: activeShift!._id,
        denominationBreakdown: {
          count500: 10, // 5000
          count200: 0,
          count100: 0,
          count50: 0,
          count20: 0,
          count10: 0,
          coins: 0,
        },
        safeDropAmount: 2000,
        closingFloatRetained: 2000, // Total 4000 != 5000 counted
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ALLOCATION_MISMATCH');
    expect(res.body.message).toContain('Allocation mismatch');
  });

  // TEST 6: Discrepancy Reason Requirement
  it('6. POST /api/v1/pms/cashier/shift/reconcile - Rejects with 400 when variance != 0 and no reason is documented', async () => {
    const activeShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.OPEN });

    // Counted 4980 (₹20 shortage from expected 5000)
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/reconcile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: activeShift!._id,
        denominationBreakdown: {
          count500: 9, // 4500
          count200: 2, // 400
          count100: 0,
          count50: 1, // 50
          count20: 1, // 20
          count10: 1, // 10
          coins: 0,    // Total = 4980
        },
        safeDropAmount: 0,
        closingFloatRetained: 4980,
        // No discrepancyReason provided!
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('MISSING_DISCREPANCY_REASON');
    expect(res.body.message).toContain('documented explanation');
  });

  // TEST 7: Supervisor PIN Enforcement for High Variance or Safe Drop
  it('7. POST /api/v1/pms/cashier/shift/reconcile - Enforces supervisor PIN when variance > 100 and rejects invalid PIN', async () => {
    const activeShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.OPEN });

    // Counted 4800 (₹200 shortage from 5000), safe drop 0, retained 4800
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/reconcile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: activeShift!._id,
        denominationBreakdown: {
          count500: 8, // 4000
          count200: 4, // 800
          count100: 0,
          count50: 0,
          count20: 0,
          count10: 0,
          coins: 0, // Total = 4800
        },
        safeDropAmount: 0,
        closingFloatRetained: 4800,
        discrepancyReason: 'Guest walked out without paying ₹200 room minibar cash charge',
        supervisorPin: '0000', // Invalid PIN
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('INVALID_SUPERVISOR_PIN');
  });

  // TEST 8: Successful Handover with Safe Drop and Retained Float
  it('8. POST /api/v1/pms/cashier/shift/handover - Closes shift, records safe drop receipt, and hands over to incoming cashier', async () => {
    const activeShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.OPEN });

    // Assume cash collected during shift = 15,000 (total in drawer = 20,000)
    activeShift!.expectedCashInDrawer = 20000;
    activeShift!.totalCashCollected = 15000;
    await activeShift!.save();

    // Physical count: 40x ₹500 = 20,000
    // Allocation: Safe Drop ₹15,000 (safe envelope DROP-20261006-001) + Retained Float ₹5,000 for next shift
    // Safe drop > 5000 so supervisor PIN 9921 is required
    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/handover')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: activeShift!._id,
        denominationBreakdown: {
          count500: 40, // 20000
          count200: 0,
          count100: 0,
          count50: 0,
          count20: 0,
          count10: 0,
          coins: 0,
        },
        safeDropAmount: 15000,
        closingFloatRetained: 5000,
        safeDropReceiptNumber: 'DROP-20261006-001',
        handoverToCashierId: incomingCashierAId,
        handoverToCashierName: 'Evening Receptionist Rohan',
        supervisorPin: '9921',
        supervisorRemarks: 'Safe drop envelope ₹15,000 verified and dropped into main treasury safe',
        notes: 'Handover complete. Drawer baseline float ₹5,000 retained.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(CashierShiftStatus.CLOSED);
    expect(res.body.data.safeDropAmount).toBe(15000);
    expect(res.body.data.safeDropReceiptNumber).toBe('DROP-20261006-001');
    expect(res.body.data.closingFloatRetained).toBe(5000);
    expect(res.body.data.handoverToCashierName).toBe('Evening Receptionist Rohan');
    expect(res.body.data.supervisorVerified).toBe(true);
    expect(res.body.data.cashVariance).toBe(0);
  });

  // TEST 9: Incoming Cashier Acknowledges Handover & Auto-Opens Next Shift
  it('9. POST /api/v1/pms/cashier/shift/acknowledge-handover - Incoming cashier acknowledges drawer float and auto-opens evening shift', async () => {
    const closedShift = await CashierShiftFloat.findOne({ hotelId: hotelIdA, status: CashierShiftStatus.CLOSED });

    const res = await request(app)
      .post('/api/v1/pms/cashier/shift/acknowledge-handover')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shiftId: closedShift!._id,
        acknowledgedByCashierId: incomingCashierAId,
        acknowledgedByCashierName: 'Evening Receptionist Rohan',
        autoOpenNextShift: true,
        nextShiftType: ShiftType.EVENING,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.previousShift.incomingCashierAcknowledged).toBe(true);
    expect(res.body.data.nextShift).toBeDefined();
    expect(res.body.data.nextShift.openingFloat).toBe(5000); // Inherited retained float!
    expect(res.body.data.nextShift.status).toBe(CashierShiftStatus.OPEN);
    expect(res.body.data.nextShift.shiftType).toBe(ShiftType.EVENING);
    expect(res.body.data.nextShift.cashierName).toBe('Evening Receptionist Rohan');
  });

  // TEST 10: Cashier Shift History & Multi-Tenant Isolation
  it('10. GET /api/v1/pms/cashier/shift/history - Enforces tenant isolation and returns shift audit summaries', async () => {
    // Hotel A History
    const resA = await request(app)
      .get('/api/v1/pms/cashier/shift/history')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data.shifts.length).toBeGreaterThanOrEqual(2);
    expect(resA.body.data.summary.totalSafeDropped).toBe(15000);
    expect(resA.body.data.summary.totalClosedShifts).toBe(1);

    // Hotel B (Rival) should see 0 shifts
    const resB = await request(app)
      .get('/api/v1/pms/cashier/shift/history')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data.shifts.length).toBe(0);
    expect(resB.body.data.summary.totalSafeDropped).toBe(0);
  });
});
