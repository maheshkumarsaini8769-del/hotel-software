import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { FoodPickupSlaConfig } from '../models/FoodPickupSlaConfig';
import { FoodPickupTicket, PickupTicketStatus } from '../models/FoodPickupTicket';
import { TargetedPushAlert, AlertRoutingType, AlertPriority } from '../models/TargetedPushAlert';

describe('--- SHIFT 40 / GATE 40: FOOD PICKUP SLA SLIDER & WAITER ON-MY-WAY SNOOZE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let waiterId: string;
  let tableId: string;
  let orderAId: string;
  let orderBId: string;
  let ticket1Id: string;
  let ticket2Id: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5125; // Port 5125 for Gate 40 Tier 1
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Fine Dining Bistro',
      slug: `fine-bistro-${Date.now()}`,
      contactEmail: `finebistro_${Date.now()}@spicehub.in`,
      contactPhone: '9844400001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Quick Bite',
      slug: `quick-bite-${Date.now()}`,
      contactEmail: `quickbite_${Date.now()}@spicehub.in`,
      contactPhone: '9844400002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    waiterId = new Types.ObjectId().toString();

    // 3. Setup Table & Orders
    const table = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-12',
      floorLevel: '1st Floor Terrace',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
      assignedWaiterId: new Types.ObjectId(waiterId),
      activeSessionId: new Types.ObjectId(),
    });
    tableId = table._id.toString();

    const orderA = await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: `ORD-SLA-101`,
      orderType: OrderType.DINE_IN,
      tableId: table._id,
      tableNumber: 'T-12',
      idempotencyKey: `IDEMP-SLA-A-${Date.now()}`,
      orderStatus: OverallOrderStatus.PREPARING,
      items: [
        {
          menuItemId: new Types.ObjectId(),
          kitchenStationId: new Types.ObjectId(),
          name: 'Tandoori Sizzler Platter',
          unitPrice: 550,
          quantity: 2,
          subtotal: 1100,
        },
      ],
      pricing: { subtotal: 1100, taxTotal: 55, grandTotal: 1155 },
    });
    orderAId = orderA._id.toString();

    const orderB = await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: `ORD-SLA-102`,
      orderType: OrderType.DINE_IN,
      tableId: table._id,
      tableNumber: 'T-12',
      idempotencyKey: `IDEMP-SLA-B-${Date.now()}`,
      orderStatus: OverallOrderStatus.PREPARING,
      items: [
        {
          menuItemId: new Types.ObjectId(),
          kitchenStationId: new Types.ObjectId(),
          name: 'Crispy Butter Naan Basket',
          unitPrice: 180,
          quantity: 2,
          subtotal: 360,
        },
      ],
      pricing: { subtotal: 360, taxTotal: 18, grandTotal: 378 },
    });
    orderBId = orderB._id.toString();
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

  it('1. GET /api/v1/food-pickup-sla/config - Default SLA configuration initial retrieval', async () => {
    const res = await request(app)
      .get('/api/v1/food-pickup-sla/config')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config).toBeDefined();
    expect(res.body.config.defaultPickupSlaMinutes).toBe(3);
    expect(res.body.config.maxSnoozeSeconds).toBe(60);
    expect(res.body.config.maxAllowedSnoozes).toBe(1);
    expect(res.body.config.escalateToCaptainOnBreach).toBe(true);
  });

  it('2. POST /api/v1/food-pickup-sla/config - Updates SLA slider target and rejects invalid limits', async () => {
    // 2a. Rejects out of bound (< 2m or > 10m)
    const badRes = await request(app)
      .post('/api/v1/food-pickup-sla/config')
      .set('x-hotel-id', tenantAId)
      .send({
        defaultPickupSlaMinutes: 15,
      });

    expect(badRes.status).toBe(400);
    expect(badRes.body.message).toContain('between 2 and 10 minutes');

    // 2b. Successfully updates to 5 minutes
    const goodRes = await request(app)
      .post('/api/v1/food-pickup-sla/config')
      .set('x-hotel-id', tenantAId)
      .send({
        defaultPickupSlaMinutes: 5,
        maxSnoozeSeconds: 60,
        maxAllowedSnoozes: 1,
        escalateToCaptainOnBreach: true,
      });

    expect(goodRes.status).toBe(200);
    expect(goodRes.body.success).toBe(true);
    expect(goodRes.body.config.defaultPickupSlaMinutes).toBe(5);
  });

  it('3. POST /api/v1/food-pickup-sla/ready-ticket - Chef marks dish ready, creates SLA pickup ticket', async () => {
    const res = await request(app)
      .post('/api/v1/food-pickup-sla/ready-ticket')
      .set('x-hotel-id', tenantAId)
      .send({
        orderId: orderAId,
        itemsSummary: '2x Tandoori Sizzler Platter',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.slaMinutes).toBe(5); // Picked up 5m config
    expect(res.body.ticket.tableNumber).toBe('T-12');
    expect(res.body.ticket.floorLevel).toBe('1st Floor Terrace');
    expect(res.body.ticket.status).toBe(PickupTicketStatus.READY_FOR_PICKUP);

    ticket1Id = res.body.ticket._id;

    // Verify DB deadline is set 5 minutes into the future
    const ticketInDb = await FoodPickupTicket.findById(ticket1Id);
    expect(ticketInDb).toBeDefined();
    const diffMs = ticketInDb!.slaDeadline.getTime() - ticketInDb!.readyAt.getTime();
    expect(Math.round(diffMs / 60000)).toBe(5);
  });

  it('4. POST /api/v1/food-pickup-sla/ticket/:ticketId/snooze - Waiter taps "On My Way" (60s snooze)', async () => {
    const res = await request(app)
      .post(`/api/v1/food-pickup-sla/ticket/${ticket1Id}/snooze`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket.status).toBe(PickupTicketStatus.WAITER_EN_ROUTE);
    expect(res.body.ticket.snoozeCount).toBe(1);
    expect(res.body.ticket.snoozeExtendedDeadline).toBeDefined();

    // Verify DB
    const dbTicket = await FoodPickupTicket.findById(ticket1Id);
    expect(dbTicket!.status).toBe(PickupTicketStatus.WAITER_EN_ROUTE);
    expect(dbTicket!.snoozeCount).toBe(1);
  });

  it('5. POST /api/v1/food-pickup-sla/ticket/:ticketId/snooze - Rejects second snooze exceeding maxAllowedSnoozes', async () => {
    const res = await request(app)
      .post(`/api/v1/food-pickup-sla/ticket/${ticket1Id}/snooze`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MAX_SNOOZE_REACHED');
    expect(res.body.message).toContain('Maximum allowed snooze limit (1) reached');
  });

  it('6. POST /api/v1/food-pickup-sla/ticket/:ticketId/pickup - Waiter confirms pickup within target', async () => {
    const res = await request(app)
      .post(`/api/v1/food-pickup-sla/ticket/${ticket1Id}/pickup`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket.status).toBe(PickupTicketStatus.PICKED_UP);
    expect(res.body.wasBreached).toBe(false);
    expect(res.body.ticket.pickupLatencySeconds).toBeGreaterThanOrEqual(0);

    // Verify DB
    const dbTicket = await FoodPickupTicket.findById(ticket1Id);
    expect(dbTicket!.status).toBe(PickupTicketStatus.PICKED_UP);
    expect(dbTicket!.pickedUpAt).toBeDefined();
  });

  it('7. POST /api/v1/food-pickup-sla/sweep-breaches - Escalates cold food past SLA deadline to Floor Captain', async () => {
    // 7a. Create a second ticket with simulated past deadline (breached)
    const resTicket = await request(app)
      .post('/api/v1/food-pickup-sla/ready-ticket')
      .set('x-hotel-id', tenantAId)
      .send({
        orderId: orderBId,
        itemsSummary: '2x Crispy Butter Naan Basket',
      });

    ticket2Id = resTicket.body.ticket._id;

    // Simulate 10 minutes ago ready time and expired deadline
    const pastTime = new Date(Date.now() - 10 * 60 * 1000);
    const pastDeadline = new Date(Date.now() - 5 * 60 * 1000);
    await FoodPickupTicket.findByIdAndUpdate(ticket2Id, {
      readyAt: pastTime,
      slaDeadline: pastDeadline,
    });

    // 7b. Trigger sweeper
    const sweepRes = await request(app)
      .post('/api/v1/food-pickup-sla/sweep-breaches')
      .set('x-hotel-id', tenantAId);

    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.success).toBe(true);
    expect(sweepRes.body.sweptCount).toBeGreaterThanOrEqual(1);
    expect(sweepRes.body.breachedTicketNumbers).toContain('ORD-SLA-102');

    // 7c. Verify ticket updated to SLA_BREACHED
    const dbTicket2 = await FoodPickupTicket.findById(ticket2Id);
    expect(dbTicket2!.status).toBe(PickupTicketStatus.SLA_BREACHED);
    expect(dbTicket2!.isBreached).toBe(true);
    expect(dbTicket2!.escalatedToCaptain).toBe(true);

    // 7d. Verify captain push alert created with CRITICAL buzzer priority
    const captainAlert = await TargetedPushAlert.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      routingType: AlertRoutingType.CAPTAIN_ESCALATION,
      priority: AlertPriority.CRITICAL,
      tableNumber: 'T-12',
    });
    expect(captainAlert).toBeDefined();
    expect(captainAlert!.title).toContain('FOOD PICKUP SLA BREACH');
  });

  it('8. Strict Multi-Tenant Isolation: Tenant B cannot access or modify Tenant A pickup tickets', async () => {
    // Tenant B attempts to snooze Tenant A's ticket
    const snoozeRes = await request(app)
      .post(`/api/v1/food-pickup-sla/ticket/${ticket2Id}/snooze`)
      .set('x-hotel-id', tenantBId);

    expect(snoozeRes.status).toBe(404);
    expect(snoozeRes.body.message).toContain('Pickup ticket not found');

    // Tenant B attempts to confirm pickup on Tenant A's ticket
    const pickupRes = await request(app)
      .post(`/api/v1/food-pickup-sla/ticket/${ticket2Id}/pickup`)
      .set('x-hotel-id', tenantBId);

    expect(pickupRes.status).toBe(404);
  });
});
