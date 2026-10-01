import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { UserRole } from '../types';

describe('--- SHIFT 10 / GATE 10: SUPERADMIN SAAS MULTI-TENANT SWITCHBOARD & KILL-SWITCH ---', () => {
  let superAdminToken: string;
  let hotelAdminToken: string;
  let testTenantId: string;
  let testPlanId: string;
  let globalSocket: Socket;
  let testServerUrl: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5090;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

    // 1. Create SuperAdmin User (Global scope, no hotelId)
    const superAdmin = await User.create({
      name: 'SuperAdmin Commander',
      email: `superadmin_${Date.now()}@spicehub.cloud`,
      phone: '9999900001',
      passwordHash: 'dummy_hash',
      role: UserRole.SUPERADMIN,
      isActive: true,
    });

    superAdminToken = jwt.sign(
      {
        userId: superAdmin._id.toString(),
        role: superAdmin.role,
        email: superAdmin.email,
        permissions: ['ALL_SUPERADMIN'],
      },
      secret,
      { expiresIn: '1h' }
    );

    // 2. Create Test Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Alpine Chalet',
      slug: `chalet-${Date.now()}`,
      contactEmail: `chalet_${Date.now()}@spicehub.com`,
      contactPhone: '9888877701',
      status: 'ACTIVE',
      featureFlags: {
        pmsEnabled: true,
        kdsEnabled: true,
        qrDineInEnabled: true,
        roomServiceEnabled: true,
        banquetEnabled: true,
        loyaltyEnabled: true,
        aiInsightsEnabled: false,
        tallyExportEnabled: true,
      },
    });
    testTenantId = tenant._id.toString();

    // 3. Create Hotel Admin for this Tenant
    const hotelAdmin = await User.create({
      hotelId: tenant._id,
      name: 'Chalet General Manager',
      email: `gm_${Date.now()}@chalet.com`,
      phone: '9888877702',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    hotelAdminToken = jwt.sign(
      {
        userId: hotelAdmin._id.toString(),
        hotelId: testTenantId,
        role: hotelAdmin.role,
        email: hotelAdmin.email,
        permissions: ['HOTEL_ADMIN'],
      },
      secret,
      { expiresIn: '1h' }
    );

    // Setup a physical room for test tenant
    const roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Alpine Suite',
      code: 'ALP',
      basePriceOvernight: 6000,
      totalRoomsCount: 1,
      isActive: true,
    });

    await Room.create({
      hotelId: tenant._id,
      roomNumber: '101',
      roomTypeId: roomType._id,
      floorNumber: 1,
      wing: 'West',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'permanent_hash_101',
    });

    // Connect socket to tenant channel
    globalSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => globalSocket.on('connect', () => resolve()));
    globalSocket.emit('join_tenant_room', { hotelId: testTenantId });
  });

  afterAll(async () => {
    if (globalSocket) globalSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await Tenant.deleteMany({ _id: testTenantId });
    await User.deleteMany({ $or: [{ hotelId: testTenantId }, { role: UserRole.SUPERADMIN }] });
    await SubscriptionPlan.deleteMany({ code: 'ENTERPRISE_PLUS' });
    await RoomType.deleteMany({ hotelId: testTenantId });
    await Room.deleteMany({ hotelId: testTenantId });
    await mongoose.connection.close();
  });

  // TEST 1: SuperAdmin RBAC Security & Non-SuperAdmin Block
  test('1. Regular Hotel Admin is strictly FORBIDDEN (403) from SuperAdmin switchboard', async () => {
    const forbiddenRes = await request(app)
      .get('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.errorCode).toBe('FORBIDDEN');

    const authorizedRes = await request(app)
      .get('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(authorizedRes.status).toBe(200);
    expect(authorizedRes.body.success).toBe(true);
    expect(Array.isArray(authorizedRes.body.tenants)).toBe(true);
  });

  // TEST 2: Subscription Plan Creation & Tier Configuration
  test('2. SuperAdmin creates SaaS Enterprise Plus Subscription Plan with custom limits and feature flags', async () => {
    const planRes = await request(app)
      .post('/api/v1/superadmin/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Enterprise Plus Tier',
        code: 'ENTERPRISE_PLUS',
        monthlyPriceINR: 9999,
        annualPriceINR: 99990,
        limits: {
          maxRooms: 100,
          maxTables: 50,
          maxStaffUsers: 30,
        },
        featureFlags: {
          pmsEnabled: true,
          kdsEnabled: true,
          qrDineInEnabled: true,
          roomServiceEnabled: true,
          banquetEnabled: true,
          loyaltyEnabled: true,
          aiInsightsEnabled: true,
          tallyExportEnabled: true,
        },
      });

    expect(planRes.status).toBe(201);
    expect(planRes.body.success).toBe(true);
    expect(planRes.body.plan.code).toBe('ENTERPRISE_PLUS');
    expect(planRes.body.plan.limits.maxRooms).toBe(100);
    testPlanId = planRes.body.plan._id;
  });

  // TEST 3: Assign Subscription Plan & Synchronize Tenant Feature Flags
  test('3. Assign Enterprise Plus plan to tenant and verify feature flags synchronized', async () => {
    const assignRes = await request(app)
      .post(`/api/v1/superadmin/tenants/${testTenantId}/assign-plan`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ planId: testPlanId });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.tenant.featureFlags.aiInsightsEnabled).toBe(true);

    const updatedTenant = await Tenant.findById(testTenantId);
    expect(updatedTenant?.featureFlags.aiInsightsEnabled).toBe(true);
  });

  // TEST 4: Fine-Grained Module Feature Flag Toggle
  test('4. SuperAdmin can toggle individual feature flags on tenant directly', async () => {
    const flagRes = await request(app)
      .put(`/api/v1/superadmin/tenants/${testTenantId}/flags`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        featureFlags: {
          banquetEnabled: false,
          tallyExportEnabled: false,
        },
      });

    expect(flagRes.status).toBe(200);
    expect(flagRes.body.success).toBe(true);
    expect(flagRes.body.featureFlags.banquetEnabled).toBe(false);
    expect(flagRes.body.featureFlags.tallyExportEnabled).toBe(false);

    const updatedTenant = await Tenant.findById(testTenantId);
    expect(updatedTenant?.featureFlags.banquetEnabled).toBe(false);
  });

  // TEST 5: Normal Tenant Access Passes when Tenant is ACTIVE
  test('5. When tenant is ACTIVE, tenant operations proceed successfully', async () => {
    const testRes = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(testRes.status).toBe(200);
    expect(testRes.body.tenantVerified).toBe(true);
  });

  // TEST 6: Emergency Tenant Kill-Switch (Immediate Suspension & Socket Broadcast)
  test('6. Emergency Kill-Switch: SuperAdmin suspends delinquent tenant, dispatches socket alert, and blocks all API access immediately', async () => {
    // 6a. Listen for live kill-switch event on socket
    const killSwitchPromise = new Promise<any>((resolve) => {
      globalSocket.on('tenant:status_changed', (data) => resolve(data));
    });

    // 6b. SuperAdmin fires emergency suspension
    const suspendRes = await request(app)
      .put(`/api/v1/superadmin/tenants/${testTenantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'SUSPENDED',
        reason: 'Payment delinquency & terms of service breach',
      });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.status).toBe('SUSPENDED');

    // 6c. Verify live socket broadcast
    const socketEvent = await killSwitchPromise;
    expect(socketEvent.tenantId).toBe(testTenantId);
    expect(socketEvent.newStatus).toBe('SUSPENDED');

    // 6d. Instantaneous Enforcement: ANY subsequent tenant operation must be blocked with 403 TENANT_SUSPENDED!
    const blockedRes = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.errorCode).toBe('TENANT_SUSPENDED');

    // Blocked from Housekeeping operations
    const blockedHkRes = await request(app)
      .get('/api/v1/housekeeping/board')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(blockedHkRes.status).toBe(403);
    expect(blockedHkRes.body.errorCode).toBe('TENANT_SUSPENDED');
  });

  // TEST 7: Tenant Re-activation
  test('7. SuperAdmin re-activates tenant and normal operations resume instantly', async () => {
    const reactivateRes = await request(app)
      .put(`/api/v1/superadmin/tenants/${testTenantId}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'Account payment settled and compliance restored',
      });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.status).toBe('ACTIVE');

    // Tenant requests succeed again
    const resumedRes = await request(app)
      .get('/api/v1/tenant/verify-isolation')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(resumedRes.status).toBe(200);
    expect(resumedRes.body.tenantVerified).toBe(true);
  });

  // TEST 8: Global Multi-Tenant Cross-Property Overview Dashboard
  test('8. Global Multi-Tenant Platform Dashboard returns aggregated counts of tenants, rooms, bookings and MRR', async () => {
    const metricsRes = await request(app)
      .get('/api/v1/superadmin/metrics')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.success).toBe(true);

    const metrics = metricsRes.body.platformMetrics;
    expect(metrics.tenants.total).toBeGreaterThanOrEqual(1);
    expect(metrics.tenants.active).toBeGreaterThanOrEqual(1);
    expect(metrics.inventory.totalRooms).toBeGreaterThanOrEqual(1);
    expect(metrics.financials.estimatedMonthlyRecurringRevenueINR).toBeGreaterThan(0);
    expect(metrics.infrastructure.engineStatus).toBe('OPERATIONAL');
    expect(metrics.infrastructure.activeShiftsCompleted).toBe(10);
  });
});
