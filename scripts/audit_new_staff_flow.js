import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/home/mahesh/.gemini/antigravity/brain/f76158f2-1c0c-4320-9850-060c577b3195';

(async () => {
  console.log('Starting Playwright test of the Hotel Code First -> Portals -> Staff PIN flow...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 mobile viewport
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();

  // 1. Initial State: Clear storage to see clean first screen
  await page.goto('http://localhost:3002');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1500);

  // 2. Verify that hotels are NOT listed beforehand ("na ki pehle se hotel dikhe")
  const hotelListCount = await page.locator('text=Bajrang Heritage Haveli').count();
  console.log('Pre-listed Bajrang card count (must be 0):', hotelListCount);
  if (hotelListCount !== 0) {
    throw new Error('Hotel should NOT be listed beforehand!');
  }

  // 3. Verify Hotel Code input is visible
  const codeInput = page.locator('[data-testid="waiter-hotel-code-input"]');
  await codeInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✅ Hotel Code input field is prominently visible!');

  console.log('Capturing 09_hotel_code_only_screen.png...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '09_hotel_code_only_screen.png'), fullPage: false });

  // 4. Enter Hotel Code "BH101"
  console.log('Entering Hotel Code BH101...');
  await codeInput.fill('BH101');
  await page.waitForTimeout(500);

  // 5. Click Verify button
  const verifyBtn = page.locator('[data-testid="waiter-verify-hotel-code"]');
  await verifyBtn.click();
  await page.waitForTimeout(2000);

  // 6. Verify that Bajrang Heritage Haveli is now verified
  await page.locator('text=Bajrang Heritage Haveli').first().waitFor({ timeout: 5000 });
  console.log('✅ Bajrang Heritage Haveli verified successfully via BH101!');

  // 7. Verify visible subscribed portals are present
  await page.locator('text=Subscribed Portals').waitFor({ timeout: 5000 });
  await page.locator('text=Waiter App').first().waitFor({ timeout: 5000 });
  console.log('✅ Visible subscribed portals displayed!');

  // 8. Verify Ramesh Waiter is present in roster
  const rameshWaiter = page.locator('text=Ramesh Waiter').first();
  await rameshWaiter.waitFor({ timeout: 5000 });
  console.log('✅ Found Ramesh Waiter in roster!');

  console.log('Capturing 10_hotel_code_verified_portals_and_staff.png...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '10_hotel_code_verified_portals_and_staff.png'), fullPage: false });

  // 9. Click Ramesh Waiter
  await rameshWaiter.click();
  await page.waitForTimeout(800);

  console.log('Capturing 11_staff_pin_screen.png...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '11_staff_pin_screen.png'), fullPage: false });

  // 10. Enter PIN 1-2-3-4
  console.log('Entering PIN 1234...');
  for (const digit of ['1', '2', '3', '4']) {
    const digitBtn = page.locator(`button[data-testid="pin-key-${digit}"]`).or(page.locator(`button:has-text("${digit}")`)).first();
    await digitBtn.click();
    await page.waitForTimeout(150);
  }

  // 11. Wait for Waiter Terminal to load
  await page.waitForTimeout(2500);
  console.log('Capturing 12_waiter_terminal_unlocked.png...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '12_waiter_terminal_unlocked.png'), fullPage: false });

  console.log('✅ All steps completed with 100% success!');
  await browser.close();
})();
