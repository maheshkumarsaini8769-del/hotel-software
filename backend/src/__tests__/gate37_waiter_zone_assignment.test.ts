import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { WaiterZoneAssignment } from '../models/WaiterZoneAssignment';
import { TargetedPushAlert, AlertStatus, AlertRoutingType, AlertType } from '../models/TargetedPushAlert';

describe('--- SHIFT 37 / GATE 37: WAITER ZONE ASSIGNMENT & TARGETED PUSH ALERTS ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterRishabhId: string;
  let waiterRakeshId: string;
  let waiterTenantBId: string;
  let zoneRishabhId: string;
  let zoneRakeshId: string;
  let alertT4Id: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5119; // Port 5119 for Gate 37
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A (SpiceHub Luxury Dine)
    const tenantA = await Tenant.create({
      name: 'SpiceHub Luxury Dine',
      slug: `luxury-dine-${Date.now()}`,
      contactEmail: `luxurydine_${Date.now()}@spicehub.in`,
      contactPhone: '9811199001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Bistro)
    const tenantB = await Tenant.create({
      name: 'Competitor Bistro',
      slug: `competitor-bistro-${Date.now()}`,
      contactEmail: `competitor_${Date.now()}@spicehub.in`,
      contactPhone: '9811199002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    waiterRishabhId = new Types.ObjectId().toString();
    waiterRakeshId = new Types.ObjectId().toString();
    waiterTenantBId = new Types.ObjectId().toString();

    // 3. Seed Tables T-01 to T-20 for Tenant A
    const tableAInserts = [];
    for (let i = 1; i <= 20; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      tableAInserts.push({
        hotelId: tenantA._id,
        tableNumber: `T-${numStr}`,
        section: i <= 10 ? 'AC_FAMILY_HALL' : 'ROOFTOP_TERRACE',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    // Also add one unassigned outlier table T-99
    tableAInserts.push({
      hotelId: tenantA._id,
      tableNumber: 'T-99',
      section: 'BALCONY',
      capacity: 2,
      currentStatus: TableStatus.AVAILABLE,
    });
    await DiningTable.insertMany(tableAInserts);

    // 4. Seed Tables for Tenant B
    await DiningTable.create({
      hotelId: tenantB._id,
      tableNumber: 'T-01',
      section: 'MAIN_FLOOR',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/waiter-zones/assign assigns Tables T-01 to T-10 to Waiter Rishabh', async () => {
    const tableNumbers = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10'];
    const res = await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantAId)
      .send({
        zoneName: 'Zone A - Family AC Hall',
        floorLevel: 'Ground Floor',
        waiterId: waiterRishabhId,
        waiterName: 'Rishabh Sharma',
        tableNumbers,
        notes: 'Priority evening dinner shift',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.assignment.waiterName).toBe('Rishabh Sharma');
    expect(res.body.assignment.tableNumbers.length).toBe(10);
    expect(res.body.assignment.isActive).toBe(true);

    zoneRishabhId = res.body.assignment._id;

    // Verify DB update: DiningTable records have assignedWaiterId
    const updatedTables = await DiningTable.find({
      hotelId: tenantAId,
      tableNumber: { $in: tableNumbers },
    });
    expect(updatedTables.length).toBe(10);
    updatedTables.forEach((t) => {
      expect(t.assignedWaiterId?.toString()).toBe(waiterRishabhId);
    });
  });

  it('2. POST /api/v1/waiter-zones/assign assigns Table Range T-11 to T-17 to Waiter Rakesh', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-zones/assign')
      .set('x-hotel-id', tenantAId)
      .send({
        zoneName: 'Zone B - Rooftop Terrace',
        floorLevel: 'Rooftop',
        waiterId: waiterRakeshId,
        waiterName: 'Rakesh Verma',
        tableRange: { start: 11, end: 17, prefix: 'T-' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.assignment.waiterName).toBe('Rakesh Verma');
    expect(res.body.assignment.tableNumbers).toEqual([
      'T-11', 'T-12', 'T-13', 'T-14', 'T-15', 'T-16', 'T-17',
    ]);

    zoneRakeshId = res.body.assignment._id;

    // Verify DB update: Tables 11-17 assigned to Rakesh
    const tablesRakesh = await DiningTable.find({
      hotelId: tenantAId,
      tableNumber: { $in: ['T-11', 'T-12', 'T-13', 'T-14', 'T-15', 'T-16', 'T-17'] },
    });
    expect(tablesRakesh.length).toBe(7);
    tablesRakesh.forEach((t) => {
      expect(t.assignedWaiterId?.toString()).toBe(waiterRakeshId);
    });
  });

  it('3. GET /api/v1/waiter-zones/active lists all active zones for the hotel', async () => {
    const res = await request(app)
      .get('/api/v1/waiter-zones/active')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    const names = res.body.assignments.map((a: any) => a.waiterName);
    expect(names).toContain('Rishabh Sharma');
    expect(names).toContain('Rakesh Verma');
  });

  it('4. GET /api/v1/waiter-zones/waiter/:waiterId/tables returns Rishabh assigned duty tables', async () => {
    const res = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRishabhId}/tables`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assigned).toBe(true);
    expect(res.body.zoneName).toBe('Zone A - Family AC Hall');
    expect(res.body.tableNumbers.length).toBe(10);
    expect(res.body.tables.length).toBe(10);
  });

  it('5. POST /api/v1/waiter-zones/dispatch-alert routes Table T-04 customer call directly to Rishabh', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-zones/dispatch-alert')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-04',
        alertType: AlertType.CUSTOMER_CALL,
        title: 'Customer Needs Assistance',
        message: 'Guest at Table T-04 is requesting the waiter.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.targetWaiterId).toBe(waiterRishabhId);
    expect(res.body.alert.targetWaiterName).toBe('Rishabh Sharma');
    expect(res.body.alert.routingType).toBe(AlertRoutingType.PRIMARY_TARGETED);
    expect(res.body.alert.status).toBe(AlertStatus.SENT);

    alertT4Id = res.body.alert._id;
  });

  it('6. Anti-Spam Push Isolation: Rishabh receives Table T-04 alert, but Rakesh sees 0 alerts', async () => {
    // 1. Rishabh queries feed
    const rishabhRes = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRishabhId}/feed`)
      .set('x-hotel-id', tenantAId);

    expect(rishabhRes.status).toBe(200);
    expect(rishabhRes.body.count).toBe(1);
    expect(rishabhRes.body.alerts[0].tableNumber).toBe('T-04');
    expect(rishabhRes.body.alerts[0].targetWaiterId).toBe(waiterRishabhId);

    // 2. Rakesh queries feed -> MUST BE 0 (No noise or distraction from other zones)
    const rakeshRes = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRakeshId}/feed`)
      .set('x-hotel-id', tenantAId);

    expect(rakeshRes.status).toBe(200);
    expect(rakeshRes.body.count).toBe(0); // Zero spam!
  });

  it('7. POST /api/v1/waiter-zones/dispatch-alert routes Table T-15 alert directly to Rakesh', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-zones/dispatch-alert')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-15',
        alertType: AlertType.BILL_REQUEST,
        title: 'Bill Requested',
        message: 'Guest wants printed check.',
      });

    expect(res.status).toBe(201);
    expect(res.body.alert.targetWaiterId).toBe(waiterRakeshId);
    expect(res.body.alert.targetWaiterName).toBe('Rakesh Verma');

    // Verify Rakesh now has 1 alert in his feed
    const rakeshRes = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRakeshId}/feed`)
      .set('x-hotel-id', tenantAId);

    expect(rakeshRes.body.count).toBe(1);
    expect(rakeshRes.body.alerts[0].tableNumber).toBe('T-15');
  });

  it('8. Fallback Escalation: Alert on unassigned Table T-99 escalates to Floor Captain', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-zones/dispatch-alert')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-99',
        alertType: AlertType.CUSTOMER_CALL,
        title: 'Unassigned Table Call',
        message: 'No waiter assigned to balcony table.',
      });

    expect(res.status).toBe(201);
    expect(res.body.alert.routingType).toBe(AlertRoutingType.CAPTAIN_ESCALATION);
    expect(res.body.alert.targetWaiterName).toContain('Floor Captain');

    // Both waiters can see captain escalation alerts to prevent guest neglect
    const rishabhRes = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRishabhId}/feed`)
      .set('x-hotel-id', tenantAId);

    // Rishabh sees his 1 targeted alert + 1 captain escalation alert = 2
    expect(rishabhRes.body.count).toBe(2);
  });

  it('9. Floor Captain Feed (isCaptain=true) sees all alerts across all zones', async () => {
    const res = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRishabhId}/feed?isCaptain=true`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    // T-04 (Rishabh) + T-15 (Rakesh) + T-99 (Unassigned) = 3 total active alerts
    expect(res.body.count).toBe(3);
  });

  it('10. POST /api/v1/waiter-zones/alert/:alertId/action with ON_MY_WAY updates status and records timestamp', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-zones/alert/${alertT4Id}/action`)
      .set('x-hotel-id', tenantAId)
      .send({
        action: 'ON_MY_WAY',
        waiterId: waiterRishabhId,
        waiterName: 'Rishabh Sharma',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.status).toBe(AlertStatus.ON_MY_WAY);
    expect(res.body.alert.acknowledgedByName).toBe('Rishabh Sharma');
    expect(res.body.alert.acknowledgedAt).toBeDefined();
  });

  it('11. POST /api/v1/waiter-zones/alert/:alertId/action with RESOLVE clears alert from active queue', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-zones/alert/${alertT4Id}/action`)
      .set('x-hotel-id', tenantAId)
      .send({
        action: 'RESOLVE',
        waiterId: waiterRishabhId,
      });

    expect(res.status).toBe(200);
    expect(res.body.alert.status).toBe(AlertStatus.RESOLVED);
    expect(res.body.alert.resolvedAt).toBeDefined();

    // Verify resolved alert is no longer in Rishabh's active feed
    const rishabhRes = await request(app)
      .get(`/api/v1/waiter-zones/waiter/${waiterRishabhId}/feed`)
      .set('x-hotel-id', tenantAId);

    const hasT4 = rishabhRes.body.alerts.some((a: any) => a._id === alertT4Id);
    expect(hasT4).toBe(false);
  });

  it('12. Rejects duplicate actions on already resolved alert with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/waiter-zones/alert/${alertT4Id}/action`)
      .set('x-hotel-id', tenantAId)
      .send({
        action: 'ON_MY_WAY',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already resolved');
  });

  it('13. POST /api/v1/waiter-zones/unassign deactivates zone and clears table assignedWaiterId', async () => {
    const res = await request(app)
      .post('/api/v1/waiter-zones/unassign')
      .set('x-hotel-id', tenantAId)
      .send({
        assignmentId: zoneRishabhId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB update: tables T-01 to T-10 no longer have assignedWaiterId
    const tables = await DiningTable.find({
      hotelId: tenantAId,
      tableNumber: { $in: ['T-01', 'T-02', 'T-03'] },
    });
    tables.forEach((t) => {
      expect(t.assignedWaiterId).toBeUndefined();
    });
  });

  it('14. Strict Multi-Tenant Isolation: Tenant B cannot query or action Tenant A alerts or zones', async () => {
    // 1. Tenant B tries to query active zones
    const zonesRes = await request(app)
      .get('/api/v1/waiter-zones/active')
      .set('x-hotel-id', tenantBId);

    expect(zonesRes.status).toBe(200);
    expect(zonesRes.body.count).toBe(0); // Tenant B has zero active zones

    // 2. Tenant B tries to action Tenant A's alert
    const actionRes = await request(app)
      .post(`/api/v1/waiter-zones/alert/${alertT4Id}/action`)
      .set('x-hotel-id', tenantBId) // Tenant B header
      .send({ action: 'RESOLVE' });

    expect(actionRes.status).toBe(404);
  });
});
