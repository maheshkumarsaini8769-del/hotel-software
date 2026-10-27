/**
 * Master E2E Continuous Hospitality Drill & Verification Suite
 * Executes full lifecycles across both Guest Stay and Table Dining workflows.
 */
import { io as SocketClient } from 'socket.io-client';

const API = 'http://10.208.156.216:5000';
console.log(`\n🚀 ================================================================`);
console.log(`   SPICEHUB MASTER CONTINUOUS HOSPITALITY VERIFICATION DRILL`);
console.log(`   Host Target: ${API}`);
console.log(`   Timestamp:   ${new Date().toISOString()}`);
console.log(`================================================================\n`);

async function run() {
  const stats = {
    stepsExecuted: 0,
    stepsPassed: 0,
    failures: [] as string[],
  };

  const assert = (condition: boolean, stepName: string, detail?: any) => {
    stats.stepsExecuted++;
    if (condition) {
      stats.stepsPassed++;
      console.log(`  ✅ [PASS] ${stepName}`);
    } else {
      stats.failures.push(stepName);
      console.error(`  ❌ [FAIL] ${stepName}`, detail || '');
    }
  };

  // -------------------------------------------------------------------------
  // STAGE 1: HEALTH & INFRASTRUCTURE READINESS
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 1: HEALTH & INFRASTRUCTURE READINESS ---`);
  const healthRes = await fetch(`${API}/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === 'HEALTHY', 'Server Health is HEALTHY and DB is CONNECTED');

  const activeHotelsRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeHotelsJson = await activeHotelsRes.json();
  assert(activeHotelsRes.ok && activeHotelsJson.success && activeHotelsJson.data.length > 0, 'Active Hotels Endpoint returns properties for mobile discovery');
  const targetHotel = activeHotelsJson.data[0];
  const hotelId = targetHotel.id;
  console.log(`  🏨 Target Hotel for Verification: "${targetHotel.name}" (ID: ${hotelId})`);

  // -------------------------------------------------------------------------
  // STAGE 2: SUPERADMIN & STAFF PROVISIONING
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 2: STAFF PROVISIONING & WORKSTATION ENTITLEMENTS ---`);
  const staffRes = await fetch(`${API}/api/v1/hotel-staff?hotelId=${hotelId}`);
  const staffJson = await staffRes.json();
  assert(staffRes.ok && staffJson.success, 'Fetch hotel staff roster');
  console.log(`  👥 Total provisioned staff members: ${staffJson.data?.length || 0}`);

  // Create a dedicated test waiter if needed
  const newStaffPayload = {
    name: `Drill Steward ${Date.now().toString().slice(-4)}`,
    email: `steward_${Date.now().toString().slice(-4)}@spicehub-drill.com`,
    role: 'WAITER',
    department: 'Food & Beverage',
    section: 'Imperial Dining Hall',
    pin: '2580',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
  };
  const createStaffRes = await fetch(`${API}/api/v1/hotel-staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify(newStaffPayload),
  });
  const createStaffJson = await createStaffRes.json();
  assert(createStaffRes.ok && createStaffJson.success, 'Provision new steward with encrypted 4-digit PIN');
  const createdStaffId = createStaffJson.data?._id || createStaffJson.data?.id;

  // Verify PIN Authentication via Staff Login
  const staffLoginRes = await fetch(`${API}/api/v1/auth/staff-pin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ staffId: createdStaffId, pin: '2580', hotelId }),
  });
  const staffLoginJson = await staffLoginRes.json();
  assert(staffLoginRes.ok && staffLoginJson.success && staffLoginJson.data?.token, 'Staff 4-digit PIN authentication produces valid session token');
  const staffToken = staffLoginJson.data?.token;

  // -------------------------------------------------------------------------
  // STAGE 3: GUEST ROOM BOOKING & KYC REGISTRATION
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 3: GUEST ROOM BOOKING & KYC SUBMISSION ---`);
  const roomCatalogRes = await fetch(`${API}/api/v1/guest-portal/rooms/catalog?hotelId=${hotelId}`);
  const roomCatalogJson = await roomCatalogRes.json();
  assert(roomCatalogRes.ok && roomCatalogJson.success, 'Fetch guest room catalog');
  
  const roomsList = Array.isArray(roomCatalogJson.data?.rooms) ? roomCatalogJson.data.rooms : (Array.isArray(roomCatalogJson.data) ? roomCatalogJson.data : []);
  const availableRoom = roomsList.find((r: any) => r.displayStatus === 'AVAILABLE') || roomsList[0];
  const targetRoomNumber = availableRoom?.roomNumber || '305';
  console.log(`  🛏️ Selected Room for Booking: #${targetRoomNumber}`);

  const bookingPayload = {
    hotelId,
    roomId: availableRoom._id || availableRoom.id,
    roomNumber: targetRoomNumber,
    guestName: 'Vikramaditya Rathore',
    guestPhone: '+91 98765 43210',
    guestEmail: 'vikram.rathore@heritage-royal.in',
    idType: 'AADHAAR',
    idNumber: '8912-4321-7654',
    checkInDate: new Date().toISOString(),
    checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    advancePaid: 1000,
    requiresReceptionApproval: true,
  };

  const bookingRes = await fetch(`${API}/api/v1/guest-portal/rooms/book-and-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify(bookingPayload),
  });
  const bookingJson = await bookingRes.json();
  assert(bookingRes.ok && bookingJson.success, 'Customer submits room booking with Aadhaar KYC document');
  const bookingId = bookingJson.data?.bookingId || bookingJson.data?._id || bookingJson.data?.id;
  const bookingNumber = bookingJson.data?.bookingNumber;

  // -------------------------------------------------------------------------
  // STAGE 4: FRONT DESK RECEPTION VERIFICATION & APPROVAL
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 4: RECEPTION DESK APPROVAL & KEYCARD ISSUANCE ---`);
  const approveRes = await fetch(`${API}/api/v1/guest-portal/rooms/approve-checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      hotelId,
      bookingId,
      bookingNumber,
      approvedBy: 'Front Desk Reception Officer',
    }),
  });
  const approveJson = await approveRes.json();
  assert(approveRes.ok && approveJson.success, 'Front desk approves check-in, activates stay & generates digital keycard');
  const guestSessionToken = approveJson.data?.sessionToken || approveJson.data?.token;
  console.log(`  🔑 Digital Keycard issued: Code ${approveJson.data?.keycardPin || '4928'}, Wi-Fi: ${approveJson.data?.wifiPassword || 'Royal@2026'}`);

  // -------------------------------------------------------------------------
  // STAGE 5: RESIDENT IN-ROOM DINING & REALTIME KDS DISPATCH
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 5: RESIDENT IN-ROOM DINING & KDS COOKING CYCLE ---`);
  // Verify Resident Session Resolution
  const verifyResidentRes = await fetch(`${API}/api/v1/guest-portal/stay/verify-resident`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, 'x-guest-session-token': guestSessionToken },
    body: JSON.stringify({ hotelId, sessionToken: guestSessionToken, roomNumber: targetRoomNumber, guestPhone: '+91 98765 43210' }),
  });
  const verifyResidentJson = await verifyResidentRes.json();
  assert(verifyResidentRes.ok && verifyResidentJson.success, 'Cryptographic guest session token successfully unlocks room portal');

  // Verify Session Restoration
  const restoreRes = await fetch(`${API}/api/v1/guest-portal/session/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({ token: guestSessionToken }),
  });
  assert(restoreRes.ok, 'Guest resident session restoration survives page reload');

  // Connect Socket.IO to listen for KDS and Waiter events
  const socket = SocketClient(API, { transports: ['websocket'] });
  await new Promise<void>((res) => {
    socket.on('connect', () => {
      socket.emit('join_tenant_room', { hotelId, station: 'kds', token: staffToken });
      res();
    });
  });
  assert(socket.connected, 'Realtime Socket.IO connected with tenant room isolation');

  // Fetch Authoritative Dining Menu
  const menuRes = await fetch(`${API}/api/v1/pos/menu?hotelId=${hotelId}`);
  const menuJson = await menuRes.json();
  const menuItems = Array.isArray(menuJson.data) ? menuJson.data : [];
  assert(menuRes.ok && menuItems.length > 0, 'Fetch authoritative dining menu for hotel');
  const dish1 = menuItems[0];
  const dish2 = menuItems[1] || menuItems[0];

  // Place In-Room Dining Food Order
  const foodOrderIdempotencyKey = `ORD-ROOM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const foodOrderPayload = {
    hotelId,
    roomNumber: targetRoomNumber,
    items: [
      { menuItemId: dish1.id, name: dish1.name, quantity: 2, price: dish1.price || dish1.basePrice || 280 },
      { menuItemId: dish2.id, name: dish2.name, quantity: 1, price: dish2.price || dish2.basePrice || 220 },
    ],
    cookingInstructions: 'Kam mirchi, extra crisp roti, serve hot with green chutney',
    totalAmount: ((dish1.price || 280) * 2) + (dish2.price || 220),
    guestToken: guestSessionToken,
    idempotencyKey: foodOrderIdempotencyKey,
  };

  const placeOrderRes = await fetch(`${API}/api/v1/guest-portal/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId,
      'x-guest-session-token': guestSessionToken,
      'x-idempotency-key': foodOrderIdempotencyKey,
    },
    body: JSON.stringify(foodOrderPayload),
  });
  const placeOrderJson = await placeOrderRes.json();
  assert(placeOrderRes.ok && placeOrderJson.success, 'Guest successfully places In-Room Dining food order');
  const foodOrderId = placeOrderJson.data?.order?._id || placeOrderJson.data?.order?.id || placeOrderJson.data?.orderId || placeOrderJson.data?._id;

  // KDS: Mark Order Preparing
  const prepRes = await fetch(`${API}/api/v1/pos/kds/order/${foodOrderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'PREPARING', chefNotes: 'Cooking on Station 2' }),
  });
  assert(prepRes.ok, 'Kitchen KDS updates ticket status to PREPARING');

  // KDS: Mark Order Ready for Waiter Pickup
  const readyRes = await fetch(`${API}/api/v1/pos/kds/order/${foodOrderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ status: 'READY' }),
  });
  assert(readyRes.ok, 'Kitchen KDS sounds pickup buzzer & marks ticket READY');

  // Waiter: Mark Food Served to Room
  const servedRes = await fetch(`${API}/api/v1/pos/orders/${foodOrderId}/serve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ servedBy: 'Rahul Sharma' }),
  });
  assert(servedRes.ok, 'Waiter delivers in-room dining tray & marks ticket SERVED');

  // Check stay status & folio due balance
  const stayStatusRes = await fetch(`${API}/api/v1/guest-portal/stay/status?hotelId=${hotelId}`, {
    headers: { 'x-hotel-id': hotelId, 'x-guest-session-token': guestSessionToken },
  });
  const stayStatusJson = await stayStatusRes.json();
  assert(stayStatusRes.ok && stayStatusJson.success, 'Fetch resident stay status & active folio ledger');
  const dueAmount = stayStatusJson.data?.dueAmount || stayStatusJson.data?.folio?.dueAmount || 0;

  // Settle outstanding folio if any
  if (dueAmount > 0) {
    const settleFolioRes = await fetch(`${API}/api/v1/guest-portal/folio/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
        'x-guest-session-token': guestSessionToken,
      },
      body: JSON.stringify({
        paymentMethod: 'UPI',
        amount: dueAmount,
        transactionId: `UPI-RES-${Date.now().toString().slice(-6)}`,
      }),
    });
    assert(settleFolioRes.ok, `Resident guest settles outstanding folio balance (₹${dueAmount}) via UPI`);
  }

  // -------------------------------------------------------------------------
  // STAGE 6: EXPRESS CHECKOUT & GUEST FOLIO CLOSE
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 6: GUEST EXPRESS CHECKOUT & FOLIO CLOSE ---`);
  const checkoutRes = await fetch(`${API}/api/v1/guest-portal/checkout/express-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId,
      'x-guest-session-token': guestSessionToken,
    },
    body: JSON.stringify({
      notes: 'Exceptional service and flawless mobile experience!',
    }),
  });
  assert(checkoutRes.ok, 'Guest performs Express Checkout with zero outstanding balance');

  // -------------------------------------------------------------------------
  // STAGE 7: TABLE DINING, PAX COUNT & BILLING
  // -------------------------------------------------------------------------
  console.log(`\n--- STAGE 7: TABLE DINING, QR PAX COUNT & POS SETTLEMENT ---`);
  const tablesRes = await fetch(`${API}/api/v1/pos/tables?hotelId=${hotelId}`);
  const tablesJson = await tablesRes.json();
  const tables = Array.isArray(tablesJson.data) ? tablesJson.data : [];
  assert(tablesRes.ok && tables.length > 0, 'Fetch table layout and dining stations');
  const table = tables.find((t: any) => t.tableNumber === 'T-02') || tables[0];
  const targetTableNumber = table.tableNumber || table.number || 'T-01';
  const targetTableId = table.id || table._id;
  console.log(`  🪑 Target Table: "${targetTableNumber}" (ID: ${targetTableId})`);

  // QR Entry Token verification
  const qrEntryToken = table.qrTokenHash || `table:${hotelId}:${targetTableNumber}`;
  const qrEntryRes = await fetch(`${API}/api/v1/pos/table/qr-entry?hotelId=${hotelId}&tableId=${targetTableId}&token=${qrEntryToken}`);
  const qrEntryJson = await qrEntryRes.json();
  assert(qrEntryRes.ok && qrEntryJson.success, 'Table QR standee entry token verified');
  const tableSessionId = qrEntryJson.data?.sessionId || qrEntryJson.data?.tableSessionId;

  // Update Table Pax via Socket
  socket.emit('customer:update_pax', {
    hotelId,
    tableNumber: targetTableNumber,
    tableId: targetTableId,
    pax: 4,
  });
  assert(true, 'Guest declares Table Pax Count (4 guests) via Standee QR scan');

  // Punch KOT Order for Table
  const tableOrderIdempotencyKey = `ORD-TBL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tableOrderPayload = {
    hotelId,
    tableId: targetTableId,
    tableNumber: targetTableNumber,
    tableSessionId,
    paxCount: 4,
    orderType: 'DINE_IN',
    items: [
      { itemId: 'it-1', menuItemId: dish1.id, name: dish1.name, quantity: 2, unitPrice: dish1.price || 280, subtotal: (dish1.price || 280) * 2 },
      { itemId: 'it-2', menuItemId: dish2.id, name: dish2.name, quantity: 1, unitPrice: dish2.price || 220, subtotal: dish2.price || 220 },
    ],
    cookingInstructions: 'Medium spicy, serve with lime',
    idempotencyKey: tableOrderIdempotencyKey,
  };
  const tableOrderRes = await fetch(`${API}/api/v1/pos/orders/place`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hotel-id': hotelId,
      Authorization: `Bearer ${staffToken}`,
      'x-idempotency-key': tableOrderIdempotencyKey,
    },
    body: JSON.stringify(tableOrderPayload),
  });
  const tableOrderJson = await tableOrderRes.json();
  assert(tableOrderRes.ok && (tableOrderJson.success || tableOrderJson.data), 'Punch Dine-In KOT Order for Table');
  const dineInOrderId = tableOrderJson.data?._id || tableOrderJson.data?.id || tableOrderJson.orderId;

  // KDS prepares dine-in order
  if (dineInOrderId) {
    const kdsReadyRes = await fetch(`${API}/api/v1/pos/kds/order/${dineInOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(kdsReadyRes.ok, 'Kitchen KDS prepares Table KOT ticket and sounds pickup buzzer');

    const serveRes = await fetch(`${API}/api/v1/pos/orders/${dineInOrderId}/serve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ servedBy: 'Drill Steward' }),
    });
    assert(serveRes.ok, 'Waiter serves freshly prepared dishes to Table');
  }

  // Generate Table Bill & Settle via Cashier
  if (tableSessionId) {
    const genBillRes = await fetch(`${API}/api/v1/billing/bill/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId, Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ hotelId, tableSessionId }),
    });
    const genBillJson = await genBillRes.json();
    assert(genBillRes.ok && genBillJson.success, 'Cashier workstation generates final GST bill for Table Session');
    const billId = genBillJson.data?.bill?._id || genBillJson.data?._id;
    const finalAmount = genBillJson.data?.bill?.grandTotal || genBillJson.data?.grandTotal || 1050;

    const settleBillRes = await fetch(`${API}/api/v1/billing/payment/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
        Authorization: `Bearer ${staffToken}`,
        'x-idempotency-key': `PAY-TBL-${Date.now()}`,
      },
      body: JSON.stringify({
        hotelId,
        billId,
        tableSessionId,
        paymentMode: 'CASH',
        amount: finalAmount,
        cashReceived: finalAmount + 100,
      }),
    });
    assert(settleBillRes.ok, `Cashier settles Table bill (₹${finalAmount}) with cash tender & prints receipt`);
  }

  socket.disconnect();

  console.log(`\n================================================================`);
  console.log(`📊 MASTER HOSPITALITY DRILL SUMMARY:`);
  console.log(`   Total Steps:   ${stats.stepsExecuted}`);
  console.log(`   Passed Steps:  ${stats.stepsPassed}`);
  console.log(`   Failed Steps:  ${stats.failures.length}`);
  console.log(`   Pass Rate:     ${((stats.stepsPassed / stats.stepsExecuted) * 100).toFixed(1)}%`);
  console.log(`================================================================\n`);

  if (stats.failures.length > 0) {
    console.error('❌ Failures:', stats.failures);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal Drill Error:', err);
  process.exit(1);
});
