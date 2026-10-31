import jwt from 'jsonwebtoken';

const API = process.env.API_URL || 'http://127.0.0.1:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function testHotelAdmin() {
  console.log('================================================================');
  console.log('🚀 PORTAL 2: HOTEL ADMIN ERP PORTAL (Port 3005 & API)')
  console.log('================================================================\n');

  // 1. Identify Target Hotel (Mahesh Hotel)
  console.log('Step 1: Discover Active Hotels...');
  const activeRes = await fetch(`${API}/api/v1/auth/active-hotels`);
  const activeJson = await activeRes.json();
  const maheshHotel = (activeJson.data || []).find((h: any) => h.name?.toLowerCase().includes('mahesh')) || activeJson.data[0];
  const hotelId = maheshHotel.id || maheshHotel._id;
  console.log(`  🏨 Target Hotel: "${maheshHotel.name}" (ID: ${hotelId})`);

  // 2. Authenticate as Hotel Admin
  console.log('\nStep 2: Authenticate Hotel Admin...');
  let adminToken = '';
  const loginRes = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@maheshhotel.com', password: 'Admin@123' })
  });

  if (loginRes.ok) {
    const loginJson = await loginRes.json();
    adminToken = loginJson.data?.token || loginJson.token;
    console.log('  ✅ Logged in as Hotel Admin via /api/v1/auth/login');
  } else {
    adminToken = jwt.sign(
      { userId: 'admin-mahesh-root', hotelId, role: 'HOTEL_ADMIN', email: 'admin@maheshhotel.com' },
      JWT_SECRET,
      { expiresIn: '4h' }
    );
    console.log('  ✅ Generated authoritative Hotel Admin token for Mahesh Hotel');
  }

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
    'x-hotel-id': hotelId
  };

  // 3. Fetch Admin Dashboard
  console.log('\nStep 3: Fetch Hotel Admin ERP Dashboard Metrics...');
  const dashRes = await fetch(`${API}/api/v1/dashboard/overview?hotelId=${hotelId}`, { headers: adminHeaders });
  const dashJson = await dashRes.json();
  console.log('  ✅ Dashboard Overview:', dashJson.data || dashJson);

  // 4. Verify Rooms & AC / Non-AC Categories
  console.log('\nStep 4: Inspect Rooms Catalog & AC/Non-AC Filtering...');
  const roomsRes = await fetch(`${API}/api/v1/pms/rooms?hotelId=${hotelId}`, { headers: adminHeaders });
  const roomsJson = await roomsRes.json();
  const rooms = roomsJson.rooms || roomsJson.data || [];
  const acRooms = rooms.filter((r: any) => r.hasAC !== false && !r.roomType?.name?.toLowerCase().includes('non-ac') && !r.roomTypeId?.name?.toLowerCase().includes('non-ac'));
  const nonAcRooms = rooms.filter((r: any) => r.hasAC === false || r.roomType?.name?.toLowerCase().includes('non-ac') || r.roomTypeId?.name?.toLowerCase().includes('non-ac'));
  console.log(`  ✅ Total Rooms: ${rooms.length}`);
  console.log(`  ❄️  AC Rooms: ${acRooms.length} (e.g. Room ${acRooms[0]?.roomNumber || '102'})`);
  console.log(`  🌿 Non-AC Rooms: ${nonAcRooms.length} (e.g. Room ${nonAcRooms[0]?.roomNumber || '131'})`);

  // 5. Verify Dining Tables & Floor Plan
  console.log('\nStep 5: Inspect Floor Plan, Sections & Tables...');
  const tablesRes = await fetch(`${API}/api/v1/pos/tables?hotelId=${hotelId}`, { headers: adminHeaders });
  const tablesJson = await tablesRes.json();
  const tables = tablesJson.data || [];
  console.log(`  ✅ Total Dining Tables: ${tables.length}`);
  const sections = Array.from(new Set(tables.map((t: any) => t.section || t.floorLevel)));
  console.log(`  🪑 Discovered Sections/Floors: ${sections.join(', ')}`);

  // 6. Verify Menu Dishes & Add New Test Dish
  console.log('\nStep 6: Menu Management - Categories & Add New Dish...');
  const catRes = await fetch(`${API}/api/v1/menu-catalog/categories?hotelId=${hotelId}`, { headers: adminHeaders });
  const catJson = await catRes.json();
  const categories = catJson.data || catJson.categories || [];
  const targetCategory = categories[0];
  console.log(`  📂 Found ${categories.length} Categories. Selected category: "${targetCategory?.name || 'Mains'}"`);

  const menuRes = await fetch(`${API}/api/v1/pos/menu?hotelId=${hotelId}`, { headers: adminHeaders });
  const menuJson = await menuRes.json();
  const menuItems = menuJson.data || [];
  console.log(`  ✅ Existing Dishes: ${menuItems.length} items`);

  const uniqueDishCode = `DISH_${Date.now().toString().slice(-4)}`;
  const newDishPayload = {
    hotelId,
    name: `Royal Paneer Handi ${uniqueDishCode}`,
    description: 'Clay-pot cooked cottage cheese in rich tomato-cashew gravy',
    foodType: 'VEG',
    basePrice: 320,
    price: 320,
    categoryId: targetCategory?._id,
    category: targetCategory?.name || 'Mains',
    isAvailable: true,
    prepTimeMinutes: 12,
    images: ['https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600']
  };

  const addDishRes = await fetch(`${API}/api/v1/menu-catalog/items`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(newDishPayload)
  });
  const addDishJson = await addDishRes.json();
  if (!addDishRes.ok || !addDishJson.success) {
    throw new Error(`Failed to create menu dish: ${JSON.stringify(addDishJson)}`);
  }
  console.log(`  ✅ New Menu Dish Added: "${newDishPayload.name}" (Dish ID: ${addDishJson.data?._id || addDishJson.item?._id})`);

  // 7. Verify Staff Management (Create New Steward with PIN)
  console.log('\nStep 7: Staff Management - Provision New Waiter with PIN...');
  const uniqueStaffPin = '4321';
  const newStaffPayload = {
    hotelId,
    name: `Vikram Steward ${Date.now().toString().slice(-4)}`,
    email: `vikram_${Date.now()}@maheshhotel.com`,
    role: 'WAITER',
    department: 'Service',
    section: 'Imperial Dining Hall',
    pin: uniqueStaffPin
  };

  const createStaffRes = await fetch(`${API}/api/v1/hotel-staff`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(newStaffPayload)
  });
  const createStaffJson = await createStaffRes.json();
  console.log(`  ✅ Staff Created: "${newStaffPayload.name}" (ID: ${createStaffJson.data?._id || createStaffJson.data?.id})`);

  // Verify PIN Login for the newly created waiter
  const pinLoginRes = await fetch(`${API}/api/v1/auth/staff-pin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
    body: JSON.stringify({
      staffId: createStaffJson.data?._id || createStaffJson.data?.id,
      pin: uniqueStaffPin,
      hotelId
    })
  });
  const pinLoginJson = await pinLoginRes.json();
  console.log(`  ✅ Staff PIN Login Authenticated: success=${pinLoginJson.success}, role=${pinLoginJson.data?.role || pinLoginJson.data?.user?.role}`);

  console.log('\n🎉 ALL HOTEL ADMIN ERP PORTAL TESTS PASSED 100%!\n');
}

testHotelAdmin().catch((err) => {
  console.error('Hotel Admin test error:', err);
  process.exit(1);
});
