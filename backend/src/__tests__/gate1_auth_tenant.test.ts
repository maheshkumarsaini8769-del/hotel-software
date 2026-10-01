import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';

describe('--- SHIFT 1 / GATE 1: FOUNDATION, AUTH & TENANT ISOLATION TESTS ---', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    // Clean test database collections
    await Tenant.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  let hotelAToken: string;
  let hotelBToken: string;
  let hotelAId: string;
  let hotelBId: string;

  // TEST 1: Health endpoint test
  test('1. System Health Check Endpoint Returns 200 & HEALTHY', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.multiTenancy).toBe('ENFORCED');
  });

  // TEST 2: Register Hotel A
  test('2. Register Hotel A (Grand Palace) with Admin', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      hotelName: 'Grand Palace Hotel',
      slug: 'grand-palace',
      contactEmail: 'admin@grandpalace.com',
      contactPhone: '9876543210',
      gstin: '07AAAAA0000A1Z5',
      adminName: 'Rajesh Manager',
      adminPassword: 'SuperSecurePassword@2026',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.tenant.slug).toBe('grand-palace');

    hotelAToken = res.body.data.token;
    hotelAId = res.body.data.tenant.id;
  });

  // TEST 3: Register Hotel B
  test('3. Register Hotel B (Ocean View Resort) with Admin', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      hotelName: 'Ocean View Resort',
      slug: 'ocean-view',
      contactEmail: 'admin@oceanview.com',
      contactPhone: '9123456780',
      gstin: '27BBBBB1111B1Z2',
      adminName: 'Amit Manager',
      adminPassword: 'OceanSecurePassword@2026',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.tenant.slug).toBe('ocean-view');

    hotelBToken = res.body.data.token;
    hotelBId = res.body.data.tenant.id;
  });

  // TEST 4: Duplicate Slug Prevention
  test('4. Prevent Duplicate Hotel Slug Registration (409 Conflict)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      hotelName: 'Fake Grand Palace',
      slug: 'grand-palace', // already used
      contactEmail: 'fake@grandpalace.com',
      adminPassword: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('TENANT_EXISTS');
  });

  // TEST 5: Login with Argon2 Verification
  test('5. Login Hotel A Admin Successfully with Argon2 Password Match', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@grandpalace.com',
      password: 'SuperSecurePassword@2026',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('HOTEL_ADMIN');
  });

  // TEST 6: Reject Invalid Password
  test('6. Reject Login with Invalid Password (401 Unauthorized)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@grandpalace.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
  });

  // TEST 7: Tenant Isolation Verification - Hotel A Token
  test('7. Verify Hotel A Token Resolves Hotel A Context Solely', async () => {
    const res = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', `Bearer ${hotelAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hotelId).toBe(hotelAId);
    expect(res.body.tenantVerified).toBe(true);
  });

  // TEST 8: Tenant Isolation Verification - Hotel B Token
  test('8. Verify Hotel B Token Resolves Hotel B Context Solely', async () => {
    const res = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', `Bearer ${hotelBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hotelId).toBe(hotelBId);
    expect(res.body.hotelId).not.toBe(hotelAId); // Cross-leakage strictly blocked!
  });

  // TEST 9: Unauthenticated Access Blocked
  test('9. Block Access Without Bearer Token (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/tenant/verify-isolation');
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });

  // TEST 10: Invalid/Forged Token Blocked
  test('10. Block Access with Forged / Tampered JWT (401 Invalid Token)', async () => {
    const res = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', 'Bearer forged_fake_tampered_jwt_token_123');

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });
});
