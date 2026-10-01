import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, ItemProductionStatus, OrderType } from '../models/RestaurantOrder';
import { UserRole, AllergenType, DietaryType } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  KdsHelper,
  KdsStore,
  KdsOrderCardModel,
  KdsOrderItemModel,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 47 / GATE 47: KITCHEN KDS HIGH-CONTRAST ALLERGEN & DIETARY WARNING BADGES & MANDATORY CHEF TAP ---', () => {
  let tenantId: string;
  let otherTenantId: string;
  let client: SpiceHubClient;
  let otherClient: SpiceHubClient;
  let testServerUrl: string;
  let chefUser: any;
  let chefToken: string;
  let otherChefToken: string;
  let stationTandoor: any;
  let stationCurry: any;
  let dishJainPaneer: any;
  let dishNutKorma: any;
  let dishNormalDal: any;
  let table1: any;
  let session1: any;
  let kdsSocket: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const chefEmail = `headchef_${Date.now()}@spicehub.com`;
  const otherChefEmail = `otherchef_${Date.now()}@otherhotel.com`;
  const port = 5139;

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

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Palace Luxury KDS',
      slug: `grand-palace-kds-${Date.now()}`,
      contactEmail: `palace_${Date.now()}@spicehub.com`,
      contactPhone: '9888800047',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const otherTenant = await Tenant.create({
      name: 'Other Competitor Hotel',
      slug: `other-kds-${Date.now()}`,
      contactEmail: `other_${Date.now()}@hotel.com`,
      contactPhone: '9888800048',
      status: 'ACTIVE',
    });
    otherTenantId = otherTenant._id.toString();

    // 2. Setup Chef Users
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    chefUser = await User.create({
      hotelId: tenant._id,
      name: 'Chef Ranveer Brar',
      email: chefEmail,
      phone: '9888800049',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    const otherChef = await User.create({
      hotelId: otherTenant._id,
      name: 'Chef Rogue',
      email: otherChefEmail,
      phone: '9888800050',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    // 3. Setup Kitchen Stations
    stationTandoor = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'TANDOOR_LUXURY',
      screenToken: 'token_tandoor_lux',
      assignedChefIds: [chefUser._id],
      isOnline: true,
    });

    stationCurry = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'CURRY_ROYAL',
      screenToken: 'token_curry_royal',
      assignedChefIds: [chefUser._id],
      isOnline: true,
    });

    // 4. Setup Dining Table & Active Session
    table1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'ROYAL-07',
      section: 'HAVELI_SUITE',
      capacity: 6,
      currentStatus: TableStatus.OCCUPIED,
    });

    session1 = await TableSession.create({
      hotelId: tenant._id,
      tableId: table1._id,
      sessionTokenHash: 'allergen_test_session_hash',
      status: SessionStatus.ACTIVE,
    });
    table1.activeSessionId = session1._id as mongoose.Types.ObjectId;
    await table1.save();

    // 5. Setup Menu Items with Allergen and Dietary configurations
    dishJainPaneer = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationCurry._id,
      name: 'Shahi Paneer (Strict Jain)',
      foodType: FoodType.VEG,
      dietaryType: DietaryType.JAIN,
      allergens: [AllergenType.DAIRY, AllergenType.JAIN_NO_ROOT],
      hasJainOption: true,
      basePrice: 480,
      isAvailable: true,
    });

    dishNutKorma = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationCurry._id,
      name: 'Navratan Korma (Cashew & Almond Rich)',
      foodType: FoodType.VEG,
      dietaryType: DietaryType.VEG,
      allergens: [AllergenType.NUTS, AllergenType.DAIRY],
      basePrice: 520,
      isAvailable: true,
    });

    dishNormalDal = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationTandoor._id,
      name: 'Tandoori Roti (Plain Safe)',
      foodType: FoodType.VEG,
      dietaryType: DietaryType.VEG,
      allergens: [],
      basePrice: 60,
      isAvailable: true,
    });

    // 6. Setup API Clients
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    const loginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: chefEmail, password: userPassword }),
    });
    const loginJson = (await loginRes.json()) as any;
    chefToken = loginJson.data.token;
    client.setAuthToken(chefToken);
    client.setHotelId(tenantId);

    otherClient = new SpiceHubClient({ baseUrl: testServerUrl });
    const otherLoginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otherChefEmail, password: userPassword }),
    });
    const otherJson = (await otherLoginRes.json()) as any;
    otherChefToken = otherJson.data.token;
    otherClient.setAuthToken(otherChefToken);
    otherClient.setHotelId(otherTenantId);

    // 7. Socket.IO connection for live event verification
    kdsSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      kdsSocket.on('connect', () => {
        kdsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'kds' });
        setTimeout(resolve, 100);
      });
    });
  });

  afterAll(async () => {
    if (kdsSocket && kdsSocket.connected) kdsSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  let createdOrder: any;

  // TEST 1: Order Placement & Allergen Alert Identification
  test('1. POST /api/v1/pos/orders/place accurately tags allergen alerts and marks chefAllergenAcknowledged = false for high-risk items', async () => {
    const idempotencyKey = `gate47-order-${Date.now()}`;
    const orderPayload = {
      hotelId: tenantId,
      tableSessionId: session1._id.toString(),
      items: [
        {
          menuItemId: dishJainPaneer._id.toString(),
          quantity: 1,
          specialInstructions: 'Strict Jain preparation, do not use any ginger or root herbs',
        },
        {
          menuItemId: dishNutKorma._id.toString(),
          quantity: 2,
          allergenNotes: 'Guest has severe peanut & tree nut allergy! Ensure clean cookware',
        },
        {
          menuItemId: dishNormalDal._id.toString(),
          quantity: 3,
        },
      ],
      idempotencyKey,
    };

    const res = await fetch(`${testServerUrl}/api/v1/pos/orders/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await res.json()) as any;
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    createdOrder = data.data;

    expect(createdOrder.items.length).toBe(3);

    // Item 0: Jain Paneer -> hasAllergenAlert = true, chefAllergenAcknowledged = false
    const item0 = createdOrder.items[0];
    expect(item0.hasAllergenAlert).toBe(true);
    expect(item0.chefAllergenAcknowledged).toBe(false);
    expect(item0.dietaryType).toBe('JAIN');

    // Item 1: Nut Korma -> hasAllergenAlert = true, chefAllergenAcknowledged = false
    const item1 = createdOrder.items[1];
    expect(item1.hasAllergenAlert).toBe(true);
    expect(item1.chefAllergenAcknowledged).toBe(false);
    expect(item1.allergens).toContain(AllergenType.NUTS);

    // Item 2: Plain Roti -> hasAllergenAlert = false, chefAllergenAcknowledged = true
    const item2 = createdOrder.items[2];
    expect(item2.hasAllergenAlert).toBe(false);
    expect(item2.chefAllergenAcknowledged).toBe(true);
  });

  // TEST 2: UI KdsHelper Badge Generation & Luxury Contrast Tokens
  test('2. KdsHelper.getAllergenBadges generates luxury high-contrast tokens with appropriate icons & severity', () => {
    // 2.1 Jain item badges
    const jainItem: KdsOrderItemModel = {
      menuItemId: dishJainPaneer._id.toString(),
      name: 'Shahi Paneer (Strict Jain)',
      quantity: 1,
      unitPrice: 480,
      subtotal: 480,
      kitchenStationId: stationCurry._id.toString(),
      itemStatus: 'PENDING',
      dietaryType: 'JAIN',
      allergens: ['DAIRY', 'JAIN_NO_ROOT'],
      hasAllergenAlert: true,
      chefAllergenAcknowledged: false,
    };

    const jainBadges = KdsHelper.getAllergenBadges(jainItem);
    expect(jainBadges.length).toBeGreaterThanOrEqual(1);
    const jainBadge = jainBadges.find((b) => b.category === 'JAIN');
    expect(jainBadge).toBeDefined();
    expect(jainBadge!.label).toContain('JAIN');
    expect(jainBadge!.badgeStyle).toContain('amber');
    expect(jainBadge!.icon).toBe('🪷');

    // 2.2 Nut allergy critical alert badges
    const nutItem: KdsOrderItemModel = {
      menuItemId: dishNutKorma._id.toString(),
      name: 'Navratan Korma',
      quantity: 1,
      unitPrice: 520,
      subtotal: 520,
      kitchenStationId: stationCurry._id.toString(),
      itemStatus: 'PENDING',
      allergens: ['NUTS'],
      allergenNotes: 'Extreme peanut anaphylaxis alert',
      hasAllergenAlert: true,
      chefAllergenAcknowledged: false,
    };

    const nutBadges = KdsHelper.getAllergenBadges(nutItem);
    const nutBadge = nutBadges.find((b) => b.category === 'NUTS');
    expect(nutBadge).toBeDefined();
    expect(nutBadge!.severity).toBe('HIGH');
    expect(nutBadge!.badgeStyle).toContain('animate-pulse');
    expect(nutBadge!.badgeStyle).toContain('rose');

    const noteBadge = nutBadges.find((b) => b.category === 'CUSTOM_NOTE');
    expect(noteBadge).toBeDefined();
    expect(noteBadge!.label).toContain('Extreme peanut anaphylaxis alert');
  });

  // TEST 3: Safety Blocking Check (KdsHelper)
  test('3. KdsHelper.isOrderBlockedByAllergen accurately flags blocked orders and generates summary alert banner', () => {
    const kdsCard: KdsOrderCardModel = {
      id: createdOrder._id,
      orderNumber: createdOrder.orderNumber,
      orderType: 'DINE_IN',
      items: createdOrder.items,
      orderStatus: 'PLACED',
      placedAt: createdOrder.placedAt,
      elapsedMinutes: 2,
      urgencyLevel: 'NORMAL',
    };

    const isBlocked = KdsHelper.isOrderBlockedByAllergen(kdsCard);
    expect(isBlocked).toBe(true);

    const bannerSummary = KdsHelper.getAllergenAlertSummary(kdsCard);
    expect(bannerSummary).toBeDefined();
    expect(bannerSummary).toContain('Mandatory Chef Tap Required');
    expect(bannerSummary).toContain('Shahi Paneer');
  });

  // TEST 4: Mandatory Chef Tap Safety Lock on Backend (PREPARING / READY Rejection)
  test('4. PATCH /api/v1/pos/kds/order/:orderId/status returns 400 ALLERGEN_NOT_ACKNOWLEDGED if chef tries to cook without acknowledging', async () => {
    // 4.1 Attempting to move overall order to PREPARING
    const blockedRes = await fetch(`${testServerUrl}/api/v1/pos/kds/order/${createdOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({ status: OverallOrderStatus.PREPARING }),
    });

    const blockedJson = (await blockedRes.json()) as any;
    expect(blockedRes.status).toBe(400);
    expect(blockedJson.success).toBe(false);
    expect(blockedJson.errorCode).toBe('ALLERGEN_NOT_ACKNOWLEDGED');
    expect(blockedJson.message).toContain('Safety Lock Active');

    // 4.2 Attempting to move individual item (Jain Paneer) to PREPARING
    const blockedItemRes = await fetch(`${testServerUrl}/api/v1/pos/kds/order/${createdOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        status: ItemProductionStatus.PREPARING,
        itemId: dishJainPaneer._id.toString(),
      }),
    });

    const itemBlockedJson = (await blockedItemRes.json()) as any;
    expect(blockedItemRes.status).toBe(400);
    expect(itemBlockedJson.errorCode).toBe('ALLERGEN_NOT_ACKNOWLEDGED');
  });

  // TEST 5: Single Item Chef Acknowledgment & Real-time Socket Broadcast
  test('5. PATCH /api/v1/pos/kds/orders/:orderId/items/0/acknowledge-allergen acknowledges alert and emits socket event', async () => {
    const socketPromise = new Promise<any>((resolve) => {
      kdsSocket.once('kds:allergen_acknowledged', (data) => resolve(data));
    });

    const ackRes = await client.pos.acknowledgeKdsItemAllergen(createdOrder._id, 0);
    expect(ackRes.success).toBe(true);
    expect(ackRes.data.chefAllergenAcknowledged).toBe(true);
    expect(ackRes.data.acknowledgedChefName).toBe('Chef Ranveer Brar');
    expect(ackRes.data.acknowledgedAt).toBeDefined();

    // Verify Socket event received by KDS screen
    const socketEvent = await socketPromise;
    expect(socketEvent.orderId).toBe(createdOrder._id);
    expect(socketEvent.itemIndex).toBe(0);
    expect(socketEvent.acknowledgedBy).toBe('Chef Ranveer Brar');

    // Item 0 can now be prepared independently
    const itemPrepRes = await client.pos.updateKdsOrderStatus(
      createdOrder._id,
      ItemProductionStatus.PREPARING,
      dishJainPaneer._id.toString()
    );
    expect(itemPrepRes.success).toBe(true);
  });

  // TEST 6: Overall Order Still Blocked until ALL Allergens Acknowledged
  test('6. Overall order status still blocked while Item 1 (Nut Korma) remains unacknowledged', async () => {
    const orderPrepRes = await fetch(`${testServerUrl}/api/v1/pos/kds/order/${createdOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({ status: OverallOrderStatus.PREPARING }),
    });

    const json = (await orderPrepRes.json()) as any;
    expect(orderPrepRes.status).toBe(400);
    expect(json.errorCode).toBe('ALLERGEN_NOT_ACKNOWLEDGED');
    expect(json.dishName).toContain('Navratan Korma');
  });

  // TEST 7: Bulk Acknowledge All Allergens Endpoint
  test('7. PATCH /api/v1/pos/kds/orders/:orderId/acknowledge-all-allergens clears all remaining allergen alerts', async () => {
    const ackAllRes = await client.pos.acknowledgeAllKdsOrderAllergens(createdOrder._id);
    expect(ackAllRes.success).toBe(true);
    expect(ackAllRes.data.acknowledgedCount).toBe(1); // Item 1 was remaining

    // Verify in database
    const dbOrder = await RestaurantOrder.findById(createdOrder._id);
    expect(dbOrder).toBeDefined();
    expect(dbOrder!.items[0].chefAllergenAcknowledged).toBe(true);
    expect(dbOrder!.items[1].chefAllergenAcknowledged).toBe(true);
    expect(dbOrder!.items[2].chefAllergenAcknowledged).toBe(true);

    // Now overall order can transition to PREPARING smoothly
    const prepRes = await client.pos.updateKdsOrderStatus(createdOrder._id, OverallOrderStatus.PREPARING);
    expect(prepRes.success).toBe(true);
    expect(prepRes.data.orderStatus).toBe(OverallOrderStatus.PREPARING);
  });

  // TEST 8: Multi-Tenant Isolation
  test('8. Foreign chef cannot view or acknowledge orders from another hotel tenant', async () => {
    try {
      await otherClient.pos.acknowledgeKdsItemAllergen(createdOrder._id, 0);
      throw new Error('Should have thrown 404/403');
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  // TEST 9: UI KdsStore Store Behavior & Optimistic Updates
  test('9. KdsStore throws error when attempting to prepare unacknowledged order and succeeds after acknowledgment', () => {
    const testOrder: KdsOrderCardModel = {
      id: 'local-kds-test-1',
      orderNumber: 'ORD-LOCAL-01',
      orderType: 'DINE_IN',
      orderStatus: 'PLACED',
      placedAt: new Date().toISOString(),
      elapsedMinutes: 3,
      urgencyLevel: 'NORMAL',
      items: [
        {
          itemId: 'item-nut-1',
          menuItemId: 'menu-1',
          name: 'Almond Halwa',
          quantity: 1,
          unitPrice: 200,
          subtotal: 200,
          kitchenStationId: 'station-1',
          itemStatus: 'PENDING',
          allergens: ['NUTS'],
          hasAllergenAlert: true,
          chefAllergenAcknowledged: false,
        },
      ],
    };

    const store = new KdsStore([testOrder]);

    // Attempting markOrderPreparing throws error
    expect(() => {
      store.markOrderPreparing('local-kds-test-1');
    }).toThrow('Safety Lock Active');

    // Acknowledge allergen
    const acknowledged = store.acknowledgeItemAllergen('local-kds-test-1', 0, 'Chef Ranveer Brar');
    expect(acknowledged).toBe(true);

    // Now markOrderPreparing succeeds without throwing
    store.markOrderPreparing('local-kds-test-1');
    const updated = store.getOrders().find((o) => o.id === 'local-kds-test-1');
    expect(updated?.orderStatus).toBe('PREPARING');
  });

  // TEST 10: Invalid Item Index Handling
  test('10. PATCH acknowledge-allergen with out-of-bounds index returns 400 INVALID_ITEM_INDEX', async () => {
    const res = await fetch(`${testServerUrl}/api/v1/pos/kds/orders/${createdOrder._id}/items/999/acknowledge-allergen`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`,
        'x-hotel-id': tenantId,
      },
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe('INVALID_ITEM_INDEX');
  });
});
