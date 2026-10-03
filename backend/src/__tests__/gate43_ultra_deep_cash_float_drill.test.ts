import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { WaiterCashFloat, WaiterFloatStatus } from '../models/WaiterCashFloat';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';

describe('--- SHIFT 43 / GATE 43 TIER 2: ULTRA-DEEP CONCURRENCY & WAITER CASH FLOAT DRILL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterAToken: string;
  let cashierTokens: string[] = [];
  let rivalCashierToken: string;
  let waiterAUserId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const tenantA = await Tenant.create({
      name: 'ITC Maurya Luxury Dining',
      slug: `itc-maurya-${Date.now()}`,
      contactEmail: `pos_${Date.now()}@itc.com`,
      contactPhone: '9833344455',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Rival Imperial Dining',
      slug: `rival-imperial-${Date.now()}`,
      contactEmail: `pos_${Date.now()}@imperial.com`,
      contactPhone: '9833344466',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // Waiter A
    const waiterA = await User.create({
      hotelId: tenantA._id,
      name: 'Ramesh Pilot Waiter',
      email: `waiter_${Date.now()}@itc.com`,
      phone: '9833344477',
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

    // 3 Concurrent Cashiers for Tenant A
    for (let i = 1; i <= 3; i++) {
      const cashier = await User.create({
        hotelId: tenantA._id,
        name: `Counter Cashier ${i}`,
        email: `cashier_${i}_${Date.now()}@itc.com`,
        phone: `983334448${i}`,
        passwordHash: 'dummy_hash',
        role: UserRole.CASHIER,
        isActive: true,
      });

      const token = jwt.sign(
        { userId: cashier._id.toString(), hotelId: tenantAId, role: UserRole.CASHIER, name: cashier.name },
        jwtSecret,
        { expiresIn: '12h' }
      );
      cashierTokens.push(token);
    }

    // Rival Cashier (Tenant B)
    const rivalCashier = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Cashier',
      email: `cashier_${Date.now()}@imperial.com`,
      phone: '9833344499',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      isActive: true,
    });

    rivalCashierToken = jwt.sign(
      { userId: rivalCashier._id.toString(), hotelId: tenantBId, role: UserRole.CASHIER, name: rivalCashier.name },
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

  let sharedFloatId: string;

  it('1. Concurrency Storm: 10 tables concurrently settle cash with a single waiter without lost float updates', async () => {
    // Open float with ₹500 opening cash
    const openRes = await request(app)
      .post('/api/v1/waiter-cash-float/open')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ openingFloat: 500 });

    sharedFloatId = openRes.body.float._id;

    // 10 concurrent table settlements: Each table bill ₹300, tendered ₹500, change ₹200 (Net cash +₹300 each)
    const settlements = Array.from({ length: 10 }, (_, i) => ({
      billId: new Types.ObjectId().toString(),
      tableNumber: `T-${i + 1}`,
      billAmount: 300,
      amountTendered: 500,
      changeGiven: 200,
    }));

    const requests = settlements.map((s) =>
      request(app)
        .post('/api/v1/waiter-cash-float/record-cash')
        .set('Authorization', `Bearer ${waiterAToken}`)
        .set('x-hotel-id', tenantAId)
        .send(s)
    );

    const responses = await Promise.all(requests);

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Mathematical verification:
    // Opening: ₹500
    // Total Collected: 10 * 500 = ₹5,000
    // Total Change Given: 10 * 200 = ₹2,000
    // Net expected cash in hand: 500 + 3,000 = ₹3,500!
    const verifiedFloat = await WaiterCashFloat.findById(sharedFloatId);
    expect(verifiedFloat?.openingFloat).toBe(500);
    expect(verifiedFloat?.totalCashCollected).toBe(5000);
    expect(verifiedFloat?.totalChangeGiven).toBe(2000);
    expect(verifiedFloat?.expectedCashInHand).toBe(3500);
    expect(verifiedFloat?.transactions.length).toBe(10);
  });

  it('2. Concurrent Cash Drop Approval Race: Multiple cashier terminals approving the same drop resolve atomically', async () => {
    // Waiter requests drop of ₹3,500
    await request(app)
      .post('/api/v1/waiter-cash-float/request-drop')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ actualCashHandedOver: 3500 });

    // 3 Cashiers concurrently try to approve the drop at the same instant
    const approvalCalls = cashierTokens.map((token) =>
      request(app)
        .post(`/api/v1/waiter-cash-float/approve-drop/${sharedFloatId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-hotel-id', tenantAId)
        .send({ confirmedCashReceived: 3500 })
    );

    const responses = await Promise.all(approvalCalls);

    // Exactly one must succeed with 200, others fail with 400 (ALREADY_SETTLED)
    const successCount = responses.filter((r) => r.status === 200).length;
    const rejectedCount = responses.filter((r) => r.status === 400 && r.body.errorCode === 'ALREADY_SETTLED').length;

    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(2);

    const finalFloat = await WaiterCashFloat.findById(sharedFloatId);
    expect(finalFloat?.status).toBe(WaiterFloatStatus.SETTLED);
    expect(finalFloat?.receiptNumber).toBeDefined();
  });

  it('3. Discrepancy & Variance Audit Drill: Accurately flags cash shortages and records reasons', async () => {
    // Open a second shift float for evening
    const openRes = await request(app)
      .post('/api/v1/waiter-cash-float/open')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ openingFloat: 1000 });

    const float2Id = openRes.body.float._id;

    // Collect ₹2,000 cash (Expected = ₹3,000)
    await request(app)
      .post('/api/v1/waiter-cash-float/record-cash')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-VIP-1',
        billAmount: 2000,
        amountTendered: 2000,
        changeGiven: 0,
      });

    // Waiter reports ₹2,800 cash (Shortage of ₹200)
    const dropRes = await request(app)
      .post('/api/v1/waiter-cash-float/request-drop')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        actualCashHandedOver: 2800,
        varianceReason: 'Customer walked off short ₹200 on bill #102',
      });

    expect(dropRes.status).toBe(200);
    expect(dropRes.body.variance).toBe(-200); // Negative variance = Shortage

    // Cashier approves with confirmed cash of ₹2,800
    const approveRes = await request(app)
      .post(`/api/v1/waiter-cash-float/approve-drop/${float2Id}`)
      .set('Authorization', `Bearer ${cashierTokens[0]}`)
      .set('x-hotel-id', tenantAId)
      .send({ confirmedCashReceived: 2800, notes: 'Manager approved ₹200 write-off from waiter tips' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.float.variance).toBe(-200);
    expect(approveRes.body.float.varianceReason).toBe('Manager approved ₹200 write-off from waiter tips');
  });

  it('4. Multi-Tenant Sabotage Defense Drill: Competitor cannot inspect or tamper with Tenant A float registers', async () => {
    const res = await request(app)
      .get('/api/v1/waiter-cash-float/history')
      .set('Authorization', `Bearer ${rivalCashierToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.floats.length).toBe(0);
    expect(res.body.summary.totalRecords).toBe(0);
    expect(res.body.summary.totalCashSettled).toBe(0);
  });
});
