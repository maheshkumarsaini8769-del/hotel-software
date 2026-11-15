const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });

(async () => {
  console.log('--- Starting Hotel Admin ERP Workflow Audit ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Navigate to Admin Login
  console.log('1. Navigating to http://localhost:3005 ...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Fill login
  console.log('2. Submitting login credentials for Amer Palace...');
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'maheshsaini10101@gmail.com');
  await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'AmerPalace@2026');
  
  // Fill slug if field exists
  const slugInput = await page.$('input[placeholder*="slug" i], input[name="slug"], input[placeholder*="property" i]');
  if (slugInput) {
    console.log('Filling property slug...');
    await slugInput.fill('amer-palace-heritage-haveli');
  }

  // Click submit
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(4000);

  // Capture Dashboard
  await page.screenshot({ path: path.join(SNAP_DIR, '58_hotel_admin_logged_in_dashboard.png'), fullPage: false });
  console.log('Captured: 58_hotel_admin_logged_in_dashboard.png');

  // Verify whether logged in
  const pageText = await page.innerText('body');
  const loggedIn = pageText.includes('Amer Palace') || pageText.includes('Dashboard') || pageText.includes('Front Desk');
  console.log('Logged In Successfully:', loggedIn);

  if (loggedIn) {
    // 3. Staff & Terminals
    console.log('3. Navigating to Staff & Terminals...');
    const staffBtn = page.locator('button:has-text("Staff & Terminals"), a:has-text("Staff & Terminals")').first();
    if (await staffBtn.isVisible()) {
      await staffBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '59_hotel_admin_staff_management.png'), fullPage: false });
      console.log('Captured: 59_hotel_admin_staff_management.png');
    }

    // 4. Dining Tables
    console.log('4. Navigating to Dining Tables...');
    const tableBtn = page.locator('button:has-text("Dining Tables"), a:has-text("Dining Tables")').first();
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '60_hotel_admin_dining_tables.png'), fullPage: false });
      console.log('Captured: 60_hotel_admin_dining_tables.png');
    }

    // 5. Front Desk & PMS
    console.log('5. Navigating to Front Desk & PMS...');
    const pmsBtn = page.locator('button:has-text("Front Desk & PMS"), a:has-text("Front Desk & PMS")').first();
    if (await pmsBtn.isVisible()) {
      await pmsBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '61_hotel_admin_frontdesk_pms.png'), fullPage: false });
      console.log('Captured: 61_hotel_admin_frontdesk_pms.png');
    }

    // 6. Menu & Stock 86
    console.log('6. Navigating to Menu & Stock 86...');
    const menuBtn = page.locator('button:has-text("Menu & Stock 86"), a:has-text("Menu & Stock 86")').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '62_hotel_admin_menu_catalog.png'), fullPage: false });
      console.log('Captured: 62_hotel_admin_menu_catalog.png');
    }

    // 7. Live Orders & KDS
    console.log('7. Navigating to Live Orders & KDS...');
    const kdsBtn = page.locator('button:has-text("Live Orders & KDS"), a:has-text("Live Orders & KDS")').first();
    if (await kdsBtn.isVisible()) {
      await kdsBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '63_hotel_admin_live_orders_kds.png'), fullPage: false });
      console.log('Captured: 63_hotel_admin_live_orders_kds.png');
    }

    // 8. Reports & Revenue
    console.log('8. Navigating to Reports & Revenue...');
    const reportsBtn = page.locator('button:has-text("Reports & Revenue"), a:has-text("Reports & Revenue")').first();
    if (await reportsBtn.isVisible()) {
      await reportsBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SNAP_DIR, '64_hotel_admin_reports_analytics.png'), fullPage: false });
      console.log('Captured: 64_hotel_admin_reports_analytics.png');
    }
  }

  await browser.close();
  console.log('--- Hotel Admin ERP Workflow Audit Completed Successfully ---');
})();
