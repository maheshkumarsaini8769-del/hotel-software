import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { WaiterZoneAssignment } from '../models/WaiterZoneAssignment';
import { TargetedPushAlert, AlertStatus, AlertRoutingType, AlertType } from '../models/TargetedPushAlert';

describe('--- SHIFT 37: ULTRA-DEEP WAITER ALERT CONCURRENCY & STRESS DRILL ---', () => {
  let tenantVictimId: string;
  let tenantAttackerId: string;
  let waiter1Id: string;
  let waiter2Id: string;
  let waiter3Id: string;
  const tableNumbers: string[] = [];

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5120; // Dedicated Port 5120
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenants
    const victim = await Tenant.create({
      name: 'SpiceHub Ultra Concurrency Mega-Resort',
      slug: `mega-resort-${Date.now()}`,
      contactEmail: `resort_${Date.now()}@spicehub.in`,
      contactPhone: '9900112233',
      status: 'ACTIVE',
    });
    tenantVictimId = victim._id.toString();

    const attacker = await Tenant.create({
      name: 'Rival Infiltrator Hotel',
      slug: `infiltrator-${Date.now()}`,
      contactEmail: `infiltrator_${Date.now()}@spicehub.in`,
      contactPhone: '9900112244',
      status: 'ACTIVE',
    });
    tenantAttackerId = attacker._id.toString();

    waiter1Id = new Types.ObjectId().toString(); // Rishabh
    waiter2Id = new Types.ObjectId().toString(); // Rakesh
    waiter3Id = new Types.ObjectId().toString(); // Suresh

    // 2. Create 30 Dining Tables (T-01 to T-30)
    const tables = [];
    for (let i = 1; i <= 30; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      const tNum = `T-${numStr}`;
      tableNumbers.push(tNum);
      tables.push({
        hotelId: victim._id,
        tableNumber: tNum,
        section: i <= 10 ? 'SECTION_A' : i <= 20 ? 'SECTION_B' : 'SECTION_C',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    await DiningTable.insertMany(tables);

    // 3. Assign Zones:
    // Zone 1: T-01 to T-10 -> Waiter 1 (Rishabh)
    const z1Tables = tableNumbers.slice(0, 10);
    await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantVictimId)
      .send({
        zoneName: 'Zone 1 - Main Floor',
        waiterId: waiter1Id,
        waiterName: 'Rishabh (Zone 1)',
        tableNumbers: z1Tables,
      });

    // Zone 2: T-11 to T-20 -> Waiter 2 (Rakesh)
    const z2Tables = tableNumbers.slice(10, 20);
    await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantVictimId)
      .send({
        zoneName: 'Zone 2 - Garden Patio',
        waiterId: waiter2Id,
        waiterName: 'Rakesh (Zone 2)',
        tableNumbers: z2Tables,
      });

    // Zone 3: T-21 to T-25 -> Waiter 3 (Suresh)
    const z3Tables = tableNumbers.slice(20, 25);
    await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantVictimId)
      .send({
        zoneName: 'Zone 3 - Rooftop Lounge',
        waiterId: waiter3Id,
        waiterName: 'Suresh (Zone 3)',
        tableNumbers: z3Tables,
      });
    // Tables T-26 to T-30 are intentionally UNASSIGNED to test escalation
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await mongoose.connection.close();
  });

  it('DRILL 1: 30-Table Simultaneous Customer Call Stampede (Zero dropped alerts, exact partitioning)', async () => {
    // 30 tables firing alerts at the exact same instant
    const alertPromises = tableNumbers.map((tNum) =>
      request(app)
        .post('/api/v1/waiter-zones/dispatch-alert')
        .set('x-hotel-id', tenantVictimId)
        .send({
          tableNumber: tNum,
          alertType: AlertType.CUSTOMER_CALL,
          title: `Table ${tNum} Call`,
          message: `Assistance needed at ${tNum}`,
        })
    );

    const responses = await Promise.all(alertPromises);

    // Every single alert must succeed with 201 Created
    expect(responses.length).toBe(30);
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.alert._id).toBeDefined();
    });

    // Verify database has all 30 alerts
    const totalCount = await TargetedPushAlert.countDocuments({ hotelId: tenantVictimId });
    expect(totalCount).toBe(30);

    // Verify exact partition routing:
    // Waiter 1 (Rishabh) feed: 10 targeted + 5 captain unassigned = 15 alerts
    const w1Feed = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiter1Id}/feed`)
      .set('x-hotel-id', tenantVictimId);
    expect(w1Feed.body.count).toBe(15);
    const w1TargetedOnly = w1Feed.body.alerts.filter(
      (a: any) => a.targetWaiterId === waiter1Id
    );
    expect(w1TargetedOnly.length).toBe(10); // Exactly 10 tables of Zone 1!

    // Waiter 2 (Rakesh) feed: 10 targeted + 5 captain unassigned = 15 alerts
    const w2Feed = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiter2Id}/feed`)
      .set('x-hotel-id', tenantVictimId);
    expect(w2Feed.body.count).toBe(15);
    const w2TargetedOnly = w2Feed.body.alerts.filter(
      (a: any) => a.targetWaiterId === waiter2Id
    );
    expect(w2TargetedOnly.length).toBe(10); // Exactly 10 tables of Zone 2!

    // Waiter 3 (Suresh) feed: 5 targeted + 5 captain unassigned = 10 alerts
    const w3Feed = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiter3Id}/feed`)
      .set('x-hotel-id', tenantVictimId);
    expect(w3Feed.body.count).toBe(10);
    const w3TargetedOnly = w3Feed.body.alerts.filter(
      (a: any) => a.targetWaiterId === waiter3Id
    );
    expect(w3TargetedOnly.length).toBe(5); // Exactly 5 tables of Zone 3!

    // Floor Captain feed: ALL 30 alerts!
    const captainFeed = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiter1Id}/feed?isCaptain=true`)
      .set('x-hotel-id', tenantVictimId);
    expect(captainFeed.body.count).toBe(30);
  });

  it('DRILL 2: Double-Tap & Rapid Concurrency Race on Alert Action (Zero crash, clean transition)', async () => {
    // Pick an active alert from T-01
    const alert = await TargetedPushAlert.findOne({
      hotelId: tenantVictimId,
      tableNumber: 'T-01',
      status: AlertStatus.SENT,
    });
    expect(alert).not.toBeNull();

    // Two rapid clicks on "ON_MY_WAY" at the same millisecond
    const [click1, click2] = await Promise.all([
      request(app)
        .post(`/api/v1/waiter-zones/alert/${alert!._id}/action`)
        .set('x-hotel-id', tenantVictimId)
        .send({ action: 'ON_MY_WAY', waiterId: waiter1Id, waiterName: 'Rishabh' }),
      request(app)
        .post(`/api/v1/waiter-zones/alert/${alert!._id}/action`)
        .set('x-hotel-id', tenantVictimId)
        .send({ action: 'ON_MY_WAY', waiterId: waiter1Id, waiterName: 'Rishabh' }),
    ]);

    expect(click1.status).toBe(200);
    expect(click2.status).toBe(200);

    const updated = await TargetedPushAlert.findById(alert!._id);
    expect(updated!.status).toBe(AlertStatus.ON_MY_WAY);
  });

  it('DRILL 3: Dynamic Live Zone Reassignment under Load (Zero cache staleness)', async () => {
    // Reassign Table T-05 from Waiter 1 (Rishabh) to Waiter 3 (Suresh)
    const reassignRes = await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantVictimId)
      .send({
        zoneName: 'Zone 3 - Expanded to T-05',
        waiterId: waiter3Id,
        waiterName: 'Suresh (Zone 3)',
        tableNumbers: ['T-05'],
      });

    expect(reassignRes.status).toBe(201);

    // Verify DiningTable record has updated assignedWaiterId
    const table5 = await DiningTable.findOne({ hotelId: tenantVictimId, tableNumber: 'T-05' });
    expect(table5!.assignedWaiterId?.toString()).toBe(waiter3Id);

    // Immediately dispatch new alert for Table T-05
    const newAlertRes = await request(app)
      .post('/api/v1/waiter-zones/dispatch-alert')
      .set('x-hotel-id', tenantVictimId)
      .send({
        tableNumber: 'T-05',
        alertType: AlertType.WATER_REFILL,
        title: 'Water Refill Needed',
        message: 'Glass empty.',
      });

    expect(newAlertRes.status).toBe(201);
    // MUST be routed to Suresh (waiter3Id), NOT Rishabh!
    expect(newAlertRes.body.alert.targetWaiterId).toBe(waiter3Id);
    expect(newAlertRes.body.alert.targetWaiterName).toBe('Suresh (Zone 3)');
  });

  it('DRILL 4: Mass Parallel Resolution (20 alerts resolved concurrently)', async () => {
    const alertsToResolve = await TargetedPushAlert.find({
      hotelId: tenantVictimId,
      status: { $in: [AlertStatus.SENT, AlertStatus.ON_MY_WAY] },
    }).limit(20);

    const resolvePromises = alertsToResolve.map((a) =>
      request(app)
        .post(`/api/v1/waiter-zones/alert/${a._id}/action`)
        .set('x-hotel-id', tenantVictimId)
        .send({ action: 'RESOLVE', waiterId: waiter1Id })
    );

    const results = await Promise.all(resolvePromises);
    results.forEach((r) => {
      expect(r.status).toBe(200);
      expect(r.body.alert.status).toBe(AlertStatus.RESOLVED);
    });

    const resolvedCount = await TargetedPushAlert.countDocuments({
      hotelId: tenantVictimId,
      status: AlertStatus.RESOLVED,
    });
    expect(resolvedCount).toBeGreaterThanOrEqual(20);
  });

  it('DRILL 5: High-Concurrency Cross-Tenant Sabotage Attack (10 parallel infiltration attempts blocked)', async () => {
    const victimAlerts = await TargetedPushAlert.find({ hotelId: tenantVictimId }).limit(10);

    // Attacker sends 10 concurrent requests to resolve or hijack victim alerts
    const attackPromises = victimAlerts.map((a) =>
      request(app)
        .post(`/api/v1/waiter-zones/alert/${a._id}/action`)
        .set('x-hotel-id', tenantAttackerId) // Attacker header
        .send({ action: 'RESOLVE' })
    );

    const attackResults = await Promise.all(attackPromises);

    // Every single attack request is blocked with 404 Not Found
    attackResults.forEach((res) => {
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
