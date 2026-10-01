import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { DynamicUpiQr, UpiQrStatus } from '../models/DynamicUpiQr';

describe('--- SHIFT 42 / GATE 42: WAITER HANDHELD DYNAMIC LOCKED UPI QR & SOUNDBOX ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterAToken: string;
  let waiterBToken: string;
  let cashierAToken: string;
  let waiterAUserId: string;

  const SOUNDBOX_SECRET = 'dev_soundbox_secret_key';

  beforeAll(async () => {
    process.env.SOUNDBOX_WEBHOOK_SECRET = SOUNDBOX_SECRET;
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5129; // Dedicated Port 5129 for Gate 42 Tier 1
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    // Tenant A
    const tenantA = await Tenant.create({
      name: 'Taj Gateway Dining',
      slug: `taj-gateway-${Date.now()}`,
      contactEmail: `billing_${Date.now()}@taj.com`,
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Oberoi Dining Suite',
      slug: `oberoi-suite-${Date.now()}`,
      contactEmail: `billing_${Date.now()}@oberoi.com`,
      contactPhone: '9876543211',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // Waiter A
    const waiterA = await User.create({
      hotelId: tenantA._id,
      name: 'Suresh Kumar',
      email: `waiter_${Date.now()}@taj.com`,
      phone: '9876543212',
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
      name: 'Meena Sharma',
      email: `cashier_${Date.now()}@taj.com`,
      phone: '9876543213',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      isActive: true,
    });

    cashierAToken = jwt.sign(
      { userId: cashierA._id.toString(), hotelId: tenantAId, role: UserRole.CASHIER, name: cashierA.name },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // Waiter B (Competitor)
    const waiterB = await User.create({
      hotelId: tenantB._id,
      name: 'Rahul Varma',
      email: `waiter_${Date.now()}@oberoi.com`,
      phone: '9876543214',
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
    await DynamicUpiQr.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  let savedTransactionRef: string;
  const mockBillId = new Types.ObjectId().toString();

  it('1. POST /api/v1/dynamic-upi/generate - Waiter generates locked dynamic UPI QR for Table T-04', async () => {
    const payload = {
      billId: mockBillId,
      tableNumber: 'T-04',
      amount: 1450.5,
      expiryMinutes: 10,
    };

    const res = await request(app)
      .post('/api/v1/dynamic-upi/generate')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.qr).toBeDefined();
    expect(res.body.amount).toBe(1450.5);
    expect(res.body.transactionRef).toMatch(/^UPI_/);
    expect(res.body.upiUri).toContain('upi://pay?');
    expect(res.body.upiUri).toContain('am=1450.50');
    expect(res.body.upiUri).toContain('cu=INR');
    expect(res.body.qr.status).toBe(UpiQrStatus.PENDING);

    savedTransactionRef = res.body.transactionRef;
  });

  it('2. POST /api/v1/dynamic-upi/generate - Rejects invalid or negative payable amounts', async () => {
    const res = await request(app)
      .post('/api/v1/dynamic-upi/generate')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: mockBillId,
        tableNumber: 'T-04',
        amount: -50,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_AMOUNT');
  });

  it('3. GET /api/v1/dynamic-upi/status/:transactionRef - Returns live status with remaining seconds', async () => {
    const res = await request(app)
      .get(`/api/v1/dynamic-upi/status/${savedTransactionRef}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe(UpiQrStatus.PENDING);
    expect(res.body.amount).toBe(1450.5);
    expect(res.body.tableNumber).toBe('T-04');
    expect(res.body.timeRemainingSeconds).toBeGreaterThan(0);
    expect(res.body.isPaid).toBe(false);
  });

  it('4. GET /api/v1/dynamic-upi/active-table/:tableNumber - Confirms active pending QR on table', async () => {
    const res = await request(app)
      .get('/api/v1/dynamic-upi/active-table/T-04')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.hasActiveQr).toBe(true);
    expect(res.body.activeQr.transactionRef).toBe(savedTransactionRef);
    expect(res.body.activeQr.status).toBe(UpiQrStatus.PENDING);
  });

  it('5. POST /api/v1/dynamic-upi/soundbox-webhook - Rejects unauthorized webhook without secret', async () => {
    const res = await request(app)
      .post('/api/v1/dynamic-upi/soundbox-webhook')
      .send({
        transactionRef: savedTransactionRef,
        amount: 1450.5,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('6. POST /api/v1/dynamic-upi/soundbox-webhook - Soundbox webhook confirms payment & returns voice broadcast', async () => {
    const webhookPayload = {
      transactionRef: savedTransactionRef,
      paymentGatewayRef: 'PAYTM_RR_987654321',
      payerVpa: 'guest@icici',
      amount: 1450.5,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/api/v1/dynamic-upi/soundbox-webhook')
      .set('x-soundbox-secret', SOUNDBOX_SECRET)
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qr.status).toBe(UpiQrStatus.PAID);
    expect(res.body.qr.soundboxNotified).toBe(true);
    expect(res.body.soundboxAnnouncement).toContain('Received Rupees 1450.5 on UPI for Table T-04');
    expect(res.body.broadcastAudioPayload).toBeDefined();
    expect(res.body.broadcastAudioPayload.voiceText).toContain('Received Rupees 1450.5');

    // DB Verification
    const dbQr = await DynamicUpiQr.findOne({ transactionRef: savedTransactionRef });
    expect(dbQr?.status).toBe(UpiQrStatus.PAID);
    expect(dbQr?.paymentGatewayRef).toBe('PAYTM_RR_987654321');
  });

  it('7. POST /api/v1/dynamic-upi/soundbox-webhook - Duplicate webhook event is idempotent', async () => {
    const res = await request(app)
      .post('/api/v1/dynamic-upi/soundbox-webhook')
      .set('x-soundbox-secret', SOUNDBOX_SECRET)
      .send({
        transactionRef: savedTransactionRef,
        paymentGatewayRef: 'PAYTM_RR_987654321',
        amount: 1450.5,
        status: 'SUCCESS',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alreadyProcessed).toBe(true);
  });

  it('8. POST /api/v1/dynamic-upi/cancel/:transactionRef - Waiter cancels PENDING QR for table paying Cash', async () => {
    // Generate fresh QR on Table T-08
    const genRes = await request(app)
      .post('/api/v1/dynamic-upi/generate')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        billId: new Types.ObjectId().toString(),
        tableNumber: 'T-08',
        amount: 820.0,
      });

    const qrRefToCancel = genRes.body.transactionRef;

    const cancelRes = await request(app)
      .post(`/api/v1/dynamic-upi/cancel/${qrRefToCancel}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.qr.status).toBe(UpiQrStatus.CANCELLED);

    // Verify status endpoint reflects cancellation
    const statusRes = await request(app)
      .get(`/api/v1/dynamic-upi/status/${qrRefToCancel}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(statusRes.body.status).toBe(UpiQrStatus.CANCELLED);
  });

  it('9. POST /api/v1/dynamic-upi/cancel/:transactionRef - Rejects cancellation on already PAID QR', async () => {
    const res = await request(app)
      .post(`/api/v1/dynamic-upi/cancel/${savedTransactionRef}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('CANNOT_CANCEL');
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot cancel or tamper with Tenant A QR', async () => {
    const res = await request(app)
      .post(`/api/v1/dynamic-upi/cancel/${savedTransactionRef}`)
      .set('Authorization', `Bearer ${waiterBToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('QR_NOT_FOUND');
  });
});
