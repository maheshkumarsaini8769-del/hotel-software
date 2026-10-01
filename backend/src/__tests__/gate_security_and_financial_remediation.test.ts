import mongoose, { Types } from 'mongoose';
import argon2 from 'argon2';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { DynamicUpiQr, UpiQrStatus } from '../models/DynamicUpiQr';
import { StockBatch, BatchFreshnessStatus } from '../models/StockBatch';
import { StoreRequisition, RequisitionStatus, RequisitionDepartment, RequisitionUrgency } from '../models/StoreRequisition';
import { NightAuditSession, NightAuditStatus } from '../models/NightAuditSession';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';

// Frontend Store Imports to verify Singleton methods exist
import { MenuCartStore } from '../../../packages/ui/src/menu-cart/MenuCartStore';
import { GuestPortalStore } from '../../../packages/ui/src/guest-portal/GuestPortalStore';
import { KdsStore } from '../../../packages/ui/src/kds/KdsStore';
import { WaiterStore } from '../../../packages/ui/src/waiter/WaiterStore';
import { MatrixStore } from '../../../packages/ui/src/pms/MatrixStore';

describe('--- REMEDIATION GATE: ADVERSARIAL FINANCIAL, SECURITY & STORE TESTS ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let cashierToken: string;
  let testDish: any;
  let testStation: any;
  let cashierUser: any;
  const userPassword = 'TestPassword123!';
  const port = 5145;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    const tenant = await Tenant.create({
      name: 'Remediation Luxury Hotel',
      slug: `remedy-${Date.now()}`,
      contactEmail: `remedy_${Date.now()}@spicehub.com`,
      contactPhone: '9888800055',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const passwordHash = await argon2.hash(userPassword);
    const pinCodeHash = await argon2.hash('1234');

    cashierUser = await User.create({
      hotelId: tenant._id,
      name: 'Cashier Aman',
      email: `cashier_${Date.now()}@spicehub.com`,
      phone: '9876543211',
      passwordHash,
      pinCodeHash,
      role: UserRole.CASHIER,
      isActive: true,
      permissions: ['pos:orders:create', 'billing:manage'],
    });

    testStation = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'Main Kitchen',
      stationCode: 'MK',
      screenToken: `station_${Date.now()}`,
      isActive: true,
    });

    const category = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Special Dishes',
      slug: `special-${Date.now()}`,
      displayOrder: 1,
    });

    testDish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: testStation._id,
      name: 'Royal Thali Special',
      itemCode: 'RT-101',
      foodType: FoodType.VEG,
      basePrice: 500,
      price: 500,
      isAvailable: true,
    });

    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: cashierUser.email,
      password: userPassword,
      hotelId: tenantId,
    });
    cashierToken = loginRes.data.token;
    client.setAuthToken(cashierToken);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await Tenant.deleteMany({ _id: tenantId });
      await User.deleteMany({ hotelId: tenantId });
      await DiningTable.deleteMany({ hotelId: tenantId });
      await TableSession.deleteMany({ hotelId: tenantId });
      await MenuItem.deleteMany({ hotelId: tenantId });
      await MenuCategory.deleteMany({ hotelId: tenantId });
      await KitchenStation.deleteMany({ hotelId: tenantId });
      await RestaurantBill.deleteMany({ hotelId: tenantId });
      await DynamicUpiQr.deleteMany({ hotelId: tenantId });
      await StockBatch.deleteMany({ hotelId: tenantId });
      await StoreRequisition.deleteMany({ hotelId: tenantId });
      await NightAuditSession.deleteMany({ hotelId: tenantId });
      await mongoose.disconnect();
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1: Frontend Singletons verification
  it('1. should verify that all 5 UI stores provide valid static getInstance() singletons without throwing', () => {
    expect(() => MenuCartStore.getInstance()).not.toThrow();
    expect(MenuCartStore.getInstance()).toBeDefined();

    expect(() => GuestPortalStore.getInstance()).not.toThrow();
    expect(GuestPortalStore.getInstance()).toBeDefined();

    expect(() => KdsStore.getInstance()).not.toThrow();
    expect(KdsStore.getInstance()).toBeDefined();

    expect(() => WaiterStore.getInstance()).not.toThrow();
    expect(WaiterStore.getInstance()).toBeDefined();

    expect(() => MatrixStore.getInstance()).not.toThrow();
    expect(MatrixStore.getInstance()).toBeDefined();
  });

  // TEST 2: Fast Cashier Adversarial Test - Reject underpaid tender amount (₹10 on ₹525 bill)
  it('2. should reject fast cashier order when tenderAmount is less than grandTotal', async () => {
    await expect(
      client.request('POST', '/api/v1/fast-cashier/order', {
        hotelId: tenantId,
        items: [{ menuItemId: testDish._id.toString(), quantity: 1 }],
        tenderAmount: 10, // Attempting to pay ₹10 on a ₹525 bill!
        paymentMethod: 'CASH',
      })
    ).rejects.toThrow();
  });

  // TEST 3: Fast Cashier - Settle bill properly when tenderAmount >= grandTotal
  it('3. should accept fast cashier order when tenderAmount >= grandTotal and return exact change', async () => {
    const res = await client.request<any>('POST', '/api/v1/fast-cashier/order', {
      hotelId: tenantId,
      items: [{ menuItemId: testDish._id.toString(), quantity: 1 }],
      tenderAmount: 1000,
      paymentMethod: 'CASH',
    });

    expect(res.success).toBe(true);
    expect(res.bill.billStatus).toBe(BillStatus.PAID);
    expect(res.bill.paidAmount).toBe(res.bill.grandTotal);
    expect(res.financials.changeAmount).toBe(1000 - res.bill.grandTotal);
  });

  // TEST 4: Dynamic UPI Webhook Adversarial Test - Reject mismatched amount
  it('4. should reject UPI webhook if amount reported by gateway does not match the generated QR amount', async () => {
    const qr = await DynamicUpiQr.create({
      hotelId: new Types.ObjectId(tenantId),
      billId: new Types.ObjectId(),
      tableNumber: 'T-99',
      waiterUserId: cashierUser._id,
      waiterName: 'Cashier Aman',
      amount: 500,
      merchantVpa: 'spicehub.hotel@upi',
      merchantName: 'SpiceHub Grand Hotel',
      transactionRef: `UPI_TEST_FAIL_${Date.now()}`,
      upiUri: 'upi://pay?...',
      status: UpiQrStatus.PENDING,
      expiresAt: new Date(Date.now() + 600000),
    });

    // Gateway reports mismatching amount of ₹1 with valid soundbox webhook secret
    await expect(
      client.request(
        'POST',
        '/api/v1/dynamic-upi/soundbox-webhook',
        {
          transactionRef: qr.transactionRef,
          status: 'SUCCESS',
          amount: 1, // Mismatched fake amount!
        },
        undefined,
        {
          'x-soundbox-secret': process.env.SOUNDBOX_WEBHOOK_SECRET || 'dev_soundbox_secret_key',
        }
      )
    ).rejects.toThrow();

    // Verify QR status remains PENDING in DB
    const refreshedQr = await DynamicUpiQr.findById(qr._id);
    expect(refreshedQr?.status).toBe(UpiQrStatus.PENDING);
  });

  // TEST 5: Dynamic UPI Webhook - Accept matching amount
  it('5. should accept UPI webhook and credit payment when reported amount matches exact QR amount', async () => {
    const qr = await DynamicUpiQr.create({
      hotelId: new Types.ObjectId(tenantId),
      billId: new Types.ObjectId(),
      tableNumber: 'T-99',
      waiterUserId: cashierUser._id,
      waiterName: 'Cashier Aman',
      amount: 500,
      merchantVpa: 'spicehub.hotel@upi',
      merchantName: 'SpiceHub Grand Hotel',
      transactionRef: `UPI_TEST_PASS_${Date.now()}`,
      upiUri: 'upi://pay?...',
      status: UpiQrStatus.PENDING,
      expiresAt: new Date(Date.now() + 600000),
    });

    const res = await client.request<any>(
      'POST',
      '/api/v1/dynamic-upi/soundbox-webhook',
      {
        transactionRef: qr.transactionRef,
        status: 'SUCCESS',
        amount: 500,
      },
      undefined,
      {
        'x-soundbox-secret': process.env.SOUNDBOX_WEBHOOK_SECRET || 'dev_soundbox_secret_key',
      }
    );

    expect(res.success).toBe(true);
    const refreshedQr = await DynamicUpiQr.findById(qr._id);
    expect(refreshedQr?.status).toBe(UpiQrStatus.PAID);
  });

  // TEST 6: Staff Roster Clock-in PIN Authentication
  it('6. should reject clock-in with invalid PIN and succeed with valid Argon2 PIN', async () => {
    // Attempt invalid PIN
    await expect(
      client.request('POST', '/api/v1/staff-roster/attendance/clock-in', {
        userId: cashierUser._id.toString(),
        staffPin: '9999', // Wrong PIN
      })
    ).rejects.toThrow();

    // Attempt valid PIN '1234'
    const clockInRes = await client.request<any>('POST', '/api/v1/staff-roster/attendance/clock-in', {
      userId: cashierUser._id.toString(),
      staffPin: '1234',
    });

    expect(clockInRes.success).toBe(true);
    expect(clockInRes.log).toBeDefined();
    expect(clockInRes.log.userId.toString()).toBe(cashierUser._id.toString());
  });

  // TEST 7: Store Requisition - Verify Physical StockBatch Deduction in MongoDB
  it('7. should deduct physical inventory from StockBatch following FEFO when store requisition is issued', async () => {
    const batch1 = await StockBatch.create({
      hotelId: new Types.ObjectId(tenantId),
      batchNumber: `BAT-FEFO-1-${Date.now()}`,
      itemName: 'Basmati Rice Royal',
      currentQuantity: 10,
      unit: 'kg',
      unitCost: 80,
      location: 'Main Dry Store',
      mfgDate: new Date(),
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: BatchFreshnessStatus.EXPIRING_SOON,
    });

    const batch2 = await StockBatch.create({
      hotelId: new Types.ObjectId(tenantId),
      batchNumber: `BAT-FEFO-2-${Date.now()}`,
      itemName: 'Basmati Rice Royal',
      currentQuantity: 20,
      unit: 'kg',
      unitCost: 80,
      location: 'Main Dry Store',
      mfgDate: new Date(),
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: BatchFreshnessStatus.FRESH,
    });

    const reqDoc = await StoreRequisition.create({
      hotelId: new Types.ObjectId(tenantId),
      requisitionNumber: `REQ-TEST-${Date.now()}`,
      requestingDepartment: RequisitionDepartment.MAIN_KITCHEN,
      requestedByUserId: cashierUser._id,
      urgency: RequisitionUrgency.HIGH,
      items: [{ itemName: 'Basmati Rice Royal', requestedQuantity: 15, unit: 'kg' }],
      status: RequisitionStatus.PENDING,
    });

    const issueRes = await client.request<any>('PATCH', `/api/v1/store-requisitions/requisitions/${reqDoc._id}/issue`, {
      issuedItems: [{ itemName: 'Basmati Rice Royal', issuedQuantity: 15 }],
    });

    expect(issueRes.success).toBe(true);

    // Verify DB assertions on StockBatch:
    // Batch 1 (10kg) should be fully depleted (currentQuantity: 0)
    // Batch 2 (20kg) should have 5kg deducted (currentQuantity: 15)
    const refreshedBatch1 = await StockBatch.findById(batch1._id);
    const refreshedBatch2 = await StockBatch.findById(batch2._id);

    expect(refreshedBatch1?.currentQuantity).toBe(0);
    expect(refreshedBatch2?.currentQuantity).toBe(15);
  });

  // TEST 8: Night Audit Date Filtering - Only aggregates today's revenue, ignores past history
  it('8. should only aggregate revenue for the specified audit business date, ignoring past bills', async () => {
    await RestaurantBill.deleteMany({ hotelId: tenantId });

    const todayStr = '2026-10-01';
    const pastDateStr = '2026-09-15';

    // Past settled bill (₹5,000)
    await RestaurantBill.create({
      hotelId: new Types.ObjectId(tenantId),
      billNumber: `BL-PAST-${Date.now()}`,
      orderIds: [],
      subTotal: 5000,
      totalTax: 250,
      discountAmount: 0,
      grandTotal: 5250,
      paidAmount: 5250,
      dueAmount: 0,
      billStatus: BillStatus.PAID,
      settledAt: new Date(`${pastDateStr}T14:00:00.000Z`),
    });

    // Today's settled bill (₹1,000)
    await RestaurantBill.create({
      hotelId: new Types.ObjectId(tenantId),
      billNumber: `BL-TODAY-${Date.now()}`,
      orderIds: [],
      subTotal: 1000,
      totalTax: 50,
      discountAmount: 0,
      grandTotal: 1050,
      paidAmount: 1050,
      dueAmount: 0,
      billStatus: BillStatus.PAID,
      settledAt: new Date(`${todayStr}T18:00:00.000Z`),
    });

    // Run Night Audit for today
    const auditRes = await client.request<any>('POST', '/api/v1/night-audit/run', {
      auditDate: todayStr,
      notes: 'Testing Date Filter Quarantine',
    });

    expect(auditRes.success).toBe(true);
    // FnB revenue must be ₹1000, NOT ₹6000!
    expect(auditRes.data.totalFoodAndBeverageRevenue).toBe(1000);
    expect(auditRes.data.totalPaymentsCollected).toBe(1050);
  });

  // TEST 9: Unauthenticated Bill IDOR Protection
  it('9. should reject unauthenticated caller attempting to access billing endpoints with arbitrary billId', async () => {
    const unauthClient = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    await expect(
      unauthClient.request('POST', '/api/v1/billing/payment/process', {
        billId: new Types.ObjectId().toString(),
        paymentMode: 'CASH',
        amount: 100,
      })
    ).rejects.toThrow();
  });
});
