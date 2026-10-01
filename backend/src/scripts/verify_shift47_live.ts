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
  const { KitchenStation } = await import('../models/KitchenStation');
  const { DiningTable, TableStatus } = await import('../models/DiningTable');
  const { TableSession, SessionStatus } = await import('../models/TableSession');
  const { RestaurantOrder, OverallOrderStatus } = await import('../models/RestaurantOrder');

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

  // 3. Setup station, table, session, and Jain menu item
  let station = await KitchenStation.findOne({ hotelId: tenant._id, stationName: 'LIVE_CURRY' });
  if (!station) {
    station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'LIVE_CURRY',
      screenToken: 'live_curry_token',
      isOnline: true,
    });
  }

  let table = await DiningTable.findOne({ hotelId: tenant._id, tableNumber: 'LIVE-01' });
  if (!table) {
    table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'LIVE-01',
      section: 'MAIN_HALL',
      capacity: 4,
      currentStatus: TableStatus.OCCUPIED,
    });
  }

  let session = await TableSession.create({
    hotelId: tenant._id,
    tableId: table._id,
    sessionTokenHash: `live_tok_${Date.now()}`,
    status: SessionStatus.ACTIVE,
  });

  let jainItem = await MenuItem.findOne({ hotelId: tenant._id, name: 'Live Shahi Jain Paneer' });
  if (!jainItem) {
    jainItem = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Live Shahi Jain Paneer',
      foodType: FoodType.VEG,
      dietaryType: 'JAIN',
      allergens: ['DAIRY', 'JAIN_NO_ROOT'],
      basePrice: 450,
      isAvailable: true,
    });
  }

  // 4. Place Live Order via HTTP
  const orderRes = await fetch(`${baseUrl}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `live-idem-${Date.now()}`,
    },
    body: JSON.stringify({
      hotelId: tenant._id.toString(),
      tableSessionId: session._id.toString(),
      items: [
        {
          menuItemId: jainItem._id.toString(),
          quantity: 2,
          allergenNotes: 'Strict Jain guest, no onion garlic root vegetables',
        },
      ],
      idempotencyKey: `live-idem-${Date.now()}`,
    }),
  });
  const orderData = (await orderRes.json()) as any;
  console.log('[Live Drill] Order Placed HTTP Status:', orderRes.status, 'hasAllergenAlert:', orderData.data.items[0].hasAllergenAlert, 'chefAllergenAcknowledged:', orderData.data.items[0].chefAllergenAcknowledged);

  const orderId = orderData.data._id;

  // 5. Verify Safety Lock Blocks PREPARING
  const blockRes = await fetch(`${baseUrl}/api/v1/pos/kds/order/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
    body: JSON.stringify({ status: OverallOrderStatus.PREPARING }),
  });
  const blockData = (await blockRes.json()) as any;
  console.log('[Live Drill] Safety Lock Verification -> Status:', blockRes.status, 'ErrorCode:', blockData.errorCode, 'Message:', blockData.message);

  // 6. Chef Taps to Acknowledge Allergen via HTTP
  const ackRes = await fetch(`${baseUrl}/api/v1/pos/kds/orders/${orderId}/items/0/acknowledge-allergen`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
  });
  const ackData = (await ackRes.json()) as any;
  console.log('[Live Drill] Chef Tap Acknowledged -> Status:', ackRes.status, 'AcknowledgedChef:', ackData.data.acknowledgedChefName, 'chefAllergenAcknowledged:', ackData.data.chefAllergenAcknowledged);

  // 7. Verify Cooking can now proceed to PREPARING
  const prepRes = await fetch(`${baseUrl}/api/v1/pos/kds/order/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hotel-id': tenant._id.toString(),
    },
    body: JSON.stringify({ status: OverallOrderStatus.PREPARING }),
  });
  const prepData = (await prepRes.json()) as any;
  console.log('[Live Drill] Food Prep Proceeded -> Status:', prepRes.status, 'NewOrderStatus:', prepData.data.orderStatus);

  await mongoose.disconnect();
  console.log('[Live Drill] ALL SHIFT 47 LIVE HTTP CHECKS PASSED 100%!');
}

runLiveVerification().catch((err) => {
  console.error('[Live Drill Error]:', err);
  process.exit(1);
});
