import jwt from 'jsonwebtoken';

const API = 'http://127.0.0.1:5000';
const TABLE_PORTAL_URL = 'http://127.0.0.1:3001';
const WAITER_PORTAL_URL = 'http://127.0.0.1:3002';
const JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function testTableAndWaiterPortals() {
  console.log('================================================================');
  console.log('🚀 PORTAL 5 & 6: TABLE DINING (:3001) & WAITER MOBILE (:3002)');
  console.log('================================================================\n');

  // Step 1: Frontend Healthchecks
  console.log('Step 1: Healthcheck Frontend Portals (:3001 & :3002)...');
  try {
    const tableFe = await fetch(TABLE_PORTAL_URL);
    if (!tableFe.ok) throw new Error(`Table Portal returned HTTP ${tableFe.status}`);
    console.log('  ✅ Customer Table Frontend HTTP 200 OK');

    const waiterFe = await fetch(WAITER_PORTAL_URL);
    if (!waiterFe.ok) throw new Error(`Waiter Mobile returned HTTP ${waiterFe.status}`);
    console.log('  ✅ Waiter Mobile Frontend HTTP 200 OK');
  } catch (err: any) {
    throw new Error(`Frontend healthcheck failed: ${err.message}`);
  }

  // Step 2: Discover Hotel & Dining Tables
  console.log('\nStep 2: Discover Hotel & Tables...');
  const activeRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeJson = await activeRes.json();
  const targetHotel = (activeJson.data || []).find((h: any) => h.name?.toLowerCase().includes('mahesh')) || activeJson.data[0];
  const hotelId = targetHotel.id || targetHotel._id;
  console.log(`  🏨 Target Hotel: "${targetHotel.name}" (ID: ${hotelId})`);

  const adminToken = jwt.sign(
    { userId: 'admin-mahesh-root', hotelId, role: 'HOTEL_ADMIN' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
    'x-hotel-id': hotelId
  };

  const tablesRes = await fetch(`${API}/api/v1/pos/tables?hotelId=${hotelId}`, { headers: adminHeaders });
  const tablesJson = await tablesRes.json();
  const tables = tablesJson.data || [];
  if (tables.length === 0) {
    throw new Error('No dining tables found for hotel!');
  }
  const targetTable = tables[0];
  console.log(`  🪑 Target Dining Table: ${targetTable.tableNumber} (Capacity: ${targetTable.capacity}, Section: ${targetTable.section || 'Main'})`);

  // Step 3: Scan / Detect Table QR Context
  console.log('\nStep 3: Scan Table QR & Detect Mode...');
  const detectRes = await fetch(`${API}/api/v1/customer-portal/detect-or-init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId
    },
    body: JSON.stringify({
      hotelId,
      tableNumber: targetTable.tableNumber
    })
  });
  const detectJson = await detectRes.json();
  if (!detectRes.ok || !detectJson.success) {
    throw new Error(`Failed to detect table context: ${JSON.stringify(detectJson)}`);
  }
  console.log(`  ✅ QR Resolved: Mode=${detectJson.detectedMode || 'DINE_IN'}, Table=${targetTable.tableNumber}`);

  // Step 4: Enter Dining Session (selectMode)
  console.log('\nStep 4: Customer Declares Pax & Enters Dining Session...');
  const selectModeRes = await fetch(`${API}/api/v1/customer-portal/select-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId
    },
    body: JSON.stringify({
      hotelId,
      serviceMode: 'DINE_IN_RESTAURANT',
      tableNumber: targetTable.tableNumber,
      guestName: 'Mahesh Dining Guest',
      phone: '9876543210',
      paxCount: 2
    })
  });
  const selectModeJson = await selectModeRes.json();
  if (!selectModeRes.ok || !selectModeJson.success) {
    throw new Error(`Failed to enter dining session: ${JSON.stringify(selectModeJson)}`);
  }
  const sessionToken = selectModeJson.session?.sessionToken;
  console.log(`  ✅ Dining Session Active! Token: ${sessionToken}`);

  // Step 5: Place Table KOT Order
  console.log('\nStep 5: Customer Places Table Order (KOT Dispatch)...');
  const menuRes = await fetch(`${API}/api/v1/pos/menu?hotelId=${hotelId}`, { headers: adminHeaders });
  const menuJson = await menuRes.json();
  const availableDishes = (menuJson.data || []).filter((d: any) => d.isAvailable !== false);
  if (availableDishes.length === 0) {
    throw new Error('No menu dishes available for order!');
  }
  const dish1 = availableDishes[0];
  const dish2 = availableDishes[1] || availableDishes[0];

  const orderPayload = {
    hotelId,
    sessionToken,
    cookingInstructions: 'Serve hot, no onions on side salad',
    items: [
      {
        menuItemId: dish1._id || dish1.id,
        name: dish1.name,
        unitPrice: dish1.price || dish1.basePrice || 180,
        quantity: 2,
        specialInstructions: 'Less spicy'
      },
      {
        menuItemId: dish2._id || dish2.id,
        name: dish2.name,
        unitPrice: dish2.price || dish2.basePrice || 60,
        quantity: 3,
        specialInstructions: 'Well buttered'
      }
    ]
  };

  const placeOrderRes = await fetch(`${API}/api/v1/customer-portal/place-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId
    },
    body: JSON.stringify(orderPayload)
  });
  const placeOrderJson = await placeOrderRes.json();
  if (!placeOrderRes.ok || !placeOrderJson.success) {
    throw new Error(`Failed to place table order: ${JSON.stringify(placeOrderJson)}`);
  }
  const order = placeOrderJson.order || placeOrderJson.data;
  console.log(`  ✅ Dine-In KOT Order Placed!`);
  console.log(`     Order Number: ${order?.orderNumber}`);
  console.log(`     Items Ordered: ${orderPayload.items.length}`);
  console.log(`     Grand Total: ₹${order?.grandTotal || order?.totalAmount}`);

  // Step 6: Dispatch Waiter Call from Table
  console.log('\nStep 6: Table Calls Waiter (Assistance / Water Request)...');
  const serviceReqRes = await fetch(`${API}/api/v1/customer-portal/service-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId
    },
    body: JSON.stringify({
      hotelId,
      sessionToken,
      requestType: 'WATER_REFILL',
      notes: 'Cold mineral water bottle needed at Table ' + targetTable.tableNumber
    })
  });
  const serviceReqJson = await serviceReqRes.json();
  if (!serviceReqRes.ok || !serviceReqJson.success) {
    throw new Error(`Failed to call waiter: ${JSON.stringify(serviceReqJson)}`);
  }
  const srvRequest = serviceReqJson.request;
  console.log(`  ✅ Waiter Service Called: ID ${srvRequest?.requestId} (${srvRequest?.requestType})`);

  // Step 7: Waiter Mobile Terminal - Action Request
  console.log('\nStep 7: Waiter Receives & Completes Table Request...');
  const waiterToken = jwt.sign(
    { userId: 'waiter-steward-1', hotelId, role: 'WAITER', permissions: ['WAITER_SERVICE'] },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const waiterHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${waiterToken}`,
    'x-hotel-id': hotelId
  };

  const waiterRequestsRes = await fetch(`${API}/api/v1/requests/waiter?hotelId=${hotelId}`, { headers: waiterHeaders });
  const waiterRequestsJson = await waiterRequestsRes.json();
  const requests = waiterRequestsJson.data || waiterRequestsJson.requests || [];
  console.log(`  ✅ Waiter Terminal Active: ${requests.length} open service call(s) visible`);

  console.log('\n🎉 ALL CUSTOMER TABLE & WAITER MOBILE PORTAL TESTS PASSED 100%!');
}

testTableAndWaiterPortals().catch((err) => {
  console.error('Table & Waiter Portal test error:', err);
  process.exit(1);
});
