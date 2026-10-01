import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import {
  NotificationPreference,
  AlertCategory,
  NotificationChannel,
} from '../models/NotificationPreference';
import { AdminAlertEvent, AlertSeverity, AlertEventStatus } from '../models/AdminAlertEvent';

describe('--- SHIFT 45 / GATE 45 TIER 2: ULTRA-DEEP CONCURRENCY & ADMIN CONTROL DRILL ---', () => {
  let server: http.Server;
  const port = 5136; // Dedicated Port 5136 for Gate 45 Tier 2

  let tenantAId: string;
  let tenantBId: string;
  let gmToken: string;
  let fnbToken: string;
  let accountantToken: string;
  let tenantBToken: string;

  let gmUser: any;
  let fnbUser: any;
  let accountantUser: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenants
    const tenantA = await Tenant.create({
      name: 'SpiceHub Royal Palace A',
      slug: `royal-palace-drill-a-${Date.now()}`,
      contactEmail: `admin-drill-a-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 00001',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Rival Resort B',
      slug: `rival-resort-drill-b-${Date.now()}`,
      contactEmail: `admin-drill-b-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 00002',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create 3 Distinct Role Users in Tenant A
    gmUser = await User.create({
      hotelId: tenantA._id,
      name: 'Rajesh Sharma (GM)',
      email: `rajesh-gm-${Date.now()}@spicehub.com`,
      phone: '+91 97777 00003',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    gmToken = jwt.sign(
      { userId: gmUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantAId, email: gmUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    fnbUser = await User.create({
      hotelId: tenantA._id,
      name: 'Chef Sanjeev (F&B Director)',
      email: `sanjeev-fnb-${Date.now()}@spicehub.com`,
      phone: '+91 97777 00004',
      passwordHash: 'hashed_pw',
      role: UserRole.MANAGER,
      permissions: ['KITCHEN', 'RESTAURANT'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    fnbToken = jwt.sign(
      { userId: fnbUser._id.toString(), role: UserRole.MANAGER, hotelId: tenantAId, email: fnbUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    accountantUser = await User.create({
      hotelId: tenantA._id,
      name: 'Sunita Rao (Head Accountant)',
      email: `sunita-acc-${Date.now()}@spicehub.com`,
      phone: '+91 97777 00005',
      passwordHash: 'hashed_pw',
      role: UserRole.MANAGER,
      permissions: ['BILLING', 'ACCOUNTS'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    accountantToken = jwt.sign(
      { userId: accountantUser._id.toString(), role: UserRole.MANAGER, hotelId: tenantAId, email: accountantUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Tenant B Admin User
    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Admin B',
      email: `rival-b-${Date.now()}@rival.com`,
      phone: '+91 97777 00006',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    tenantBToken = jwt.sign(
      { userId: rivalUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantBId, email: rivalUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Configure Granular Notification Subscriptions for the 3 Users
    // GM: Subscribed to ALL categories
    await NotificationPreference.create({
      hotelId: tenantA._id,
      userId: gmUser._id,
      role: 'HOTEL_ADMIN',
      subscriptions: [
        {
          category: AlertCategory.LARGE_TRANSACTION,
          enabled: true,
          minThreshold: 1000,
          channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX],
          soundChime: true,
          urgentVibration: false,
        },
        {
          category: AlertCategory.KITCHEN_DELAY,
          enabled: true,
          minThreshold: 10,
          channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX],
          soundChime: true,
          urgentVibration: true,
        },
      ],
      isActive: true,
    });

    // F&B Director: Subscribed ONLY to KITCHEN_DELAY
    await NotificationPreference.create({
      hotelId: tenantA._id,
      userId: fnbUser._id,
      role: 'FNB_MANAGER',
      subscriptions: [
        {
          category: AlertCategory.KITCHEN_DELAY,
          enabled: true,
          minThreshold: 10,
          channels: [NotificationChannel.IN_APP, NotificationChannel.DESKTOP_POPUP],
          soundChime: true,
          urgentVibration: true,
        },
      ],
      isActive: true,
    });

    // Accountant: Subscribed ONLY to LARGE_TRANSACTION
    await NotificationPreference.create({
      hotelId: tenantA._id,
      userId: accountantUser._id,
      role: 'ACCOUNTANT',
      subscriptions: [
        {
          category: AlertCategory.LARGE_TRANSACTION,
          enabled: true,
          minThreshold: 2000,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          soundChime: true,
          urgentVibration: false,
        },
      ],
      isActive: true,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await NotificationPreference.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await AdminAlertEvent.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. High-Concurrency Alert Ingestion Storm: 20 concurrent alerts dispatched without drops or race conditions', async () => {
    const promises = Array.from({ length: 20 }).map((_, idx) =>
      request(server)
        .post('/api/v1/admin-control/dispatch-alert')
        .set('Authorization', `Bearer ${gmToken}`)
        .send({
          category: AlertCategory.KITCHEN_DELAY,
          severity: AlertSeverity.WARNING,
          title: `Concurrent Alert #${idx + 1}`,
          message: `Station ${idx + 1} reporting ticket prep delay`,
          payload: { delayMinutes: 15, stationId: `STATION_${idx + 1}` },
        })
    );

    const results = await Promise.all(promises);
    expect(results.every((r) => r.status === 201)).toBe(true);

    // Verify exactly 20 alert events stored in DB
    const count = await AdminAlertEvent.countDocuments({ hotelId: new Types.ObjectId(tenantAId) });
    expect(count).toBe(20);
  });

  it('2. Multi-Role Routing Matrix: KITCHEN_DELAY notifies GM and F&B Director, but Accountant is omitted', async () => {
    const res = await request(server)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({
        category: AlertCategory.KITCHEN_DELAY,
        severity: AlertSeverity.CRITICAL,
        title: 'Tandoor Station Delayed',
        message: 'Order #404 delayed by 25 minutes',
        payload: { delayMinutes: 25 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.notifiedUsersCount).toBe(2);

    const notifiedIds = res.body.alert.notifiedUserIds.map((id: any) => id.toString());
    expect(notifiedIds).toContain(gmUser._id.toString());
    expect(notifiedIds).toContain(fnbUser._id.toString());
    expect(notifiedIds).not.toContain(accountantUser._id.toString());
  });

  it('3. Multi-Role Routing Matrix: LARGE_TRANSACTION notifies GM and Accountant, but F&B Director is omitted', async () => {
    const res = await request(server)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({
        category: AlertCategory.LARGE_TRANSACTION,
        severity: AlertSeverity.INFO,
        title: 'Large Corporate Invoice Settled',
        message: 'Corporate bill of ₹15,000 paid via NEFT',
        payload: { amount: 15000 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.notifiedUsersCount).toBe(2);

    const notifiedIds = res.body.alert.notifiedUserIds.map((id: any) => id.toString());
    expect(notifiedIds).toContain(gmUser._id.toString());
    expect(notifiedIds).toContain(accountantUser._id.toString());
    expect(notifiedIds).not.toContain(fnbUser._id.toString());
  });

  it('4. Concurrent Acknowledge Race: 5 concurrent managers acknowledging the same alert resolve with exactly 1 success and 4 rejected', async () => {
    // 1. Create a fresh single alert
    const createRes = await request(server)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({
        category: AlertCategory.KITCHEN_DELAY,
        severity: AlertSeverity.CRITICAL,
        title: 'Immediate Escalation Required',
        message: 'Table 7 food delayed by 30 mins',
        payload: { delayMinutes: 30 },
      });

    const alertId = createRes.body.alert._id;

    // 2. Fire 5 concurrent acknowledge calls
    const ackPromises = Array.from({ length: 5 }).map((_, idx) =>
      request(server)
        .put(`/api/v1/admin-control/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({ acknowledgedByName: `Manager #${idx + 1}` })
    );

    const ackResults = await Promise.all(ackPromises);
    const successCount = ackResults.filter((r) => r.status === 200).length;
    const alreadyAckCount = ackResults.filter((r) => r.status === 400 && r.body.errorCode === 'ALREADY_ACKNOWLEDGED').length;

    expect(successCount).toBe(1);
    expect(alreadyAckCount).toBe(4);

    // Verify DB state
    const alert = await AdminAlertEvent.findById(alertId);
    expect(alert!.status).toBe(AlertEventStatus.ACKNOWLEDGED);
    expect(alert!.acknowledgedAt).toBeTruthy();
  });

  it('5. Switchboard Audit Summary: Aggregates staff count, active coverage, and channel distribution', async () => {
    const res = await request(server)
      .get('/api/v1/admin-control/switchboard-summary')
      .set('Authorization', `Bearer ${gmToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalStaff).toBe(3);
    expect(res.body.configuredPreferencesCount).toBe(3);
    expect(res.body.channelCoverage.IN_APP).toBe(3);
    expect(res.body.last24HoursVolume.totalAlerts).toBeGreaterThanOrEqual(23);
  });
});
