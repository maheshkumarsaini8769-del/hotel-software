import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { StaffSpilloverLog, SpilloverTier } from '../models/StaffSpilloverLog';

describe('--- SHIFT 39: ULTRA-DEEP LATE ATTENDANCE & CONCURRENCY SPILLOVER DRILL ---', () => {
  let victimTenantId: string;
  let attackerTenantId: string;
  let lateMukeshId: string;
  let lateRameshId: string;
  let lateAnilId: string;
  let helperSureshId: string;
  let helperPoojaId: string;
  let captainId: string;
  const mukeshTables: string[] = [];
  const rameshTables: string[] = [];
  const anilTables: string[] = [];

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5124; // Port 5124 for Gate 39 Drill
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenants
    const victim = await Tenant.create({
      name: 'SpiceHub 24x7 Banquet & Resort',
      slug: `resort-spillover-${Date.now()}`,
      contactEmail: `resort_spillover_${Date.now()}@spicehub.in`,
      contactPhone: '9944411122',
      status: 'ACTIVE',
    });
    victimTenantId = victim._id.toString();

    const attacker = await Tenant.create({
      name: 'Rival Roster Saboteur',
      slug: `saboteur-${Date.now()}`,
      contactEmail: `saboteur_${Date.now()}@spicehub.in`,
      contactPhone: '9944411133',
      status: 'ACTIVE',
    });
    attackerTenantId = attacker._id.toString();

    lateMukeshId = new Types.ObjectId().toString();
    lateRameshId = new Types.ObjectId().toString();
    lateAnilId = new Types.ObjectId().toString();
    helperSureshId = new Types.ObjectId().toString();
    helperPoojaId = new Types.ObjectId().toString();
    captainId = new Types.ObjectId().toString();

    // 2. Seed 20 Tables:
    // Mukesh: M-01 to M-06 (6 tables)
    // Ramesh: R-01 to R-06 (6 tables)
    // Anil: A-01 to A-08 (8 tables)
    const tableInserts = [];
    for (let i = 1; i <= 6; i++) {
      const num = `0${i}`;
      mukeshTables.push(`M-${num}`);
      tableInserts.push({
        hotelId: victim._id,
        tableNumber: `M-${num}`,
        floorLevel: 'Main Dining Hall',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
        assignedWaiterId: new Types.ObjectId(lateMukeshId),
      });

      rameshTables.push(`R-${num}`);
      tableInserts.push({
        hotelId: victim._id,
        tableNumber: `R-${num}`,
        floorLevel: 'Main Dining Hall',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
        assignedWaiterId: new Types.ObjectId(lateRameshId),
      });
    }

    for (let i = 1; i <= 8; i++) {
      const num = `0${i}`;
      anilTables.push(`A-${num}`);
      tableInserts.push({
        hotelId: victim._id,
        tableNumber: `A-${num}`,
        floorLevel: 'Main Dining Hall',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
        assignedWaiterId: new Types.ObjectId(lateAnilId),
      });
    }

    await DiningTable.insertMany(tableInserts);
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await mongoose.connection.close();
  });

  it('DRILL 1: Parallel Mass Spillover Execution for 3 Late Waiters across 20 Tables', async () => {
    // 3 parallel spillover triggers simultaneously
    const spilloverOperations = [
      // Mukesh: 18m late (Tier 1) -> Peers (Suresh, Pooja)
      request(app)
        .post('/api/v1/load-balancer/trigger-spillover')
        .set('x-hotel-id', victimTenantId)
        .send({
          staffId: lateMukeshId,
          staffName: 'Mukesh Kumar',
          delayMinutes: 18,
          floorLevel: 'Main Dining Hall',
          availablePeers: [
            { staffId: helperSureshId, staffName: 'Suresh Helper' },
            { staffId: helperPoojaId, staffName: 'Pooja Helper' },
          ],
        }),

      // Ramesh: 24m late (Tier 1) -> Peers (Suresh, Pooja)
      request(app)
        .post('/api/v1/load-balancer/trigger-spillover')
        .set('x-hotel-id', victimTenantId)
        .send({
          staffId: lateRameshId,
          staffName: 'Ramesh Singh',
          delayMinutes: 24,
          floorLevel: 'Main Dining Hall',
          availablePeers: [
            { staffId: helperSureshId, staffName: 'Suresh Helper' },
            { staffId: helperPoojaId, staffName: 'Pooja Helper' },
          ],
        }),

      // Anil: 38m late (Tier 2) -> Captain Escalation
      request(app)
        .post('/api/v1/load-balancer/trigger-spillover')
        .set('x-hotel-id', victimTenantId)
        .send({
          staffId: lateAnilId,
          staffName: 'Anil Absentee',
          delayMinutes: 38,
          floorLevel: 'Main Dining Hall',
          captainId,
          captainName: 'Floor Captain Vinod',
        }),
    ];

    const results = await Promise.all(spilloverOperations);

    // All 3 must succeed with 200 OK
    results.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    expect(results[0].body.spilloverTier).toBe(SpilloverTier.TIER_1_TEMPORARY);
    expect(results[0].body.reallocatedCount).toBe(6);

    expect(results[1].body.spilloverTier).toBe(SpilloverTier.TIER_1_TEMPORARY);
    expect(results[1].body.reallocatedCount).toBe(6);

    expect(results[2].body.spilloverTier).toBe(SpilloverTier.TIER_2_ABSENTEE_ESCALATION);
    expect(results[2].body.reallocatedCount).toBe(8);

    // Verify Anil's 8 tables are now assigned to Captain in DB
    const anilDbTables = await DiningTable.find({
      hotelId: victimTenantId,
      tableNumber: { $in: anilTables },
    });
    expect(anilDbTables.length).toBe(8);
    anilDbTables.forEach((t) => {
      expect(t.assignedWaiterId?.toString()).toBe(captainId);
    });
  });

  it('DRILL 2: Millisecond Race Condition between Spillover Reassignment and Customer Order', async () => {
    // Pick table M-01 (reallocated to Suresh/Pooja)
    const m01 = await DiningTable.findOne({ hotelId: victimTenantId, tableNumber: 'M-01' });
    expect(m01).not.toBeNull();

    // Customer places order at the same moment late waiter tries to reclaim
    const [orderRes, reclaimRes] = await Promise.all([
      request(app)
        .post('/api/v1/qr-locker/order')
        .set('x-hotel-id', victimTenantId)
        .send({
          qrSessionToken: `QRT-DRILL-${Date.now()}`,
          tableNumber: 'M-01',
          items: [
            {
              menuItemId: new Types.ObjectId().toString(),
              kitchenStationId: new Types.ObjectId().toString(),
              name: 'Biryani',
              unitPrice: 350,
              quantity: 2,
              subtotal: 700,
            },
          ],
        }),
      request(app)
        .post('/api/v1/load-balancer/reclaim-tables')
        .set('x-hotel-id', victimTenantId)
        .send({
          staffId: lateMukeshId,
          staffName: 'Mukesh Kumar',
          reclaimStrategy: 'OPEN_TABLES_ONLY',
        }),
    ]);

    // Reclaim should process cleanly
    expect(reclaimRes.status).toBe(200);
    expect(reclaimRes.body.success).toBe(true);
  });

  it('DRILL 3: Dynamic Workload Adaptation Under Active Dining Load', async () => {
    // Suresh now has several tables. Check that workload computation accurately detects this
    const res = await request(app)
      .post('/api/v1/load-balancer/floor-workloads')
      .set('x-hotel-id', victimTenantId)
      .send({
        floorLevel: 'Main Dining Hall',
        activeStaff: [
          { staffId: helperSureshId, staffName: 'Suresh Helper' },
          { staffId: helperPoojaId, staffName: 'Pooja Helper' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.workloads.length).toBe(2);
    // Both helpers have assigned tables calculated accurately
    expect(res.body.workloads[0].assignedTablesCount).toBeGreaterThanOrEqual(1);
    expect(res.body.workloads[1].assignedTablesCount).toBeGreaterThanOrEqual(1);
  });

  it('DRILL 4: Cross-Tenant Sabotage Attack (Blocked with 404)', async () => {
    const sabotageRes = await request(app)
      .post('/api/v1/load-balancer/reclaim-tables')
      .set('x-hotel-id', attackerTenantId) // Attacker header
      .send({
        staffId: lateAnilId,
        reclaimStrategy: 'ALL_TABLES',
      });

    // Attacker cannot touch victim's spillover logs: 404
    expect(sabotageRes.status).toBe(404);
  });
});
