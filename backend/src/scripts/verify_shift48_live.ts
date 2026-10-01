import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const port = process.env.PORT || 5000;
const baseUrl = `http://localhost:${port}`;

async function runLiveVerification() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
  await mongoose.connect(mongoUri);

  const { Tenant } = await import('../models/Tenant');
  const { User } = await import('../models/User');
  const { MenuItem, FoodType } = await import('../models/MenuItem');
  const { MenuCategory } = await import('../models/MenuCategory');
  const { KitchenStation } = await import('../models/KitchenStation');
  const { DiningTable, TableStatus } = await import('../models/DiningTable');
  const { TableSession, SessionStatus } = await import('../models/TableSession');
  const { RestaurantOrder } = await import('../models/RestaurantOrder');

  console.log('[Live Drill] Connecting to Live Server on:', baseUrl);

  // 1. Get or create Tenant & Chef
  let tenant = await Tenant.findOne({ slug: 'live-kds-palace' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'Live KDS Luxury Palace',
      slug: 'live-kds-palace',
      contactEmail: 'live_kds@palace.com',
      contactPhone: '9888800099',
      status: 'ACTIVE',
    });
  }

  const argon2 = require('argon2');
  const hash = await argon2.hash('Test1234!');
  let chef = await User.findOne({ email: 'live_master_chef@palace.com' });
  if (!chef) {
    chef = await User.create({
      hotelId: tenant._id,
      name: 'Master Chef Sanjeev Live',
      email: 'live_master_chef@palace.com',
      phone: '9888800098',
      passwordHash: hash,
      role: 'CHEF',
      isActive: true,
    });
  }

  // 2. Login Chef
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: chef.email, password: 'Test1234!' }),
  });
  const loginJson = (await loginRes.json()) as any;
  const token = loginJson.data.token;
  console.log('[Live Drill] Chef logged in successfully, token acquired.');

  // 3. Station & Category
  let station = await KitchenStation.findOne({ hotelId: tenant._id, stationCode: 'LIV-TND' });
  if (!station) {
    station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'Live Tandoor Screen',
      stationCode: 'LIV-TND',
      screenToken: 'token_live_tnd_86',
      isActive: true,
    });
  }

  let category = await MenuCategory.findOne({ hotelId: tenant._id, slug: 'live-starters' });
  if (!category) {
    category = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Live Royal Starters',
      slug: 'live-starters',
      isActive: true,
    });
  }

  // 4. Create or find dish
  let dish = await MenuItem.findOne({ hotelId: tenant._id, name: 'Live Zafrani Paneer Tikka 86' });
  if (!dish) {
    dish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Live Zafrani Paneer Tikka 86',
      itemCode: 'LIV-86',
      foodType: FoodType.VEG,
      basePrice: 350,
      isAvailable: true,
      prepTimeMinutes: 12,
    });
  }

  // Ensure initially available
  dish.isAvailable = true;
  await dish.save();

  // 5. Table & Session
  let table = await DiningTable.findOne({ hotelId: tenant._id, tableNumber: 'Live 86 Table' });
  if (!table) {
    table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'Live 86 Table',
      section: 'Live Terrace',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });
  }

  let session = await TableSession.create({
    hotelId: tenant._id,
    tableId: table._id,
    sessionTokenHash: 'hash_live_86',
    status: SessionStatus.ACTIVE,
    guestCount: 2,
    totalAmount: 0,
    finalAmount: 0,
  });

  // Step 6: 1-Tap 86 Toggle via Live HTTP
  console.log('[Live Drill] 1-Tap 86 Toggle -> Marking dish out of stock...');
  const toggleRes = await fetch(`${baseUrl}/api/v1/pos/menu/${dish._id}/toggle-86`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
    body: JSON.stringify({
      isAvailable: false,
      reason: 'INGREDIENT_EXHAUSTED',
      chefName: 'Master Chef Sanjeev Live',
    }),
  });
  const toggleJson = (await toggleRes.json()) as any;
  console.log(`[Live Drill] 86 Toggle Response Status: ${toggleRes.status}, isAvailable: ${toggleJson.data?.isAvailable}, reason: ${toggleJson.data?.outOfStockReason}`);
  if (toggleRes.status !== 200 || toggleJson.data?.isAvailable !== false) {
    throw new Error('Failed to toggle item 86');
  }

  // Step 7: Customer Order Placement Blocking Drill
  console.log('[Live Drill] Attempting to place order with 86 item (expecting 400 rejection)...');
  const orderBlockedRes = await fetch(`${baseUrl}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `live_order_86_blocked_${Date.now()}`,
    },
    body: JSON.stringify({
      hotelId: tenant._id.toString(),
      tableSessionId: session._id.toString(),
      items: [{ menuItemId: dish._id.toString(), quantity: 1 }],
    }),
  });
  const orderBlockedJson = (await orderBlockedRes.json()) as any;
  console.log(`[Live Drill] Order Rejection Status: ${orderBlockedRes.status}, ErrorCode: ${orderBlockedJson.errorCode}, Message: ${orderBlockedJson.message}`);
  if (orderBlockedRes.status !== 400 || orderBlockedJson.errorCode !== 'ITEM_UNAVAILABLE') {
    throw new Error('Expected 400 ITEM_UNAVAILABLE for 86 item order');
  }

  // Step 8: Query 86 List
  console.log('[Live Drill] Querying active 86 items list for kitchen review...');
  const list86Res = await fetch(`${baseUrl}/api/v1/pos/menu/86-items`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
  });
  const list86Json = (await list86Res.json()) as any;
  console.log(`[Live Drill] 86 Items Count: ${list86Json.count}`);
  if (list86Res.status !== 200 || list86Json.count < 1) {
    throw new Error('Failed to retrieve 86 items list');
  }

  // Step 9: 1-Tap Restock
  console.log('[Live Drill] 1-Tap Restock -> Restoring dish to in-stock...');
  const restockRes = await fetch(`${baseUrl}/api/v1/pos/menu/${dish._id}/toggle-86`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
    body: JSON.stringify({
      isAvailable: true,
      chefName: 'Master Chef Sanjeev Live',
    }),
  });
  const restockJson = (await restockRes.json()) as any;
  console.log(`[Live Drill] Restock Response Status: ${restockRes.status}, isAvailable: ${restockJson.data?.isAvailable}`);
  if (restockRes.status !== 200 || restockJson.data?.isAvailable !== true) {
    throw new Error('Failed to restock item');
  }

  // Step 10: Order Placement Succeeded
  console.log('[Live Drill] Placing order now that item is restocked...');
  const orderSuccessRes = await fetch(`${baseUrl}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `live_order_success_${Date.now()}`,
    },
    body: JSON.stringify({
      hotelId: tenant._id.toString(),
      tableSessionId: session._id.toString(),
      items: [{ menuItemId: dish._id.toString(), quantity: 2 }],
    }),
  });
  const orderSuccessJson = (await orderSuccessRes.json()) as any;
  console.log(`[Live Drill] Order Success Status: ${orderSuccessRes.status}, OrderNumber: ${orderSuccessJson.data?.orderNumber || orderSuccessJson.order?.orderNumber}`);
  if (orderSuccessRes.status !== 201) {
    throw new Error('Failed to place order after restock');
  }

  console.log('[Live Drill] ALL SHIFT 48 LIVE HTTP CHECKS PASSED 100%!');
  await mongoose.disconnect();
}

runLiveVerification().catch((err) => {
  console.error('[Live Drill Error]', err);
  process.exit(1);
});
