import axios from 'axios';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { io as ClientSocket } from 'socket.io-client';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession } from '../models/TableSession';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { RestaurantOrder } from '../models/RestaurantOrder';
const UserRole = {
  MANAGER: 'MANAGER',
};

async function runLiveVerification() {
  console.log('=== [SHIFT 49] LIVE PORT 5000 END-TO-END VERIFICATION START ===');
  const baseURL = 'http://localhost:5000';
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  // 1. Setup Live Test Tenant
  const tenant = await Tenant.create({
    name: 'Shift 49 Live Verification Palace',
    slug: `live-s49-${Date.now()}`,
    contactEmail: `live_s49_${Date.now()}@spicehub.com`,
    contactPhone: '9888800049',
    status: 'ACTIVE',
  });
  const hotelId = tenant._id.toString();
  console.log(`[1] Created Live Tenant: ${tenant.name} (${hotelId})`);

  // 2. Setup Staff User
  const password = 'TestPassword123!';
  const passwordHash = await argon2.hash(password);
  const manager = await User.create({
    hotelId: tenant._id,
    name: 'Live Manager',
    email: `live_mgr_${Date.now()}@spicehub.com`,
    phone: '9876543210',
    passwordHash,
    role: UserRole.MANAGER,
    isActive: true,
  });

  // 3. Login to get JWT
  const loginRes = await axios.post(`${baseURL}/api/v1/auth/login`, {
    email: manager.email,
    password,
    hotelId,
  });
  const token = loginRes.data.data.token;
  console.log(`[2] Successfully Authenticated Manager via HTTP`);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': hotelId,
  };

  // 4. Create Station, Category, Item and Tables
  const station = await KitchenStation.create({
    hotelId: tenant._id,
    stationName: 'Live Hot Kitchen',
    stationCode: 'LHK',
    screenToken: `lhk_token_${Date.now()}`,
    isActive: true,
  });

  const category = await MenuCategory.create({
    hotelId: tenant._id,
    name: 'Live Starters',
    slug: `live-starters-${Date.now()}`,
    displayOrder: 1,
  });

  const testDish = await MenuItem.create({
    hotelId: tenant._id,
    categoryId: category._id,
    kitchenStationId: station._id,
    name: 'Crispy Corn Salt & Pepper',
    itemCode: 'CC-101',
    foodType: FoodType.VEG,
    basePrice: 280,
    price: 280,
    isAvailable: true,
  });

  const tableLive3 = await DiningTable.create({
    hotelId: tenant._id,
    tableNumber: 'LIVE-03',
    section: 'MAIN_DINING',
    capacity: 4,
    currentStatus: TableStatus.AVAILABLE,
  });

  const tableLive4 = await DiningTable.create({
    hotelId: tenant._id,
    tableNumber: 'LIVE-04',
    section: 'MAIN_DINING',
    capacity: 4,
    currentStatus: TableStatus.AVAILABLE,
  });
  console.log(`[3] Seeded Tables LIVE-03 (Cap 4) and LIVE-04 (Cap 4)`);

  // 5. Connect Live Socket.IO
  const liveSocket = ClientSocket(baseURL, { transports: ['websocket'] });
  let receivedMergeEvent: any = null;
  let receivedUnmergeEvent: any = null;

  await new Promise<void>((resolve) => {
    liveSocket.on('connect', () => {
      liveSocket.emit('join_tenant_room', { hotelId, station: 'pos' });
      resolve();
    });
  });

  liveSocket.on('table:merged', (ev) => {
    receivedMergeEvent = ev;
  });

  liveSocket.on('table:unmerged', (ev) => {
    receivedUnmergeEvent = ev;
  });

  // 6. Merge LIVE-04 into LIVE-03
  const mergeHttpRes = await axios.post(
    `${baseURL}/api/v1/pos/tables/merge`,
    {
      primaryTableId: tableLive3._id.toString(),
      secondaryTableIds: [tableLive4._id.toString()],
      mergedBy: 'Live Floor Captain',
    },
    { headers: authHeaders }
  );

  if (
    mergeHttpRes.data.success &&
    mergeHttpRes.data.data.combinedCapacity === 8 &&
    mergeHttpRes.data.data.primaryTable.isMerged === true
  ) {
    console.log(`[4] HTTP POST /tables/merge SUCCESS: Consolidated Capacity = 8 Pax`);
  } else {
    throw new Error('Table merge response failed validation');
  }

  // Allow socket event to arrive
  await new Promise((r) => setTimeout(r, 300));
  if (receivedMergeEvent && receivedMergeEvent.combinedCapacity === 8) {
    console.log(`[5] Realtime Socket.IO table:merged event verified! Primary: ${receivedMergeEvent.primaryTableNumber}`);
  } else {
    throw new Error('Socket.IO table:merged event was not received');
  }

  // 7. QR Scan on LIVE-04 -> Verify it returns unified parent session
  const qrScanRes = await axios.get(
    `${baseURL}/api/v1/pos/table/qr-entry?hotelId=${hotelId}&tableId=${tableLive4._id.toString()}`
  );

  if (
    qrScanRes.data.success &&
    qrScanRes.data.data.tableId === tableLive3._id.toString() &&
    qrScanRes.data.data.originalScannedTableNumber === 'LIVE-04' &&
    qrScanRes.data.data.isMerged === true &&
    qrScanRes.data.data.combinedCapacity === 8
  ) {
    console.log(`[6] HTTP GET /table/qr-entry for LIVE-04 successfully routed to parent LIVE-03 session!`);
  } else {
    throw new Error('QR Entry routing resolution failed');
  }

  // 8. Place order on the unified tab
  const placeOrderRes = await axios.post(
    `${baseURL}/api/v1/pos/orders/place`,
    {
      hotelId,
      tableSessionId: qrScanRes.data.data.sessionId,
      items: [{ menuItemId: testDish._id.toString(), quantity: 2 }],
    },
    {
      headers: {
        'x-idempotency-key': `idemp-live-s49-${Date.now()}`,
      },
    }
  );

  if (placeOrderRes.data.success) {
    console.log(`[7] HTTP POST /orders/place successfully added items to unified tab!`);
  } else {
    throw new Error('Order placement on unified tab failed');
  }

  // 9. Split / Unmerge LIVE-04 from LIVE-03
  const unmergeHttpRes = await axios.post(
    `${baseURL}/api/v1/pos/tables/unmerge`,
    {
      primaryTableId: tableLive3._id.toString(),
      unmergeTableIds: [tableLive4._id.toString()],
      splitBy: 'Live Floor Captain',
    },
    { headers: authHeaders }
  );

  if (
    unmergeHttpRes.data.success &&
    unmergeHttpRes.data.data.primaryTable.isMerged === false &&
    unmergeHttpRes.data.data.primaryTable.combinedCapacity === 4 &&
    unmergeHttpRes.data.data.unmergedTables[0].status === TableStatus.AVAILABLE
  ) {
    console.log(`[8] HTTP POST /tables/unmerge SUCCESS: LIVE-04 restored to AVAILABLE, LIVE-03 capacity restored to 4`);
  } else {
    throw new Error('Table unmerge response failed validation');
  }

  await new Promise((r) => setTimeout(r, 300));
  if (receivedUnmergeEvent && receivedUnmergeEvent.unmergedTableNumbers.includes('LIVE-04')) {
    console.log(`[9] Realtime Socket.IO table:unmerged event verified!`);
  } else {
    throw new Error('Socket.IO table:unmerged event was not received');
  }

  // 10. Cleanup
  liveSocket.disconnect();
  await Tenant.findByIdAndDelete(hotelId);
  await User.deleteMany({ hotelId });
  await DiningTable.deleteMany({ hotelId });
  await TableSession.deleteMany({ hotelId });
  await RestaurantOrder.deleteMany({ hotelId });
  await MenuItem.deleteMany({ hotelId });
  await MenuCategory.deleteMany({ hotelId });
  await KitchenStation.deleteMany({ hotelId });
  await mongoose.disconnect();

  console.log('=== [SHIFT 49] ALL 9/9 LIVE CHECKS PASSED WITH 100% ZERO-DEFECT ACCURACY ===');
}

runLiveVerification().catch((err) => {
  console.error('[ERROR] Live Verification Failed:', err);
  process.exit(1);
});
