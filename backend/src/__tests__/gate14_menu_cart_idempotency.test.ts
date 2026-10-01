import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder } from '../models/RestaurantOrder';
import { UserRole, FoodType, OrderStatus } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  MenuCartStore,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 14 / GATE 14: DINING MENU, CART & ITEM 86 OUT-OF-STOCK PROTECTION ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let socketClient: Socket;
  let tableId: string;
  let tableSessionId: string;
  let sessionToken: string;
  let stationId: mongoose.Types.ObjectId;
  let itemPaneer: any;
  let itemChicken: any;
  let itemLassi: any;
  let itemUnavailable: any;
  const userPassword = 'TestPassword123!';
  const adminEmail = `menu_admin_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5094;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `menu-lounge-${Date.now()}`,
      contactEmail: `menu_${Date.now()}@spicehub.com`,
      contactPhone: '9888822211',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Kitchen Station
    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'MAIN_KITCHEN',
      screenToken: 'station_main_token',
    });
    stationId = station._id as mongoose.Types.ObjectId;

    // 3. Setup Admin User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    await User.create({
      hotelId: tenant._id,
      name: 'Menu Admin',
      email: adminEmail,
      phone: '9888822210',
      passwordHash: hash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    // 4. Setup Table & Session
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'M-10',
      section: 'MAIN_HALL',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableId = table._id.toString();

    // 5. Setup Menu Items across food types
    const catNorth = new mongoose.Types.ObjectId();
    const catDrinks = new mongoose.Types.ObjectId();

    itemPaneer = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: catNorth,
      kitchenStationId: stationId,
      name: 'Paneer Butter Masala',
      foodType: FoodType.VEG,
      basePrice: 320,
      isAvailable: true,
      description: 'Rich cottage cheese in creamy tomato gravy',
    });

    itemChicken = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: catNorth,
      kitchenStationId: stationId,
      name: 'Butter Chicken Special',
      foodType: FoodType.NON_VEG,
      basePrice: 420,
      isAvailable: true,
      description: 'Tender chicken simmered in butter gravy',
    });

    itemLassi = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: catDrinks,
      kitchenStationId: stationId,
      name: 'Sweet Punjabi Lassi',
      foodType: FoodType.BEVERAGE,
      basePrice: 120,
      isAvailable: true,
      description: 'Traditional sweet yogurt beverage',
    });

    itemUnavailable = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: catDrinks,
      kitchenStationId: stationId,
      name: 'Alphonso Mango Shake',
      foodType: FoodType.BEVERAGE,
      basePrice: 180,
      isAvailable: false, // 86 Out of stock initially
      description: 'Seasonal fresh mango shake',
    });

    // 6. Initialize SpiceHubClient and authenticate
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    const loginRes = await client.auth.login({
      email: adminEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    client.setAuthToken(loginRes.data.token);

    // 7. QR entry to get session
    const qrRes = await client.pos.getTableByQr(tenantId, tableId);
    tableSessionId = qrRes.data.sessionId!;
    sessionToken = qrRes.data.sessionToken;

    // 8. Connect Socket Client and join tenant global room
    socketClient = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      socketClient.on('connect', () => {
        socketClient.emit('join_tenant_room', { hotelId: tenantId });
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await KitchenStation.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Dining Menu Query & Filters
  test('1. GET /pos/menu returns tenant menu with filters for FoodType, search, and inStockOnly', async () => {
    // All items
    const allRes = await client.pos.getMenu({ hotelId: tenantId });
    expect(allRes.success).toBe(true);
    expect(allRes.data.length).toBe(4);

    // Filter by Veg
    const vegRes = await client.pos.getMenu({ hotelId: tenantId, foodType: FoodType.VEG });
    expect(vegRes.data.length).toBe(1);
    expect(vegRes.data[0].name).toBe('Paneer Butter Masala');

    // Filter by search query 'Butter' (matches Paneer Butter Masala & Butter Chicken)
    const searchRes = await client.pos.getMenu({ hotelId: tenantId, search: 'Butter' });
    expect(searchRes.data.length).toBe(2);

    // Filter by inStockOnly
    const inStockRes = await client.pos.getMenu({ hotelId: tenantId, inStockOnly: true });
    expect(inStockRes.data.length).toBe(3);
    const unavailableInStock = inStockRes.data.find((d) => d.id === itemUnavailable._id.toString());
    expect(unavailableInStock).toBeUndefined();
  });

  // TEST 2: Item 86 Out of Stock Protection in MenuCartStore
  test('2. MenuCartStore strictly prevents adding out-of-stock items to cart', () => {
    const store = new MenuCartStore([
      {
        id: itemPaneer._id.toString(),
        name: itemPaneer.name,
        categoryId: itemPaneer.categoryId.toString(),
        foodType: itemPaneer.foodType,
        basePrice: itemPaneer.basePrice,
        isAvailable: true,
      },
      {
        id: itemUnavailable._id.toString(),
        name: itemUnavailable.name,
        categoryId: itemUnavailable.categoryId.toString(),
        foodType: itemUnavailable.foodType,
        basePrice: itemUnavailable.basePrice,
        isAvailable: false,
      },
    ]);

    // Try adding unavailable item
    const addedUnavailable = store.addToCart(store.getMenuItems()[1], 1);
    expect(addedUnavailable).toBe(false);
    expect(store.getCartItems().length).toBe(0);

    // Add available item
    const addedAvailable = store.addToCart(store.getMenuItems()[0], 2);
    expect(addedAvailable).toBe(true);
    expect(store.getCartItems().length).toBe(1);
    expect(store.getCartItems()[0].quantity).toBe(2);
  });

  // TEST 3: Real-Time Socket.IO Item 86 Toggle & Live In-Cart Warning
  test('3. Chef toggles Item 86 -> broadcast emitted -> in-cart warning triggered in MenuCartStore', async () => {
    const store = new MenuCartStore([
      {
        id: itemPaneer._id.toString(),
        name: itemPaneer.name,
        categoryId: itemPaneer.categoryId.toString(),
        foodType: itemPaneer.foodType,
        basePrice: itemPaneer.basePrice,
        isAvailable: true,
      },
    ]);

    // Add paneer to cart while available
    store.addToCart(store.getMenuItems()[0], 1);
    expect(store.getCartItems().length).toBe(1);
    expect(store.getOutOfStockWarnings().length).toBe(0);

    // Setup socket listener
    const socketPromise = new Promise<any>((resolve) => {
      socketClient.once('menu:item_86_toggled', resolve);
    });

    // Chef marks Paneer as 86 Out of stock
    const toggleRes = await client.pos.toggleItem86(itemPaneer._id.toString(), false);
    expect(toggleRes.success).toBe(true);
    expect(toggleRes.data.isAvailable).toBe(false);

    const socketEvent = await socketPromise;
    expect(socketEvent).toBeDefined();
    expect(socketEvent.menuItemId).toBe(itemPaneer._id.toString());
    expect(socketEvent.isAvailable).toBe(false);

    // Pass socket event to store
    store.handleItem86Toggled(socketEvent);

    // Verify item in menu is updated to unavailable
    const menuItemInStore = store.getMenuItems().find((i) => i.id === itemPaneer._id.toString());
    expect(menuItemInStore?.isAvailable).toBe(false);

    // Verify in-cart warning is flagged!
    expect(store.getOutOfStockWarnings()).toContain(itemPaneer._id.toString());

    // Restore back to available for subsequent tests
    await client.pos.toggleItem86(itemPaneer._id.toString(), true);
  });

  // TEST 4: Cart Pricing & 5% GST Calculation
  test('4. MenuCartStore calculates accurate subtotal, 5% GST tax snapshot, and grand total', () => {
    const store = new MenuCartStore();

    store.addToCart({
      id: 'dish_a',
      name: 'Paneer Butter Masala',
      categoryId: 'cat_1',
      foodType: FoodType.VEG,
      basePrice: 300,
      isAvailable: true,
    }, 2); // 2 x 300 = 600

    store.addToCart({
      id: 'dish_b',
      name: 'Lassi',
      categoryId: 'cat_2',
      foodType: FoodType.BEVERAGE,
      basePrice: 100,
      isAvailable: true,
    }, 3); // 3 x 100 = 300

    const pricing = store.getPricingSummary(0.05);
    expect(pricing.subtotal).toBe(900); // 600 + 300
    expect(pricing.taxRate).toBe(0.05);
    expect(pricing.taxAmount).toBe(45); // 5% of 900 = 45
    expect(pricing.totalAmount).toBe(945); // 900 + 45
    expect(pricing.itemCount).toBe(5); // 2 + 3
  });

  // TEST 5: Idempotent Order Placement & Race Condition Prevention
  test('5. Submitting cart with Idempotency Key creates order once and safely deduplicates retries', async () => {
    const store = new MenuCartStore();
    const idempotencyKey = store.generateIdempotencyKey('order_gate14');

    const orderPayload = {
      hotelId: tenantId,
      tableSessionId,
      items: [
        {
          menuItemId: itemChicken._id.toString(),
          quantity: 2,
        },
      ],
      cookingInstructions: 'Spicy, well done',
    };

    // First submission
    const res1 = await fetch(`${testServerUrl}/api/v1/pos/orders/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const json1 = (await res1.json()) as any;
    expect(res1.status).toBe(201);
    expect(json1.success).toBe(true);
    expect(json1.data.items.length).toBe(1);
    expect(json1.data.items[0].unitPrice).toBe(420);
    expect(json1.data.items[0].subtotal).toBe(840);
    const orderId1 = json1.data._id;

    // Retry submission with SAME idempotency key (simulating double-tap / network retry)
    const res2 = await fetch(`${testServerUrl}/api/v1/pos/orders/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const json2 = (await res2.json()) as any;
    expect(res2.status).toBe(200);
    expect(json2.success).toBe(true);
    expect(json2.data._id).toBe(orderId1);

    // Verify exactly ONE order exists in MongoDB with this idempotency key
    const count = await RestaurantOrder.countDocuments({
      hotelId: tenantId,
      idempotencyKey,
    });
    expect(count).toBe(1);
  });

  // TEST 6: Backend Defense Against Placing Order with Item 86 (Out of Stock)
  test('6. Backend strictly rejects order placement if any dish is marked Item 86 (400 ITEM_UNAVAILABLE)', async () => {
    // Mark Lassi as out of stock
    await client.pos.toggleItem86(itemLassi._id.toString(), false);

    const idempotencyKey = `idemp_rejected_${Date.now()}`;
    const orderPayload = {
      hotelId: tenantId,
      tableSessionId,
      items: [
        {
          menuItemId: itemLassi._id.toString(),
          quantity: 1,
        },
      ],
    };

    const res = await fetch(`${testServerUrl}/api/v1/pos/orders/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const json = (await res.json()) as any;
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe('ITEM_UNAVAILABLE');
  });
});
