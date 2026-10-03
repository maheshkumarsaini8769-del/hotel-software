import mongoose from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { UserRole, FoodType } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  BillingCalculatorHelper,
  CurrencyDenomination,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 15 / GATE 15: RESTAURANT BILLING, SPLIT & CASHIER SHIFT CLOSE ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let cashierUser: any;
  let cashierId: string;
  let cashierToken: string;
  let tableId: string;
  let sessionId: string;
  let billId: string;
  let billGrandTotal: number;
  const userPassword = 'TestPassword123!';
  const cashierEmail = `cashier_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5095;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `billing-lounge-${Date.now()}`,
      contactEmail: `billing_${Date.now()}@spicehub.com`,
      contactPhone: '9888811122',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Cashier User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    cashierUser = await User.create({
      hotelId: tenant._id,
      name: 'Sunita Cashier',
      email: cashierEmail,
      phone: '9888811121',
      passwordHash: hash,
      role: UserRole.CASHIER,
      isActive: true,
    });
    cashierId = cashierUser._id.toString();

    // 3. Setup Table & Session
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'B-1',
      section: 'MAIN_HALL',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });
    tableId = table._id.toString();

    const session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'dummy_billing_hash',
      status: SessionStatus.ACTIVE,
    });
    sessionId = session._id.toString();
    table.activeSessionId = session._id as mongoose.Types.ObjectId;
    await table.save();

    // 4. Setup Kitchen Station & Menu Items
    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'HOT_KITCHEN',
      screenToken: 'station_hot_kitchen',
    });

    const dish1 = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Paneer Lababdar',
      foodType: FoodType.VEG,
      basePrice: 350,
      isAvailable: true,
    });

    const dish2 = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Garlic Butter Naan',
      foodType: FoodType.VEG,
      basePrice: 75,
      isAvailable: true,
    });

    // 5. Place active Order: 2 x Paneer (700) + 4 x Naan (300) = 1,000 subtotal
    await RestaurantOrder.create({
      hotelId: tenant._id,
      tableSessionId: session._id,
      tableId: table._id,
      orderType: OrderType.DINE_IN,
      orderNumber: `ORD-${Date.now()}`,
      idempotencyKey: `idemp_bill_${Date.now()}`,
      items: [
        {
          menuItemId: dish1._id,
          kitchenStationId: station._id,
          name: dish1.name,
          quantity: 2,
          unitPrice: 350,
          subtotal: 700,
        },
        {
          menuItemId: dish2._id,
          kitchenStationId: station._id,
          name: dish2.name,
          quantity: 4,
          unitPrice: 75,
          subtotal: 300,
        },
      ],
      orderStatus: OverallOrderStatus.PREPARING,
      placedAt: new Date(),
    });

    // 6. Initialize SpiceHubClient and authenticate as Cashier
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: cashierEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    cashierToken = loginRes.data.token;
    client.setAuthToken(cashierToken);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await RestaurantBill.deleteMany({ hotelId: tenantId });
    await Payment.deleteMany({ hotelId: tenantId });
    await ShiftReconciliation.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: 5% Dynamic GST Snapshot & Bill Generation
  test('1. POST /api/v1/billing/bill/generate locks 5% GST snapshot (2.5% CGST + 2.5% SGST) and updates table to BILLING', async () => {
    const res = await fetch(`${testServerUrl}/api/v1/billing/bill/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        hotelId: tenantId,
        tableSessionId: sessionId,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.subTotal).toBe(1000);
    expect(json.data.totalTax).toBe(50); // 5% of 1000 = 50
    expect(json.data.grandTotal).toBe(1050); // 1000 + 50
    expect(json.data.dueAmount).toBe(1050);
    expect(json.data.isSnapshotLocked).toBe(true);

    billId = json.data._id;
    billGrandTotal = json.data.grandTotal;

    // Verify DB Table and Session transition to BILLING
    const updatedTable = await DiningTable.findById(tableId);
    expect(updatedTable?.currentStatus).toBe(TableStatus.BILLING);

    const updatedSession = await TableSession.findById(sessionId);
    expect(updatedSession?.status).toBe(SessionStatus.BILLING);
  });

  // TEST 2: Equal 3-Way Split Bill Calculator
  test('2. POST /api/v1/billing/bill/split-calc computes accurate 3-way equal split with remainder penny rounding', async () => {
    const res = await fetch(`${testServerUrl}/api/v1/billing/bill/split-calc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        billId,
        splitType: 'EQUAL',
        splitCount: 3,
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.splits.length).toBe(3);

    // 1050 / 3 = 350 exactly
    expect(json.splits[0].amount).toBe(350);
    expect(json.splits[1].amount).toBe(350);
    expect(json.splits[2].amount).toBe(350);

    const totalSplit = json.splits.reduce((acc: number, s: any) => acc + s.amount, 0);
    expect(totalSplit).toBe(billGrandTotal);
  });

  // TEST 3: Custom Split Bill Validation
  test('3. Custom Split accurately accepts balanced shares and strictly rejects unbalanced splits (400 SPLIT_MISMATCH)', async () => {
    // 1. Valid Custom Split: 600 + 450 = 1050
    const validRes = await fetch(`${testServerUrl}/api/v1/billing/bill/split-calc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        billId,
        splitType: 'CUSTOM',
        customSplits: [
          { personNumber: 1, amount: 600 },
          { personNumber: 2, amount: 450 },
        ],
      }),
    });

    const validJson = (await validRes.json()) as any;
    expect(validRes.status).toBe(200);
    expect(validJson.success).toBe(true);
    expect(validJson.splits.length).toBe(2);

    // 2. Invalid Custom Split: 500 + 400 = 900 != 1050
    const invalidRes = await fetch(`${testServerUrl}/api/v1/billing/bill/split-calc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        billId,
        splitType: 'CUSTOM',
        customSplits: [
          { personNumber: 1, amount: 500 },
          { personNumber: 2, amount: 400 },
        ],
      }),
    });

    const invalidJson = (await invalidRes.json()) as any;
    expect(invalidRes.status).toBe(400);
    expect(invalidJson.success).toBe(false);
    expect(invalidJson.errorCode).toBe('SPLIT_MISMATCH');
  });

  // TEST 4: Cash Payment with Change Return & Idempotency
  test('4. Cash payment of ₹1,100 on ₹1,050 bill returns ₹50 change, marks bill PAID, and deduplicates retries', async () => {
    const idempotencyKey = `idemp_pay_cash_${Date.now()}`;

    const paymentPayload = {
      hotelId: tenantId,
      billId,
      paymentMode: 'CASH',
      amount: billGrandTotal, // 1050
      cashReceived: 1100, // Guest gave 1100
    };

    // First attempt
    const res1 = await fetch(`${testServerUrl}/api/v1/billing/payment/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const json1 = (await res1.json()) as any;
    expect(res1.status).toBe(201);
    expect(json1.success).toBe(true);
    expect(json1.data.payment.amount).toBe(1050);
    expect(json1.data.payment.cashReceived).toBe(1100);
    expect(json1.data.changeReturned).toBe(50); // 1100 - 1050 = 50

    // Verify Bill is now PAID
    const paidBill = await RestaurantBill.findById(billId);
    expect(paidBill?.billStatus).toBe(BillStatus.PAID);
    expect(paidBill?.dueAmount).toBe(0);

    // Duplicate submission with same idempotency key
    const res2 = await fetch(`${testServerUrl}/api/v1/billing/payment/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const json2 = (await res2.json()) as any;
    expect(res2.status).toBe(200);
    expect(json2.success).toBe(true);
    expect(json2.message).toContain('idempotent');
  });

  // TEST 5: BillingCalculatorHelper Unit Tests
  test('5. BillingCalculatorHelper validates 5% GST, denominations breakdown, and shift variances', () => {
    // GST
    const gstCalc = BillingCalculatorHelper.calculate5PercentGst(2000, 200); // 1800 taxable
    expect(gstCalc.taxableAmount).toBe(1800);
    expect(gstCalc.cgstAmount).toBe(45); // 2.5%
    expect(gstCalc.sgstAmount).toBe(45); // 2.5%
    expect(gstCalc.totalTax).toBe(90);
    expect(gstCalc.grandTotal).toBe(1890);

    // Cash Change
    const change = BillingCalculatorHelper.calculateCashChange(1890, 2000);
    expect(change.changeDue).toBe(110);
    expect(change.isSufficient).toBe(true);

    const insuff = BillingCalculatorHelper.calculateCashChange(1890, 1500);
    expect(insuff.isSufficient).toBe(false);

    // Denominations Total: 5x500 + 4x200 + 2x100 + 1x50 = 2500 + 800 + 200 + 50 = 3550
    const noteCounts: Record<CurrencyDenomination, number> = {
      2000: 0,
      500: 5,
      200: 4,
      100: 2,
      50: 1,
      20: 0,
      10: 0,
      5: 0,
      1: 0,
    };
    const denomRes = BillingCalculatorHelper.calculateDenominationsTotal(noteCounts);
    expect(denomRes.total).toBe(3550);
    expect(denomRes.breakdown.length).toBe(4);

    // Shift Variance: Opening Float = 2000, Cash Sales = 1050 -> Expected = 3050. Counted = 3050 -> BALANCED
    const balanced = BillingCalculatorHelper.calculateShiftVariance(2000, 3050, 1050);
    expect(balanced.status).toBe('BALANCED');
    expect(balanced.varianceAmount).toBe(0);

    // Shortage: Counted = 2950 -> -100
    const shortage = BillingCalculatorHelper.calculateShiftVariance(2000, 2950, 1050);
    expect(shortage.status).toBe('SHORTAGE');
    expect(shortage.varianceAmount).toBe(-100);
  });

  // TEST 6: Cashier Blind Shift Close Audit & Certificate Generation
  test('6. POST /api/v1/billing/shift/blind-close audits physical notes vs cash sales and generates certificate', async () => {
    // Physical note count:
    // Opening float = 2000
    // Previous cash sale = 1050
    // Expected = 3050
    // Cashier counts: 5 x ₹500 (2500) + 2 x ₹200 (400) + 1 x ₹100 (100) + 1 x ₹50 (50) = 3,050
    const noteCounts = [
      { denomination: 500, count: 5 },
      { denomination: 200, count: 2 },
      { denomination: 100, count: 1 },
      { denomination: 50, count: 1 },
    ];

    const res = await fetch(`${testServerUrl}/api/v1/billing/shift/blind-close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        openingFloatCash: 2000,
        noteCounts,
        notes: 'Evening shift smoothly reconciled',
      }),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.certificateNumber).toContain('CERT-SHIFT');
    expect(json.data.systemExpectedCash).toBe(3050);
    expect(json.data.actualCountedCash).toBe(3050);
    expect(json.data.varianceAmount).toBe(0);
    expect(json.data.status).toBe('BALANCED');

    // Verify DB ShiftReconciliation document
    const reconDoc = await ShiftReconciliation.findOne({
      hotelId: tenantId,
      reconciliationCertificateNumber: json.data.certificateNumber,
    });
    expect(reconDoc).toBeDefined();
    expect(reconDoc?.isBlindCloseCompleted).toBe(true);
  });
});
