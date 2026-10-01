import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { StaffSpilloverLog, SpilloverTier, SpilloverItemStatus } from '../models/StaffSpilloverLog';

describe('--- SHIFT 39 / GATE 39: DYNAMIC STAFF LOAD BALANCING & LATE SPILLOVER ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterMukeshId: string; // Late waiter
  let waiterRishabhId: string; // Busy peer
  let waiterSureshId: string; // Free peer (least loaded)
  let captainId: string;
  let table5Id: string;
  let table6Id: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5123; // Port 5123 for Gate 39
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `grand-lounge-${Date.now()}`,
      contactEmail: `grandlounge_${Date.now()}@spicehub.in`,
      contactPhone: '9833300001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival FastFood Inn',
      slug: `rival-fast-${Date.now()}`,
      contactEmail: `rivalfast_${Date.now()}@spicehub.in`,
      contactPhone: '9833300002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    waiterMukeshId = new Types.ObjectId().toString();
    waiterRishabhId = new Types.ObjectId().toString();
    waiterSureshId = new Types.ObjectId().toString();
    captainId = new Types.ObjectId().toString();

    // 3. Create Tables for Mukesh (T-05, T-06)
    const t5 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-05',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      assignedWaiterId: new Types.ObjectId(waiterMukeshId),
    });
    table5Id = t5._id.toString();

    const t6 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-06',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      assignedWaiterId: new Types.ObjectId(waiterMukeshId),
    });
    table6Id = t6._id.toString();

    // 4. Create Busy Tables for Rishabh (T-01, T-02, T-03)
    const t1 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-01',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: new Types.ObjectId(waiterRishabhId),
    });

    const t2 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-02',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: new Types.ObjectId(waiterRishabhId),
    });

    // Create 2 open orders for Rishabh's tables
    await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: `KOT-RISHABH-1`,
      orderType: OrderType.DINE_IN,
      tableId: t1._id,
      items: [{ menuItemId: new Types.ObjectId(), kitchenStationId: new Types.ObjectId(), name: 'Soup', unitPrice: 150, quantity: 2, subtotal: 300 }],
      idempotencyKey: `IDEMP-R1-${Date.now()}`,
      orderStatus: OverallOrderStatus.ACCEPTED,
    });

    await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: `KOT-RISHABH-2`,
      orderType: OrderType.DINE_IN,
      tableId: t2._id,
      items: [{ menuItemId: new Types.ObjectId(), kitchenStationId: new Types.ObjectId(), name: 'Paneer', unitPrice: 300, quantity: 1, subtotal: 300 }],
      idempotencyKey: `IDEMP-R2-${Date.now()}`,
      orderStatus: OverallOrderStatus.PLACED,
    });

    // Suresh has only 1 table and 0 orders (light workload)
    await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-04',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      assignedWaiterId: new Types.ObjectId(waiterSureshId),
    });
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/load-balancer/floor-workloads ranks staff by real-time workload score', async () => {
    const res = await request(app)
      .post('/api/v1/load-balancer/floor-workloads')
      .set('x-hotel-id', tenantAId)
      .send({
        floorLevel: 'Ground Floor',
        activeStaff: [
          { staffId: waiterRishabhId, staffName: 'Rishabh Sharma' },
          { staffId: waiterSureshId, staffName: 'Suresh Raina' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalStaffActive).toBe(2);

    // Suresh must be ranked as least busy because Rishabh has 2 occupied tables + 2 pending orders
    expect(res.body.leastBusyStaff.staffId).toBe(waiterSureshId);
    expect(res.body.leastBusyStaff.staffName).toBe('Suresh Raina');

    const rishabhScore = res.body.workloads.find((w: any) => w.staffId === waiterRishabhId);
    const sureshScore = res.body.workloads.find((w: any) => w.staffId === waiterSureshId);
    expect(rishabhScore.workloadScore).toBeGreaterThan(sureshScore.workloadScore);
  });

  it('2. POST /api/v1/load-balancer/trigger-spillover executes Tier 1 Temporary Spillover (Mukesh 20m late)', async () => {
    const res = await request(app)
      .post('/api/v1/load-balancer/trigger-spillover')
      .set('x-hotel-id', tenantAId)
      .send({
        staffId: waiterMukeshId,
        staffName: 'Mukesh Kumar',
        delayMinutes: 20, // 20m late -> Tier 1 (15-29 mins)
        floorLevel: 'Ground Floor',
        plannedStartTime: '18:00',
        availablePeers: [
          { staffId: waiterRishabhId, staffName: 'Rishabh Sharma' },
          { staffId: waiterSureshId, staffName: 'Suresh Raina' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.spilloverTier).toBe(SpilloverTier.TIER_1_TEMPORARY);
    expect(res.body.reallocatedCount).toBe(2); // T-05 and T-06

    // Verify T-05 assigned to least loaded peer Suresh in database
    const table5 = await DiningTable.findById(table5Id);
    expect(table5!.assignedWaiterId?.toString()).toBe(waiterSureshId);

    // Verify StaffSpilloverLog created
    const log = await StaffSpilloverLog.findById(res.body.log._id);
    expect(log).not.toBeNull();
    expect(log!.spilloverTier).toBe(SpilloverTier.TIER_1_TEMPORARY);
    expect(log!.scheduledStaffName).toBe('Mukesh Kumar');
  });

  it('3. POST /api/v1/load-balancer/trigger-spillover executes Tier 2 Emergency Absentee Spillover (40m late)', async () => {
    // Late staff on 2nd floor with 40 mins delay
    const absenteeId = new Types.ObjectId().toString();
    const absentTable = await DiningTable.create({
      hotelId: new Types.ObjectId(tenantAId),
      tableNumber: 'T-90',
      floorLevel: 'Ground Floor',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      assignedWaiterId: new Types.ObjectId(absenteeId),
    });

    const res = await request(app)
      .post('/api/v1/load-balancer/trigger-spillover')
      .set('x-hotel-id', tenantAId)
      .send({
        staffId: absenteeId,
        staffName: 'Deepak Absentee',
        delayMinutes: 40, // 40m late -> Tier 2 (30+ mins)
        floorLevel: 'Ground Floor',
        captainId,
        captainName: 'Floor Captain Vinod',
      });

    expect(res.status).toBe(200);
    expect(res.body.spilloverTier).toBe(SpilloverTier.TIER_2_ABSENTEE_ESCALATION);
    expect(res.body.reallocatedCount).toBe(1);

    // Reassigned to Captain
    const updatedTable = await DiningTable.findById(absentTable._id);
    expect(updatedTable!.assignedWaiterId?.toString()).toBe(captainId);
  });

  it('4. POST /api/v1/load-balancer/reclaim-tables (OPEN_TABLES_ONLY strategy)', async () => {
    // Simulate: T-05 became OCCUPIED (guest dining), T-06 is still AVAILABLE
    await DiningTable.findByIdAndUpdate(table5Id, { currentStatus: TableStatus.OCCUPIED });
    await DiningTable.findByIdAndUpdate(table6Id, { currentStatus: TableStatus.AVAILABLE });

    // Mukesh clocks in late and reclaims open tables
    const res = await request(app)
      .post('/api/v1/load-balancer/reclaim-tables')
      .set('x-hotel-id', tenantAId)
      .send({
        staffId: waiterMukeshId,
        staffName: 'Mukesh Kumar',
        reclaimStrategy: 'OPEN_TABLES_ONLY',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reclaimedTables).toContain('T-06'); // Open table reclaimed
    expect(res.body.retainedByPeerTables).toContain('T-05'); // Occupied table stays with Suresh

    // Verify DB states:
    const t6 = await DiningTable.findById(table6Id);
    expect(t6!.assignedWaiterId?.toString()).toBe(waiterMukeshId);

    const t5 = await DiningTable.findById(table5Id);
    expect(t5!.assignedWaiterId?.toString()).toBe(waiterSureshId); // Left with helper
  });

  it('5. POST /api/v1/load-balancer/reclaim-tables (ALL_TABLES strategy)', async () => {
    // Mukesh reclaims all tables
    const res = await request(app)
      .post('/api/v1/load-balancer/reclaim-tables')
      .set('x-hotel-id', tenantAId)
      .send({
        staffId: waiterMukeshId,
        staffName: 'Mukesh Kumar',
        reclaimStrategy: 'ALL_TABLES',
      });

    expect(res.status).toBe(200);
    expect(res.body.reclaimedTables).toContain('T-05');

    // Both tables now with Mukesh
    const t5 = await DiningTable.findById(table5Id);
    expect(t5!.assignedWaiterId?.toString()).toBe(waiterMukeshId);
  });

  it('6. Strict Multi-Tenant Isolation: Tenant B cannot query or trigger Tenant A spillover', async () => {
    const res = await request(app)
      .post('/api/v1/load-balancer/reclaim-tables')
      .set('x-hotel-id', tenantBId) // Tenant B header
      .send({
        staffId: waiterMukeshId,
      });

    expect(res.status).toBe(404);
  });
});
