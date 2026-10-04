import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { FloorDutyMatrix } from '../models/FloorDutyMatrix';
import { AlertRoutingType, AlertType } from '../models/TargetedPushAlert';

describe('--- SHIFT 38 / GATE 38: MULTI-FLOOR WAITER DUTY MATRIX & DYNAMIC RANGE ASSIGNER ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let captainVinodId: string;
  let captainPriyaId: string;
  let captainRohanId: string;
  let waiterRishabhId: string;
  let waiterMukeshId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5121; // Dedicated Port 5121 for Gate 38
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A (Grand Palace Multi-Floor Hotel)
    const tenantA = await Tenant.create({
      name: 'Grand Palace Multi-Floor Hotel',
      slug: `grand-palace-${Date.now()}`,
      contactEmail: `palace_${Date.now()}@spicehub.in`,
      contactPhone: '9822200001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Hotel)
    const tenantB = await Tenant.create({
      name: 'Competitor Inn',
      slug: `competitor-inn-${Date.now()}`,
      contactEmail: `competitor_${Date.now()}@spicehub.in`,
      contactPhone: '9822200002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    captainVinodId = new Types.ObjectId().toString();
    captainPriyaId = new Types.ObjectId().toString();
    captainRohanId = new Types.ObjectId().toString();
    waiterRishabhId = new Types.ObjectId().toString();
    waiterMukeshId = new Types.ObjectId().toString();

    // 3. Seed Tables across 3 distinct floors for Tenant A:
    // Ground Floor: GF-01 to GF-15 (15 tables * 4 capacity = 60 pax)
    const gfTables = [];
    for (let i = 1; i <= 15; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      gfTables.push({
        hotelId: tenantA._id,
        tableNumber: `GF-${numStr}`,
        floorLevel: 'Ground Floor',
        section: 'GF_AC_HALL',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    await DiningTable.insertMany(gfTables);

    // 2nd Floor: 2F-01 to 2F-10 (10 tables * 4 capacity = 40 pax)
    const floor2Tables = [];
    for (let i = 1; i <= 10; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      floor2Tables.push({
        hotelId: tenantA._id,
        tableNumber: `2F-${numStr}`,
        floorLevel: '2nd Floor',
        section: '2F_FINE_DINE',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    await DiningTable.insertMany(floor2Tables);

    // Rooftop: RT-01 to RT-08 (8 tables * 4 capacity = 32 pax)
    const rtTables = [];
    for (let i = 1; i <= 8; i++) {
      const numStr = i < 10 ? `0${i}` : `${i}`;
      rtTables.push({
        hotelId: tenantA._id,
        tableNumber: `RT-${numStr}`,
        floorLevel: 'Rooftop Lounge',
        section: 'RT_BAR_LOUNGE',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });
    }
    await DiningTable.insertMany(rtTables);

    // Seed 1 Table for Tenant B
    await DiningTable.create({
      hotelId: tenantB._id,
      tableNumber: 'GF-01',
      floorLevel: 'Ground Floor',
      section: 'MAIN',
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

  it('1. POST /api/v1/floor-matrix/init-sync initializes Ground Floor (GF) matrix with 15 tables', async () => {
    const res = await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', tenantAId)
      .send({
        floorName: 'Ground Floor',
        floorCode: 'GF',
        supervisorId: captainVinodId,
        supervisorName: 'Captain Vinod',
        shift: 'EVENING',
        maxPaxPerWaiterCap: 40,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.matrix.floorCode).toBe('GF');
    expect(res.body.matrix.totalTables).toBe(15);
    expect(res.body.matrix.totalCapacity).toBe(60); // 15 tables * 4
    expect(res.body.matrix.unassignedTables.length).toBe(15);
    expect(res.body.matrix.supervisorName).toBe('Captain Vinod');
  });

  it('2. POST /api/v1/floor-matrix/init-sync initializes 2nd Floor (2F) and Rooftop (RT) matrices', async () => {
    // 2nd Floor
    const res2F = await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', tenantAId)
      .send({
        floorName: '2nd Floor',
        floorCode: '2F',
        supervisorId: captainPriyaId,
        supervisorName: 'Captain Priya',
        shift: 'EVENING',
        maxPaxPerWaiterCap: 30, // Tighter cap for fine dining
      });

    expect(res2F.status).toBe(200);
    expect(res2F.body.matrix.totalTables).toBe(10);
    expect(res2F.body.matrix.totalCapacity).toBe(40);

    // Rooftop
    const resRT = await request(app)
      .post('/api/v1/floor-matrix/init-sync')
      .set('x-hotel-id', tenantAId)
      .send({
        floorName: 'Rooftop Lounge',
        floorCode: 'RT',
        supervisorId: captainRohanId,
        supervisorName: 'Captain Rohan',
        shift: 'EVENING',
      });

    expect(resRT.status).toBe(200);
    expect(resRT.body.matrix.totalTables).toBe(8);
    expect(resRT.body.matrix.totalCapacity).toBe(32);
  });

  it('3. POST /api/v1/floor-matrix/assign-range assigns GF-01 to GF-08 to Waiter Rishabh (32 pax)', async () => {
    const res = await request(app)
      .post('/api/v1/floor-matrix/assign-range')
      .set('x-hotel-id', tenantAId)
      .send({
        floorCode: 'GF',
        waiterId: waiterRishabhId,
        waiterName: 'Rishabh Sharma',
        tableRange: { start: 1, end: 8, prefix: 'GF-' },
        shift: 'EVENING',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duty.tableCount).toBe(8);
    expect(res.body.duty.paxCapacity).toBe(32);
    expect(res.body.isOverloaded).toBe(false); // 32 <= 40
    expect(res.body.unassignedCount).toBe(7); // 15 - 8 = 7 remaining

    // Verify DiningTable records updated in DB
    const tables = await DiningTable.find({
      hotelId: tenantAId,
      tableNumber: { $in: ['GF-01', 'GF-02', 'GF-03'] },
    });
    tables.forEach((t) => {
      expect(t.assignedWaiterId?.toString()).toBe(waiterRishabhId);
    });
  });

  it('4. POST /api/v1/floor-matrix/assign-range warns when waiter is overloaded beyond cap', async () => {
    // 2nd Floor has maxPaxPerWaiterCap of 30. Assigning 9 tables (36 pax) to Waiter Mukesh
    const res = await request(app)
      .post('/api/v1/floor-matrix/assign-range')
      .set('x-hotel-id', tenantAId)
      .send({
        floorCode: '2F',
        waiterId: waiterMukeshId,
        waiterName: 'Mukesh Kumar',
        tableRange: { start: 1, end: 9, prefix: '2F-' },
        shift: 'EVENING',
      });

    expect(res.status).toBe(200);
    expect(res.body.duty.paxCapacity).toBe(36);
    expect(res.body.isOverloaded).toBe(true); // 36 > 30 cap!
    expect(res.body.overloadWarning).toContain('exceeding safety cap');
  });

  it('5. GET /api/v1/floor-matrix/overview returns multi-floor summary with overload counters', async () => {
    const res = await request(app)
      .get('/api/v1/floor-matrix/overview')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalFloorsActive).toBe(3); // GF, 2F, RT

    const gf = res.body.floors.find((f: any) => f.floorCode === 'GF');
    expect(gf.totalAssignedTables).toBe(8);
    expect(gf.unassignedTablesCount).toBe(7);
    expect(gf.overloadedWaitersCount).toBe(0);

    const f2 = res.body.floors.find((f: any) => f.floorCode === '2F');
    expect(f2.overloadedWaitersCount).toBe(1);
    expect(f2.overloadedWaiters[0].waiterName).toBe('Mukesh Kumar');
  });

  it('6. POST /api/v1/floor-matrix/dispatch-floor-alert routes GF-04 alert directly to Rishabh', async () => {
    const res = await request(app)
      .post('/api/v1/floor-matrix/dispatch-floor-alert')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'GF-04',
        alertType: AlertType.CUSTOMER_CALL,
        title: 'Water Call',
        message: 'Guest calls for waiter at GF-04',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.floorCode).toBe('GF');
    expect(res.body.alert.targetWaiterId).toBe(waiterRishabhId);
    expect(res.body.alert.routingType).toBe(AlertRoutingType.PRIMARY_TARGETED);
  });

  it('7. POST /api/v1/floor-matrix/dispatch-floor-alert escalates unassigned 2F-10 alert to 2nd Floor Captain', async () => {
    // 2F-10 was not assigned to Mukesh (Mukesh got 2F-01..2F-09)
    const res = await request(app)
      .post('/api/v1/floor-matrix/dispatch-floor-alert')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: '2F-10',
        alertType: AlertType.BILL_REQUEST,
        title: 'Check Request',
      });

    expect(res.status).toBe(201);
    expect(res.body.floorCode).toBe('2F');
    expect(res.body.alert.routingType).toBe(AlertRoutingType.CAPTAIN_ESCALATION);
    // Escalates specifically to Captain Priya (2nd Floor Captain), NOT Ground Floor captain!
    expect(res.body.alert.targetWaiterName).toContain('Captain Priya');
    expect(res.body.alert.targetWaiterName).toContain('2nd Floor Captain');
  });

  it('8. Strict Multi-Tenant Isolation: Tenant B cannot access Tenant A floor matrices', async () => {
    const res = await request(app)
      .get('/api/v1/floor-matrix/overview')
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.totalFloorsActive).toBe(0); // Tenant B has zero initialized matrices
  });
});
