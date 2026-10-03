import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { UserRole, Item86Reason } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';

describe('--- SHIFT 48 / GATE 48: KITCHEN KDS 1-TAP 86 (OUT-OF-STOCK) INSTANT MILLISECOND BROADCAST ---', () => {
  let tenantId: string;
  let otherTenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let chefToken: string;
  let stationTandoor: any;
  let stationCurry: any;
  let dishPaneerTikka: any;
  let dishButterChicken: any;
  let dishDalMakhani: any;
  let table1: any;
  let session1: any;
  let customerSocket: ClientSocketType;
  let waiterSocket: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const chefEmail = `chef86_${Date.now()}@spicehub.com`;
  const port = 5141;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }
    const addr = server.address() as any;
    testServerUrl = `http://localhost:${addr.port}`;

    // 1. Setup Tenants
    const tenant = await Tenant.create({
      name: 'SpiceHub 86 Testing Palace',
      slug: `palace-86-${Date.now()}`,
      contactEmail: `palace_${Date.now()}@spicehub.com`,
      contactPhone: '9888800048',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const otherTenant = await Tenant.create({
      name: 'Unrelated Hotel Tenant',
      slug: `unrelated-${Date.now()}`,
      contactEmail: `unrelated_${Date.now()}@hotel.com`,
      contactPhone: '9888800049',
      status: 'ACTIVE',
    });
    otherTenantId = otherTenant._id.toString();

    // 2. Setup Chef User
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(userPassword);

    const chef = await User.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'Executive Chef Vikram',
      email: chefEmail,
      phone: '9988776655',
      passwordHash,
      role: UserRole.CHEF,
      permissions: ['kds:manage', 'pos:orders:read', 'menu:manage'],
      isActive: true,
    });

    // 3. Setup Kitchen Stations
    stationTandoor = await KitchenStation.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      stationName: 'Tandoor & Clay Oven Station',
      stationCode: 'TND',
      screenToken: 'token_kds_tandoor_86',
      printerIp: '192.168.1.101',
      isActive: true,
    });

    stationCurry = await KitchenStation.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      stationName: 'Main Gravy & Curry Station',
      stationCode: 'CRY',
      screenToken: 'token_kds_curry_86',
      printerIp: '192.168.1.102',
      isActive: true,
    });

    // 4. Setup Menu Category & Test Menu Items
    const category = await MenuCategory.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      name: 'North Indian Royal Specialties',
      slug: `north-indian-${Date.now()}`,
      isActive: true,
    });

    dishPaneerTikka = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: category._id,
      kitchenStationId: stationTandoor._id,
      name: 'Signature Paneer Tikka Angara',
      itemCode: 'TND-101',
      foodType: FoodType.VEG,
      basePrice: 320,
      isAvailable: true,
      prepTimeMinutes: 12,
    });

    dishButterChicken = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: category._id,
      kitchenStationId: stationCurry._id,
      name: 'Old Delhi Butter Chicken',
      itemCode: 'CRY-201',
      foodType: FoodType.NON_VEG,
      basePrice: 480,
      isAvailable: true,
      prepTimeMinutes: 15,
    });

    dishDalMakhani = await MenuItem.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      categoryId: category._id,
      kitchenStationId: stationCurry._id,
      name: 'Overnight Slow Dal Makhani',
      itemCode: 'CRY-202',
      foodType: FoodType.VEG,
      basePrice: 290,
      isAvailable: true,
      prepTimeMinutes: 8,
    });

    // 5. Setup Dining Table & Active Session
    table1 = await DiningTable.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableNumber: 'Table 86',
      section: 'Terrace Garden',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });

    session1 = await TableSession.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      tableId: table1._id,
      sessionTokenHash: 'hash_test_token_86',
      status: SessionStatus.ACTIVE,
      guestCount: 2,
      totalAmount: 0,
      finalAmount: 0,
    });

    // 6. Init API Client
    client = new SpiceHubClient({
      baseUrl: testServerUrl,
      hotelId: tenantId,
    });

    // Login Chef
    const loginRes = await client.auth.login({
      email: chefEmail,
      password: userPassword,
      hotelId: tenantId,
    });
    chefToken = loginRes.data.token;
    client.setAuthToken(chefToken);

    // 7. Setup Live Sockets for Customer & Waiter
    customerSocket = ClientSocket(testServerUrl, {
      transports: ['websocket'],
      query: { hotelId: tenantId },
    });

    waiterSocket = ClientSocket(testServerUrl, {
      transports: ['websocket'],
      query: { hotelId: tenantId },
    });

    await new Promise<void>((resolve) => {
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) resolve();
      };
      customerSocket.on('connect', () => {
        customerSocket.emit('join_tenant_room', { hotelId: tenantId, token: chefToken });
        onConnect();
      });
      waiterSocket.on('connect', () => {
        waiterSocket.emit('join_tenant_room', { hotelId: tenantId, token: chefToken });
        onConnect();
      });
    });
  });

  afterAll(async () => {
    if (customerSocket) customerSocket.disconnect();
    if (waiterSocket) waiterSocket.disconnect();
  });

  test('1. Chef queries menu and confirms all initial test dishes are IN STOCK (isAvailable: true)', async () => {
    const menuRes = await client.pos.getMenu({ hotelId: tenantId });
    expect(menuRes.success).toBe(true);
    expect(menuRes.data.length).toBeGreaterThanOrEqual(3);

    const pt = menuRes.data.find((d) => d.id === dishPaneerTikka._id.toString());
    expect(pt).toBeDefined();
    expect(pt?.isAvailable).toBe(true);
  });

  test('2. Chef marks Paneer Tikka as 86 (Out of Stock) with reason INGREDIENT_EXHAUSTED', async () => {
    const toggleRes = await client.pos.toggleItem86(
      dishPaneerTikka._id.toString(),
      false,
      Item86Reason.INGREDIENT_EXHAUSTED,
      'Executive Chef Vikram'
    );

    expect(toggleRes.success).toBe(true);
    expect(toggleRes.data.isAvailable).toBe(false);
    expect(toggleRes.data.outOfStockReason).toBe(Item86Reason.INGREDIENT_EXHAUSTED);
    expect(toggleRes.message).toContain('OUT OF STOCK (86)');

    // Verify DB update directly
    const dbDish = await MenuItem.findById(dishPaneerTikka._id);
    expect(dbDish?.isAvailable).toBe(false);
    expect(dbDish?.outOfStockReason).toBe(Item86Reason.INGREDIENT_EXHAUSTED);
    expect(dbDish?.markedOutOfStockBy).toBe('Executive Chef Vikram');
    expect(dbDish?.markedOutOfStockAt).toBeDefined();
  });

  test('3. Realtime Socket.IO broadcasts millisecond 86 event to customer and waiter clients', async () => {
    // Listen for socket broadcast on both customer and waiter
    const customerPromise = new Promise<any>((resolve) => {
      customerSocket.once('menu:item_86_toggled', (payload) => resolve(payload));
    });

    const waiterPromise = new Promise<any>((resolve) => {
      waiterSocket.once('menu:item:86', (payload) => resolve(payload));
    });

    // Chef marks Butter Chicken as 86
    const toggleRes = await client.pos.toggleItem86(
      dishButterChicken._id.toString(),
      false,
      Item86Reason.CHEF_SPECIAL_SOLD_OUT,
      'Sous Chef Anand'
    );
    expect(toggleRes.success).toBe(true);

    const [customerPayload, waiterPayload] = await Promise.all([customerPromise, waiterPromise]);

    expect(customerPayload.menuItemId).toBe(dishButterChicken._id.toString());
    expect(customerPayload.isAvailable).toBe(false);
    expect(customerPayload.outOfStockReason).toBe(Item86Reason.CHEF_SPECIAL_SOLD_OUT);

    expect(waiterPayload.menuItemId).toBe(dishButterChicken._id.toString());
    expect(waiterPayload.name).toBe('Old Delhi Butter Chicken');
    expect(waiterPayload.isAvailable).toBe(false);
  });

  test('4. Customer digital menu query immediately reflects 86 out-of-stock items', async () => {
    const res = await client.pos.getMenu({ hotelId: tenantId });
    expect(res.success).toBe(true);

    const paneer = res.data.find((d) => d.id === dishPaneerTikka._id.toString());
    const butterChicken = res.data.find((d) => d.id === dishButterChicken._id.toString());
    const dal = res.data.find((d) => d.id === dishDalMakhani._id.toString());

    expect(paneer?.isAvailable).toBe(false);
    expect(butterChicken?.isAvailable).toBe(false);
    expect(dal?.isAvailable).toBe(true);
  });

  test('5. Backend strictly blocks order placement containing 86 item (HTTP 400 ITEM_UNAVAILABLE)', async () => {
    try {
      await client.pos.placeOrder({
        hotelId: tenantId,
        tableId: table1._id.toString(),
        tableSessionId: session1._id.toString(),
        sessionToken: 'session_token_86_test',
        items: [
          { menuItemId: dishPaneerTikka._id.toString(), quantity: 1 },
          { menuItemId: dishDalMakhani._id.toString(), quantity: 1 },
        ],
        idempotencyKey: `order_86_fail_${Date.now()}`,
      });
      throw new Error('Should have thrown 400 ITEM_UNAVAILABLE');
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.errorCode).toBe('ITEM_UNAVAILABLE');
      expect(err.message).toContain('Signature Paneer Tikka Angara');
      expect(err.message).toContain('out of stock (86)');
    }
  });

  test('6. GET /api/v1/pos/menu/86-items returns active 86 dishes for Kitchen Captain review', async () => {
    const res = await client.pos.get86Items();
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);

    const itemNames = res.data.map((d: any) => d.name);
    expect(itemNames).toContain('Signature Paneer Tikka Angara');
    expect(itemNames).toContain('Old Delhi Butter Chicken');
  });

  test('7. Chef restores Butter Chicken to IN STOCK (1-Tap Restock)', async () => {
    const restockRes = await client.pos.toggleItem86(
      dishButterChicken._id.toString(),
      true,
      undefined,
      'Executive Chef Vikram'
    );

    expect(restockRes.success).toBe(true);
    expect(restockRes.data.isAvailable).toBe(true);
    expect(restockRes.data.outOfStockReason).toBeUndefined();
    expect(restockRes.message).toContain('IN STOCK');

    const dbDish = await MenuItem.findById(dishButterChicken._id);
    expect(dbDish?.isAvailable).toBe(true);
    expect(dbDish?.outOfStockReason).toBeUndefined();
    expect(dbDish?.restockedBy).toBe('Executive Chef Vikram');
    expect(dbDish?.restockedAt).toBeDefined();
  });

  test('8. Realtime Socket.IO broadcasts Restock event to waiting clients', async () => {
    const customerPromise = new Promise<any>((resolve) => {
      customerSocket.once('menu:item_86_toggled', (payload) => resolve(payload));
    });

    await client.pos.toggleItem86(dishPaneerTikka._id.toString(), true, undefined, 'Chef Sanjeev');
    const payload = await customerPromise;

    expect(payload.menuItemId).toBe(dishPaneerTikka._id.toString());
    expect(payload.isAvailable).toBe(true);
  });

  test('9. Order placement succeeds now that dishes are restocked', async () => {
    const orderRes = await client.pos.placeOrder({
      hotelId: tenantId,
      tableId: table1._id.toString(),
      tableSessionId: session1._id.toString(),
      sessionToken: 'session_token_86_test',
      items: [
        { menuItemId: dishButterChicken._id.toString(), quantity: 1 },
        { menuItemId: dishDalMakhani._id.toString(), quantity: 2 },
      ],
      idempotencyKey: `order_restocked_success_${Date.now()}`,
    });

    expect(orderRes.success).toBe(true);
    const placedOrder = (orderRes as any).order || (orderRes as any).data;
    expect(placedOrder).toBeDefined();
    expect(placedOrder.orderStatus).toBe(OverallOrderStatus.PLACED);
    expect(placedOrder.items.length).toBe(2);
  });

  test('10. Batch 86 Toggle: Chef 86s multiple station dishes at once with 1 tap (POST /menu/batch-86)', async () => {
    const itemIds = [dishPaneerTikka._id.toString(), dishDalMakhani._id.toString()];
    const batchRes = await client.pos.batchToggle86({
      itemIds,
      isAvailable: false,
      reason: Item86Reason.EQUIPMENT_BREAKDOWN,
      chefName: 'Master Chef Sanjeev',
    });

    expect(batchRes.success).toBe(true);
    expect(batchRes.updatedCount).toBe(2);

    const check86 = await client.pos.get86Items();
    expect(check86.count).toBe(2);
    const reasons = check86.data.map((d: any) => d.outOfStockReason);
    expect(reasons).toContain(Item86Reason.EQUIPMENT_BREAKDOWN);
  });
});
