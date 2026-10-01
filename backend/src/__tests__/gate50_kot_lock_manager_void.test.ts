import http from 'http';
import mongoose, { Types } from 'mongoose';
import argon2 from 'argon2';
import { app } from '../index';
import { SpiceHubClient } from '@spicehub/api-client';
import {
  KotVoidStore,
  KotVoidHelper,
  KotVoidReason,
  WasteDisposition,
} from '@spicehub/ui';
import {
  UserRole,
  FoodType,
  OrderStatus,
} from '@spicehub/shared-types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { MenuItem } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, OrderType, ItemProductionStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { KotVoidAudit } from '../models/KotVoidAudit';

const TEST_PORT = 5146;
const TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spicehub_test';

describe('--- SHIFT 50 GATE: KOT LOCK & MANAGER SECURITY PIN VOID TESTS ---', () => {
  let server: http.Server;
  let tenantAId: string;
  let tenantBId: string;
  let clientA: SpiceHubClient;
  let clientB: SpiceHubClient;

  let managerUser: any;
  let waiterUser: any;
  let waiterToken: string = '';
  let managerToken: string = '';
  const MANAGER_PIN = '7890';
  const WRONG_PIN = '0000';

  let testTable: any;
  let testDish1: any;
  let testDish2: any;
  let station: any;
  let activeOrder: any;
  let activeBill: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, () => resolve());
    });

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'Grand Imperial Palace',
      slug: `grand-palace-void-${Date.now()}`,
      isActive: true,
      subscriptionPlan: 'ENTERPRISE',
      contactEmail: `admin.void.${Date.now()}@imperial.com`,
      contactPhone: '9888877771',
    });
    tenantAId = tenantA._id.toString();

    // 2. Create Tenant B (Attacker Tenant)
    const tenantB = await Tenant.create({
      name: 'Attacker Hotel B',
      slug: `attacker-b-void-${Date.now()}`,
      isActive: true,
      subscriptionPlan: 'BASIC',
      contactEmail: `attacker.void.${Date.now()}@test.com`,
      contactPhone: '9888877772',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Manager in Tenant A with Argon2 PIN hash
    const managerPinHash = await argon2.hash(MANAGER_PIN);
    const passwordHash = await argon2.hash('SecurePassword@123');

    managerUser = await User.create({
      hotelId: tenantA._id,
      name: 'Vikram Rajput (General Manager)',
      email: `gm.vikram.${Date.now()}@imperial.com`,
      phone: '9876543210',
      passwordHash,
      role: UserRole.MANAGER,
      pinCodeHash: managerPinHash,
      isActive: true,
    });

    // 4. Create Waiter in Tenant A
    waiterUser = await User.create({
      hotelId: tenantA._id,
      name: 'Ramesh (Captain)',
      email: `waiter.ramesh.${Date.now()}@imperial.com`,
      phone: '9876543211',
      passwordHash,
      role: UserRole.WAITER,
      isActive: true,
    });

    // 5. Create Attacker User in Tenant B
    const attackerUser = await User.create({
      hotelId: tenantB._id,
      name: 'Sneaky Attacker',
      email: `attacker.${Date.now()}@test.com`,
      phone: '9876543212',
      passwordHash,
      role: UserRole.MANAGER,
      pinCodeHash: managerPinHash,
      isActive: true,
    });

    // 6. Setup Category, Station, MenuItems
    station = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'TANDOOR',
      screenToken: 'station-token-tandoor-50',
      assignedChefIds: [],
      isOnline: true,
    });

    const category = await MenuCategory.create({
      hotelId: tenantA._id,
      name: 'Starters',
      slug: 'starters',
      displayOrder: 1,
      isActive: true,
    });

    testDish1 = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Murg Malai Tikka',
      itemCode: 'MMT-01',
      foodType: FoodType.NON_VEG,
      basePrice: 400,
      price: 400,
      isAvailable: true,
    });

    testDish2 = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Garlic Butter Naan',
      itemCode: 'GBN-01',
      foodType: FoodType.VEG,
      basePrice: 80,
      price: 80,
      isAvailable: true,
    });

    // 7. Setup Table
    testTable = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-10',
      capacity: 4,
      section: 'FINE_DINE',
      status: TableStatus.OCCUPIED,
      isActive: true,
    });

    // 8. Setup Clients & Logins
    clientA = new SpiceHubClient({ baseUrl: TEST_SERVER_URL, hotelId: tenantAId });
    clientB = new SpiceHubClient({ baseUrl: TEST_SERVER_URL, hotelId: tenantBId });

    const waiterLogin = await clientA.auth.login({
      email: waiterUser.email,
      password: 'SecurePassword@123',
      hotelId: tenantAId,
    });
    waiterToken = waiterLogin.data.token;
    clientA.setAuthToken(waiterToken);

    const managerLogin = await clientA.auth.login({
      email: managerUser.email,
      password: 'SecurePassword@123',
      hotelId: tenantAId,
    });
    managerToken = managerLogin.data.token;

    const attackerLogin = await clientB.auth.login({
      email: attackerUser.email,
      password: 'SecurePassword@123',
      hotelId: tenantBId,
    });
    clientB.setAuthToken(attackerLogin.data.token);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
      await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
      await DiningTable.deleteMany({ hotelId: tenantAId });
      await KitchenStation.deleteMany({ hotelId: tenantAId });
      await MenuCategory.deleteMany({ hotelId: tenantAId });
      await MenuItem.deleteMany({ hotelId: tenantAId });
      await RestaurantOrder.deleteMany({ hotelId: tenantAId });
      await RestaurantBill.deleteMany({ hotelId: tenantAId });
      await KotVoidAudit.deleteMany({ hotelId: tenantAId });
      await mongoose.disconnect();
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1: UI Store and Helper verification
  it('1. should verify KotVoidStore singleton and KotVoidHelper formatting without throwing', () => {
    const store = KotVoidStore.getInstance();
    expect(store).toBeDefined();

    const label = KotVoidHelper.formatVoidReasonLabel(KotVoidReason.CUSTOMER_CANCELLED);
    expect(label).toBe('Customer Cancelled');

    const badge = KotVoidHelper.getWasteDispositionBadge(WasteDisposition.WASTED_SCRAPPED);
    expect(badge.label).toBe('Food Wasted (Scrap Loss)');

    const pinCheck = KotVoidHelper.validateManagerPinFormat('7890');
    expect(pinCheck.isValid).toBe(true);

    const pinFail = KotVoidHelper.validateManagerPinFormat('12');
    expect(pinFail.isValid).toBe(false);
  });

  // TEST 2: Seed active order with 2 items and a provisional bill
  it('2. should seed an active order with multiple items and an active bill', async () => {
    activeOrder = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantAId),
      orderNumber: `ORD-VOID-${Date.now()}`,
      orderType: OrderType.DINE_IN,
      tableId: testTable._id,
      tableNumber: testTable.tableNumber,
      tokenNumber: 42,
      orderStatus: OverallOrderStatus.PREPARING,
      idempotencyKey: `idemp-void-${Date.now()}`,
      items: [
        {
          menuItemId: testDish1._id,
          name: testDish1.name,
          quantity: 2,
          price: 400,
          unitPrice: 400,
          subtotal: 800,
          kitchenStationId: station._id,
          itemStatus: ItemProductionStatus.PREPARING,
        },
        {
          menuItemId: testDish2._id,
          name: testDish2.name,
          quantity: 4,
          price: 80,
          unitPrice: 80,
          subtotal: 320,
          kitchenStationId: station._id,
          itemStatus: ItemProductionStatus.PREPARING,
        },
      ],
      placedAt: new Date(),
    });

    const subTotal = 2 * 400 + 4 * 80; // 800 + 320 = 1120
    const totalTax = Math.round(subTotal * 0.05); // 56
    const grandTotal = subTotal + totalTax; // 1176

    activeBill = await RestaurantBill.create({
      hotelId: new Types.ObjectId(tenantAId),
      billNumber: `BL-VOID-${Date.now()}`,
      orderIds: [activeOrder._id],
      subTotal,
      totalTax,
      discountAmount: 0,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      billStatus: BillStatus.UNPAID,
    });

    expect(activeOrder.items.length).toBe(2);
    expect(activeBill.grandTotal).toBe(1176);
  });

  // TEST 3: Adversarial Attack - Reject void attempt with missing or short PIN
  it('3. should reject void attempt if manager PIN is missing or invalid format', async () => {
    const targetItemId = activeOrder.items[0].menuItemId.toString();

    await expect(
      clientA.kotVoid.voidItem({
        orderId: activeOrder._id.toString(),
        itemId: targetItemId,
        managerPin: '', // Empty PIN!
        voidReason: KotVoidReason.CUSTOMER_CANCELLED,
        wasteDisposition: WasteDisposition.CANCELLED_BEFORE_COOKING,
      })
    ).rejects.toThrow();

    await expect(
      clientA.kotVoid.voidItem({
        orderId: activeOrder._id.toString(),
        itemId: targetItemId,
        managerPin: '12', // Too short PIN!
        voidReason: KotVoidReason.CUSTOMER_CANCELLED,
        wasteDisposition: WasteDisposition.CANCELLED_BEFORE_COOKING,
      })
    ).rejects.toThrow();
  });

  // TEST 4: Adversarial Attack - Reject void attempt with WRONG manager PIN
  it('4. should reject void attempt if unauthorized PIN is provided', async () => {
    const targetItemId = activeOrder.items[0].menuItemId.toString();

    await expect(
      clientA.kotVoid.voidItem({
        orderId: activeOrder._id.toString(),
        itemId: targetItemId,
        managerPin: WRONG_PIN, // Wrong PIN!
        voidReason: KotVoidReason.WRONG_ITEM_PUNCHED,
        wasteDisposition: WasteDisposition.WASTED_SCRAPPED,
      })
    ).rejects.toThrow();

    // Verify item remains PREPARING in DB
    const refreshedOrder = await RestaurantOrder.findById(activeOrder._id);
    expect(refreshedOrder?.items[0].itemStatus).toBe(ItemProductionStatus.PREPARING);
  });

  // TEST 5: Legitimate Manager Authorization - Void Murg Malai Tikka (₹800) with Valid PIN
  it('5. should successfully void item when valid Manager PIN is provided and adjust order & bill financials', async () => {
    const targetItemId = activeOrder.items[0].menuItemId.toString();

    const res = await clientA.kotVoid.voidItem({
      orderId: activeOrder._id.toString(),
      itemId: targetItemId,
      managerPin: MANAGER_PIN, // Correct Argon2 PIN!
      voidReason: KotVoidReason.CUSTOMER_CANCELLED,
      wasteDisposition: WasteDisposition.CANCELLED_BEFORE_COOKING,
      notes: 'Customer changed order to vegetarian before preparation started',
    });

    expect(res.success).toBe(true);
    expect(res.voidAudit).toBeDefined();
    expect(res.voidAudit.itemName).toBe('Murg Malai Tikka');
    expect(res.voidAudit.totalVoidAmount).toBe(800);
    expect(res.voidAudit.managerName).toContain('Vikram Rajput');
    expect(res.voidAudit.kitchenNotified).toBe(true);

    // Verify DB states:
    // 1. Order item status must be CANCELLED
    const refreshedOrder = await RestaurantOrder.findById(activeOrder._id);
    expect(refreshedOrder?.items[0].itemStatus).toBe(ItemProductionStatus.CANCELLED);
    expect(refreshedOrder?.items[1].itemStatus).toBe(ItemProductionStatus.PREPARING);

    // 2. Bill financials must be recalculated (only Naan remaining: 4 * 80 = ₹320 + 5% tax = ₹336)
    const refreshedBill = await RestaurantBill.findById(activeBill._id);
    expect(refreshedBill?.subTotal).toBe(320);
    expect(refreshedBill?.grandTotal).toBe(336);

    // 3. KotVoidAudit document saved in MongoDB
    const auditDoc = await KotVoidAudit.findById(res.voidAudit.id || (res.voidAudit as any)._id);
    expect(auditDoc).toBeDefined();
    expect(auditDoc?.wasteDisposition).toBe(WasteDisposition.CANCELLED_BEFORE_COOKING);
  });

  // TEST 6: Adversarial Attack - Reject attempting to void the already-voided item again
  it('6. should reject attempting to void an item that is already CANCELLED/VOIDED', async () => {
    const targetItemId = activeOrder.items[0].menuItemId.toString();

    await expect(
      clientA.kotVoid.voidItem({
        orderId: activeOrder._id.toString(),
        itemId: targetItemId,
        managerPin: MANAGER_PIN,
        voidReason: KotVoidReason.CUSTOMER_CANCELLED,
        wasteDisposition: WasteDisposition.CANCELLED_BEFORE_COOKING,
      })
    ).rejects.toThrow();
  });

  // TEST 7: Cross-Tenant Isolation - Attacker from Tenant B cannot void Tenant A items
  it('7. should reject cross-tenant attempt by Tenant B to void Tenant A order item', async () => {
    const targetItemId = activeOrder.items[1].menuItemId.toString();

    await expect(
      clientB.kotVoid.voidItem({
        orderId: activeOrder._id.toString(),
        itemId: targetItemId,
        managerPin: MANAGER_PIN,
        voidReason: KotVoidReason.QUALITY_REJECTED,
        wasteDisposition: WasteDisposition.WASTED_SCRAPPED,
      })
    ).rejects.toThrow();
  });

  // TEST 8: Void remaining items -> Cancels entire Order & Bill
  it('8. should cancel entire order and bill if all items in order are voided', async () => {
    const targetItemId2 = activeOrder.items[1].menuItemId.toString();

    const res = await clientA.kotVoid.voidItem({
      orderId: activeOrder._id.toString(),
      itemId: targetItemId2,
      managerPin: MANAGER_PIN,
      voidReason: KotVoidReason.OUT_OF_STOCK,
      wasteDisposition: WasteDisposition.WASTED_SCRAPPED,
      notes: 'Tandoor oven breakdown',
    });

    expect(res.success).toBe(true);

    const refreshedOrder = await RestaurantOrder.findById(activeOrder._id);
    expect(refreshedOrder?.orderStatus).toBe(OverallOrderStatus.CANCELLED);

    const refreshedBill = await RestaurantBill.findById(activeBill._id);
    expect(refreshedBill?.grandTotal).toBe(0);
    expect(refreshedBill?.billStatus).toBe(BillStatus.VOID);
  });

  // TEST 9: Query Audit Logs with Filters & Daily Summary Analytics
  it('9. should return accurate audit logs and daily void waste summary', async () => {
    clientA.setAuthToken(managerToken);
    const logsRes = await clientA.kotVoid.getAuditLogs({
      voidReason: KotVoidReason.CUSTOMER_CANCELLED,
    });

    expect(logsRes.success).toBe(true);
    expect(logsRes.totalCount).toBe(1);
    expect(logsRes.logs[0].itemName).toBe('Murg Malai Tikka');

    const summaryRes = await clientA.kotVoid.getDailySummary();
    expect(summaryRes.success).toBe(true);
    expect(summaryRes.totalVoidEvents).toBe(2);
    expect(summaryRes.totalVoidValue).toBe(800 + 320); // 1120
    expect(summaryRes.totalScrappedWasteCost).toBe(320); // Only second item was WASTED_SCRAPPED
    expect(summaryRes.topVoidedItems.length).toBeGreaterThan(0);
  });
});
