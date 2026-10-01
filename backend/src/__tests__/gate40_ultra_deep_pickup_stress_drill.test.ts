import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { FoodPickupSlaConfig } from '../models/FoodPickupSlaConfig';
import { FoodPickupTicket, PickupTicketStatus } from '../models/FoodPickupTicket';
import { TargetedPushAlert, AlertRoutingType, AlertPriority } from '../models/TargetedPushAlert';

describe('--- SHIFT 40 / GATE 40 TIER 2: ULTRA-DEEP CONCURRENCY & STRESS DRILL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tableIds: string[] = [];
  let orderIds: string[] = [];
  let createdTicketIds: string[] = [];

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5126; // Port 5126 for Gate 40 Tier 2 drill
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Megaplex Dining',
      slug: `megaplex-${Date.now()}`,
      contactEmail: `megaplex_${Date.now()}@spicehub.in`,
      contactPhone: '9855500001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'Rival Bistro Stress',
      slug: `bistro-stress-${Date.now()}`,
      contactEmail: `bistro_stress_${Date.now()}@spicehub.in`,
      contactPhone: '9855500002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // Set 2m SLA configuration
    await FoodPickupSlaConfig.create({
      hotelId: tenantA._id,
      defaultPickupSlaMinutes: 2,
      maxSnoozeSeconds: 60,
      maxAllowedSnoozes: 1,
      escalateToCaptainOnBreach: true,
    });

    // Seed 10 tables and 10 orders for Tenant A
    for (let i = 1; i <= 10; i++) {
      const table = await DiningTable.create({
        hotelId: tenantA._id,
        tableNumber: `T-STRESS-${i}`,
        floorLevel: i % 2 === 0 ? 'Ground Floor' : '1st Floor',
        capacity: 4,
        currentStatus: TableStatus.OCCUPIED,
      });
      tableIds.push(table._id.toString());

      const order = await RestaurantOrder.create({
        hotelId: tenantA._id,
        orderNumber: `ORD-STRESS-${100 + i}`,
        orderType: OrderType.DINE_IN,
        tableId: table._id,
        tableNumber: table.tableNumber,
        orderStatus: OverallOrderStatus.PREPARING,
        idempotencyKey: `IDEMP-STRESS-${i}-${Date.now()}`,
        items: [
          {
            menuItemId: new Types.ObjectId(),
            kitchenStationId: new Types.ObjectId(),
            name: `Signature Dish ${i}`,
            unitPrice: 250,
            quantity: 1,
            subtotal: 250,
          },
        ],
        pricing: { subtotal: 250, taxTotal: 12.5, grandTotal: 262.5 },
      });
      orderIds.push(order._id.toString());
    }
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FoodPickupSlaConfig.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FoodPickupTicket.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await TargetedPushAlert.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. Concurrency Drill: 10 Chef Stations simultaneously generate Food Pickup Tickets', async () => {
    const promises = orderIds.map((orderId, idx) =>
      request(app)
        .post('/api/v1/food-pickup-sla/ready-ticket')
        .set('x-hotel-id', tenantAId)
        .send({
          orderId,
          itemsSummary: `Hot Combo #${idx + 1}`,
        })
    );

    const responses = await Promise.all(promises);
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.status).toBe(PickupTicketStatus.READY_FOR_PICKUP);
      createdTicketIds.push(res.body.ticket._id);
    });

    expect(createdTicketIds.length).toBe(10);
  });

  it('2. Race Condition Prevention: Multiple concurrent snoozes on single ticket enforce max snooze limit', async () => {
    const targetTicketId = createdTicketIds[0];

    // Fire 5 simultaneous snooze requests on the same ticket
    const snoozeCalls = Array.from({ length: 5 }).map(() =>
      request(app)
        .post(`/api/v1/food-pickup-sla/ticket/${targetTicketId}/snooze`)
        .set('x-hotel-id', tenantAId)
    );

    const responses = await Promise.all(snoozeCalls);
    const successCount = responses.filter((r) => r.status === 200).length;
    const rejectedCount = responses.filter((r) => r.status === 400).length;

    // At most 1 should succeed due to maxAllowedSnoozes = 1
    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(4);

    const finalTicket = await FoodPickupTicket.findById(targetTicketId);
    expect(finalTicket!.snoozeCount).toBe(1);
  });

  it('3. High-Volume Concurrent Waiter Pickups: 5 tickets confirmed simultaneously', async () => {
    const pickupTickets = createdTicketIds.slice(1, 6);

    const pickupCalls = pickupTickets.map((ticketId) =>
      request(app)
        .post(`/api/v1/food-pickup-sla/ticket/${ticketId}/pickup`)
        .set('x-hotel-id', tenantAId)
    );

    const responses = await Promise.all(pickupCalls);
    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.status).toBe(PickupTicketStatus.PICKED_UP);
    });

    const pickedUpCount = await FoodPickupTicket.countDocuments({
      _id: { $in: pickupTickets },
      status: PickupTicketStatus.PICKED_UP,
    });
    expect(pickedUpCount).toBe(5);
  });

  it('4. Sweeper Concurrency & Isolation: Multiple background sweeps produce exact breach escalations without duplication', async () => {
    // Age the remaining tickets (indices 6 to 9) to simulate expired deadlines
    const expiredTickets = createdTicketIds.slice(6, 10);
    const pastTime = new Date(Date.now() - 15 * 60 * 1000);
    const pastDeadline = new Date(Date.now() - 5 * 60 * 1000);

    await FoodPickupTicket.updateMany(
      { _id: { $in: expiredTickets } },
      { $set: { readyAt: pastTime, slaDeadline: pastDeadline } }
    );

    // Run sweep
    const sweepRes = await request(app)
      .post('/api/v1/food-pickup-sla/sweep-breaches')
      .set('x-hotel-id', tenantAId);

    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.sweptCount).toBe(4);

    // Tenant B sweeps its own workspace and finds 0 breaches
    const tenantBSweep = await request(app)
      .post('/api/v1/food-pickup-sla/sweep-breaches')
      .set('x-hotel-id', tenantBId);

    expect(tenantBSweep.status).toBe(200);
    expect(tenantBSweep.body.sweptCount).toBe(0);

    // Verify exactly 4 captain alerts created for Tenant A, and 0 for Tenant B
    const tenantAAlerts = await TargetedPushAlert.countDocuments({ hotelId: new Types.ObjectId(tenantAId) });
    const tenantBAlerts = await TargetedPushAlert.countDocuments({ hotelId: new Types.ObjectId(tenantBId) });

    expect(tenantAAlerts).toBe(4);
    expect(tenantBAlerts).toBe(0);
  });
});
