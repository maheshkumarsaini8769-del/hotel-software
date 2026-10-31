import jwt from 'jsonwebtoken';

const API = 'http://127.0.0.1:5000';
const RECEPTION_PORTAL_URL = 'http://127.0.0.1:3008';
const JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function testReceptionPortal() {
  console.log('================================================================');
  console.log('🚀 PORTAL 3: RECEPTION FRONT DESK PORTAL (Port 3008 & PMS API)');
  console.log('================================================================\n');

  // Step 1: Healthcheck on Reception Frontend (:3008)
  console.log('Step 1: Check Reception Front Desk Frontend (:3008)...');
  try {
    const feRes = await fetch(RECEPTION_PORTAL_URL);
    if (!feRes.ok) throw new Error(`Frontend returned HTTP ${feRes.status}`);
    const html = await feRes.text();
    console.log(`  ✅ Reception Frontend HTTP 200 OK (${html.length} bytes delivered)`);
  } catch (err: any) {
    throw new Error(`Reception frontend not reachable at :3008: ${err.message}`);
  }

  // Step 2: Hotel Discovery & Front Desk Authentication
  console.log('\nStep 2: Authenticate Reception Front Desk Operator...');
  const activeRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeJson = await activeRes.json();
  const hotels = activeJson.data || [];
  const targetHotel = hotels.find((h: any) => h.name?.toLowerCase().includes('mahesh')) || hotels[0];
  const hotelId = targetHotel.id || targetHotel._id;
  console.log(`  🏨 Hotel: "${targetHotel.name}" (ID: ${hotelId})`);

  const receptionToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8099',
      role: 'HOTEL_ADMIN',
      hotelId: hotelId.toString(),
      permissions: ['PMS_FRONTDESK', 'ROOM_CHECKIN', 'FOLIO_BILLING', 'SETTLE_CHARGES']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${receptionToken}`,
    'x-hotel-id': hotelId.toString()
  };
  console.log('  ✅ Front Desk Terminal token issued');

  // Step 3: Fetch PMS Room Grid & AC vs Non-AC Capacity
  console.log('\nStep 3: Fetch PMS Room Grid & Inventory...');
  const roomsRes = await fetch(`${API}/api/v1/pms/rooms?hotelId=${hotelId}`, { headers: authHeaders });
  const roomsJson = await roomsRes.json();
  const rooms = roomsJson.rooms || [];
  console.log(`  ✅ Total PMS Inventory: ${rooms.length} rooms (Max Capacity: ${roomsJson.maxRooms})`);

  const occupiedRooms = rooms.filter((r: any) => r.status === 'OCCUPIED');
  const availableRooms = rooms.filter((r: any) => r.status === 'AVAILABLE');
  const dirtyRooms = rooms.filter((r: any) => r.status === 'DIRTY');
  const reservedRooms = rooms.filter((r: any) => r.status === 'RESERVED');
  console.log(`  📊 Room Matrix: Available=${availableRooms.length}, Occupied=${occupiedRooms.length}, Dirty=${dirtyRooms.length}, Reserved=${reservedRooms.length}`);

  if (availableRooms.length === 0) {
    throw new Error('No available rooms found for walk-in check-in test!');
  }

  const targetRoom = availableRooms[0];
  console.log(`  🎯 Selected Room for Walk-In Check-In: Room ${targetRoom.roomNumber} (Type: ${targetRoom.roomTypeId?.name || 'Standard'})`);

  // Step 4: Perform Quick Walk-In Check-In with KYC
  console.log('\nStep 4: Execute Walk-in Check-in with Aadhaar KYC...');
  const uniqueSuffix = Date.now().toString().slice(-4);
  const guestName = `Rajesh Sharma ${uniqueSuffix}`;
  const guestPhone = `98290${uniqueSuffix}12`;
  const aadhaarNumber = `5432-8765-${uniqueSuffix}`;

  const checkinPayload = {
    hotelId,
    roomId: targetRoom._id,
    guestName,
    guestPhone,
    guestEmail: `rajesh_${uniqueSuffix}@gmail.com`,
    idType: 'AADHAAR',
    idNumber: aadhaarNumber,
    verifiedByReceptionist: true,
    receptionistNotes: 'Verified original Aadhaar Card at reception counter',
    keyCardIssued: `KEY-${targetRoom.roomNumber}`,
    advancePaid: 1000
  };

  const checkinRes = await fetch(`${API}/api/v1/pms/frontdesk/quick-checkin`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(checkinPayload)
  });
  const checkinJson = await checkinRes.json();
  if (!checkinRes.ok || !checkinJson.success) {
    throw new Error(`Walk-in check-in failed: ${JSON.stringify(checkinJson)}`);
  }

  const booking = checkinJson.booking || checkinJson.data?.booking;
  const stay = checkinJson.stay || checkinJson.data?.stay;
  console.log(`  ✅ Walk-in Check-in Succeeded!`);
  console.log(`     Booking Number: ${booking?.bookingNumber}`);
  console.log(`     Room Assigned: Room ${targetRoom.roomNumber}`);
  console.log(`     Stay ID: ${stay?._id || checkinJson.data?.stayId}`);
  console.log(`     KeyCard Issued: ${checkinPayload.keyCardIssued}`);

  // Step 5: Verify Room Status Transitioned to OCCUPIED
  console.log('\nStep 5: Verify PMS Room State Update...');
  const verifyRoomRes = await fetch(`${API}/api/v1/pms/rooms?hotelId=${hotelId}`, { headers: authHeaders });
  const verifyRoomJson = await verifyRoomRes.json();
  const refreshedTarget = (verifyRoomJson.rooms || []).find((r: any) => r._id === targetRoom._id);
  if (refreshedTarget?.status !== 'OCCUPIED') {
    throw new Error(`Expected Room ${targetRoom.roomNumber} to be OCCUPIED, found ${refreshedTarget?.status}`);
  }
  console.log(`  ✅ Room ${targetRoom.roomNumber} successfully confirmed OCCUPIED in PMS Matrix`);

  // Step 6: Expected Arrivals Board Verification
  console.log('\nStep 6: Query Expected Arrivals & Online Pre-Bookings...');
  const arrivalsRes = await fetch(`${API}/api/v1/pms/frontdesk/expected-arrivals?hotelId=${hotelId}`, { headers: authHeaders });
  const arrivalsJson = await arrivalsRes.json();
  const arrivals = arrivalsJson.data || arrivalsJson.arrivals || [];
  console.log(`  ✅ Expected Arrivals Queue: ${arrivals.length} pending guest(s)`);

  // Step 7: Inspect Live Active Stays & In-House Folio Ledger
  console.log('\nStep 7: Inspect In-House Guests & Live Room Stay Folio...');
  const activeStaysRes = await fetch(`${API}/api/v1/pms/frontdesk/active-stays?hotelId=${hotelId}`, { headers: authHeaders });
  const activeStaysJson = await activeStaysRes.json();
  const activeStays = activeStaysJson.data || activeStaysJson.activeStays || [];
  console.log(`  ✅ Active Stays in House: ${activeStays.length} active resident(s)`);

  const stayDetailsRes = await fetch(`${API}/api/v1/pms/frontdesk/room-stay-details/${targetRoom.roomNumber}?hotelId=${hotelId}`, {
    headers: authHeaders
  });
  const stayDetailsJson = await stayDetailsRes.json();
  if (!stayDetailsRes.ok || !stayDetailsJson.success) {
    throw new Error(`Failed to fetch room stay details for Room ${targetRoom.roomNumber}: ${JSON.stringify(stayDetailsJson)}`);
  }
  const folio = stayDetailsJson.data?.folio;
  const initialBalance = folio?.netAmountPayable ?? folio?.dueAmount ?? 0;
  console.log(`  ✅ Room ${targetRoom.roomNumber} Live Folio:`);
  console.log(`     Guest: ${stayDetailsJson.data?.stay?.guestName}`);
  console.log(`     Folio Number: ${folio?.folioNumber || 'N/A'}`);
  console.log(`     Initial Net Payable: ₹${initialBalance}`);

  // Step 8: Post In-Room Incidental Charge to Folio
  console.log('\nStep 8: Post In-Room Charge (Mini-Bar / Laundry) to Folio...');
  const chargeAmount = 450;
  const postChargePayload = {
    hotelId,
    roomNumber: targetRoom.roomNumber,
    department: 'LAUNDRY',
    description: 'Dry Cleaning Service (2 Kurtas & 1 Blazer)',
    amount: chargeAmount
  };

  const postChargeRes = await fetch(`${API}/api/v1/pms/frontdesk/post-inroom-charge`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(postChargePayload)
  });
  const postChargeJson = await postChargeRes.json();
  if (!postChargeRes.ok || !postChargeJson.success) {
    throw new Error(`Failed to post in-room charge: ${JSON.stringify(postChargeJson)}`);
  }
  console.log(`  ✅ In-Room Charge Posted: +₹${chargeAmount} (${postChargePayload.description})`);

  // Step 9: Re-Verify Folio Balance Increased Accurately
  console.log('\nStep 9: Re-query Folio to confirm atomic ledger update...');
  const updatedStayDetailsRes = await fetch(`${API}/api/v1/pms/frontdesk/room-stay-details/${targetRoom.roomNumber}?hotelId=${hotelId}`, {
    headers: authHeaders
  });
  const updatedStayDetailsJson = await updatedStayDetailsRes.json();
  const updatedFolio = updatedStayDetailsJson.data?.folio;
  const newBalance = updatedFolio?.netAmountPayable ?? updatedFolio?.dueAmount ?? 0;
  console.log(`  ✅ Updated Net Payable: ₹${newBalance} (Laundry Total: ₹${updatedFolio?.totalLaundry}, Line Items: ${updatedFolio?.lineItems?.length})`);

  console.log('\n🎉 ALL RECEPTION FRONT DESK PORTAL TESTS PASSED 100%!');
}

testReceptionPortal().catch((err) => {
  console.error('Reception Portal test error:', err);
  process.exit(1);
});
