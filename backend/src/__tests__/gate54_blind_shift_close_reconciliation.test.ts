import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { ShiftReconciliation } from '../models/ShiftReconciliation';

describe('--- SHIFT 54 / GATE 54: CASHIER BLIND SHIFT CLOSE & CASH DRAWER RECONCILIATION ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let cashierAToken: string;
  let cashierBToken: string;
  let cashierAUserId: string;
  let cashierBUserId: string;
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'Taj Gateway Resort',
      slug: `taj-gateway-${Date.now()}`,
      contactEmail: `audit-a-${Date.now()}@taj.com`,
      contactPhone: '+91 98888 11111',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Oberoi Grand Luxury',
      slug: `oberoi-grand-${Date.now()}`,
      contactEmail: `audit-b-${Date.now()}@oberoi.com`,
      contactPhone: '+91 98888 22222',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Cashier Users
    const cashierA = await User.create({
      hotelId: tenantA._id,
      name: 'Priya Sharma (Head Cashier)',
      email: `priya-cashier-${Date.now()}@taj.com`,
      phone: '+91 91111 22222',
      passwordHash: 'dummy_hash_54',
      role: UserRole.CASHIER,
      isActive: true,
    });
    cashierAUserId = cashierA._id.toString();

    const cashierB = await User.create({
      hotelId: tenantB._id,
      name: 'Amit Roy (Cashier B)',
      email: `amit-cashier-${Date.now()}@oberoi.com`,
      phone: '+91 91111 33333',
      passwordHash: 'dummy_hash_54_b',
      role: UserRole.CASHIER,
      isActive: true,
    });
    cashierBUserId = cashierB._id.toString();

    cashierAToken = jwt.sign(
      { userId: cashierAUserId, hotelId: tenantAId, role: UserRole.CASHIER, name: cashierA.name },
      jwtSecret,
      { expiresIn: '8h' }
    );

    cashierBToken = jwt.sign(
      { userId: cashierBUserId, hotelId: tenantBId, role: UserRole.CASHIER, name: cashierB.name },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // 3. Seed Cash Payments for Tenant A within current shift
    await Payment.create([
      {
        hotelId: tenantA._id,
        billId: new Types.ObjectId(),
        amount: 2000,
        paymentMode: PaymentMode.CASH,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: `idemp-cash-1-${Date.now()}`,
        createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      },
      {
        hotelId: tenantA._id,
        billId: new Types.ObjectId(),
        amount: 1500,
        paymentMode: PaymentMode.CASH,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: `idemp-cash-2-${Date.now()}`,
        createdAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
      },
      // Non-cash payment (UPI - should be excluded from drawer cash expected)
      {
        hotelId: tenantA._id,
        billId: new Types.ObjectId(),
        amount: 3200,
        paymentMode: PaymentMode.UPI,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: `idemp-upi-${Date.now()}`,
        createdAt: new Date(Date.now() - 1 * 3600000),
      },
      // Old cash payment from 3 days ago (should be excluded from current shift window)
      {
        hotelId: tenantA._id,
        billId: new Types.ObjectId(),
        amount: 5000,
        paymentMode: PaymentMode.CASH,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: `idemp-cash-old-${Date.now()}`,
        createdAt: new Date(Date.now() - 72 * 3600000),
      },
      // Tenant B cash payment (must be excluded due to multi-tenant isolation)
      {
        hotelId: tenantB._id,
        billId: new Types.ObjectId(),
        amount: 8000,
        paymentMode: PaymentMode.CASH,
        status: PaymentStatus.SUCCESS,
        idempotencyKey: `idemp-cash-b-${Date.now()}`,
        createdAt: new Date(Date.now() - 1 * 3600000),
      },
    ]);
  });

  afterAll(async () => {
    // Cleanup created test records
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ _id: { $in: [cashierAUserId, cashierBUserId] } });
    await Payment.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await ShiftReconciliation.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Security & Auth Gate
  // ---------------------------------------------------------------------------
  it('TEST 1: Security - Rejects blind close without authentication token', async () => {
    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .send({
        openingFloatCash: 1000,
        noteCounts: [{ denomination: 500, count: 2 }],
      });

    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Perfectly Balanced Blind Shift Close
  // ---------------------------------------------------------------------------
  it('TEST 2: Exact Balanced Shift - Calculates expected cash (Float 1000 + Cash 3500 = 4500) and yields BALANCED with signed certificate', async () => {
    // Expected cash: Opening Float (1000) + Cash sales (2000 + 1500) = 4500.
    // Physical count:
    // ₹2000 x 2 = ₹4000
    // ₹500 x 1 = ₹500
    // Total physical = ₹4500. Variance = 0.
    const noteCounts = [
      { denomination: 2000, count: 2 },
      { denomination: 500, count: 1 },
      { denomination: 200, count: 0 },
      { denomination: 100, count: 0 },
    ];

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        openingFloatCash: 1000,
        noteCounts,
        notes: 'Priya Sharma evening shift blind close - balanced drawer test',
        shiftStartTime: new Date(Date.now() - 12 * 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.systemExpectedCash).toBe(4500);
    expect(res.body.data.actualCountedCash).toBe(4500);
    expect(res.body.data.varianceAmount).toBe(0);
    expect(res.body.data.status).toBe('BALANCED');
    expect(res.body.data.certificateNumber).toMatch(/^CERT-SHIFT-/);

    // Verify document in MongoDB
    const savedDoc = await ShiftReconciliation.findOne({
      reconciliationCertificateNumber: res.body.data.certificateNumber,
    });
    expect(savedDoc).not.toBeNull();
    expect(savedDoc?.isBlindCloseCompleted).toBe(true);
    expect(savedDoc?.hotelId.toString()).toBe(tenantAId);
    expect(savedDoc?.cashierUserId.toString()).toBe(cashierAUserId);
    expect(savedDoc?.cashBreakdown.length).toBe(4);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Cash Shortage (Deficit) Detection
  // ---------------------------------------------------------------------------
  it('TEST 3: Shortage Audit - Accurately flags SHORTAGE when physical cash is less than expected', async () => {
    // Physical count: ₹2000 x 1 + ₹500 x 3 = ₹3500 (Expected 4500 -> Shortage of ₹1000)
    const noteCounts = [
      { denomination: 2000, count: 1 },
      { denomination: 500, count: 3 },
    ];

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        openingFloatCash: 1000,
        noteCounts,
        notes: 'Shortage test - drawer missing notes',
        shiftStartTime: new Date(Date.now() - 12 * 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.systemExpectedCash).toBe(4500);
    expect(res.body.data.actualCountedCash).toBe(3500);
    expect(res.body.data.varianceAmount).toBe(-1000);
    expect(res.body.data.status).toBe('SHORTAGE');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Cash Excess (Surplus) Detection
  // ---------------------------------------------------------------------------
  it('TEST 4: Excess Audit - Accurately flags EXCESS when physical cash exceeds expected drawer float', async () => {
    // Physical count: ₹2000 x 2 + ₹500 x 2 = ₹5000 (Expected 4500 -> Excess of ₹500)
    const noteCounts = [
      { denomination: 2000, count: 2 },
      { denomination: 500, count: 2 },
    ];

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        openingFloatCash: 1000,
        noteCounts,
        notes: 'Excess test - extra tip cash left in drawer',
        shiftStartTime: new Date(Date.now() - 12 * 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.systemExpectedCash).toBe(4500);
    expect(res.body.data.actualCountedCash).toBe(5000);
    expect(res.body.data.varianceAmount).toBe(500);
    expect(res.body.data.status).toBe('EXCESS');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Multi-Tenant Strict Isolation
  // ---------------------------------------------------------------------------
  it('TEST 5: Multi-Tenant Ledger Isolation - Tenant B cashier sees ONLY Tenant B expected cash', async () => {
    // Tenant B seeded cash payment is 8000, Opening float 500 -> Expected: 8500
    // Physical count: ₹2000 x 4 + ₹500 x 1 = ₹8500
    const noteCounts = [
      { denomination: 2000, count: 4 },
      { denomination: 500, count: 1 },
    ];

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierBToken}`)
      .send({
        openingFloatCash: 500,
        noteCounts,
        notes: 'Tenant B shift reconciliation',
        shiftStartTime: new Date(Date.now() - 12 * 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.systemExpectedCash).toBe(8500);
    expect(res.body.data.actualCountedCash).toBe(8500);
    expect(res.body.data.varianceAmount).toBe(0);
    expect(res.body.data.status).toBe('BALANCED');

    // Verify DB record belongs strictly to Tenant B
    const bDoc = await ShiftReconciliation.findOne({
      reconciliationCertificateNumber: res.body.data.certificateNumber,
    });
    expect(bDoc?.hotelId.toString()).toBe(tenantBId);
    expect(bDoc?.cashierUserId.toString()).toBe(cashierBUserId);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Denomination Breakdown Array Precision
  // ---------------------------------------------------------------------------
  it('TEST 6: Denomination Counter Precision - Stores full coin & note audit trails in MongoDB', async () => {
    const fullBreakdown = [
      { denomination: 2000, count: 1 },
      { denomination: 500, count: 2 },
      { denomination: 200, count: 5 },
      { denomination: 100, count: 10 },
      { denomination: 50, count: 4 },
      { denomination: 20, count: 5 },
      { denomination: 10, count: 10 },
      { denomination: 5, count: 20 },
      { denomination: 1, count: 50 },
    ];
    // 2000 + 1000 + 1000 + 1000 + 200 + 100 + 100 + 100 + 50 = 5550

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        openingFloatCash: 1050,
        noteCounts: fullBreakdown,
        notes: 'Full denomination array verification',
        shiftStartTime: new Date(Date.now() - 12 * 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.actualCountedCash).toBe(5550);

    const doc = await ShiftReconciliation.findOne({
      reconciliationCertificateNumber: res.body.data.certificateNumber,
    });
    expect(doc?.cashBreakdown.length).toBe(9);
    const note1Row = doc?.cashBreakdown.find((r: any) => r.denomination === 1);
    expect(note1Row?.count).toBe(50);
    expect(note1Row?.total).toBe(50);
  });
});
