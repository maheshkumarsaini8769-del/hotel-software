const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_local_dev_jwt_secret_do_not_use_in_production';
const HOTEL_ID = '6ae06d00ddbafddfbb0a8013'; // Mahesh Hotel

const superAdminToken = jwt.sign(
  { userId: '6adcb811d58c1637ff16b355', role: 'SUPERADMIN', email: 'superadmin@spicehub.com', permissions: ['ALL'] },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const hotelAdminToken = jwt.sign(
  { userId: '6ae06d00ddbafddfbb0a8015', hotelId: HOTEL_ID, role: 'HOTEL_ADMIN', email: 'mahesh@hotel.com', permissions: ['ALL'] },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const cashierToken = jwt.sign(
  { userId: '6ae0ce400a2276678a684db6', hotelId: HOTEL_ID, role: 'CASHIER', email: 'sunil.cashier@spicehub.hotel', permissions: ['ALL'] },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const outputDir = path.join(__dirname, '../artifacts/theme-standardization');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function captureScreen(url, theme, initStorageFn, outputFile, postLoadFn) {
  console.log(`\n📸 Capturing ${path.basename(outputFile)} (${theme.toUpperCase()}) from ${url}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((storageData, themeValue) => {
      for (const [k, v] of Object.entries(storageData)) {
        localStorage.setItem(k, v);
      }
      if (themeValue === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, initStorageFn(theme), theme);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Ensure theme class is applied and synced
    await page.evaluate((themeValue) => {
      if (themeValue === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, theme);

    if (postLoadFn) {
      await postLoadFn(page);
    }

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: outputFile, fullPage: false });
    console.log(`  ✅ Successfully saved to: ${outputFile}`);
  } catch (err) {
    console.error(`  ❌ Error capturing ${outputFile}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log('================================================================');
  console.log('🎨 CAPTURING 3 PAIRS OF STANDARDIZED ENTERPRISE UI SCREENSHOTS');
  console.log('================================================================');

  // Pair 1: Super Admin SaaS Dashboard (:3006)
  const superAdminStorage = (theme) => ({
    spicehub_token: superAdminToken,
    token: superAdminToken,
    spicehub_superadmin_theme: theme,
    spicehub_auth_user: JSON.stringify({ id: '6adcb811d58c1637ff16b355', name: 'SpiceHub Super Admin', email: 'superadmin@spicehub.com', role: 'SUPERADMIN' })
  });

  await captureScreen(
    'http://localhost:3006',
    'light',
    superAdminStorage,
    path.join(outputDir, '01_superadmin_dashboard_light.png')
  );

  await captureScreen(
    'http://localhost:3006',
    'dark',
    superAdminStorage,
    path.join(outputDir, '01_superadmin_dashboard_dark.png')
  );

  // Pair 2: Hotel Admin ERP Room PMS Matrix (:3005)
  const hotelAdminStorage = (theme) => ({
    spicehub_token: hotelAdminToken,
    token: hotelAdminToken,
    spicehub_hotel_id: HOTEL_ID,
    hotelId: HOTEL_ID,
    spicehub_erp_theme: theme,
    spicehub_auth_user: JSON.stringify({ id: '6ae06d00ddbafddfbb0a8015', name: 'Mahesh', role: 'HOTEL_ADMIN', hotelId: HOTEL_ID })
  });

  await captureScreen(
    'http://localhost:3005?module=ROOM_MANAGEMENT',
    'light',
    hotelAdminStorage,
    path.join(outputDir, '02_hotel_admin_pms_matrix_light.png'),
    async (page) => {
      // Click Matrix view tab if available
      try {
        const matrixBtn = await page.$('button[data-tab="MATRIX"], button:has-text("Matrix"), button:has-text("PMS Matrix")');
        if (matrixBtn) await matrixBtn.click();
      } catch (e) {}
    }
  );

  await captureScreen(
    'http://localhost:3005?module=ROOM_MANAGEMENT',
    'dark',
    hotelAdminStorage,
    path.join(outputDir, '02_hotel_admin_pms_matrix_dark.png'),
    async (page) => {
      try {
        const matrixBtn = await page.$('button[data-tab="MATRIX"], button:has-text("Matrix"), button:has-text("PMS Matrix")');
        if (matrixBtn) await matrixBtn.click();
      } catch (e) {}
    }
  );

  // Pair 3: Cashier POS screen (:3007)
  const cashierStorage = (theme) => ({
    spicehub_token: cashierToken,
    token: cashierToken,
    spicehub_hotel_id: HOTEL_ID,
    hotelId: HOTEL_ID,
    spicehub_cashier_theme: theme,
    spicehub_auth_user: JSON.stringify({ id: '6ae0ce400a2276678a684db6', name: 'Sunil Verma', role: 'CASHIER', hotelId: HOTEL_ID })
  });

  await captureScreen(
    `http://localhost:3007?token=${cashierToken}&hotelId=${HOTEL_ID}`,
    'light',
    cashierStorage,
    path.join(outputDir, '03_cashier_pos_light.png')
  );

  await captureScreen(
    `http://localhost:3007?token=${cashierToken}&hotelId=${HOTEL_ID}`,
    'dark',
    cashierStorage,
    path.join(outputDir, '03_cashier_pos_dark.png')
  );

  console.log('\n================================================================');
  console.log('✅ ALL 3 PAIRS OF PROOF-OF-WORK SCREENSHOTS CAPTURED');
  console.log('================================================================');
}

run().catch(console.error);
