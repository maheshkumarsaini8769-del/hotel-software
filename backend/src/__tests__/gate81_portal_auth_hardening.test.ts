import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Booking, BookingStatus } from '../models/Booking';
import { UserRole } from '../types';

describe('--- GATE 81: CRITICAL PORTAL AUTH & TENANT HARDENING ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let adminToken: string;
  let waiterToken: string;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOtaSecret = process.env.OTA_WEBHOOK_SECRET;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }

    const tenantA = await Tenant.create({
      name: 'Gate81 Secure Hotel',
      slug: `gate81-secure-${Date.now()}`,
      contactEmail: `gate81_a_${Date.now()}@spicehub.com`,
      contactPhone: '9877000081',
      status: 'ACTIVE',
      enabledPortals: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Gate81 Rival Hotel',
      slug: `gate81-rival-${Date.now()}`,
      contactEmail: `gate81_b_${Date.now()}@spicehub.com`,
      contactPhone: '9877000082',
      status: 'ACTIVE',
      enabledPortals: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
    });
    tenantBId = tenantB._id.toString();

    const admin = await User.create({
      hotelId: tenantA._id,
      name: 'Gate81 Admin',
      email: `gate81_admin_${Date.now()}@spicehub.com`,
      phone: '9877000083',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    const waiter = await User.create({
      hotelId: tenantA._id,
      name: 'Gate81 Waiter',
      email: `gate81_waiter_${Date.now()}@spicehub.com`,
      phone: '9877000084',
      passwordHash: 'dummy_hash',
      role: UserRole.WAITER,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET as string;

    adminToken = jwt.sign(
      {
        userId: admin._id.toString(),
        hotelId: tenantAId,
        role: UserRole.HOTEL_ADMIN,
        email: admin.email,
        permissions: ['*'],
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    waiterToken = jwt.sign(
      {
        userId: waiter._id.toString(),
        hotelId: tenantAId,
        role: UserRole.WAITER,
        email: waiter.email,
        permissions: [],
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalOtaSecret === undefined) delete process.env.OTA_WEBHOOK_SECRET;
    else process.env.OTA_WEBHOOK_SECRET = originalOtaSecret;

    await Booking.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  const enterProduction = () => {
    process.env.NODE_ENV = 'production';
    process.env.OTA_WEBHOOK_SECRET = 'gate81-ota-secret';
  };

  beforeEach(() => enterProduction());
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalOtaSecret === undefined) delete process.env.OTA_WEBHOOK_SECRET;
    else process.env.OTA_WEBHOOK_SECRET = originalOtaSecret;
  });

  it('1. Staff portal cannot be entered with only an x-hotel-id header', async () => {
    const res = await request(app)
      .get('/api/v1/dynamic-upi/status/GATE81-FAKE-REF')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  it('2. A forged guest JWT (no matching stay/session) cannot enter a staff portal', async () => {
    const forged = jwt.sign(
      {
        purpose: 'GUEST_SESSION',
        hotelId: tenantAId,
        stayId: new mongoose.Types.ObjectId().toString(),
        roomNumber: '999',
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/v1/dynamic-upi/status/GATE81-FAKE-REF')
      .set('x-guest-session-token', forged);

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  it('3. QR locker admin action rejects anonymous hotel-header callers', async () => {
    const res = await request(app)
      .post('/api/v1/qr-locker/init-table')
      .set('x-hotel-id', tenantAId)
      .send({ tableId: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  it('4. SuperAdmin branding update is not anonymously writable', async () => {
    const anonymous = await request(app)
      .put(`/api/v1/superadmin/tenants/${tenantAId}/branding`)
      .send({ name: 'Defaced Hotel' });

    expect(anonymous.status).toBe(401);

    const hotelAdmin = await request(app)
      .put(`/api/v1/superadmin/tenants/${tenantAId}/branding`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Still Secure Hotel' });

    expect(hotelAdmin.status).toBe(403);

    const tenant = await Tenant.findById(tenantAId);
    expect(tenant!.name).toBe('Gate81 Secure Hotel');
  });

  it('5. Promo code management is not anonymously writable', async () => {
    const res = await request(app)
      .post('/api/v1/crm/promos')
      .set('x-hotel-id', tenantAId)
      .send({ code: 'HACK100', discountType: 'PERCENTAGE', discountValue: 100 });

    expect(res.status).toBe(401);
  });

  it('6. Revenue and analytics reports require authentication', async () => {
    const revpar = await request(app).get(`/api/v1/analytics/revenue?hotelId=${tenantAId}`);
    expect(revpar.status).toBe(401);

    const summary = await request(app).get(`/api/v1/reports/analytics-summary?hotelId=${tenantAId}`);
    expect(summary.status).toBe(401);

    const authenticated = await request(app)
      .get('/api/v1/reports/analytics-summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(authenticated.status).toBe(200);
  });

  it('7. DPDP erasure is not anonymously executable', async () => {
    const res = await request(app)
      .delete('/api/v1/guest/erasure')
      .set('x-hotel-id', tenantAId)
      .send({ phone: '9999999999' });

    expect(res.status).toBe(401);
  });

  it('8. OTA inbound webhook rejects unsigned booking creation', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/ota/mmt')
      .send({
        hotelId: tenantAId,
        guestName: 'Fraud Guest',
        phone: '9999999999',
        roomType: 'Deluxe',
        checkIn: '2026-12-01',
        checkOut: '2026-12-02',
        amount: 100,
      });

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED_WEBHOOK');
  });

  it('9. UPI payment simulation is unavailable in production', async () => {
    const res = await request(app)
      .post('/api/v1/dynamic-upi/simulate-paid/GATE81-FAKE-REF')
      .set('Authorization', `Bearer ${waiterToken}`);

    expect(res.status).toBe(404);
  });

  it('10. Public booking-status lookup remains available without a staff token', async () => {
    const bookingNumber = `GATE81-${Date.now()}`;
    await Booking.create({
      hotelId: new mongoose.Types.ObjectId(tenantAId),
      bookingNumber,
      roomTypeId: new mongoose.Types.ObjectId(),
      guestName: 'Public Status Guest',
      guestPhone: '9877000099',
      guestEmail: 'public-status@example.com',
      checkInDate: new Date(Date.now() + 86400000),
      checkOutDate: new Date(Date.now() + 2 * 86400000),
      nights: 1,
      totalTariff: 1000,
      taxAmount: 120,
      grandTotal: 1120,
      bookingStatus: BookingStatus.CONFIRMED,
      bookingSource: 'DIRECT_PUBLIC_WEB' as any,
      bookingMode: 'OVERNIGHT' as any,
    });

    const res = await request(app).get(
      `/api/v1/guest-portal/rooms/booking-status/${bookingNumber}`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingNumber).toBe(bookingNumber);
  });
});
