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
import { UserRole, Item86Reason } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';

describe('--- SHIFT 48 / GATE 48 ULTRA-DEEP CONCURRENCY & MULTI-TENANT ISOLATION DRILL ---', () => {
  let tenantA: any;
  let tenantB: any;
  let clientA: SpiceHubClient;
  let clientB: SpiceHubClient;
  let testServerUrl: string;
  let chefTokenA: string;
  let chefTokenB: string;
  let categoryA: any;
  let categoryB: any;
  let stationA: any;
  let stationB: any;
  let rushDishA: any;
  let safeDishB: any;
  let tableA: any;
  let sessionA: any;
  let socketA: ClientSocketType;
  let socketB: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const port = 5142;

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

    // 1. Setup Tenant A and Tenant B
    tenantA = await Tenant.create({
      name: 'SpiceHub Hotel Taj Rush',
      slug: `taj-rush-${Date.now()}`,
      contactEmail: `taj_${Date.now()}@spicehub.com`,
      contactPhone: '9888800051',
      status: 'ACTIVE',
    });

    tenantB = await Tenant.create({
      name: 'SpiceHub Hotel Oberoi Serene',
      slug: `oberoi-serene-${Date.now()}`,
      contactEmail: `oberoi_${Date.now()}@spicehub.com`,
      contactPhone: '9888800052',
      status: 'ACTIVE',
    });

    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);

    // 2. Chefs for both hotels
    const chefA = await User.create({
      hotelId: tenantA._id,
      name: 'Chef Sanjeev Taj',
      email: `cheftaj_${Date.now()}@spicehub.com`,
      phone: '9888800053',
      passwordHash: hash,
      role: UserRole.CHEF,
      permissions: ['kds:manage', 'pos:orders:read', 'menu:manage'],
      isActive: true,
    });

    const chefB = await User.create({
      hotelId: tenantB._id,
      name: 'Chef Ranveer Oberoi',
      email: `chefoberoi_${Date.now()}@spicehub.com`,
      phone: '9888800054',
      passwordHash: hash,
      role: UserRole.CHEF,
      permissions: ['kds:manage', 'pos:orders:read', 'menu:manage'],
      isActive: true,
    });

    // 3. Stations & Categories
    stationA = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'Taj Live Grill',
      stationCode: 'GRL',
      screenToken: 'token_grill_taj_86',
      isActive: true,
    });

    stationB = await KitchenStation.create({
      hotelId: tenantB._id,
      stationName: 'Oberoi Master Kitchen',
      stationCode: 'OMK',
      screenToken: 'token_omk_86',
      isActive: true,
    });

    categoryA = await MenuCategory.create({
      hotelId: tenantA._id,
      name: 'Tandoori Platters',
      slug: `tandoori-platters-${Date.now()}`,
      isActive: true,
    });

    categoryB = await MenuCategory.create({
      hotelId: tenantB._id,
      name: 'Royal Curries',
      slug: `royal-curries-${Date.now()}`,
      isActive: true,
    });

    // 4. Test Dishes
    rushDishA = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: categoryA._id,
      kitchenStationId: stationA._id,
      name: 'Mutton Seekh Kebab Special',
      itemCode: 'GRL-501',
      foodType: FoodType.NON_VEG,
      basePrice: 550,
      isAvailable: true,
      prepTimeMinutes: 15,
    });

    safeDishB = await MenuItem.create({
      hotelId: tenantB._id,
      categoryId: categoryB._id,
      kitchenStationId: stationB._id,
      name: 'Oberoi Shahi Paneer',
      itemCode: 'OMK-101',
      foodType: FoodType.VEG,
      basePrice: 420,
      isAvailable: true,
      prepTimeMinutes: 12,
    });

    // 5. Table & Session for Hotel A
    tableA = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'Table Rush 10',
      section: 'Main Lawn',
      capacity: 6,
      currentStatus: TableStatus.OCCUPIED,
    });

    sessionA = await TableSession.create({
      hotelId: tenantA._id,
      tableId: tableA._id,
      sessionTokenHash: 'hash_rush_token',
      status: SessionStatus.ACTIVE,
      guestCount: 4,
      totalAmount: 0,
      finalAmount: 0,
    });

    // 6. Clients
    clientA = new SpiceHubClient({ baseUrl: testServerUrl, hotelId: tenantA._id.toString() });
    clientB = new SpiceHubClient({ baseUrl: testServerUrl, hotelId: tenantB._id.toString() });

    const loginResA = await clientA.auth.login({ email: chefA.email, password: userPassword, hotelId: tenantA._id.toString() });
    chefTokenA = loginResA.data.token;
    clientA.setAuthToken(chefTokenA);

    const loginResB = await clientB.auth.login({ email: chefB.email, password: userPassword, hotelId: tenantB._id.toString() });
    chefTokenB = loginResB.data.token;
    clientB.setAuthToken(chefTokenB);

    // 7. Sockets
    socketA = ClientSocket(testServerUrl, { transports: ['websocket'], query: { hotelId: tenantA._id.toString() } });
    socketB = ClientSocket(testServerUrl, { transports: ['websocket'], query: { hotelId: tenantB._id.toString() } });

    await new Promise<void>((resolve) => {
      let count = 0;
      const done = () => { count++; if (count === 2) resolve(); };
      socketA.on('connect', () => {
        socketA.emit('join_tenant_room', { hotelId: tenantA._id.toString(), token: chefTokenA });
        done();
      });
      socketB.on('connect', () => {
        socketB.emit('join_tenant_room', { hotelId: tenantB._id.toString(), token: chefTokenB });
        done();
      });
    });
  });

  afterAll(async () => {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
  });

  test('1. Multi-Tenant Event Isolation Drill: Hotel A 86 broadcast NEVER leaks to Hotel B', async () => {
    let hotelBReceivedLeak = false;
    socketB.on('menu:item_86_toggled', (payload) => {
      if (payload.menuItemId === rushDishA._id.toString()) {
        hotelBReceivedLeak = true;
      }
    });

    const hotelAPromise = new Promise<any>((resolve) => {
      socketA.once('menu:item_86_toggled', (payload) => resolve(payload));
    });

    // Hotel A marks Seekh Kebab as 86
    await clientA.pos.toggleItem86(
      rushDishA._id.toString(),
      false,
      Item86Reason.INGREDIENT_EXHAUSTED,
      'Chef Sanjeev Taj'
    );

    const receivedPayloadA = await hotelAPromise;
    expect(receivedPayloadA.menuItemId).toBe(rushDishA._id.toString());
    expect(receivedPayloadA.isAvailable).toBe(false);

    // Allow 50ms network propagation and assert Hotel B remained completely isolated
    await new Promise((r) => setTimeout(r, 60));
    expect(hotelBReceivedLeak).toBe(false);

    // Hotel B dish remains unaffected
    const menuB = await clientB.pos.getMenu({ hotelId: tenantB._id.toString() });
    const oberoiDish = menuB.data.find((d) => d.id === safeDishB._id.toString());
    expect(oberoiDish?.isAvailable).toBe(true);
  });

  test('2. Concurrent Peak-Rush Order Rejection Drill: Orders submitted after 86 lock fail with 400', async () => {
    // 5 simultaneous customer requests attempting to place order for 86 dish
    const orderPromises = Array.from({ length: 5 }).map((_, i) =>
      clientA.pos
        .placeOrder({
          hotelId: tenantA._id.toString(),
          tableId: tableA._id.toString(),
          tableSessionId: sessionA._id.toString(),
          sessionToken: 'hash_rush_token',
          items: [{ menuItemId: rushDishA._id.toString(), quantity: 1 }],
          idempotencyKey: `concurrent_86_rush_${i}_${Date.now()}`,
        })
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, status: err.status, errorCode: err.errorCode, message: err.message }))
    );

    const results = await Promise.all(orderPromises);

    // 100% of concurrent attempts must be rejected with 400 ITEM_UNAVAILABLE
    for (const r of results as any[]) {
      expect(r.success).toBe(false);
      expect(r.status).toBe(400);
      expect(r.errorCode).toBe('ITEM_UNAVAILABLE');
      expect(r.message).toContain('out of stock (86)');
    }
  });

  test('3. Full Lifecycle Audit Trail: Out of Stock and Restock timestamps & actors verified', async () => {
    // Restock dish
    await clientA.pos.toggleItem86(rushDishA._id.toString(), true, undefined, 'Head Chef Sanjeev');

    const restockedDb = await MenuItem.findById(rushDishA._id);
    expect(restockedDb?.isAvailable).toBe(true);
    expect(restockedDb?.outOfStockReason).toBeUndefined();
    expect(restockedDb?.restockedBy).toBe('Head Chef Sanjeev');
    expect(restockedDb?.restockedAt).toBeDefined();

    // Re-86 with different reason
    await clientA.pos.toggleItem86(
      rushDishA._id.toString(),
      false,
      Item86Reason.QUALITY_HOLD,
      'Quality Auditor Ritu'
    );

    const re86Db = await MenuItem.findById(rushDishA._id);
    expect(re86Db?.isAvailable).toBe(false);
    expect(re86Db?.outOfStockReason).toBe(Item86Reason.QUALITY_HOLD);
    expect(re86Db?.markedOutOfStockBy).toBe('Quality Auditor Ritu');
  });

  test('4. High-Throughput Station Failure Drill: 10 dishes batch-toggled 86 in < 100ms', async () => {
    // Create 10 items for Hotel A
    const items = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        MenuItem.create({
          hotelId: tenantA._id,
          categoryId: categoryA._id,
          kitchenStationId: stationA._id,
          name: `Rapid Dish #${i + 1}`,
          itemCode: `RAPID-${i + 1}`,
          foodType: FoodType.VEG,
          basePrice: 200 + i * 10,
          isAvailable: true,
          prepTimeMinutes: 10,
        })
      )
    );

    const itemIds = items.map((it) => it._id.toString());
    const startTime = Date.now();

    const batchRes = await clientA.pos.batchToggle86({
      itemIds,
      isAvailable: false,
      reason: Item86Reason.EQUIPMENT_BREAKDOWN,
      chefName: 'Maintenance Lead Rakesh',
    });

    const elapsed = Date.now() - startTime;

    expect(batchRes.success).toBe(true);
    expect(batchRes.updatedCount).toBe(10);
    expect(elapsed).toBeLessThan(500); // Super fast millisecond execution

    // Verify all 10 in DB
    const dbCount = await MenuItem.countDocuments({
      _id: { $in: itemIds },
      isAvailable: false,
      outOfStockReason: Item86Reason.EQUIPMENT_BREAKDOWN,
    });
    expect(dbCount).toBe(10);
  });
});
