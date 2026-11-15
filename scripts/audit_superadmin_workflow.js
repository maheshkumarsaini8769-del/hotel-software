const { chromium } = require('playwright');
const path = require('path');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Super Admin SaaS...');
  await page.goto('http://localhost:3006', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // If login form present, login
  const emailInput = await page.$('input[type="email"], input[placeholder*="email" i]');
  if (emailInput) {
    await emailInput.fill('superadmin@spicehub.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'SpiceHub@123');
    await page.click('button[type="submit"], button:has-text("Sign In")');
    await page.waitForTimeout(3000);
  }

  // Click Tenant Management (BRANCHES)
  const tenantTab = page.locator('[data-testid="sidebar-nav-BRANCHES"]').first();
  if (await tenantTab.isVisible()) {
    console.log('Clicking Tenant Management tab...');
    await tenantTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SNAP_DIR, '65_superadmin_tenant_management.png'), fullPage: false });
    console.log('Captured: 65_superadmin_tenant_management.png');
  }

  // Click Subscriptions & Billing (SUBSCRIPTIONS)
  const subsTab = page.locator('[data-testid="sidebar-nav-SUBSCRIPTIONS"]').first();
  if (await subsTab.isVisible()) {
    console.log('Clicking Subscriptions tab...');
    await subsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SNAP_DIR, '66_superadmin_subscriptions_billing.png'), fullPage: false });
    console.log('Captured: 66_superadmin_subscriptions_billing.png');
  }

  // Click Rooms & PMS Fleet (ROOMS_PMS)
  const pmsTab = page.locator('[data-testid="sidebar-nav-ROOMS_PMS"]').first();
  if (await pmsTab.isVisible()) {
    console.log('Clicking Rooms & PMS Fleet tab...');
    await pmsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SNAP_DIR, '67_superadmin_rooms_pms_fleet.png'), fullPage: false });
    console.log('Captured: 67_superadmin_rooms_pms_fleet.png');
  }

  await browser.close();
  console.log('Done capturing Superadmin tabs!');
})();
