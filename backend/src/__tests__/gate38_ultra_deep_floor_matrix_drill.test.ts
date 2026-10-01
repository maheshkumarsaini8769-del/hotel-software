import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { FloorDutyMatrix } from '../models/FloorDutyMatrix';
import { TargetedPushAlert, AlertRoutingType, AlertType } from '../models/TargetedPushAlert';

describe('--- SHIFT 38: ULTRA-DEEP MULTI-FLOOR CONCURRENCY & STRESS DRILL ---', () => {
  let victimTenantId: string;
  let attackerTenantId: string;
  let waiterGfId: string;
  let waiter2fId: string;
  let waiterRtId: string;
  let rovingWaiterId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5122; // Port 5122 for Gate 38 Drill
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Victim Tenant
    const victim = await Tenant.create({
      name: 'SpiceHub 5-Star Multi-Floor Sky Resort',
      slug: `sky-resort-${Date.now()}`,
      contactEmail: `sky_${Date.now()}@spicehub.in`,
      contactPhone: '9922233344',
      status: 'ACTIVE',
    });
    victimTenantId = victim._id.toString();

    // 2. Setup Malicious Attacker Tenant
    const attacker = await Tenant.create({
      name: 'Hostile Floor Infiltrator',
      slug: `hostile-floor-${Date.now()}`,
      contactEmail: `hostile_${Date.now()}@spicehub.in`,
      contactPhone: '9922233355',
      status: 'ACTIVE',
    });
    attackerTenantId = attacker._id.toString();

    waiterGfId = new Types.ObjectId().toString();
    waiter2fId = new Types.ObjectId().toString();
    waiterRtId = new Types.ObjectId().toString();
    rovingWaiterId = new Types.ObjectId().toString();

    // 3. Seed 30 Tables: 10 GF, 10 2F, 10 RT
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      const num = i < 10 ? `0${i}` : `${i}`;
      tables.push({
        hotelId: victim._id,
        tableNumber: `GF-${num}`,
        floorLevel: 'Ground Floor',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
      tables.push({
        hotelId: victim._id,
        tableNumber: `2F-${num}`,
        floorLevel: '2nd Floor',
        capacity: 6, // 6-seater fine dining
        currentStatus: TableStatus.AVAILABLE,
      });
      tables.push({
        hotelId: victim._id,
        tableNumber: `RT-${num}`,
        floorLevel: 'Rooftop Lounge',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    await DiningTable.insertMany(tables);

    // 4. Initialize all 3 Floors
    await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', victimTenantId)
      .send({ floorName: 'Ground Floor', floorCode: 'GF', supervisorName: 'Captain Ramesh' });

    await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', victimTenantId)
      .send({ floorName: '2nd Floor', floorCode: '2F', supervisorName: 'Captain Sunita' });

    await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', victimTenantId)
      .send({ floorName: 'Rooftop Lounge', floorCode: 'RT', supervisorName: 'Captain Vikram' });
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('DRILL 1: Concurrent Floor Range Assignments (5 Parallel Admin Updates)', async () => {
    // 5 concurrent assignment operations running simultaneously across floors
    const assignOperations = [
      // Ground Floor: GF-01..GF-06 to Waiter GF
      request(app)
        .post('/api/v1/floor-matrix/assign-range')
        .set('x-hotel-id', victimTenantId)
        .send({
          floorCode: 'GF',
          waiterId: waiterGfId,
          waiterName: 'Waiter GF (Ground)',
          tableRange: { start: 1, end: 6, prefix: 'GF-' },
        }),
      // 2nd Floor: 2F-01..2F-05 to Waiter 2F
      request(app)
        .post('/api/v1/floor-matrix/assign-range')
        .set('x-hotel-id', victimTenantId)
        .send({
          floorCode: '2F',
          waiterId: waiter2fId,
          waiterName: 'Waiter 2F (Fine Dining)',
          tableRange: { start: 1, end: 5, prefix: '2F-' },
        }),
      // Rooftop: RT-01..RT-06 to Waiter RT
      request(app)
        .post('/api/v1/floor-matrix/assign-range')
        .set('x-hotel-id', victimTenantId)
        .send({
          floorCode: 'RT',
          waiterId: waiterRtId,
          waiterName: 'Waiter RT (Rooftop Bar)',
          tableRange: { start: 1, end: 6, prefix: 'RT-' },
        }),
      // Ground Floor: GF-07..GF-10 to Roving Waiter
      request(app)
        .post('/api/v1/floor-matrix/assign-range')
        .set('x-hotel-id', victimTenantId)
        .send({
          floorCode: 'GF',
          waiterId: rovingWaiterId,
          waiterName: 'Senior Roving Captain',
          tableRange: { start: 7, end: 10, prefix: 'GF-' },
          isRovingWaiter: true,
        }),
      // Rooftop: RT-07..RT-10 to Roving Waiter (Roving across Rooftop as well!)
      request(app)
        .post('/api/v1/floor-matrix/assign-range')
        .set('x-hotel-id', victimTenantId)
        .send({
          floorCode: 'RT',
          waiterId: rovingWaiterId,
          waiterName: 'Senior Roving Captain',
          tableRange: { start: 7, end: 10, prefix: 'RT-' },
          isRovingWaiter: true,
        }),
    ];

    const responses = await Promise.all(assignOperations);

    // All 5 operations must succeed with 200 OK
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Check Overview: All 3 floors must reflect these assignments without collision
    const overviewRes = await request(app)
      .get('/api/v1/floor-matrix/overview')
      .set('x-hotel-id', victimTenantId);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.totalFloorsActive).toBe(3);

    const gf = overviewRes.body.floors.find((f: any) => f.floorCode === 'GF');
    expect(gf.totalAssignedTables).toBe(10); // 6 + 4 = 10 (100% covered)
    expect(gf.unassignedTablesCount).toBe(0);

    const rt = overviewRes.body.floors.find((f: any) => f.floorCode === 'RT');
    expect(rt.totalAssignedTables).toBe(10); // 6 + 4 = 10 (100% covered)
    expect(rt.unassignedTablesCount).toBe(0);

    const f2 = overviewRes.body.floors.find((f: any) => f.floorCode === '2F');
    expect(f2.totalAssignedTables).toBe(5);
    expect(f2.unassignedTablesCount).toBe(5); // 5 tables still open on 2nd floor
  });

  it('DRILL 2: Multi-Floor 30-Table Simultaneous Alert Dispatch Drill (Zero cross-floor misdirection)', async () => {
    // Generate 30 simultaneous alerts across all 3 floors
    const tableKeys = [
      ...Array.from({ length: 10 }, (_, i) => `GF-${i < 9 ? '0' : ''}${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `2F-${i < 9 ? '0' : ''}${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `RT-${i < 9 ? '0' : ''}${i + 1}`),
    ];

    const alertPromises = tableKeys.map((tNum) =>
      request(app)
        .post('/api/v1/floor-matrix/dispatch-floor-alert')
        .set('x-hotel-id', victimTenantId)
        .send({
          tableNumber: tNum,
          alertType: AlertType.CUSTOMER_CALL,
          title: `Rapid Service Call from ${tNum}`,
        })
    );

    const alertResults = await Promise.all(alertPromises);

    // All 30 must be accepted (201 Created)
    expect(alertResults.length).toBe(30);
    alertResults.forEach((r) => {
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
    });

    // Verify Floor Specific Routing Assertions:
    // GF-02 must route to Waiter GF
    const gf02Alert = alertResults.find((r) => r.body.alert.tableNumber === 'GF-02');
    expect(gf02Alert?.body.floorCode).toBe('GF');
    expect(gf02Alert?.body.alert.targetWaiterId).toBe(waiterGfId);

    // 2F-08 (unassigned on 2nd floor) must escalate to 2nd Floor Captain (Captain Sunita)
    const f2UnassignedAlert = alertResults.find((r) => r.body.alert.tableNumber === '2F-08');
    expect(f2UnassignedAlert?.body.floorCode).toBe('2F');
    expect(f2UnassignedAlert?.body.alert.routingType).toBe(AlertRoutingType.CAPTAIN_ESCALATION);
    expect(f2UnassignedAlert?.body.alert.targetWaiterName).toContain('Captain Sunita');

    // RT-03 must route to Waiter RT
    const rt03Alert = alertResults.find((r) => r.body.alert.tableNumber === 'RT-03');
    expect(rt03Alert?.body.floorCode).toBe('RT');
    expect(rt03Alert?.body.alert.targetWaiterId).toBe(waiterRtId);

    // RT-09 (assigned to Roving Captain) must route to Roving Waiter
    const rt09Alert = alertResults.find((r) => r.body.alert.tableNumber === 'RT-09');
    expect(rt09Alert?.body.alert.targetWaiterId).toBe(rovingWaiterId);
  });

  it('DRILL 3: Dynamic Range Overwrite & Table Shuffling Under Active Load (Zero duplicate allocations)', async () => {
    // Ground Floor: Move GF-05 and GF-06 from Waiter GF to Roving Waiter
    const moveRes = await request(app)
      .post('/api/v1/floor-matrix/assign-range')
      .set('x-hotel-id', victimTenantId)
      .send({
        floorCode: 'GF',
        waiterId: rovingWaiterId,
        waiterName: 'Senior Roving Captain',
        tables: ['GF-05', 'GF-06', 'GF-07', 'GF-08', 'GF-09', 'GF-10'],
        isRovingWaiter: true,
      });

    expect(moveRes.status).toBe(200);

    // Check Waiter GF's duty entry in DB: GF-05 and GF-06 MUST have been cleanly removed
    const matrix = await FloorDutyMatrix.findOne({
      hotelId: victimTenantId,
      floorCode: 'GF',
      isActive: true,
    });

    const waiterGfDuty = matrix!.dutyRoster.find((d) => d.waiterId.toString() === waiterGfId);
    expect(waiterGfDuty!.assignedTables).toEqual(['GF-01', 'GF-02', 'GF-03', 'GF-04']);
    expect(waiterGfDuty!.tableCount).toBe(4);

    const rovingDuty = matrix!.dutyRoster.find((d) => d.waiterId.toString() === rovingWaiterId);
    expect(rovingDuty!.assignedTables).toEqual(['GF-05', 'GF-06', 'GF-07', 'GF-08', 'GF-09', 'GF-10']);
    expect(rovingDuty!.tableCount).toBe(6);
  });

  it('DRILL 4: Overload Safety Threshold Trigger & Capacity Calculation Drill', async () => {
    // 2nd Floor has 6-seater tables. Assigning all 10 tables (60 pax) to one single waiter
    const heavyRes = await request(app)
      .post('/api/v1/floor-matrix/assign-range')
      .set('x-hotel-id', victimTenantId)
      .send({
        floorCode: '2F',
        waiterId: waiter2fId,
        waiterName: 'Overloaded Waiter',
        tableRange: { start: 1, end: 10, prefix: '2F-' },
      });

    expect(heavyRes.status).toBe(200);
    expect(heavyRes.body.duty.paxCapacity).toBe(60); // 10 tables * 6 pax
    expect(heavyRes.body.isOverloaded).toBe(true); // 60 > 40 cap
    expect(heavyRes.body.overloadWarning).toContain('exceeding safety cap of 40 pax');
  });

  it('DRILL 5: Cross-Tenant Multi-Floor Infiltration Defense Drill', async () => {
    // Attacker tries to dispatch alert to victim's Rooftop table RT-01
    const attackAlert = await request(app)
      .post('/api/v1/floor-matrix/dispatch-floor-alert')
      .set('x-hotel-id', attackerTenantId) // Attacker header
      .send({
        tableNumber: 'RT-01',
        title: 'Attacker Alert Injection',
      });

    // Attacker has no RT-01 registered: 404
    expect(attackAlert.status).toBe(404);

    // Attacker tries to query overview: sees 0 floors
    const attackOverview = await request(app)
      .get('/api/v1/floor-matrix/overview')
      .set('x-hotel-id', attackerTenantId);

    expect(attackOverview.status).toBe(200);
    expect(attackOverview.body.totalFloorsActive).toBe(0);
  });
});
