const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';

function takeDeviceScreenshot(filename) {
  const target = path.join(SNAP_DIR, filename);
  try {
    execSync(`adb exec-out screencap -p > "${target}"`, { stdio: 'inherit' });
    console.log(`[Device Screencap] Saved -> ${filename}`);
  } catch (err) {
    console.error(`Failed screencap for ${filename}:`, err.message);
  }
}

async function run() {
  console.log('Connecting to phone webview via CDP...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  console.log('Connected! Page title:', await page.title());

  // 1. Back to portals if in terminal
  const backToPortals = page.locator('[data-testid="back-to-portals-btn"]');
  if (await backToPortals.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking back-to-portals-btn...');
    await backToPortals.click();
    await page.waitForTimeout(1000);
  }

  // 2. Back to hotel code if in portals
  const backToHotels = page.locator('[data-testid="back-to-hotels-btn"]');
  if (await backToHotels.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking back-to-hotels-btn...');
    await backToHotels.click();
    await page.waitForTimeout(1000);
  }

  takeDeviceScreenshot('11_enter_hotel_code_screen.png');

  // 3. Fill Hotel Code AP3722
  console.log('Entering Hotel Code AP3722...');
  const codeInput = page.locator('#staff-hotel-code');
  await codeInput.waitFor({ state: 'visible', timeout: 5000 });
  await codeInput.fill('AP3722');
  await page.waitForTimeout(400);

  console.log('Clicking Verify Hotel Code...');
  const verifyCodeBtn = page.locator('[data-testid="verify-staff-hotel-code"]');
  await verifyCodeBtn.click();
  await page.waitForTimeout(2000);

  takeDeviceScreenshot('12_hotel_code_verified_portals.png');

  // 4. Click Reception Front Desk portal
  console.log('Clicking Reception Front Desk...');
  const receptionBtn = page.locator('text=Reception').first();
  await receptionBtn.click();
  await page.waitForTimeout(2500);

  takeDeviceScreenshot('13_reception_staff_roster.png');

  // 5. Select Priya Sharma
  const staffCard = page.locator('text=Priya Sharma').first();
  if (await staffCard.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('Selecting Priya Sharma...');
    await staffCard.click();
    await page.waitForTimeout(1000);

    takeDeviceScreenshot('14_pin_entry_screen.png');

    // 6. Enter PIN 1234
    console.log('Entering PIN 1234...');
    for (const d of ['1', '2', '3', '4']) {
      const btn = page.locator(`button:has-text("${d}")`).first();
      await btn.click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(3000);

    takeDeviceScreenshot('15_reception_portal_logged_in.png');
  } else {
    console.log('Staff member Priya Sharma was not found.');
  }

  await browser.close();
  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
