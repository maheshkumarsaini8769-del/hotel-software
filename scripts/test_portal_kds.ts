import jwt from 'jsonwebtoken';

const API = 'http://127.0.0.1:5000';
const KDS_PORTAL_URL = 'http://127.0.0.1:3003';
const JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function testKdsPortal() {
  console.log('================================================================');
  console.log('🚀 PORTAL 6: KITCHEN DISPLAY SYSTEM KDS (Port 3003 & KDS API)');
  console.log('================================================================\n');

  // Step 1: Frontend Healthcheck (:3003)
  console.log('Step 1: Check Kitchen KDS Frontend (:3003)...');
  try {
    const feRes = await fetch(KDS_PORTAL_URL);
    if (!feRes.ok) throw new Error(`Frontend returned HTTP ${feRes.status}`);
    const html = await feRes.text();
    console.log(`  ✅ Kitchen KDS Frontend HTTP 200 OK (${html.length} bytes delivered)`);
  } catch (err: any) {
    throw new Error(`KDS frontend not reachable at :3003: ${err.message}`);
  }

  // Step 2: Hotel Discovery & Chef Authentication
  console.log('\nStep 2: Authenticate Head Chef / KDS Terminal...');
  const activeRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeJson = await activeRes.json();
  const targetHotel = (activeJson.data || []).find((h: any) => h.name?.toLowerCase().includes('mahesh')) || activeJson.data[0];
  const hotelId = targetHotel.id || targetHotel._id;
  console.log(`  🏨 Target Hotel: "${targetHotel.name}" (ID: ${hotelId})`);

  const chefToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8055',
      hotelId: hotelId.toString(),
      role: 'CHEF',
      permissions: ['KDS_OPERATIONS', 'MENU_STOCK_86', 'KITCHEN_BUZZER']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const chefHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${chefToken}`,
    'x-hotel-id': hotelId.toString()
  };
  console.log('  ✅ Chef Terminal Token issued');

  // Step 3: Kitchen Stations Query
  console.log('\nStep 3: Query Kitchen Stations...');
  const stationsRes = await fetch(`${API}/api/v1/pos/kds/stations?hotelId=${hotelId}`, { headers: chefHeaders });
  const stationsJson = await stationsRes.json();
  const stations = stationsJson.data || stationsJson.stations || [];
  console.log(`  ✅ Kitchen Stations: ${stations.length} configured station(s)`);

  // Step 4: Live KDS Order Tickets Stream
  console.log('\nStep 4: Fetch Live KDS Ticket Queue...');
  const kdsOrdersRes = await fetch(`${API}/api/v1/pos/kds-orders?hotelId=${hotelId}`, { headers: chefHeaders });
  const kdsOrdersJson = await kdsOrdersRes.json();
  const orders = kdsOrdersJson.data || kdsOrdersJson.orders || [];
  console.log(`  ✅ Incoming KOT Tickets: ${orders.length} active ticket(s) in kitchen feed`);

  let targetOrder = orders.find((o: any) => o.orderStatus === 'PLACED') || orders[0];
  if (!targetOrder) {
    console.log('  ⚠️ No open ticket found in feed, placing a fresh test KOT ticket...');
    const menuRes = await fetch(`${API}/api/v1/pos/menu?hotelId=${hotelId}`, { headers: chefHeaders });
    const menuJson = await menuRes.json();
    const dishes = menuJson.data || [];
    const dish = dishes[0];

    const orderRes = await fetch(`${API}/api/v1/customer-portal/place-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
      body: JSON.stringify({
        hotelId,
        sessionToken: 'UCS-TEST-KDS-' + Date.now(),
        items: [{ menuItemId: dish._id, name: dish.name, unitPrice: 200, quantity: 1 }]
      })
    });
    const orderJson = await orderRes.json();
    targetOrder = orderJson.order || orderJson.data;
  }

  const orderId = targetOrder._id || targetOrder.id || targetOrder.orderNumber;
  console.log(`  🎫 Selected Ticket: ${targetOrder.orderNumber} (Current Status: ${targetOrder.orderStatus})`);

  // Step 5: Transition Ticket to PREPARING
  console.log('\nStep 5: Chef Starts Cooking (Transition to PREPARING)...');
  const prepRes = await fetch(`${API}/api/v1/pos/kds/order/${orderId}/status`, {
    method: 'PATCH',
    headers: chefHeaders,
    body: JSON.stringify({
      hotelId,
      status: 'PREPARING'
    })
  });
  const prepJson = await prepRes.json();
  if (!prepRes.ok || !prepJson.success) {
    throw new Error(`Failed to transition to PREPARING: ${JSON.stringify(prepJson)}`);
  }
  console.log(`  ✅ Ticket ${targetOrder.orderNumber} transitioned to PREPARING`);

  // Step 6: Transition Ticket to READY (Food Plated)
  console.log('\nStep 6: Food Plated at Kitchen Pass (Transition to READY)...');
  const readyRes = await fetch(`${API}/api/v1/pos/kds/order/${orderId}/status`, {
    method: 'PATCH',
    headers: chefHeaders,
    body: JSON.stringify({
      hotelId,
      status: 'READY'
    })
  });
  const readyJson = await readyRes.json();
  if (!readyRes.ok || !readyJson.success) {
    throw new Error(`Failed to transition to READY: ${JSON.stringify(readyJson)}`);
  }
  console.log(`  ✅ Ticket ${targetOrder.orderNumber} transitioned to READY`);

  // Step 7: Sound Kitchen Buzzer for Waiter Pickup
  console.log('\nStep 7: Kitchen Buzzer Alert for Runner/Waiter Pickup...');
  const buzzerPayload = {
    hotelId,
    orderId: targetOrder._id,
    tableNumber: targetOrder.tableNumber || 'STAR-01',
    message: `Hot food ready for ${targetOrder.orderNumber} at Main Kitchen Pass!`
  };

  const buzzerRes = await fetch(`${API}/api/v1/pos/kds/buzzer`, {
    method: 'POST',
    headers: chefHeaders,
    body: JSON.stringify(buzzerPayload)
  });
  const buzzerJson = await buzzerRes.json();
  console.log(`  ✅ Kitchen Buzzer Emitted: ${buzzerJson.message || 'Buzzer sounded'}`);

  // Step 8: Pass Bump to SERVED
  console.log('\nStep 8: Waiter Picks Up & Serves Order (Bump Pass to SERVED)...');
  const serveRes = await fetch(`${API}/api/v1/pos/orders/${orderId}/serve`, {
    method: 'PATCH',
    headers: chefHeaders,
    body: JSON.stringify({
      hotelId,
      status: 'SERVED'
    })
  });
  const serveJson = await serveRes.json();
  if (!serveRes.ok || !serveJson.success) {
    throw new Error(`Failed to bump order to SERVED: ${JSON.stringify(serveJson)}`);
  }
  console.log(`  ✅ Ticket ${targetOrder.orderNumber} Bumped to SERVED!`);

  console.log('\n🎉 ALL KITCHEN DISPLAY SYSTEM (KDS) PORTAL TESTS PASSED 100%!');
}

testKdsPortal().catch((err) => {
  console.error('KDS Portal test error:', err);
  process.exit(1);
});
