import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { DynamicUpiQr, UpiQrStatus } from '../models/DynamicUpiQr';

describe('--- SHIFT 42 / GATE 42 TIER 2: ULTRA-DEEP CONCURRENCY & DYNAMIC UPI DRILL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterTokens: string[] = [];
  let rivalToken: string;

  const SOUNDBOX_SECRET = 'dev_soundbox_secret_key';

  beforeAll(async () => {
    process.env.SOUNDBOX_WEBHOOK_SECRET = SOUNDBOX_SECRET;
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5130; // Dedicated Port 5130 for Gate 42 Tier 2
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    const tenantA = await Tenant.create({
      name: 'Leela Palace Grand Dining',
      slug: `leela-palace-${Date.now()}`,
      contactEmail: `pos_${Date.now()}@leela.com`,
      contactPhone: '9811122233',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Rival Royal Kitchen',
      slug: `rival-kitchen-${Date.now()}`,
      contactEmail: `pos_${Date.now()}@rival.com`,
      contactPhone: '9811122244',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // Spawn 5 concurrent waiters for Tenant A
    for (let i = 1; i <= 5; i++) {
      const waiter = await User.create({
        hotelId: tenantA._id,
        name: `Floor Waiter ${i}`,
        email: `waiter_${i}_${Date.now()}@leela.com`,
        phone: `981112220${i}`,
        passwordHash: 'dummy_hash',
        role: UserRole.WAITER,
        isActive: true,
      });

      const token = jwt.sign(
        { userId: waiter._id.toString(), hotelId: tenantAId, role: UserRole.WAITER, name: waiter.name },
        jwtSecret,
        { expiresIn: '12h' }
      );
      waiterTokens.push(token);
    }

    // Rival Staff
    const rival = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Intruder',
      email: `intruder_${Date.now()}@rival.com`,
      phone: '9811122299',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      isActive: true,
    });

    rivalToken = jwt.sign(
      { userId: rival._id.toString(), hotelId: tenantBId, role: UserRole.WAITER, name: rival.name },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await DynamicUpiQr.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Concurrency Storm: 10 Waiters simultaneously generate 10 dynamic locked UPI QRs across 10 tables', async () => {
    const tableOrders = Array.from({ length: 10 }, (_, i) => ({
      tableNumber: `T-${i + 1}`,
      billId: new Types.ObjectId().toString(),
      amount: 500 + (i + 1) * 75, // e.g. 575, 650, 725 ...
      waiterToken: waiterTokens[i % waiterTokens.length],
    }));

    const requests = tableOrders.map((order) =>
      request(app)
        .post('/api/v1/dynamic-upi/generate')
        .set('Authorization', `Bearer ${order.waiterToken}`)
        .set('x-hotel-id', tenantAId)
        .send({
          billId: order.billId,
          tableNumber: order.tableNumber,
          amount: order.amount,
        })
    );

    const responses = await Promise.all(requests);

    responses.forEach((res, i) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.amount).toBe(tableOrders[i].amount);
      expect(res.body.qr.tableNumber).toBe(tableOrders[i].tableNumber);
      expect(res.body.transactionRef).toBeDefined();
    });

    // Verify all 10 transaction references are strictly unique
    const txnRefs = responses.map((r) => r.body.transactionRef);
    const uniqueRefs = new Set(txnRefs);
    expect(uniqueRefs.size).toBe(10);

    // Verify DB count
    const dbCount = await DynamicUpiQr.countDocuments({ hotelId: tenantAId, status: UpiQrStatus.PENDING });
    expect(dbCount).toBe(10);
  });

  it('2. Concurrent Webhook Race: 10 simultaneous webhook callbacks for the same transaction resolve atomically', async () => {
    // Generate a fresh single QR
    const genRes = await request(app)
      .post('/api/v1/dynamic-upi/generate')
      .set('Authorization', `Bearer ${waiterTokens[0]}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-VIP-01',
        amount: 3200.0,
      });

    const targetTxnRef = genRes.body.transactionRef;

    // Fire 10 simultaneous webhooks at the exact same instant
    const webhookCalls = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v1/dynamic-upi/soundbox-webhook')
        .set('x-soundbox-secret', SOUNDBOX_SECRET)
        .send({
          transactionRef: targetTxnRef,
          paymentGatewayRef: `PG_BATCH_${i}`,
          amount: 3200.0,
          status: 'SUCCESS',
        })
    );

    const webhookResponses = await Promise.all(webhookCalls);

    // All 10 must succeed (either primary processor or idempotent handler)
    webhookResponses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Exactly one DB update must reflect PAID status
    const verifiedQr = await DynamicUpiQr.findOne({ transactionRef: targetTxnRef });
    expect(verifiedQr?.status).toBe(UpiQrStatus.PAID);
    expect(verifiedQr?.soundboxNotified).toBe(true);
    expect(verifiedQr?.soundboxAnnouncement).toContain('Received Rupees 3200 on UPI for Table T-VIP-01');
  });

  it('3. Auto-Expiry SLA Enforcement: Expired QR is marked EXPIRED and cannot be paid', async () => {
    // Manually create an expired QR in MongoDB
    const expiredTxnRef = `UPI_EXPIRED_${Date.now()}`;
    await DynamicUpiQr.create({
      hotelId: new Types.ObjectId(tenantAId),
      billId: new Types.ObjectId().toString(),
      tableNumber: 'T-99',
      waiterUserId: new Types.ObjectId(),
      waiterName: 'Test Waiter',
      amount: 990.0,
      currency: 'INR',
      merchantVpa: 'hotel@upi',
      merchantName: 'Grand Hotel',
      transactionRef: expiredTxnRef,
      upiUri: 'upi://pay?pa=hotel@upi&am=990.00',
      status: UpiQrStatus.PENDING,
      expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
      soundboxNotified: false,
    });

    // 1. Polling should auto-mark as EXPIRED
    const statusRes = await request(app)
      .get(`/api/v1/dynamic-upi/status/${expiredTxnRef}`)
      .set('Authorization', `Bearer ${waiterTokens[0]}`)
      .set('x-hotel-id', tenantAId);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe(UpiQrStatus.EXPIRED);
    expect(statusRes.body.timeRemainingSeconds).toBe(0);

    // 2. Soundbox webhook for expired QR must be rejected
    const webhookRes = await request(app)
      .post('/api/v1/dynamic-upi/soundbox-webhook')
      .set('x-soundbox-secret', SOUNDBOX_SECRET)
      .send({
        transactionRef: expiredTxnRef,
        amount: 990.0,
        status: 'SUCCESS',
      });

    expect(webhookRes.status).toBe(400);
    expect(webhookRes.body.errorCode).toBe('INVALID_TRANSACTION_STATE');
  });

  it('4. Multi-Tenant Sabotage Drill: Rival cannot discover or access Tenant A active QRs', async () => {
    const res = await request(app)
      .get('/api/v1/dynamic-upi/active-table/T-VIP-01')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.hasActiveQr).toBe(false);
    expect(res.body.activeQr).toBeNull();
  });
});
