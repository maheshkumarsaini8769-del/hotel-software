import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { UserRole, ShiftStatus } from '../types';

describe('--- SHIFT 4 / GATE 4: RESTAURANT BILLING, SPLIT, CASH DRAWER & FINANCIAL AUDIT ---', () => {
  let tenantId: string;
  let cashierUser: any;
  let cashierToken: string;
  let tableId: string;
  let tableSessionId: string;
  let menuItemId: string;
  let billId: string;
  let grandTotal: number;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const uniqueSlug = `billing-audit-hotel-${Date.now()}`;
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Billing Hotel',
      slug: uniqueSlug,
      contactEmail: `billing_${Date.now()}@spicehub.com`,
      contactPhone: '9888877777',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    cashierUser = await User.create({
      hotelId: tenant._id,
      name: 'Rohan Cashier',
      email: `rohan_${Date.now()}@spicehub.com`,
      phone: '9877766655',
      passwordHash: 'dummy_hash',
      role: UserRole.CASHIER,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    cashierToken = jwt.sign(
      {
        userId: cashierUser._id.toString(),
        hotelId: tenantId,
        role: cashierUser.role,
        email: cashierUser.email,
        permissions: ['CASHIER_BILLING'],
      },
      secret,
      { expiresIn: '1h' }
    );

    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'FAST_BILL_KITCHEN',
      screenToken: 'station_fast_bill_token',
    });

    const dish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Paneer Butter Masala',
      foodType: FoodType.VEG,
      basePrice: 300,
      isAvailable: true,
    });
    menuItemId = dish._id.toString();

    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-BILL-01',
      section: 'FINE_DINE',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });
    tableId = table._id.toString();

    const session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'billing_session_token_hash_01',
      status: SessionStatus.ACTIVE,
    });
    tableSessionId = session._id.toString();

    // Create an active order of 2 dishes (2 * 300 = 600)
    await RestaurantOrder.create({
      hotelId: tenant._id,
      orderNumber: 'ORD-BILL-TEST',
      orderType: 'DINE_IN',
      tableSessionId: session._id,
      tableId: table._id,
      items: [
        {
          menuItemId: dish._id,
          kitchenStationId: station._id,
          name: dish.name,
          unitPrice: 300,
          quantity: 2,
          subtotal: 600,
          itemStatus: 'SERVED',
        },
      ],
      orderStatus: OverallOrderStatus.SERVED,
      idempotencyKey: `order_bill_test_key_${Date.now()}`,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await KitchenStation.deleteMany({ hotelId: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await RestaurantBill.deleteMany({ hotelId: tenantId });
    await Payment.deleteMany({ hotelId: tenantId });
    await ShiftReconciliation.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Generate Bill with Dynamic GST (2.5% CGST + 2.5% SGST) & Snapshot Lock
  test('1. Authoritative Bill Generation with 5% Dynamic GST & Snapshot Lock', async () => {
    const res = await request(app).post('/api/v1/billing/bill/generate').send({
      hotelId: tenantId,
      tableSessionId,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subTotal).toBe(600);

    // Tax check: 600 * 2.5% = 15 CGST, 15 SGST, Total Tax = 30
    expect(res.body.data.totalTax).toBe(30);
    // Grand Total: 600 + 30 = 630
    expect(res.body.data.grandTotal).toBe(630);
    expect(res.body.data.isSnapshotLocked).toBe(true);
    expect(res.body.data.billStatus).toBe(BillStatus.UNPAID);

    billId = res.body.data._id;
    grandTotal = res.body.data.grandTotal;

    // Verify DiningTable status changed to BILLING
    const table = await DiningTable.findById(tableId);
    expect(table?.currentStatus).toBe(TableStatus.BILLING);
  });

  // TEST 2: Equal Split Bill Calculation
  test('2. Split Bill Engine Calculates Equal 3-Way Distribution Accurately', async () => {
    const res = await request(app).post('/api/v1/billing/bill/split-calc').send({
      billId,
      splitType: 'EQUAL',
      splitCount: 3,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.splits.length).toBe(3);
    // 630 / 3 = 210 each
    expect(res.body.splits[0].amount).toBe(210);
    expect(res.body.splits[1].amount).toBe(210);
    expect(res.body.splits[2].amount).toBe(210);
  });

  // TEST 3: Cash Tender Calculation (Customer gives ₹1,000 for ₹630 bill ➔ ₹370 change)
  test('3. Cash Payment Calculates Exact Tender Change and Updates Bill to PAID', async () => {
    const idempotencyKey = `cash_payment_key_${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/billing/payment/process')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        hotelId: tenantId,
        billId,
        paymentMode: PaymentMode.CASH,
        amount: 630,
        cashReceived: 1000, // Customer gave two 500 notes
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.changeReturned).toBe(370); // 1000 - 630 = 370
    expect(res.body.data.billStatus).toBe(BillStatus.PAID);

    // CRITICAL ARCHITECTURE RULE VERIFICATION:
    // Payment success must NOT mark the table AVAILABLE; it marks PAYMENT_SETTLED!
    const table = await DiningTable.findById(tableId);
    expect(table?.currentStatus).toBe(TableStatus.PAYMENT_SETTLED);
    expect(table?.currentStatus).not.toBe(TableStatus.AVAILABLE);
  });

  // TEST 4: Payment Idempotency Protection - Double Payment Click Blocked
  test('4. Idempotency Key Safely Prevents Double Payment Processing', async () => {
    const sameKey = `payment_idemp_key_double_click_test`;

    // Create a fresh unpaid bill for this test
    const idempBill = await RestaurantBill.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      billNumber: `BILL-IDEMP-${Date.now()}`,
      tableSessionId: new mongoose.Types.ObjectId(tableSessionId),
      tableId: new mongoose.Types.ObjectId(tableId),
      subTotal: 200,
      totalTax: 10,
      grandTotal: 210,
      dueAmount: 210,
      billStatus: BillStatus.UNPAID,
    });

    // 1st Click
    const firstRes = await request(app)
      .post('/api/v1/billing/payment/process')
      .set('x-idempotency-key', sameKey)
      .send({
        hotelId: tenantId,
        billId: idempBill._id,
        paymentMode: PaymentMode.UPI,
        amount: 210,
        utrNumber: 'UPI9988776655',
      });

    expect(firstRes.status).toBe(201);

    // 2nd Click at same time
    const secondRes = await request(app)
      .post('/api/v1/billing/payment/process')
      .set('x-idempotency-key', sameKey)
      .send({
        hotelId: tenantId,
        billId: idempBill._id,
        paymentMode: PaymentMode.UPI,
        amount: 210,
        utrNumber: 'UPI9988776655',
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.message).toContain('idempotent');

    const paymentCount = await Payment.countDocuments({
      hotelId: tenantId,
      idempotencyKey: sameKey,
    });
    expect(paymentCount).toBe(1);
  });

  // TEST 5: Blind Cash Drawer Shift Settlement & Physical Notes Breakdown
  test('5. Cashier Blind Shift Close Reconciles Physical Notes and Detects Variance', async () => {
    // Cash sales completed above: ₹630
    // Opening float cash: ₹500
    // Total System Expected Cash: 500 + 630 = ₹1,130

    // Cashier blindly counts drawer:
    // Notes: 2x 500 (= 1000), 1x 100 (= 100), 1x 50 (= 50) ➔ Total Counted: ₹1,150
    // Expected Variance: +₹20 (Excess)

    const res = await request(app)
      .post('/api/v1/billing/shift/blind-close')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        openingFloatCash: 500,
        noteCounts: [
          { denomination: 500, count: 2 },
          { denomination: 100, count: 1 },
          { denomination: 50, count: 1 },
        ],
        notes: 'End of dinner rush shift close',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.systemExpectedCash).toBe(1130);
    expect(res.body.data.actualCountedCash).toBe(1150);
    expect(res.body.data.varianceAmount).toBe(20);
    expect(res.body.data.status).toBe('EXCESS');
  });

  // TEST 6: Financial Boundary - Cash Received Less than Amount Rejection
  test('6. Rejects Cash Payment when Cash Received is Less than Bill Amount', async () => {
    // Create new temporary bill for ₹500
    const tempBill = await RestaurantBill.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      billNumber: `BILL-REJECT-${Date.now()}`,
      tableSessionId: new mongoose.Types.ObjectId(tableSessionId),
      tableId: new mongoose.Types.ObjectId(tableId),
      subTotal: 500,
      totalTax: 25,
      grandTotal: 525,
      dueAmount: 525,
      billStatus: BillStatus.UNPAID,
    });

    const res = await request(app)
      .post('/api/v1/billing/payment/process')
      .set('x-idempotency-key', `reject_insufficient_${Date.now()}`)
      .send({
        hotelId: tenantId,
        billId: tempBill._id,
        paymentMode: PaymentMode.CASH,
        amount: 525,
        cashReceived: 400, // Insufficient!
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INSUFFICIENT_CASH');
  });
});
