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

describe('--- SHIFT 47 / TIER 2 ULTRA-DEEP DRILL: KDS ALLERGEN CONCURRENCY, MULTI-STATION ROUTING & SAFETY LOCK DRILL ---', () => {
  let tenantId: string;
  let testServerUrl: string;
  let headChef: any;
  let sousChef1: any;
  let sousChef2: any;
  let headChefToken: string;
  let sousChef1Token: string;
  let stationCurry: any;
  let stationTandoor: any;
  let dishComplexCurry: any;
  let dishNutNaan: any;
  let table: any;
  let session: any;
  let kdsSocket: ClientSocketType;
  const password = 'DrillPassword123!';
  const port = 5140;

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

    const tenant = await Tenant.create({
      name: 'SpiceHub Ultra Luxury Grand Banquet',
      slug: `grand-banquet-${Date.now()}`,
      contactEmail: `banquet_${Date.now()}@spicehub.com`,
      contactPhone: '9888800060',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const argon2 = require('argon2');
    const hash = await argon2.hash(password);

    headChef = await User.create({
      hotelId: tenant._id,
      name: 'Master Chef Sanjeev Kapoor',
      email: `master_${Date.now()}@spicehub.com`,
      phone: '9888800061',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    sousChef1 = await User.create({
      hotelId: tenant._id,
      name: 'Sous Chef Vikas',
      email: `vikas_${Date.now()}@spicehub.com`,
      phone: '9888800062',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    sousChef2 = await User.create({
      hotelId: tenant._id,
      name: 'Sous Chef Kunal',
      email: `kunal_${Date.now()}@spicehub.com`,
      phone: '9888800063',
      passwordHash: hash,
      role: UserRole.CHEF,
      isActive: true,
    });

    stationCurry = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'CURRY_MAIN',
      screenToken: 'curry_tok_drill',
      assignedChefIds: [headChef._id, sousChef1._id],
      isOnline: true,
    });

    stationTandoor = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'TANDOOR_HOT',
      screenToken: 'tandoor_tok_drill',
      assignedChefIds: [sousChef2._id],
      isOnline: true,
    });

    table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'PRESIDENTIAL-01',
      section: 'VVIP_TERRACE',
      capacity: 8,
      currentStatus: TableStatus.OCCUPIED,
    });

    session = await TableSession.create({
      hotelId: tenant._id,
      tableId: table._id,
      sessionTokenHash: 'vvip_session_hash',
      status: SessionStatus.ACTIVE,
    });
    table.activeSessionId = session._id as mongoose.Types.ObjectId;
    await table.save();

    dishComplexCurry = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationCurry._id,
      name: 'Royal Kesari Dal (Composite Allergy Profile)',
      foodType: FoodType.VEG,
      dietaryType: DietaryType.NO_ONION_GARLIC,
      allergens: [AllergenType.DAIRY, AllergenType.GLUTEN, AllergenType.SOY],
      basePrice: 550,
      isAvailable: true,
    });

    dishNutNaan = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationTandoor._id,
      name: 'Peshawari Nut Naan (Tree Nut Hazard)',
      foodType: FoodType.VEG,
      dietaryType: DietaryType.VEG,
      allergens: [AllergenType.NUTS, AllergenType.PEANUT],
      basePrice: 180,
      isAvailable: true,
    });

    // Login Head Chef
    const headRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: headChef.email, password }),
    });
    headChefToken = ((await headRes.json()) as any).data.token;

    // Login Sous Chef 1
    const sousRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sousChef1.email, password }),
    });
    sousChef1Token = ((await sousRes.json()) as any).data.token;

    // Socket
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
  });

  // DRILL 1: Concurrent Multi-Chef Tap Race
  test('Drill 1: 5 simultaneous concurrent chef tap requests acknowledge safely without database race collisions', async () => {
    // Create an order
    const order = await RestaurantOrder.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      orderNumber: `ORD-RACE-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table._id,
      tableSessionId: session._id,
      items: [
        {
          menuItemId: dishComplexCurry._id,
          kitchenStationId: stationCurry._id,
          name: dishComplexCurry.name,
          unitPrice: 550,
          quantity: 2,
          subtotal: 1100,
          itemStatus: ItemProductionStatus.PENDING,
          dietaryType: 'NO_ONION_GARLIC',
          allergens: ['DAIRY', 'GLUTEN', 'SOY'],
          hasAllergenAlert: true,
          chefAllergenAcknowledged: false,
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey: `idem-race-${Date.now()}`,
    });

    // Fire 5 concurrent requests
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${testServerUrl}/api/v1/pos/kds/orders/${order._id}/items/0/acknowledge-allergen`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${i % 2 === 0 ? headChefToken : sousChef1Token}`,
          'x-hotel-id': tenantId,
        },
      }).then((r) => r.json())
    );

    const results = (await Promise.all(promises)) as any[];
    for (const res of results) {
      expect(res.success).toBe(true);
      expect(res.data.chefAllergenAcknowledged).toBe(true);
    }

    const updated = await RestaurantOrder.findById(order._id);
    expect(updated!.items[0].chefAllergenAcknowledged).toBe(true);
    expect(updated!.items[0].acknowledgedChefName).toBeDefined();
    expect(updated!.items[0].acknowledgedAt).toBeDefined();
  });

  // DRILL 2: Multi-Station Allergen Isolation
  test('Drill 2: Multi-station order with Curry & Tandoor items isolates acknowledgment by station', async () => {
    const multiStationOrder = await RestaurantOrder.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      orderNumber: `ORD-STN-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table._id,
      tableSessionId: session._id,
      items: [
        {
          menuItemId: dishComplexCurry._id,
          kitchenStationId: stationCurry._id,
          name: dishComplexCurry.name,
          unitPrice: 550,
          quantity: 1,
          subtotal: 550,
          itemStatus: ItemProductionStatus.PENDING,
          hasAllergenAlert: true,
          chefAllergenAcknowledged: false,
        },
        {
          menuItemId: dishNutNaan._id,
          kitchenStationId: stationTandoor._id,
          name: dishNutNaan.name,
          unitPrice: 180,
          quantity: 2,
          subtotal: 360,
          itemStatus: ItemProductionStatus.PENDING,
          allergens: ['NUTS'],
          hasAllergenAlert: true,
          chefAllergenAcknowledged: false,
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey: `idem-stn-${Date.now()}`,
    });

    // 1. Chef acknowledges only Item 0 (Curry Station)
    const ackCurryRes = await fetch(
      `${testServerUrl}/api/v1/pos/kds/orders/${multiStationOrder._id}/items/0/acknowledge-allergen`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headChefToken}`,
          'x-hotel-id': tenantId,
        },
      }
    );
    expect(ackCurryRes.status).toBe(200);

    // 2. Curry Item can now be marked PREPARING
    const prepCurryRes = await fetch(`${testServerUrl}/api/v1/pos/kds/order/${multiStationOrder._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headChefToken}`,
        'x-hotel-id': tenantId,
      },
      body: JSON.stringify({
        status: ItemProductionStatus.PREPARING,
        itemId: dishComplexCurry._id.toString(),
      }),
    });
    expect(prepCurryRes.status).toBe(200);

    // 3. Tandoor Item (Item 1) is still BLOCKED
    const blockedTandoorRes = await fetch(
      `${testServerUrl}/api/v1/pos/kds/order/${multiStationOrder._id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headChefToken}`,
          'x-hotel-id': tenantId,
        },
        body: JSON.stringify({
          status: ItemProductionStatus.PREPARING,
          itemId: dishNutNaan._id.toString(),
        }),
      }
    );
    expect(blockedTandoorRes.status).toBe(400);
    const blockedJson = (await blockedTandoorRes.json()) as any;
    expect(blockedJson.errorCode).toBe('ALLERGEN_NOT_ACKNOWLEDGED');
  });

  // DRILL 3: Composite Allergen Badges & Styling Precision
  test('Drill 3: Item with composite allergens (No Onion/Garlic, Dairy, Gluten, Soy, Note) outputs all badges correctly', () => {
    const complexItem: KdsOrderItemModel = {
      menuItemId: dishComplexCurry._id.toString(),
      name: dishComplexCurry.name,
      quantity: 1,
      unitPrice: 550,
      subtotal: 550,
      kitchenStationId: stationCurry._id.toString(),
      itemStatus: 'PENDING',
      dietaryType: 'NO_ONION_GARLIC',
      allergens: ['DAIRY', 'GLUTEN', 'SOY'],
      allergenNotes: 'Severe Celiac Disease + Lactose Intolerance',
      hasAllergenAlert: true,
      chefAllergenAcknowledged: false,
    };

    const badges = KdsHelper.getAllergenBadges(complexItem);
    expect(badges.length).toBe(5);

    const categories = badges.map((b) => b.category);
    expect(categories).toContain('NO_ONION_GARLIC');
    expect(categories).toContain('DAIRY');
    expect(categories).toContain('GLUTEN');
    expect(categories).toContain('SOY');
    expect(categories).toContain('CUSTOM_NOTE');

    // Verify luxury contrast tokens
    const noOnionBadge = badges.find((b) => b.category === 'NO_ONION_GARLIC')!;
    expect(noOnionBadge.badgeStyle).toContain('indigo');
    expect(noOnionBadge.icon).toContain('🧅');

    const dairyBadge = badges.find((b) => b.category === 'DAIRY')!;
    expect(dairyBadge.badgeStyle).toContain('sky');

    const glutenBadge = badges.find((b) => b.category === 'GLUTEN')!;
    expect(glutenBadge.badgeStyle).toContain('cyan');
  });

  // DRILL 4: Audit Trail Integrity & Socket Broadcast Payload
  test('Drill 4: Real-time socket event kds:allergen_acknowledged carries full chef attribution audit trail', async () => {
    const order = await RestaurantOrder.create({
      hotelId: new mongoose.Types.ObjectId(tenantId),
      orderNumber: `ORD-AUDIT-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      tableId: table._id,
      tableSessionId: session._id,
      items: [
        {
          menuItemId: dishNutNaan._id,
          kitchenStationId: stationTandoor._id,
          name: dishNutNaan.name,
          unitPrice: 180,
          quantity: 1,
          subtotal: 180,
          itemStatus: ItemProductionStatus.PENDING,
          allergens: ['NUTS'],
          hasAllergenAlert: true,
          chefAllergenAcknowledged: false,
        },
      ],
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey: `idem-audit-${Date.now()}`,
    });

    const socketPromise = new Promise<any>((resolve) => {
      kdsSocket.once('kds:allergen_acknowledged', (data) => resolve(data));
    });

    await fetch(`${testServerUrl}/api/v1/pos/kds/orders/${order._id}/items/0/acknowledge-allergen`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headChefToken}`,
        'x-hotel-id': tenantId,
      },
    });

    const event = await socketPromise;
    expect(event.orderId).toBe(order._id.toString());
    expect(event.itemIndex).toBe(0);
    expect(event.itemName).toBe('Peshawari Nut Naan (Tree Nut Hazard)');
    expect(event.acknowledgedBy).toBe('Master Chef Sanjeev Kapoor');
    expect(event.acknowledgedAt).toBeDefined();
  });
});
