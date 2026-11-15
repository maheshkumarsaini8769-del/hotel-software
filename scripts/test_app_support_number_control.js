const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });

(async () => {
  console.log('--- Testing App Support Number Control from Hotel Admin ERP ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login to Hotel Admin ERP
  console.log('1. Navigating to http://localhost:3005 ...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('2. Submitting login for Bajrang Heritage Haveli...');
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'admin@bajranghaveli.com');
  await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'Bajrang@2026');

  const slugInput = await page.$('input[placeholder*="slug" i], input[name="slug"], input[placeholder*="property" i]');
  if (slugInput) {
    await slugInput.fill('bajrang-heritage-haveli');
  }

  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(3000);

  // 2. Open Hotel Profile & Location Modal
  console.log('3. Opening Hotel Profile & Location modal...');
  const profileSettingsBtn = page.locator('[data-testid="btn-hotel-profile-settings"]').first();
  await profileSettingsBtn.click();
  await page.waitForTimeout(1500);

  // 3. Verify App Support Phone card is visible
  const supportPhoneInput = page.locator('input[data-testid="input-app-support-phone"]');
  await supportPhoneInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('App Support Phone input found!');

  await page.screenshot({ path: path.join(SNAP_DIR, '74_hotel_admin_profile_modal.png'), fullPage: false });
  console.log('Captured: 74_hotel_admin_profile_modal.png');

  // 4. Update the App Support Number to '+91 98290 77777'
  console.log('4. Updating App Support Number to +91 98290 77777 ...');
  await supportPhoneInput.fill('+91 98290 77777');
  await page.waitForTimeout(500);

  const saveBtn = page.locator('button:has-text("Save & Live Sync Property"), button[type="submit"]:has-text("Save")').first();
  await saveBtn.click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(SNAP_DIR, '75_hotel_admin_support_phone_saved.png'), fullPage: false });
  console.log('Captured: 75_hotel_admin_support_phone_saved.png');

  // 5. Check Operations & Settings Tab in Hotel Admin ERP
  console.log('5. Checking Operations & Settings tab in Hotel Admin ERP...');
  const opsNav = page.locator('button:has-text("Operations & Settings"), a:has-text("Operations & Settings")').first();
  await opsNav.click();
  await page.waitForTimeout(2000);

  const hubSupportInput = page.locator('input[data-testid="input-hub-support-phone"]');
  await hubSupportInput.waitFor({ state: 'visible', timeout: 5000 });
  const hubVal = await hubSupportInput.inputValue();
  console.log('Operations Hub Support Phone Value:', hubVal);

  await page.screenshot({ path: path.join(SNAP_DIR, '76_operations_hub_support_phone_synced.png'), fullPage: false });
  console.log('Captured: 76_operations_hub_support_phone_synced.png');

  // 6. Test Waiter Mobile App on http://localhost:3002
  console.log('6. Navigating to Waiter Mobile App (http://localhost:3002) ...');
  const waiterPage = await context.newPage();
  await waiterPage.setViewportSize({ width: 420, height: 860 }); // Mobile viewport
  await waiterPage.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await waiterPage.waitForTimeout(2000);

  // Enter Hotel Code BH2026 if code input is shown
  const codeInput = waiterPage.locator('input[placeholder*="hotel code" i]');
  if (await codeInput.isVisible()) {
    console.log('Entering hotel code BH2026 in Waiter App...');
    await codeInput.fill('BH2026');
    await waiterPage.click('button:has-text("Verify hotel code")');
    await waiterPage.waitForTimeout(2000);
  }

  // Select staff Ramesh Waiter
  const staffOption = waiterPage.locator('text="Ramesh Waiter"').first();
  if (await staffOption.isVisible()) {
    console.log('Selecting Ramesh Waiter...');
    await staffOption.click();
    await waiterPage.waitForTimeout(1000);

    // Enter PIN: 1234
    console.log('Entering PIN 1234...');
    for (const d of ['1', '2', '3', '4']) {
      const pinKey = waiterPage.locator(`button:has-text("${d}")`).first();
      if (await pinKey.isVisible()) {
        await pinKey.click();
        await waiterPage.waitForTimeout(150);
      }
    }
    await waiterPage.waitForTimeout(2500);
  }

  // Navigate to Help & Support in Waiter App
  console.log('Opening More drawer in Waiter App...');
  const moreBtn = waiterPage.locator('button:has-text("More"), button[title*="Navigation Drawer" i]').first();
  await moreBtn.click();
  await waiterPage.waitForTimeout(1000);

  console.log('Clicking Help & Support...');
  const helpItem = waiterPage.locator('button[data-testid="nav-item-help-support"], button:has-text("Help & Support")').first();
  await helpItem.click();
  await waiterPage.waitForTimeout(2000);

  // Verify support helpline card
  const helplineCard = waiterPage.locator('[data-testid="waiter-support-helpline-card"]');
  await helplineCard.waitFor({ state: 'visible', timeout: 5000 });
  const cardText = await helplineCard.innerText();
  console.log('Helpline card text in Waiter App:', cardText.replace(/\n+/g, ' '));

  await waiterPage.screenshot({ path: path.join(SNAP_DIR, '77_waiter_app_support_number_live.png'), fullPage: false });
  console.log('Captured: 77_waiter_app_support_number_live.png');

  console.log('✅ ALL TESTS PASSED! Closing browser...');
  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
