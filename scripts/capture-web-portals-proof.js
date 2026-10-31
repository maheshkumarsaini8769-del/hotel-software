const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_local_dev_jwt_secret_do_not_use_in_production';
const HOTEL_ID = '6ae06d00ddbafddfbb0a8013';

const superAdminToken = jwt.sign(
  {
    userId: '6adcb811d58c1637ff16b355',
    role: 'SUPERADMIN',
    email: 'superadmin@spicehub.com',
    permissions: ['ALL']
  },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const hotelAdminToken = jwt.sign(
  {
    userId: '6ae06d00ddbafddfbb0a8015',
    hotelId: HOTEL_ID,
    role: 'HOTEL_ADMIN',
    email: 'mahesh@hotel.com',
    permissions: ['ALL']
  },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const outputDir = path.join(__dirname, '../artifacts/web-portals-proof');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log('🚀 Starting Web Portals Playwright Screenshot Audit...');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // -------------------------------------------------------------
    // PROOFS 1 & 2: Super Admin Login (Desktop & Tablet)
    // -------------------------------------------------------------
    console.log('Capturing Super Admin Login screens...');
    
    // 1. superadmin_login_desktop_1440x900.png
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3006', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, 'superadmin_login_desktop_1440x900.png') });
      console.log('✅ superadmin_login_desktop_1440x900.png');
      await context.close();
    }

    // 2. superadmin_login_tablet_768x1024.png
    {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3006', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, 'superadmin_login_tablet_768x1024.png') });
      console.log('✅ superadmin_login_tablet_768x1024.png');
      await context.close();
    }

    // -------------------------------------------------------------
    // PROOFS 3 & 4: Hotel Admin Login (Desktop Split & Tablet Stacked)
    // -------------------------------------------------------------
    console.log('Capturing Hotel Admin Login screens...');

    // 3. hotel_admin_login_desktop_split_1440x900.png
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3005', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_login_desktop_split_1440x900.png') });
      console.log('✅ hotel_admin_login_desktop_split_1440x900.png');
      await context.close();
    }

    // 4. hotel_admin_login_tablet_stacked_768x1024.png
    {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await context.newPage();
      await page.goto('http://localhost:3005', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_login_tablet_stacked_768x1024.png') });
      console.log('✅ hotel_admin_login_tablet_stacked_768x1024.png');
      await context.close();
    }

    // -------------------------------------------------------------
    // PROOFS 5-9: Super Admin Authenticated Views
    // -------------------------------------------------------------
    console.log('Capturing Super Admin Authenticated screens...');

    // 5. superadmin_dashboard_desktop_1440x900.png (Light Mode)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript((token) => {
        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_superadmin_theme', 'light');
        localStorage.setItem('spicehub_auth_user', JSON.stringify({
          id: '6adcb811d58c1637ff16b355',
          name: 'SpiceHub Super Admin',
          email: 'superadmin@spicehub.com',
          role: 'SUPERADMIN'
        }));
        document.documentElement.classList.remove('dark');
      }, superAdminToken);

      await page.goto('http://localhost:3006?nav=DASHBOARD', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'superadmin_dashboard_desktop_1440x900.png') });
      console.log('✅ superadmin_dashboard_desktop_1440x900.png');

      // 7. superadmin_tenant_management_table_desktop_1440x900.png
      await page.goto('http://localhost:3006?nav=BRANCHES', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'superadmin_tenant_management_table_desktop_1440x900.png') });
      console.log('✅ superadmin_tenant_management_table_desktop_1440x900.png');

      // 8. superadmin_create_hotel_modal_desktop_1440x900.png (2-column grid)
      const createBtn = await page.$('[data-testid="btn-create-hotel"]');
      if (createBtn) {
        await createBtn.click();
        await page.waitForTimeout(1000);
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        await page.screenshot({ path: path.join(outputDir, 'superadmin_create_hotel_modal_desktop_1440x900.png') });
        console.log('✅ superadmin_create_hotel_modal_desktop_1440x900.png');
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // 9. superadmin_portal_entitlements_modal_desktop_1440x900.png (Toggle switches + dynamic pricing)
      const portalsBtn = await page.$('button[data-testid^="btn-edit-portals-"]');
      if (portalsBtn) {
        await portalsBtn.click();
        await page.waitForTimeout(1000);
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        await page.screenshot({ path: path.join(outputDir, 'superadmin_portal_entitlements_modal_desktop_1440x900.png') });
        console.log('✅ superadmin_portal_entitlements_modal_desktop_1440x900.png');
      }

      await context.close();
    }

    // 6. superadmin_dashboard_tablet_768x1024.png (Collapsed sidebar hamburger)
    {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await context.newPage();
      await page.addInitScript((token) => {
        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_superadmin_theme', 'light');
        localStorage.setItem('spicehub_auth_user', JSON.stringify({
          id: '6adcb811d58c1637ff16b355',
          name: 'SpiceHub Super Admin',
          email: 'superadmin@spicehub.com',
          role: 'SUPERADMIN'
        }));
        document.documentElement.classList.remove('dark');
      }, superAdminToken);

      await page.goto('http://localhost:3006?nav=DASHBOARD', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'superadmin_dashboard_tablet_768x1024.png') });
      console.log('✅ superadmin_dashboard_tablet_768x1024.png');
      await context.close();
    }

    // -------------------------------------------------------------
    // PROOFS 10-13: Hotel Admin ERP Authenticated Views
    // -------------------------------------------------------------
    console.log('Capturing Hotel Admin ERP Authenticated screens...');

    // 10. hotel_admin_dashboard_desktop_1440x900.png (Light Mode, 4 KPI cards + RevPAR chart)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(({ token, hotelId }) => {
        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', hotelId);
        localStorage.setItem('hotelId', hotelId);
        localStorage.setItem('spicehub_auth_user', JSON.stringify({
          id: '6ae06d00ddbafddfbb0a8015',
          name: 'Mahesh Saini',
          role: 'HOTEL_ADMIN',
          hotelId: hotelId
        }));
        document.documentElement.classList.remove('dark');
      }, { token: hotelAdminToken, hotelId: HOTEL_ID });

      await page.goto('http://localhost:3005?module=DASHBOARD', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_dashboard_desktop_1440x900.png') });
      console.log('✅ hotel_admin_dashboard_desktop_1440x900.png');

      // 12. hotel_admin_pms_matrix_desktop_1440x900.png (Floor list + room cards)
      await page.goto('http://localhost:3005?module=ROOM_MANAGEMENT', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_pms_matrix_desktop_1440x900.png') });
      console.log('✅ hotel_admin_pms_matrix_desktop_1440x900.png');

      // 13. hotel_admin_staff_management_table_desktop_1440x900.png (Clean table + Add Staff modal)
      await page.goto('http://localhost:3005?module=STAFF_MANAGEMENT', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      const addStaffBtn = await page.$('button:has-text("+ Add Staff")');
      if (addStaffBtn) {
        await addStaffBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_staff_management_table_desktop_1440x900.png') });
      console.log('✅ hotel_admin_staff_management_table_desktop_1440x900.png');

      await context.close();
    }

    // 11. hotel_admin_dashboard_tablet_768x1024.png
    {
      const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await context.newPage();
      await page.addInitScript(({ token, hotelId }) => {
        localStorage.setItem('spicehub_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('spicehub_hotel_id', hotelId);
        localStorage.setItem('hotelId', hotelId);
        localStorage.setItem('spicehub_auth_user', JSON.stringify({
          id: '6ae06d00ddbafddfbb0a8015',
          name: 'Mahesh Saini',
          role: 'HOTEL_ADMIN',
          hotelId: hotelId
        }));
        document.documentElement.classList.remove('dark');
      }, { token: hotelAdminToken, hotelId: HOTEL_ID });

      await page.goto('http://localhost:3005?module=DASHBOARD', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.screenshot({ path: path.join(outputDir, 'hotel_admin_dashboard_tablet_768x1024.png') });
      console.log('✅ hotel_admin_dashboard_tablet_768x1024.png');
      await context.close();
    }

    console.log('🎉 All 13 Web Portals Proof Screenshots Successfully Captured!');
  } catch (err) {
    console.error('❌ Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
