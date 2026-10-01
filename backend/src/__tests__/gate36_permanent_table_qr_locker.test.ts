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

describe('--- SHIFT 36 / GATE 36: PERMANENT TABLE QR LOCKER & 10-SECOND WAITER SLA ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tableAId: string;
  let tableBId: string;
  let menuItem1Id: string;
  let menuItem2Id: string;
  let permanentSaltA: string;
  let validSessionTokenA: string;
  let waiterUserId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5117;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Dining',
      slug: `grand-dining-${Date.now()}`,
      contactEmail: `dining_${Date.now()}@spicehub.in`,
      contactPhone: '9877700001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Attacker / Isolated Tenant)
    const tenantB = await Tenant.create({
      name: 'Rival FastFood',
      slug: `rival-fastfood-${Date.now()}`,
      contactEmail: `fastfood_${Date.now()}@spicehub.in`,
      contactPhone: '9877700002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Setup Tables
    const tableA = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-10',
      section: 'ROOFTOP',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableAId = tableA._id.toString();

    const tableB = await DiningTable.create({
      hotelId: tenantB._id,
      tableNumber: 'TB-01',
      section: 'INDOOR',
      capacity: 2,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableBId = tableB._id.toString();

    // 4. Setup Menu Items for Tenant A
    const item1 = await MenuItem.create({
      hotelId: tenantA._id,
      name: 'Paneer Tikka Sizzler',
      basePrice: 320,
      categoryId: new Types.ObjectId(),
      kitchenStationId: new Types.ObjectId(),
      isAvailable: true,
    });
    menuItem1Id = item1._id.toString();

    const item2 = await MenuItem.create({
      hotelId: tenantA._id,
      name: 'Masala Chaas Pitcher',
      basePrice: 120,
      categoryId: new Types.ObjectId(),
      kitchenStationId: new Types.ObjectId(),
      isAvailable: true,
    });
    menuItem2Id = item2._id.toString();

    waiterUserId = new Types.ObjectId().toString();
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/qr-locker/init-table generates permanent QR and cryptographic salt', async () => {
    const res = await request(app)
      .post('/api/v1/qr-locker/init-table')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: tableAId,
        domainUrl: 'https://menu.spicehub.in',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.locker).toBeDefined();
    expect(res.body.locker.tableNumber).toBe('T-10');
    expect(res.body.locker.permanentSalt).toBeDefined();
    expect(res.body.locker.permanentSalt.length).toBe(32); // 16 bytes hex = 32 chars
    expect(res.body.locker.permanentQrUrl).toContain('salt=');
    expect(res.body.locker.isLocked).toBe(false);

    permanentSaltA = res.body.locker.permanentSalt;
  });

  it('2. POST /api/v1/qr-locker/init-table is idempotent: returns existing permanent salt without re-rolling', async () => {
    const res = await request(app)
      .post('/api/v1/qr-locker/init-table')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId: tableAId,
        domainUrl: 'https://menu.spicehub.in',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Salt must remain identical so physical stickers never stop working
    expect(res.body.locker.permanentSalt).toBe(permanentSaltA);
  });

  it('3. POST /api/v1/qr-locker/scan cryptographically verifies salt and generates signed 2-hour session token', async () => {
    const res = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-10',
        salt: permanentSaltA,
        deviceFingerprint: 'guest-iphone-15-safari-fp99',
        clientIp: '192.168.1.105',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.qrSessionToken).toBeDefined();
    expect(res.body.qrSessionToken).toMatch(/^QRT-/);
    expect(res.body.tableNumber).toBe('T-10');
    expect(res.body.expiresAt).toBeDefined();

    validSessionTokenA = res.body.qrSessionToken;

    // Verify DB locker is locked to this session
    const locker = await TableQrLocker.findOne({ hotelId: tenantAId, tableNumber: 'T-10' });
    expect(locker!.isLocked).toBe(true);
    expect(locker!.activeSessionToken).toBe(validSessionTokenA);
    expect(locker!.deviceFingerprint).toBe('guest-iphone-15-safari-fp99');
  });

  it('4. POST /api/v1/qr-locker/scan blocks tampered salt with 403 ANTI_FRAUD_SALT_MISMATCH', async () => {
    const fakeSalt = 'bad_forged_salt_1234567890abcdef';
    const res = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-10',
        salt: fakeSalt,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ANTI_FRAUD_SALT_MISMATCH');
  });

  it('5. POST /api/v1/qr-locker/scan returns 404 for unknown table', async () => {
    const res = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'NON-EXISTENT-TABLE',
        salt: 'some-salt',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('6. POST /api/v1/qr-locker/order places order with 10-second waiter SLA deadline', async () => {
    const beforeOrder = Date.now();
    const res = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAId)
      .send({
        qrSessionToken: validSessionTokenA,
        tableNumber: 'T-10',
        customerName: 'Aarav Sharma',
        cookingInstructions: 'Less spicy paneer please',
        items: [
          {
            menuItemId: menuItem1Id,
            name: 'Paneer Tikka Sizzler',
            unitPrice: 320,
            quantity: 2,
            specialInstructions: 'Well charred',
          },
          {
            menuItemId: menuItem2Id,
            name: 'Masala Chaas Pitcher',
            unitPrice: 120,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBeDefined();
    expect(res.body.orderNumber).toBeDefined();
    expect(res.body.approvalStatus).toBe(OrderApprovalStatus.PENDING_WAITER_APPROVAL);
    expect(res.body.waiterSlaSeconds).toBe(10);
    expect(res.body.subTotal).toBe(760); // 320*2 + 120*1 = 760

    // Verify SLA deadline is ~10s in future
    const deadlineMs = new Date(res.body.approvalDeadline).getTime();
    expect(deadlineMs).toBeGreaterThanOrEqual(beforeOrder + 9500);
    expect(deadlineMs).toBeLessThanOrEqual(beforeOrder + 11500);

    // Verify DB order record
    const savedOrder = await RestaurantOrder.findById(res.body.orderId);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder!.orderStatus).toBe(OverallOrderStatus.PLACED);
    expect(savedOrder!.cookingInstructions).toBe('Less spicy paneer please');
    expect(savedOrder!.items.length).toBe(2);
  });

  it('7. POST /api/v1/qr-locker/order rejects forged qrSessionToken with 403 INVALID_QR_TOKEN', async () => {
    const forgedToken = 'QRT-FAKE-FORGED-SESSION-TOKEN-9999.badhash';
    const res = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAId)
      .send({
        qrSessionToken: forgedToken,
        tableNumber: 'T-10',
        items: [{ menuItemId: menuItem1Id, name: 'Paneer', unitPrice: 320, quantity: 1 }],
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_QR_TOKEN');
  });

  it('8. POST /api/v1/qr-locker/order rejects expired session token with 403 EXPIRED_QR_TOKEN', async () => {
    // Manually expire session in DB
    await TableQrLocker.updateOne(
      { hotelId: tenantAId, tableNumber: 'T-10' },
      { $set: { sessionExpiresAt: new Date(Date.now() - 10000) } } // 10s in past
    );

    const res = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAId)
      .send({
        qrSessionToken: validSessionTokenA,
        tableNumber: 'T-10',
        items: [{ menuItemId: menuItem1Id, name: 'Paneer', unitPrice: 320, quantity: 1 }],
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPIRED_QR_TOKEN');

    // Restore expiration for subsequent tests
    await TableQrLocker.updateOne(
      { hotelId: tenantAId, tableNumber: 'T-10' },
      { $set: { sessionExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) } }
    );
  });

  it('9. POST /api/v1/qr-locker/order/:orderId/waiter-action with APPROVE sends order directly to Kitchen KDS', async () => {
    // Place a fresh order to approve
    const placeRes = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAId)
      .send({
        qrSessionToken: validSessionTokenA,
        tableNumber: 'T-10',
        customerName: 'Pooja Hegde',
        items: [{ menuItemId: menuItem1Id, name: 'Paneer Tikka', unitPrice: 320, quantity: 1 }],
      });

    const orderId = placeRes.body.orderId;

    const actionRes = await request(app)
      .post(`/api/v1/qr-locker/order/${orderId}/waiter-action`)
      .set('x-hotel-id', tenantAId)
      .send({
        action: 'APPROVE',
        waiterId: waiterUserId,
      });

    expect(actionRes.status).toBe(200);
    expect(actionRes.body.success).toBe(true);
    expect(actionRes.body.order.approvalStatus).toBe(OrderApprovalStatus.APPROVED_BY_WAITER);
    expect(actionRes.body.order.orderStatus).toBe(OverallOrderStatus.ACCEPTED); // Routing to kitchen
    expect(actionRes.body.order.approvedByWaiterId).toBe(waiterUserId);
    expect(actionRes.body.order.approvedAt).toBeDefined();
  });

  it('10. POST /api/v1/qr-locker/order/:orderId/waiter-action with REJECT cancels order and records rejection reason', async () => {
    // Place an order to reject
    const placeRes = await request(app)
      .post('/api/v1/qr-locker/order')
      .set('x-hotel-id', tenantAId)
      .send({
        qrSessionToken: validSessionTokenA,
        tableNumber: 'T-10',
        customerName: 'Prank Guest',
        items: [{ menuItemId: menuItem1Id, name: 'Paneer Tikka', unitPrice: 320, quantity: 10 }],
      });

    const orderId = placeRes.body.orderId;

    const actionRes = await request(app)
      .post(`/api/v1/qr-locker/order/${orderId}/waiter-action`)
      .set('x-hotel-id', tenantAId)
      .send({
        action: 'REJECT',
        rejectionReason: 'Guest walked away / accidental order',
      });

    expect(actionRes.status).toBe(200);
    expect(actionRes.body.success).toBe(true);
    expect(actionRes.body.order.approvalStatus).toBe(OrderApprovalStatus.REJECTED_BY_WAITER);
    expect(actionRes.body.order.orderStatus).toBe(OverallOrderStatus.CANCELLED);
    expect(actionRes.body.order.cancellationReason).toBe('Guest walked away / accidental order');
  });

  it('11. POST /api/v1/qr-locker/order/:orderId/waiter-action rejects duplicate actions on resolved order', async () => {
    // Attempt to re-approve the already rejected order from test 10
    const resolvedOrder = await RestaurantOrder.findOne({
      hotelId: tenantAId,
      approvalStatus: OrderApprovalStatus.REJECTED_BY_WAITER,
    });

    const dupRes = await request(app)
      .post(`/api/v1/qr-locker/order/${resolvedOrder!._id}/waiter-action`)
      .set('x-hotel-id', tenantAId)
      .send({ action: 'APPROVE' });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toContain('already resolved');
  });

  it('12. POST /api/v1/qr-locker/sweep-auto-approvals auto-approves orders when 10-second SLA elapses', async () => {
    // Create 2 orders that have passed their 10s deadline
    const pastTime = new Date(Date.now() - 5000); // 5 seconds in past
    const timeoutOrder1 = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantAId),
      orderNumber: `KOT-TIMEOUT-1`,
      orderType: OrderType.DINE_IN,
      tableId: new Types.ObjectId(tableAId),
      items: [
        {
          menuItemId: new Types.ObjectId(menuItem1Id),
          kitchenStationId: new Types.ObjectId(),
          name: 'Paneer',
          unitPrice: 320,
          quantity: 1,
          subtotal: 320,
        },
      ],
      idempotencyKey: `IDEMP-TO1-${Date.now()}`,
      qrSessionToken: validSessionTokenA,
      orderStatus: OverallOrderStatus.PLACED,
      approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
      approvalDeadline: pastTime,
      placedAt: new Date(Date.now() - 15000),
    });

    const timeoutOrder2 = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantAId),
      orderNumber: `KOT-TIMEOUT-2`,
      orderType: OrderType.DINE_IN,
      tableId: new Types.ObjectId(tableAId),
      items: [
        {
          menuItemId: new Types.ObjectId(menuItem2Id),
          kitchenStationId: new Types.ObjectId(),
          name: 'Chaas',
          unitPrice: 120,
          quantity: 2,
          subtotal: 240,
        },
      ],
      idempotencyKey: `IDEMP-TO2-${Date.now()}`,
      qrSessionToken: validSessionTokenA,
      orderStatus: OverallOrderStatus.PLACED,
      approvalStatus: OrderApprovalStatus.PENDING_WAITER_APPROVAL,
      approvalDeadline: pastTime,
      placedAt: new Date(Date.now() - 15000),
    });

    // Run sweep
    const sweepRes = await request(app)
      .post('/api/v1/qr-locker/sweep-auto-approvals')
      .set('x-hotel-id', tenantAId);

    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.success).toBe(true);
    expect(sweepRes.body.sweptCount).toBeGreaterThanOrEqual(2);
    expect(sweepRes.body.autoApprovedOrderNumbers).toContain('KOT-TIMEOUT-1');
    expect(sweepRes.body.autoApprovedOrderNumbers).toContain('KOT-TIMEOUT-2');

    // Verify DB states: routed to KDS as ACCEPTED
    const o1 = await RestaurantOrder.findById(timeoutOrder1._id);
    expect(o1!.approvalStatus).toBe(OrderApprovalStatus.AUTO_APPROVED_TIMEOUT);
    expect(o1!.orderStatus).toBe(OverallOrderStatus.ACCEPTED);

    const o2 = await RestaurantOrder.findById(timeoutOrder2._id);
    expect(o2!.approvalStatus).toBe(OrderApprovalStatus.AUTO_APPROVED_TIMEOUT);
    expect(o2!.orderStatus).toBe(OverallOrderStatus.ACCEPTED);
  });

  it('13. POST /api/v1/qr-locker/release-session unbinds table and clears token for next party', async () => {
    const releaseRes = await request(app)
      .post('/api/v1/qr-locker/release-session')
      .set('x-hotel-id', tenantAId)
      .send({ tableNumber: 'T-10' });

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.success).toBe(true);
    expect(releaseRes.body.message).toContain('unlocked');

    // Verify locker is now unlocked and session token cleared
    const locker = await TableQrLocker.findOne({ hotelId: tenantAId, tableNumber: 'T-10' });
    expect(locker!.isLocked).toBe(false);
    expect(locker!.activeSessionToken).toBeUndefined();
    // But permanent salt stays preserved!
    expect(locker!.permanentSalt).toBe(permanentSaltA);
  });

  it('14. Strict Multi-Tenant Isolation: Tenant B cannot scan or modify Tenant A table locker', async () => {
    // 1. Tenant B tries to scan Tenant A's table T-10
    const scanRes = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantBId) // Tenant B header
      .send({
        tableNumber: 'T-10',
        salt: permanentSaltA,
      });

    // Tenant B has no T-10 registered
    expect(scanRes.status).toBe(404);

    // 2. Tenant B tries to release Tenant A's table
    const releaseRes = await request(app)
      .post('/api/v1/qr-locker/release-session')
      .set('x-hotel-id', tenantBId)
      .send({ tableNumber: 'T-10' });

    expect(releaseRes.status).toBe(404);
  });

  it('15. Concurrent Orders Stress Drill: 5 parallel customer requests under active session resolve safely', async () => {
    // Re-lock table session for concurrency drill
    const scanRes = await request(app)
      .post('/api/v1/qr-locker/scan')
      .set('x-hotel-id', tenantAId)
      .send({
        tableNumber: 'T-10',
        salt: permanentSaltA,
      });
    const drillToken = scanRes.body.qrSessionToken;

    // Send 5 parallel order requests simultaneously
    const orderPromises = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/v1/qr-locker/order')
        .set('x-hotel-id', tenantAId)
        .send({
          qrSessionToken: drillToken,
          tableNumber: 'T-10',
          customerName: `Guest ${i + 1}`,
          items: [
            {
              menuItemId: menuItem1Id,
              name: 'Paneer Tikka Sizzler',
              unitPrice: 320,
              quantity: 1,
            },
          ],
        })
    );

    const results = await Promise.all(orderPromises);

    // All 5 must succeed with 201 Created and unique orderNumbers
    results.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.approvalStatus).toBe(OrderApprovalStatus.PENDING_WAITER_APPROVAL);
    });

    const orderNumbers = results.map((r) => r.body.orderNumber);
    const uniqueNumbers = new Set(orderNumbers);
    expect(uniqueNumbers.size).toBe(5);
  });
});
