import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableQrLocker } from '../models/TableQrLocker';
import {
  RestaurantOrder,
  OrderType,
  OverallOrderStatus,
  OrderApprovalStatus,
} from '../models/RestaurantOrder';
import { MenuItem } from '../models/MenuItem';

describe('--- SHIFT 36: ULTRA-DEEP QR STRESS, CONCURRENCY & ATTACK DRILL ---', () => {
  let tenantVictimId: string;
  let tenantAttackerId: string;
  let tableId: string;
  let permanentSalt: string;
  let validToken: string;
  let menuItemId: string;
  let waiterId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5118; // Dedicated Port 5118
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Victim Tenant
    const victim = await Tenant.create({
      name: 'SpiceHub Flagship Cyber Security Test',
      slug: `victim-${Date.now()}`,
      contactEmail: `victim_${Date.now()}@spicehub.in`,
      contactPhone: '9900000001',
      status: 'ACTIVE',
    });
    tenantVictimId = victim._id.toString();

    // 2. Setup Malicious Attacker Tenant
    const attacker = await Tenant.create({
      name: 'Hostile PenTest Tenant',
      slug: `attacker-${Date.now()}`,
      contactEmail: `attacker_${Date.now()}@spicehub.in`,
      contactPhone: '9900000002',
      status: 'ACTIVE',
    });
    tenantAttackerId = attacker._id.toString();

    // 3. Setup Dining Table VIP-07
    const table = await DiningTable.create({
      hotelId: victim._id,
      tableNumber: 'VIP-07',
      section: 'PRESIDENTIAL',
      capacity: 8,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableId = table._id.toString();

    // 4. Setup Menu Item
    const item = await MenuItem.create({
      hotelId: victim._id,
      name: 'Tandoori Truffle Platter',
      basePrice: 850,
      categoryId: new Types.ObjectId(),
      kitchenStationId: new Types.ObjectId(),
      isAvailable: true,
    });
    menuItemId = item._id.toString();

    waiterId = new Types.ObjectId().toString();

    // Initialize Permanent Locker
    const initRes = await request(app)
      .post('/api/v1/qr-locker/init-table')
      .set('x-hotel-id', tenantVictimId)
      .send({ tableId, domainUrl: 'https://spicehub.in' });
    permanentSalt = initRes.body.locker.permanentSalt;

    // Scan & Lock Active Session
    const scanRes = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantVictimId)
      .send({
        tableNumber: 'VIP-07',
        salt: permanentSalt,
        deviceFingerprint: 'authorized-ipad-pro-station-01',
        clientIp: '10.0.4.15',
      });
    validToken = scanRes.body.qrSessionToken;
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('DRILL 1: Brute Force Anti-Fraud Salt Attack (25 simultaneous forged salt probes)', async () => {
    // 25 attackers simultaneously trying to guess the permanent salt
    const attackPromises = Array.from({ length: 25 }, (_, i) =>
      request(app)
        .post('/api/v1/qr-locker/scan')
        .set('x-hotel-id', tenantVictimId)
        .send({
          tableNumber: 'VIP-07',
          salt: `forged_salt_attempt_${i}_${Math.random().toString(36).substring(2)}`,
        })
    );

    const responses = await Promise.all(attackPromises);

    // Every single brute force request must be 100% blocked with 403 ANTI_FRAUD_SALT_MISMATCH
    expect(responses.length).toBe(25);
    responses.forEach((res) => {
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ANTI_FRAUD_SALT_MISMATCH');
    });

    // Verify legitimate locker was NEVER corrupted
    const locker = await TableQrLocker.findOne({ hotelId: tenantVictimId, tableNumber: 'VIP-07' });
    expect(locker!.permanentSalt).toBe(permanentSalt);
  });

  it('DRILL 2: 30-Guest Parallel Order Rush Stampede (Zero race condition, distinct KOTs)', async () => {
    // 30 parallel guests tapping "Order Now" on table VIP-07 at the exact same millisecond
    const stampedePromises = Array.from({ length: 30 }, (_, i) =>
      request(app)
        .post('/api/v1/qr-locker/order')
        .set('x-hotel-id', tenantVictimId)
        .send({
          qrSessionToken: validToken,
          tableNumber: 'VIP-07',
          customerName: `VIP Guest #${i + 1}`,
          items: [
            {
              menuItemId,
              name: 'Tandoori Truffle Platter',
              unitPrice: 850,
              quantity: 1,
            },
          ],
        })
    );

    const results = await Promise.all(stampedePromises);

    // Verify 100% success rate with zero dropped orders
    results.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.approvalStatus).toBe(OrderApprovalStatus.PENDING_WAITER_APPROVAL);
      expect(res.body.subTotal).toBe(850);
    });

    // Verify all 30 KOT numbers are globally unique
    const orderNumbers = results.map((r) => r.body.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);
    expect(uniqueOrderNumbers.size).toBe(30);

    // Verify count in DB
    const dbOrdersCount = await RestaurantOrder.countDocuments({
      hotelId: tenantVictimId,
      qrSessionToken: validToken,
    });
    expect(dbOrdersCount).toBeGreaterThanOrEqual(30);
  });

  it('DRILL 3: Millisecond Concurrency Race: Waiter Manual Review vs Background Auto-Sweep', async () => {
    // Create an order right at its 10s deadline limit
    const order = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantVictimId),
      orderNumber: `KOT-RACE-${Date.now()}`,
      orderType: OrderType.DINE_IN,
      tableId: new Types.ObjectId(tableId),
      items: [
        {
          menuItemId: new Types.ObjectId(menuItemId),
          kitchenStationId: new Types.ObjectId(),
          name: 'Tandoori Truffle Platter',
          unitPrice: 850,
          quantity: 1,
          subtotal: 850,
        },
      ],
      idempotencyKey: `IDEMP-RACE-${Date.now()}`,
      qrSessionToken: validToken,
      orderStatus: OverallOrderStatus.PLACED,
      approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
      approvalDeadline: new Date(Date.now() - 100), // Deadline just crossed 100ms ago
      placedAt: new Date(Date.now() - 10100),
    });

    // Launch both waiter approval AND background sweep in parallel at the EXACT same instant
    const [waiterRes, sweepRes] = await Promise.all([
      request(app)
        .post(`/api/v1/qr-locker/order/${order._id}/waiter-action`)
        .set('x-hotel-id', tenantVictimId)
        .send({ action: 'APPROVE', waiterId }),
      request(app)
        .post('/api/v1/qr-locker/sweep-auto-approvals')
        .set('x-hotel-id', tenantVictimId),
    ]);

    // One must win, and the other must cleanly resolve without 500 error or corrupted status
    expect([200, 400]).toContain(waiterRes.status);
    expect(sweepRes.status).toBe(200);

    // The order in DB must be cleanly ACCEPTED (either APPROVED_BY_WAITER or AUTO_APPROVED_TIMEOUT)
    const finalOrder = await RestaurantOrder.findById(order._id);
    expect(finalOrder!.orderStatus).toBe(OverallOrderStatus.ACCEPTED);
    expect([
      OrderApprovalStatus.APPROVED_BY_WAITER,
      OrderApprovalStatus.AUTO_APPROVED_TIMEOUT,
    ]).toContain(finalOrder!.approvalStatus);
  });

  it('DRILL 4: Cross-Tenant Penetration Attack (Zero breach across isolated boundaries)', async () => {
    // 1. Attacker tries to place order using Victim token on Victim table, but sending Attacker Tenant ID
    const crossOrderRes = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAttackerId) // Attacker header
      .send({
        qrSessionToken: validToken,
        tableNumber: 'VIP-07',
        items: [{ menuItemId, name: 'Stolen Order', unitPrice: 850, quantity: 1 }],
      });

    // Must be rejected with 403 INVALID_QR_TOKEN because token does not belong to Attacker tenant
    expect(crossOrderRes.status).toBe(403);
    expect(crossOrderRes.body.code).toBe('INVALID_QR_TOKEN');

    // 2. Attacker waiter attempts to reject Victim pending orders
    const victimOrder = await RestaurantOrder.findOne({
      hotelId: tenantVictimId,
      approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
    });
    expect(victimOrder).not.toBeNull();

    const crossActionRes = await request(app)
      .post(`/api/v1/qr-locker/order/${victimOrder!._id}/waiter-action`)
      .set('x-hotel-id', tenantAttackerId) // Attacker header
      .send({ action: 'REJECT', rejectionReason: 'Malicious sabotage' });

    // Attacker cannot see Victim order: 404 Not Found
    expect(crossActionRes.status).toBe(404);

    // Verify Victim order was NOT modified or cancelled
    const verifiedOrder = await RestaurantOrder.findById(victimOrder!._id);
    expect(verifiedOrder!.approvalStatus).toBe(OrderApprovalStatus.PENDING_WAITER_APPROVAL);
  });

  it('DRILL 5: Full 8-Step Lifecycle on 5 Concurrent Dining Tables (Multi-Table Swarm)', async () => {
    // Create 5 tables simultaneously
    const tablePromises = Array.from({ length: 5 }, async (_, idx) => {
      const tNum = `SWARM-${idx + 1}`;
      const dt = await DiningTable.create({
        hotelId: tenantVictimId,
        tableNumber: tNum,
        section: 'TERRACE',
        capacity: 4,
        currentStatus: TableStatus.AVAILABLE,
      });

      // 1. Init permanent QR
      const initR = await request(app)
        .post('/api/v1/qr-locker/init-table')
        .set('x-hotel-id', tenantVictimId)
        .send({ tableId: dt._id });

      const salt = initR.body.locker.permanentSalt;

      // 2. Customer Scans and Locks session
      const scanR = await request(app)
        .post('/api/v1/qr-locker/scan')
        .set('x-hotel-id', tenantVictimId)
        .send({ tableNumber: tNum, salt });
      const tok = scanR.body.qrSessionToken;

      // 3. Customer places order
      const ordR = await request(app)
        .post('/api/v1/qr-locker/order')
        .set('x-hotel-id', tenantVictimId)
        .send({
          qrSessionToken: tok,
          tableNumber: tNum,
          customerName: `Swarm Guest ${tNum}`,
          items: [{ menuItemId, name: 'Tandoori Truffle Platter', unitPrice: 850, quantity: 1 }],
        });

      // 4. Waiter Approves order
      const waitR = await request(app)
        .post(`/api/v1/qr-locker/order/${ordR.body.orderId}/waiter-action`)
        .set('x-hotel-id', tenantVictimId)
        .send({ action: 'APPROVE', waiterId });

      // 5. Release session after meal
      const relR = await request(app)
        .post('/api/v1/qr-locker/release-session')
        .set('x-hotel-id', tenantVictimId)
        .send({ tableNumber: tNum });

      return {
        initSuccess: initR.body.success,
        scanSuccess: scanR.body.success,
        orderSuccess: ordR.body.success,
        waiterSuccess: waitR.body.success,
        approvedStatus: waitR.body.order.approvalStatus,
        releaseSuccess: relR.body.success,
      };
    });

    const swarmResults = await Promise.all(tablePromises);

    // Verify all 5 tables completed the entire lifecycle without any failure
    expect(swarmResults.length).toBe(5);
    swarmResults.forEach((r) => {
      expect(r.initSuccess).toBe(true);
      expect(r.scanSuccess).toBe(true);
      expect(r.orderSuccess).toBe(true);
      expect(r.waiterSuccess).toBe(true);
      expect(r.approvedStatus).toBe(OrderApprovalStatus.APPROVED_BY_WAITER);
      expect(r.releaseSuccess).toBe(true);
    });
  });
});
