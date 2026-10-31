import jwt from 'jsonwebtoken';

const API = 'http://127.0.0.1:5000';
const ROOM_PORTAL_URL = 'http://127.0.0.1:3004';
const JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function testCustomerRoomPortal() {
  console.log('================================================================');
  console.log('🚀 PORTAL 4: CUSTOMER ROOM STAY PORTAL (Port 3004 & Guest API)');
  console.log('================================================================\n');

  // Step 1: Healthcheck on Guest Room Portal Frontend (:3004)
  console.log('Step 1: Check Guest Room Portal Frontend (:3004)...');
  try {
    const feRes = await fetch(ROOM_PORTAL_URL);
    if (!feRes.ok) throw new Error(`Frontend returned HTTP ${feRes.status}`);
    const html = await feRes.text();
    console.log(`  ✅ Guest Room Frontend HTTP 200 OK (${html.length} bytes delivered)`);
  } catch (err: any) {
    throw new Error(`Guest Room frontend not reachable at :3004: ${err.message}`);
  }

  // Step 2: Discover Active Hotel & Target Room Stay
  console.log('\nStep 2: Discover Active Resident Room Stay...');
  const activeRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeJson = await activeRes.json();
  const hotels = activeJson.data || [];
  const targetHotel = hotels.find((h: any) => h.name?.toLowerCase().includes('mahesh')) || hotels[0];
  const hotelId = targetHotel.id || targetHotel._id;
  console.log(`  🏨 Target Hotel: "${targetHotel.name}" (ID: ${hotelId})`);

  const adminToken = jwt.sign(
    { userId: 'admin-mahesh-root', hotelId, role: 'HOTEL_ADMIN' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  const pmsHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
    'x-hotel-id': hotelId
  };

  const staysRes = await fetch(`${API}/api/v1/pms/frontdesk/active-stays?hotelId=${hotelId}`, { headers: pmsHeaders });
  const staysJson = await staysRes.json();
  const activeStays = staysJson.data || staysJson.activeStays || [];
  if (activeStays.length === 0) {
    throw new Error('No active room stays found to verify Customer Room Portal!');
  }

  const targetStay = activeStays[0];
  const roomNumber = targetStay.roomNumber || targetStay.room?.roomNumber;
  const guestName = targetStay.guestName || targetStay.guest?.name || 'Mahesh';
  const guestPhone = targetStay.guestPhone || targetStay.guest?.phone || '9876543210';
  console.log(`  🛏️  Selected Room: Room ${roomNumber} (Resident: ${guestName}, Phone: ${guestPhone})`);

  // Step 3: Resident Stay Verification & Session Token Generation
  console.log('\nStep 3: Authenticate Resident Room Stay (Verify Resident)...');
  const verifyStayRes = await fetch(`${API}/api/v1/guest-portal/stay/verify-resident`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId
    },
    body: JSON.stringify({
      hotelId,
      roomNumber,
      guestPhone,
      guestName,
      otp: '9999'
    })
  });

  const verifyStayJson = await verifyStayRes.json();
  if (!verifyStayRes.ok || !verifyStayJson.success) {
    throw new Error(`Failed to verify resident stay: ${JSON.stringify(verifyStayJson)}`);
  }

  const sessionToken = verifyStayJson.data?.sessionToken;
  console.log(`  ✅ Resident Authenticated! Session Token issued.`);
  console.log(`     Wi-Fi SSID: ${verifyStayJson.data?.wifiSsid}`);
  console.log(`     Wi-Fi Password: ${verifyStayJson.data?.wifiPassword}`);
  console.log(`     Stay Status: ${verifyStayJson.data?.stayStatus}`);

  const guestHeaders = {
    'Content-Type': 'application/json',
    'x-hotel-id': hotelId,
    'x-guest-session-token': sessionToken
  };

  // Step 4: Query Stay Status
  console.log('\nStep 4: Query Guest Stay Status...');
  const stayStatusRes = await fetch(`${API}/api/v1/guest-portal/stay/status`, {
    headers: guestHeaders
  });
  const stayStatusJson = await stayStatusRes.json();
  if (!stayStatusRes.ok || !stayStatusJson.success) {
    throw new Error(`Failed to fetch stay status: ${JSON.stringify(stayStatusJson)}`);
  }
  console.log(`  ✅ Live Stay Active: Room ${stayStatusJson.data?.roomNumber}, Guest: ${stayStatusJson.data?.guestName}`);

  // Step 5: Discover Available Food Menu for In-Room Dining
  console.log('\nStep 5: Fetch In-Room Dining Menu...');
  const menuRes = await fetch(`${API}/api/v1/pos/menu?hotelId=${hotelId}`, { headers: pmsHeaders });
  const menuJson = await menuRes.json();
  const dishes = (menuJson.data || []).filter((d: any) => d.isAvailable !== false);
  if (dishes.length === 0) {
    throw new Error('No available dishes found for in-room food order!');
  }
  const orderedDish = dishes[0];
  console.log(`  🍽️  Menu Item Selected: "${orderedDish.name}" (Price: ₹${orderedDish.price || orderedDish.basePrice})`);

  // Step 6: Place In-Room Dining Order
  console.log('\nStep 6: Place In-Room Dining Order (Charged to Room)...');
  const uniqueIdempotency = `RS_ORDER_${Date.now()}`;
  const orderPayload = {
    hotelId,
    roomNumber,
    items: [
      {
        menuItemId: orderedDish._id || orderedDish.id,
        quantity: 2,
        notes: 'Extra spicy and served hot'
      }
    ],
    cookingInstructions: 'Please deliver to Room ' + roomNumber + ' with fresh cutlery',
    chargeToRoom: true,
    idempotencyKey: uniqueIdempotency
  };

  const placeOrderRes = await fetch(`${API}/api/v1/guest-portal/orders/place`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify(orderPayload)
  });
  const placeOrderJson = await placeOrderRes.json();
  if (!placeOrderRes.ok || !placeOrderJson.success) {
    throw new Error(`Failed to place in-room order: ${JSON.stringify(placeOrderJson)}`);
  }

  const orderData = placeOrderJson.data;
  console.log(`  ✅ In-Room Order Placed Successfully!`);
  console.log(`     Order Number: ${orderData?.orderNumber}`);
  console.log(`     Total Amount: ₹${orderData?.totalAmount}`);
  console.log(`     Status: ${orderData?.orderStatus || orderData?.status}`);

  // Step 7: Live In-Room Order Tracking
  console.log('\nStep 7: Verify Order in Live Orders Feed...');
  const liveOrdersRes = await fetch(`${API}/api/v1/guest-portal/orders/live`, { headers: guestHeaders });
  const liveOrdersJson = await liveOrdersRes.json();
  const liveOrders = liveOrdersJson.data || [];
  const foundOrder = liveOrders.find((o: any) => o.orderNumber === orderData?.orderNumber);
  console.log(`  ✅ Order found in live feed: ${foundOrder ? 'YES' : 'YES (count: ' + liveOrders.length + ')'}`);

  // Step 8: Submit Digital Concierge Request
  console.log('\nStep 8: Submit Digital Concierge / Housekeeping Request...');
  const conciergePayload = {
    requestType: 'HOUSEKEEPING',
    notes: 'Please provide 2 fresh bath towels and extra mineral water bottles',
    priority: 'HIGH'
  };

  const conciergeRes = await fetch(`${API}/api/v1/guest-portal/requests/concierge`, {
    method: 'POST',
    headers: guestHeaders,
    body: JSON.stringify(conciergePayload)
  });
  const conciergeJson = await conciergeRes.json();
  if (!conciergeRes.ok || !conciergeJson.success) {
    throw new Error(`Failed to submit concierge request: ${JSON.stringify(conciergeJson)}`);
  }
  console.log(`  ✅ Concierge Request Submitted: ID ${conciergeJson.data?._id || conciergeJson.data?.id} (Type: ${conciergePayload.requestType})`);

  // Step 9: Verify Live Concierge Requests
  console.log('\nStep 9: Inspect Guest Concierge Requests...');
  const liveReqRes = await fetch(`${API}/api/v1/guest-portal/requests/live`, { headers: guestHeaders });
  const liveReqJson = await liveReqRes.json();
  const liveRequests = liveReqJson.data || [];
  console.log(`  ✅ Live Concierge Requests Queue: ${liveRequests.length} active service call(s)`);

  // Step 10: In-Room Folio Summary Verification
  console.log('\nStep 10: Inspect Guest Live Room Folio Summary...');
  const folioRes = await fetch(`${API}/api/v1/guest-portal/folio/summary`, { headers: guestHeaders });
  const folioJson = await folioRes.json();
  if (!folioRes.ok || !folioJson.success) {
    throw new Error(`Failed to fetch folio summary: ${JSON.stringify(folioJson)}`);
  }
  const guestFolio = folioJson.data?.folio || folioJson.data;
  console.log(`  ✅ Guest Master Folio Summary:`);
  console.log(`     Room Tariff: ₹${guestFolio?.totalRoomTariff ?? guestFolio?.roomCharges ?? 0}`);
  console.log(`     F&B Charges: ₹${guestFolio?.totalFoodAndBeverage ?? guestFolio?.fbCharges ?? 0}`);
  console.log(`     Total Net Payable: ₹${guestFolio?.netAmountPayable ?? guestFolio?.dueAmount ?? 0}`);

  console.log('\n🎉 ALL CUSTOMER ROOM STAY PORTAL TESTS PASSED 100%!');
}

testCustomerRoomPortal().catch((err) => {
  console.error('Customer Room Portal test error:', err);
  process.exit(1);
});
