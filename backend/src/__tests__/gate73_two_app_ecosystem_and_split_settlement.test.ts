import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import argon2 from 'argon2';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole } from '../types';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { TableSession, SessionStatus } from '../models/TableSession';
import { DynamicUpiQr } from '../models/DynamicUpiQr';
import { WaiterCashFloat } from '../models/WaiterCashFloat';

describe('--- SHIFT 73 / GATE 73: TWO-APP PLAY STORE ECOSYSTEM, DUAL-TENDER SPLIT SETTLEMENT & ANTI-FRAUD VERIFICATION ---', () => {
  let hotelId: string;
  let adminToken: string;
  let waiterUser: any;
  let cashierUser: any;
  let testTable: any;
  let testCategory: any;
  let paneerDish: any;
  let rotiDish: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Create test hotel tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Palace',
      slug: `spicehub-test-${Date.now()}`,
      contactEmail: `admin-${Date.now()}@spicehub.com`,
      contactPhone: '9876543210',
      gstin: '27AAAAA0000A1Z5',
      status: 'ACTIVE',
      currency: 'INR',
      city: 'Mumbai',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
      enabledPortals: ['admin', 'customer', 'waiter', 'cashier', 'kds', 'pms'],
    });
    hotelId = (tenant._id as Types.ObjectId).toString();

    // Create Admin user
    const adminPasswordHash = await argon2.hash('AdminSecure@1234');
    const adminUser = await User.create({
      hotelId: tenant._id,
      name: 'Test Admin',
      email: `admin-${Date.now()}@spicehub.com`,
      phone: '9800011122',
      passwordHash: adminPasswordHash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    // Login as Admin to get JWT
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: adminUser.email,
      password: 'AdminSecure@1234',
    });
    adminToken = adminLoginRes.body.data.token;

    // Create Waiter user
    const waiterPasswordHash = await argon2.hash('WaiterPass@1234');
    waiterUser = await User.create({
      hotelId: tenant._id,
      name: 'Ramesh Waiter',
      email: `ramesh.waiter-${Date.now()}@spicehub.com`,
      phone: '9811122233',
      passwordHash: waiterPasswordHash,
      role: UserRole.WAITER,
      isActive: true,
      pinStatus: 'NONE',
    });

    // Create Cashier user
    const cashierPasswordHash = await argon2.hash('CashierPass@1234');
    cashierUser = await User.create({
      hotelId: tenant._id,
      name: 'Suresh Cashier',
      email: `suresh.cashier-${Date.now()}@spicehub.com`,
      phone: '9844455566',
      passwordHash: cashierPasswordHash,
      role: UserRole.CASHIER,
      isActive: true,
    });

    // Create Dining Table
    testTable = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-10',
      section: 'Main Dining AC',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });

    // Setup Kitchen Station
    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'CURRY_STATION',
      screenToken: `station_curry_token_${Date.now()}`,
    });

    // Create Menu Category & Items
    testCategory = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Main Course',
      slug: 'main-course',
      displayOrder: 1,
      isActive: true,
    });

    paneerDish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: testCategory._id,
      kitchenStationId: station._id,
      name: 'Paneer Butter Masala',
      basePrice: 350,
      price: 350,
      foodType: 'VEG',
      isAvailable: true,
    });

    rotiDish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: testCategory._id,
      kitchenStationId: station._id,
      name: 'Butter Roti',
      basePrice: 50,
      price: 50,
      foodType: 'VEG',
      isAvailable: true,
    });
  });

  afterAll(async () => {
    // Clean up created records
    await Tenant.deleteMany({ _id: new Types.ObjectId(hotelId) });
    await User.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await DiningTable.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await KitchenStation.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await MenuCategory.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await MenuItem.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await TableSession.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await RestaurantOrder.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await DynamicUpiQr.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await WaiterCashFloat.deleteMany({ hotelId: new Types.ObjectId(hotelId) });
    await mongoose.connection.close();
  });

  // TEST 1: Active Hotels Discovery API (For Mobile App Hotel Selector)
  test('1. GET /api/v1/auth/active-hotels returns public active hotels list with enabledPortals', async () => {
    const res = await request(app).get('/api/v1/auth/active-hotels');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.find((h: any) => h.id === hotelId);
    expect(found).toBeDefined();
    expect(found.name).toBe('SpiceHub Grand Palace');
    expect(found.city).toBe('Mumbai');
    expect(found.enabledPortals).toContain('waiter');
  });

  // TEST 2: Staff PIN Self-Request Workflow
  test('2. POST /api/v1/auth/request-pin allows staff to request 4-digit PIN with status PENDING_APPROVAL', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-pin')
      .send({
        hotelId,
        email: waiterUser.email,
        pin: '4321',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pinStatus).toBe('PENDING_APPROVAL');

    // Attempt waiter PIN login before Admin approval -> MUST FAIL
    const loginAttempt = await request(app)
      .post('/api/v1/auth/waiter-login')
      .send({
        hotelId,
        pinCode: '4321',
      });

    expect(loginAttempt.status).toBe(403);
    expect(loginAttempt.body.errorCode).toBe('PIN_PENDING_ADMIN_APPROVAL');
  });

  // TEST 3: Hotel Admin Approves Staff PIN
  test('3. PATCH /api/v1/hotel-staff/:id/approve-pin approves staff PIN to ACTIVE', async () => {
    const res = await request(app)
      .patch(`/api/v1/hotel-staff/${waiterUser._id}/approve-pin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-hotel-id', hotelId)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pinStatus).toBe('ACTIVE');
    expect(res.body.data.pinApprovedByAdmin).toBe(true);

    // Waiter PIN login now succeeds!
    const loginSuccess = await request(app)
      .post('/api/v1/auth/waiter-login')
      .send({
        hotelId,
        pinCode: '4321',
      });

    expect(loginSuccess.status).toBe(200);
    expect(loginSuccess.body.success).toBe(true);
    expect(loginSuccess.body.data.token).toBeDefined();
    expect(loginSuccess.body.data.user.role).toBe(UserRole.WAITER);
  });

  // TEST 4: Food Customization & Cooking Notes Engine
  test('4. Customer places order with cooking notes ("Kam namak / less salt") & item-level modifiers', async () => {
    // 1. Initialize table session
    const qrEntryRes = await request(app)
      .get(`/api/v1/pos/table/qr-entry?hotelId=${hotelId}&tableId=${testTable._id}`);

    expect(qrEntryRes.status).toBe(200);
    const sessionToken = qrEntryRes.body.data.sessionToken;
    const sessionId = qrEntryRes.body.data.sessionId;

    // 2. Place order with cooking instructions
    const orderRes = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-session-token', sessionToken)
      .send({
        hotelId,
        tableId: testTable._id.toString(),
        tableSessionId: sessionId,
        guestCount: 2,
        items: [
          {
            menuItemId: paneerDish._id.toString(),
            name: paneerDish.name,
            price: paneerDish.price,
            quantity: 1,
            specialInstructions: 'Kam namak / less salt, mirchi kam',
          },
          {
            menuItemId: rotiDish._id.toString(),
            name: rotiDish.name,
            price: rotiDish.price,
            quantity: 2,
            specialInstructions: 'Extra crispy, no butter',
          },
        ],
        cookingInstructions: 'Kam namak / less salt across all dishes',
        idempotencyKey: `ORD_TEST_${Date.now()}`,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    const savedOrder = orderRes.body.data;
    expect(savedOrder.cookingInstructions).toBe('Kam namak / less salt across all dishes');
    expect(savedOrder.items[0].specialInstructions).toBe('Kam namak / less salt, mirchi kam');
    expect(savedOrder.items[1].specialInstructions).toBe('Extra crispy, no butter');
  });

  // TEST 5: Dual-Tender Split Settlement & Anti-Fraud Dynamic UPI QR
  test('5. Anti-Fraud Enforcement: Multi-Tender split settlement strictly prevents unverified UPI payment', async () => {
    const splitAmount = 1500;
    const cashPortion = 1000;
    const onlineUpiPortion = 500;

    // Create Table Session with ₹1500 bill
    const splitSession = await TableSession.create({
      hotelId: new Types.ObjectId(hotelId),
      tableId: testTable._id,
      sessionTokenHash: 'mock_hash_split',
      status: SessionStatus.BILL_REQUESTED,
      subtotalAmount: 1500,
      totalAmount: 1500,
    });

    // 1. Generate Dynamic UPI QR for ₹500
    const upiQrRes = await request(app)
      .post('/api/v1/dynamic-upi/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hotelId,
        tableSessionId: (splitSession._id as Types.ObjectId).toString(),
        tableNumber: 'T-10',
        amount: onlineUpiPortion,
        note: 'Split online portion Table 10',
      });

    expect(upiQrRes.status).toBe(201);
    expect(upiQrRes.body.success).toBe(true);
    const upiData = upiQrRes.body.data;
    expect(upiData.amount).toBe(500);
    expect(upiData.status).toBe('PENDING');
    expect(upiData.upiUri).toContain('upi://pay?');
    expect(upiData.upiUri).toContain('am=500.00');
    const transactionRef = upiData.transactionRef;

    // 2. ANTI-FRAUD ATTEMPT: Waiter attempts to settle multi-tender bill before payment is verified -> MUST FAIL!
    const unverifiedSettleRes = await request(app)
      .post('/api/v1/billing/multi-tender-settle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hotelId,
        tableSessionId: (splitSession._id as Types.ObjectId).toString(),
        tableNumber: 'T-10',
        tenders: [
          { method: 'CASH', amount: cashPortion },
          { method: 'UPI', amount: onlineUpiPortion, transactionRef },
        ],
        waiterId: waiterUser._id.toString(),
        waiterName: waiterUser.name,
      });

    expect(unverifiedSettleRes.status).toBe(400);
    expect(unverifiedSettleRes.body.errorCode).toBe('ANTI_FRAUD_UNVERIFIED_ONLINE_PAYMENT');
    expect(unverifiedSettleRes.body.message).toContain('Anti-Fraud Lock');

    // 3. Webhook / Gateway simulation arrives: UPI payment confirmed!
    const webhookRes = await request(app)
      .post('/api/v1/dynamic-upi/soundbox-webhook')
      .send({
        hotelId,
        transactionRef,
        status: 'PAID',
        gatewayRef: 'UPI_BANK_TXN_987654321',
      });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.data.status).toBe('PAID');

    // 4. Retry Multi-Tender Settlement after verification -> SUCCEEDS!
    const verifiedSettleRes = await request(app)
      .post('/api/v1/billing/multi-tender-settle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hotelId,
        tableSessionId: (splitSession._id as Types.ObjectId).toString(),
        tableNumber: 'T-10',
        tenders: [
          { method: 'CASH', amount: cashPortion },
          { method: 'UPI', amount: onlineUpiPortion, transactionRef },
        ],
        waiterId: waiterUser._id.toString(),
        waiterName: waiterUser.name,
      });

    expect(verifiedSettleRes.status).toBe(200);
    expect(verifiedSettleRes.body.success).toBe(true);
    expect(verifiedSettleRes.body.data.splitSummary.cashTotal).toBe(1000);
    expect(verifiedSettleRes.body.data.splitSummary.onlineTotal).toBe(500);

    // 5. Verify Waiter Cash Float automatically received the ₹1000 Cash portion
    const waiterFloatRes = await request(app)
      .get(`/api/v1/waiter-cash-float/active?hotelId=${hotelId}&waiterId=${waiterUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(waiterFloatRes.status).toBe(200);
    expect(waiterFloatRes.body.success).toBe(true);
    expect(waiterFloatRes.body.data.totalCashCollected).toBeGreaterThanOrEqual(1000);
    expect(waiterFloatRes.body.data.currentCashInHand).toBeGreaterThanOrEqual(1000);
  });

  // TEST 6: Direct Cashier Food Punching (Walk-in / Verbal orders)
  test('6. Fast Cashier punches walk-in verbal order directly and settles on the spot', async () => {
    const cashierOrderRes = await request(app)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hotelId,
        items: [
          {
            menuItemId: paneerDish._id.toString(),
            name: paneerDish.name,
            price: paneerDish.price,
            quantity: 1,
          },
          {
            menuItemId: rotiDish._id.toString(),
            name: rotiDish.name,
            price: rotiDish.price,
            quantity: 4,
          },
        ],
        paymentMethod: 'CASH',
        customerName: 'Walk-in Guest',
        totalAmount: 550,
      });

    expect(cashierOrderRes.status).toBe(201);
    expect(cashierOrderRes.body.success).toBe(true);
    expect(cashierOrderRes.body.tokenNumber).toBeDefined();
    expect(cashierOrderRes.body.order).toBeDefined();
    expect(cashierOrderRes.body.bill).toBeDefined();
    expect(cashierOrderRes.body.financials.subtotal).toBe(550);
    expect(cashierOrderRes.body.financials.grandTotal).toBe(578);
  });

  // TEST 7: Subscription Module Feature Gating ("Call Waiter")
  test('7. Tenant without waiter portal subscription returns waiterEnabled: false in table & context', async () => {
    // Create hotel tenant WITHOUT waiter portal
    const noWaiterTenant = await Tenant.create({
      name: 'Budget Stay Express',
      slug: `budget-stay-${Date.now()}`,
      contactEmail: `budget-${Date.now()}@spicehub.com`,
      contactPhone: '9899988877',
      gstin: '27BBBBB1111B1Z2',
      status: 'ACTIVE',
      enabledPortals: ['admin', 'customer', 'cashier', 'kds'], // NO 'waiter'
    });

    const budgetTable = await DiningTable.create({
      hotelId: noWaiterTenant._id,
      tableNumber: 'B-01',
      section: 'Quick Eat',
      capacity: 2,
      currentStatus: TableStatus.AVAILABLE,
    });

    // Check table QR entry endpoint
    const entryRes = await request(app)
      .get(`/api/v1/pos/table/qr-entry?hotelId=${noWaiterTenant._id}&tableId=${budgetTable._id}`);

    expect(entryRes.status).toBe(200);
    expect(entryRes.body.data.waiterEnabled).toBe(false);

    // Clean up
    await Tenant.deleteMany({ _id: noWaiterTenant._id });
    await DiningTable.deleteMany({ hotelId: noWaiterTenant._id });
  });
});
