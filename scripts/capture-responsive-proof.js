const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function captureAllProofs() {
  const outputDir = path.join(__dirname, '..', 'artifacts', 'responsive-proof');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fetch active hotel ID from API
  let hotelId = '66f5b9b2c8a14b30e0123456';
  try {
    const res = await fetch('http://127.0.0.1:5000/api/v1/auth/active-hotels');
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      hotelId = json.data[0].id || json.data[0]._id;
    }
  } catch (err) {
    console.warn('Using default hotelId:', hotelId);
  }

  const cashierToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8077',
      hotelId: hotelId.toString(),
      role: 'CASHIER',
      permissions: ['POS_BILLING', 'SETTLE_PAYMENTS', 'TAX_INVOICE', 'SPLIT_BILL']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const chefToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8088',
      hotelId: hotelId.toString(),
      role: 'CHEF',
      permissions: ['KITCHEN_KDS', 'MANAGE_ORDERS']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const receptionistToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8099',
      hotelId: hotelId.toString(),
      role: 'RECEPTIONIST',
      permissions: ['FRONT_DESK', 'ROOM_ASSIGNMENT', 'CHECKIN', 'CHECKOUT']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const waiterToken = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a80aa',
      hotelId: hotelId.toString(),
      role: 'WAITER',
      permissions: ['WAITER_SERVICE', 'KOT_PUNCHING']
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = {
    mobile: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 }
  };

  console.log('================================================================');
  console.log('📸 [RESPONSIVE PROOF AUDIT] STARTING SCREENSHOT ACQUISITION');
  console.log('================================================================');

  // -------------------------------------------------------------
  // SECTION 1: PIN Login Screens (Mobile, Tablet, Desktop)
  // -------------------------------------------------------------
  console.log('\n--- 1. Capturing PIN Login Screens ---');

  // Waiter PIN Login - Mobile (390x844)
  {
    const page = await browser.newPage({ viewport: viewports.mobile });
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const savePath = path.join(outputDir, 'waiter_pin_login_mobile_390x844.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Waiter PIN Login - Tablet (768x1024)
  {
    const page = await browser.newPage({ viewport: viewports.tablet });
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const savePath = path.join(outputDir, 'waiter_pin_login_tablet_768x1024.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Cashier PIN Login - Desktop (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const savePath = path.join(outputDir, 'cashier_pin_login_desktop_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Reception PIN Login - Desktop (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3008', { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const savePath = path.join(outputDir, 'reception_pin_login_desktop_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // -------------------------------------------------------------
  // SECTION 2: Cashier POS Layouts
  // -------------------------------------------------------------
  console.log('\n--- 2. Capturing Cashier POS Layouts ---');

  // Cashier POS - Desktop Side-by-Side (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3007', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8077',
        name: 'Priya Verma',
        email: 'priya@tajgateway.com',
        role: 'CASHIER',
        hotelId: hId
      }));
    }, { token: cashierToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'cashier_pos_desktop_side_by_side_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Cashier POS - Mobile Stacked (390x844)
  {
    const page = await browser.newPage({ viewport: viewports.mobile });
    await page.goto('http://localhost:3007', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8077',
        name: 'Priya Verma',
        email: 'priya@tajgateway.com',
        role: 'CASHIER',
        hotelId: hId
      }));
    }, { token: cashierToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'cashier_pos_mobile_stacked_390x844.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // -------------------------------------------------------------
  // SECTION 3: Kitchen KDS Layouts
  // -------------------------------------------------------------
  console.log('\n--- 3. Capturing Kitchen KDS Layouts ---');

  // KDS - Desktop 3 Kanban Columns (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8088',
        name: 'Vikram Singh',
        email: 'vikram@tajgateway.com',
        role: 'CHEF',
        hotelId: hId
      }));
    }, { token: chefToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'kitchen_kds_desktop_3_columns_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // KDS - Mobile Single Column with Tabs (390x844)
  {
    const page = await browser.newPage({ viewport: viewports.mobile });
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8088',
        name: 'Vikram Singh',
        email: 'vikram@tajgateway.com',
        role: 'CHEF',
        hotelId: hId
      }));
    }, { token: chefToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'kitchen_kds_mobile_single_column_390x844.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // -------------------------------------------------------------
  // SECTION 4: Waiter Mobile App Layouts
  // -------------------------------------------------------------
  console.log('\n--- 4. Capturing Waiter Mobile App Layouts ---');

  const waiterSessionObj = {
    staffId: 'W-01',
    name: 'Ramesh Kumar',
    role: 'Senior Waiter',
    assignedSection: 'Indoor AC Hall',
    assignedTableStart: 1,
    assignedTableEnd: 6,
    assignedTableCount: 6,
    shift: 'Morning Shift (09:00 AM - 05:00 PM)',
    permissions: ['KOT Punching', 'Food Pickup & Serving', 'Table Transfer', 'Bill Settle Request', 'Guest Calls'],
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  };

  // Waiter My Tables - Tablet Grid (768x1024)
  {
    const page = await browser.newPage({ viewport: viewports.tablet });
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ session, token, hId }) => {
      localStorage.setItem('spicehub_waiter_session', JSON.stringify(session));
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: session.staffId,
        name: session.name,
        role: 'WAITER',
        hotelId: hId
      }));
    }, { session: waiterSessionObj, token: waiterToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'waiter_my_tables_tablet_768x1024.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Waiter My Tables - Mobile (390x844)
  {
    const page = await browser.newPage({ viewport: viewports.mobile });
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ session, token, hId }) => {
      localStorage.setItem('spicehub_waiter_session', JSON.stringify(session));
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: session.staffId,
        name: session.name,
        role: 'WAITER',
        hotelId: hId
      }));
    }, { session: waiterSessionObj, token: waiterToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'waiter_my_tables_mobile_390x844.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Waiter Quick KOT Modal - Desktop (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ session, token, hId }) => {
      localStorage.setItem('spicehub_waiter_session', JSON.stringify(session));
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: session.staffId,
        name: session.name,
        role: 'WAITER',
        hotelId: hId
      }));
    }, { session: waiterSessionObj, token: waiterToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Click first table card to open Quick KOT modal
    const tableCard = await page.$('[data-testid^="card-table-"]');
    if (tableCard) {
      await tableCard.click();
      await page.waitForTimeout(1000);
    }
    const savePath = path.join(outputDir, 'waiter_quick_kot_modal_desktop_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // -------------------------------------------------------------
  // SECTION 5: Reception Front Desk PMS
  // -------------------------------------------------------------
  console.log('\n--- 5. Capturing Reception Front Desk PMS ---');

  // Reception PMS - Desktop 50/50 Split View (1440x900)
  {
    const page = await browser.newPage({ viewport: viewports.desktop });
    await page.goto('http://localhost:3008', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8099',
        name: 'Neha Sharma',
        email: 'reception.neha@test.com',
        role: 'RECEPTIONIST',
        hotelId: hId
      }));
    }, { token: receptionistToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'reception_pms_desktop_split_view_1440x900.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  // Reception PMS - Mobile Stacked (390x844)
  {
    const page = await browser.newPage({ viewport: viewports.mobile });
    await page.goto('http://localhost:3008', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, hId }) => {
      localStorage.setItem('spicehub_auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hId);
      localStorage.setItem('hotelId', hId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8099',
        name: 'Neha Sharma',
        email: 'reception.neha@test.com',
        role: 'RECEPTIONIST',
        hotelId: hId
      }));
    }, { token: receptionistToken, hId: hotelId });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const savePath = path.join(outputDir, 'reception_pms_mobile_stacked_390x844.png');
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`✅ Saved: ${path.basename(savePath)}`);
    await page.close();
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL RESPONSIVE PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('================================================================\n');
}

captureAllProofs().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
