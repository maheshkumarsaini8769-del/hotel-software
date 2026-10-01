import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { RestaurantOrder, OrderType, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { UserRole } from '../types';

describe('--- SHIFT 23 / GATE 23: DEDICATED FAST CASHIER POS MODE (BARCODE & 10-KEY NUMPAD, AUTO TOKEN, CHANGE ENGINE) ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let cashierToken: string;
  let rivalToken: string;
  let itemChaiId: string;
  let itemBiryaniId: string;
  let order1Id: string;
  let order2Id: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5103;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'Express SpiceHub QSR Counter',
      slug: `qsr-counter-${Date.now()}`,
      contactEmail: `qsr_${Date.now()}@spicehub.com`,
      contactPhone: '9822200001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Fast Food Hub',
      slug: `rival-qsr-${Date.now()}`,
      contactEmail: `rival_qsr_${Date.now()}@spicehub.com`,
      contactPhone: '9822200002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Cashier User for Tenant A
    const cashier = await User.create({
      hotelId: tenantA._id,
      name: 'Speed Cashier Rohit Sharma',
      email: `rohit_cashier_${Date.now()}@spicehub.com`,
      phone: '9822200003',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    cashierToken = jwt.sign(
      {
        userId: cashier._id.toString(),
        hotelId: tenantAId,
        role: UserRole.CASHIER,
        email: cashier.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Create User for Tenant B
    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Cashier',
      email: `rival_cashier_${Date.now()}@spicehub.com`,
      phone: '9822200004',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      isActive: true,
    });

    rivalToken = jwt.sign(
      {
        userId: rivalUser._id.toString(),
        hotelId: tenantBId,
        role: UserRole.CASHIER,
        email: rivalUser.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Seed Catalog with 10-Key Shortcut Codes and Barcodes for Tenant A
    const dummyCatId = new mongoose.Types.ObjectId();
    const dummyStationId = new mongoose.Types.ObjectId();

    const itemChai = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: dummyCatId,
      kitchenStationId: dummyStationId,
      name: 'Signature Adrak Elaichi Chai',
      basePrice: 40,
      itemCode: '101',
      barcode: '890100100001',
      isAvailable: true,
    });
    itemChaiId = itemChai._id.toString();

    const itemBiryani = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: dummyCatId,
      kitchenStationId: dummyStationId,
      name: 'Dum Hyderabadi Chicken Biryani Box',
      basePrice: 260,
      itemCode: '301',
      barcode: '890300100001',
      isAvailable: true,
    });
    itemBiryaniId = itemBiryani._id.toString();
  });

  afterAll(async () => {
    await MenuItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Payment.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Quick Lookup: Find item by 10-Key Shortcut Code (e.g. 101)', async () => {
    const res = await request(app)
      .get('/api/v1/fast-cashier/lookup?code=101')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.name).toBe('Signature Adrak Elaichi Chai');
    expect(res.body.item.basePrice).toBe(40);
    expect(res.body.item.itemCode).toBe('101');
  });

  // TEST 2
  it('2. Quick Lookup: Find item by EAN/UPC Barcode (e.g. 890300100001)', async () => {
    const res = await request(app)
      .get('/api/v1/fast-cashier/lookup?code=890300100001')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.name).toBe('Dum Hyderabadi Chicken Biryani Box');
    expect(res.body.item.basePrice).toBe(260);
    expect(res.body.item.barcode).toBe('890300100001');
  });

  // TEST 3
  it('3. Instant Fast Counter Order: Auto Token #001, 5% GST, Cash Tender & Change Due', async () => {
    // 2 x Chai (80) + 1 x Biryani (260) = Subtotal 340
    // 5% GST = 17 => Grand Total = 357
    // Tender ₹500 note => Change = 143
    const res = await request(app)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [
          { menuItemId: itemChaiId, quantity: 2 },
          { menuItemId: itemBiryaniId, quantity: 1, specialInstructions: 'Extra spicy salan' },
        ],
        customerName: 'Aman Verma',
        customerPhone: '9876543210',
        paymentMethod: PaymentMode.CASH,
        tenderAmount: 500,
        cookingInstructions: 'Pack in insulated box',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenNumber).toBe(1);
    expect(res.body.order.orderType).toBe(OrderType.TAKEAWAY);
    expect(res.body.order.customerName).toBe('Aman Verma');

    // Verify Financials
    expect(res.body.financials.subtotal).toBe(340);
    expect(res.body.financials.taxAmount).toBe(17);
    expect(res.body.financials.grandTotal).toBe(357);
    expect(res.body.financials.tenderAmount).toBe(500);
    expect(res.body.financials.changeAmount).toBe(143);

    order1Id = res.body.order._id;
  });

  // TEST 4
  it('4. Sequential Daily Token: Next Takeaway order automatically gets Token #002', async () => {
    const res = await request(app)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [{ menuItemId: itemChaiId, quantity: 1 }],
        paymentMethod: PaymentMode.UPI,
        tenderAmount: 42,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenNumber).toBe(2);
    expect(res.body.order.tokenNumber).toBe(2);

    order2Id = res.body.order._id;
  });

  // TEST 5
  it('5. Verify RestaurantBill & Payment records auto-settled with zero due', async () => {
    const bill = await RestaurantBill.findOne({ orderIds: order1Id, hotelId: tenantAId });
    expect(bill).toBeDefined();
    expect(bill?.billStatus).toBe(BillStatus.PAID);
    expect(bill?.grandTotal).toBe(357);
    expect(bill?.paidAmount).toBe(357);
    expect(bill?.dueAmount).toBe(0);

    const payment = await Payment.findOne({ billId: bill?._id, hotelId: tenantAId });
    expect(payment).toBeDefined();
    expect(payment?.status).toBe(PaymentStatus.SUCCESS);
    expect(payment?.paymentMode).toBe(PaymentMode.CASH);
    expect(payment?.cashReceived).toBe(500);
    expect(payment?.cashChangeReturned).toBe(143);
  });

  // TEST 6
  it('6. Real-Time Takeaway Calling Queue: List orders in PREPARING & READY states', async () => {
    const res = await request(app)
      .get('/api/v1/fast-cashier/queue')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalActiveTakeaways).toBe(2);
    expect(res.body.preparingQueue.length).toBe(2);
    expect(res.body.preparingQueue[0].tokenNumber).toBe(1);
    expect(res.body.preparingQueue[1].tokenNumber).toBe(2);
  });

  // TEST 7
  it('7. Hand Over / Mark Takeaway Picked Up by Guest transitions status to SERVED', async () => {
    const res = await request(app)
      .patch(`/api/v1/fast-cashier/order/${order1Id}/pickup`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.orderStatus).toBe(OverallOrderStatus.SERVED);

    // Check queue after pickup
    const queueRes = await request(app)
      .get('/api/v1/fast-cashier/queue')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('x-hotel-id', tenantAId);

    expect(queueRes.body.completedQueue.some((o: any) => o._id === order1Id)).toBe(true);
  });

  // TEST 8
  it('8. Strict Multi-Tenant Isolation: Competitor cannot lookup Tenant A items or orders', async () => {
    // Attempt lookup of Tenant A's 101 item with Tenant B credentials
    const res = await request(app)
      .get('/api/v1/fast-cashier/lookup?code=101')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ITEM_NOT_FOUND');

    // Attempt pickup of Tenant A's order with Tenant B credentials
    const pickupRes = await request(app)
      .patch(`/api/v1/fast-cashier/order/${order2Id}/pickup`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(pickupRes.status).toBe(404);
    expect(pickupRes.body.success).toBe(false);
    expect(pickupRes.body.errorCode).toBe('ORDER_NOT_FOUND');
  });
});
