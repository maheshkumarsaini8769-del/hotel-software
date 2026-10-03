import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { WaiterCashFloat, WaiterFloatStatus } from '../models/WaiterCashFloat';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';

describe('--- SHIFT 43 / GATE 43: WAITER RUNNING CASH-IN-HAND FLOAT LEDGER & CASH DROP ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterAToken: string;
  let waiterBToken: string;
  let cashierAToken: string;
  let waiterAUserId: string;
  let cashierAUserId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const tenantA = await Tenant.create({
      name: 'Grand Hyatt Dining',
      slug: `grand-hyatt-${Date.now()}`,
      contactEmail: `cashier_${Date.now()}@hyatt.com`,
      contactPhone: '9822233344',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Rival Marriott Dining',
      slug: `rival-marriott-${Date.now()}`,
      contactEmail: `cashier_${Date.now()}@marriott.com`,
      contactPhone: '9822233355',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // Waiter A
    const waiterA = await User.create({
      hotelId: tenantA._id,
      name: 'Vikram Singh',
      email: `waiter_${Date.now()}@hyatt.com`,
      phone: '9822233366',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      isActive: true,
    });
    waiterAUserId = waiterA._id.toString();

    waiterAToken = jwt.sign(
      { userId: waiterAUserId, hotelId: tenantAId, role: UserRole.WAITER, name: waiterA.name },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // Cashier A
    const cashierA = await User.create({
      hotelId: tenantA._id,
      name: 'Pooja Hegde',
      email: `cashier_${Date.now()}@hyatt.com`,
      phone: '9822233377',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      isActive: true,
    });
    cashierAUserId = cashierA._id.toString();

    cashierAToken = jwt.sign(
      { userId: cashierAUserId, hotelId: tenantAId, role: UserRole.CASHIER, name: cashierA.name },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // Create active main cashier shift drawer (Shift 41 model) to test auto-credit
    await CashierShiftFloat.create({
      hotelId: tenantA._id,
      shiftNumber: `SHIFT_${Date.now()}`,
      cashierId: cashierA._id,
      cashierName: cashierA.name,
      shiftDate: new Date(),
      status: CashierShiftStatus.OPEN,
      openingFloat: 5000,
      totalCashCollected: 0,
      expectedCashInDrawer: 5000,
    });

    // Waiter B (Competitor)
    const waiterB = await User.create({
      hotelId: tenantB._id,
      name: 'Sunil Gavaskar',
      email: `waiter_${Date.now()}@marriott.com`,
      phone: '9822233388',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      isActive: true,
    });

    waiterBToken = jwt.sign(
      { userId: waiterB._id.toString(), hotelId: tenantBId, role: UserRole.WAITER, name: waiterB.name },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await WaiterCashFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
  });

  let savedFloatId: string;

  it('1. POST /api/v1/waiter-cash-float/open - Waiter Vikram opens daily pocket float with ₹1,000 opening change', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/open')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        openingFloat: 1000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.float.openingFloat).toBe(1000);
    expect(res.body.float.expectedCashInHand).toBe(1000);
    expect(res.body.float.status).toBe(WaiterFloatStatus.OPEN);

    savedFloatId = res.body.float._id;
  });

  it('2. POST /api/v1/waiter-cash-float/open - Idempotently returns active float if already open', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/open')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ openingFloat: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.alreadyOpen).toBe(true);
    expect(res.body.float._id).toBe(savedFloatId);
  });

  it('3. POST /api/v1/waiter-cash-float/record-cash - Records exact table cash collection (Bill ₹850, Tendered ₹850)', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/record-cash')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-03',
        billAmount: 850,
        amountTendered: 850,
        changeGiven: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.currentCashInHand).toBe(1850); // 1000 opening + 850 collected
    expect(res.body.float.totalCashCollected).toBe(850);
  });

  it('4. POST /api/v1/waiter-cash-float/record-cash - Records table cash collection with change given (Bill ₹1,200, Tendered ₹2,000, Change ₹800)', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/record-cash')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-07',
        billAmount: 1200,
        amountTendered: 2000,
        changeGiven: 800,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.currentCashInHand).toBe(3050); // 1850 + (2000 - 800) = 3050
    expect(res.body.float.totalCashCollected).toBe(2850);
    expect(res.body.float.totalChangeGiven).toBe(800);
    expect(res.body.float.transactions.length).toBe(2);
  });

  it('5. POST /api/v1/waiter-cash-float/record-cash - Rejects collection when tendered cash is less than bill amount', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/record-cash')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-09',
        billAmount: 500,
        amountTendered: 400,
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INSUFFICIENT_TENDER');
  });

  it('6. GET /api/v1/waiter-cash-float/active - Returns currently open float with running balance', async () => {
    const res = await request(app)
      .get('/api/v1/waiter-cash-float/active')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.hasActiveFloat).toBe(true);
    expect(res.body.activeFloat.expectedCashInHand).toBe(3050);
    expect(res.body.activeFloat.status).toBe(WaiterFloatStatus.OPEN);
  });

  it('7. POST /api/v1/waiter-cash-float/request-drop - Waiter initiates cash drop handover of ₹3,050 at shift end', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-cash-float/request-drop')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        actualCashHandedOver: 3050,
        varianceReason: 'Exact cash match',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.float.status).toBe(WaiterFloatStatus.DROPPED_PENDING_APPROVAL);
    expect(res.body.variance).toBe(0);
    expect(res.body.actual).toBe(3050);
  });

  it('8. POST /api/v1/waiter-cash-float/approve-drop/:floatId - Cashier approves drop, marks SETTLED, and credits Main Cashier Drawer', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-cash-float/approve-drop/${savedFloatId}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        confirmedCashReceived: 3050,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.float.status).toBe(WaiterFloatStatus.SETTLED);
    expect(res.body.receiptNumber).toMatch(/^DROP_REC_/);
    expect(res.body.handoverReceipt).toBeDefined();
    expect(res.body.handoverReceipt.actualCashReceived).toBe(3050);

    // Cross-module verification: Verify Main Cashier Drawer Float was credited with +₹3050
    const cashierDrawer = await CashierShiftFloat.findOne({ hotelId: tenantAId, status: CashierShiftStatus.OPEN });
    expect(cashierDrawer?.totalCashCollected).toBe(3050);
    expect(cashierDrawer?.expectedCashInDrawer).toBe(8050); // 5000 opening + 3050 from waiter drop
  });

  it('9. POST /api/v1/waiter-cash-float/approve-drop/:floatId - Rejects approval attempt on already settled float', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-cash-float/approve-drop/${savedFloatId}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ALREADY_SETTLED');
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot access or approve Tenant A cash floats', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-cash-float/approve-drop/${savedFloatId}`)
      .set('Authorization', `Bearer ${waiterBToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(403); // Forbidden because waiter role cannot approve drops
  });
});
