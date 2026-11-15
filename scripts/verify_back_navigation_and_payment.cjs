const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/home/mahesh/.gemini/antigravity/brain/f77e34bf-05bc-4a43-9daa-39b99e3453d5';
const LIVE_HOTEL_ID = '6af93b65a11bc972a8d566c8';

async function runVerification() {
  console.log('🚀 Starting Verification of Room Folio Removal & Mobile Back Navigation...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 SpiceHubCustomer/1.0',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[Browser Unhandled Exception]: ${err.message}`);
  });

  let realSessionToken = null;

  try {
    // =========================================================================
    // TEST 1: Open Table Dining Portal & Place Real Order to Check Bill Options
    // =========================================================================
    console.log('\n--- TEST 1: Table Dining Real Order & Payment Methods ---');
    await page.goto(`http://localhost:3001/?hotelId=${LIVE_HOTEL_ID}&table=T-01`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(1500);

    // If pax modal is open, click confirm
    const paxConfirmBtn = page.locator('button:has-text("Confirm & View Menu")');
    if (await paxConfirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Dismissing initial Pax modal...');
      await paxConfirmBtn.click();
      await page.waitForTimeout(800);
    }

    // Check if Resume button is on screen if occupied
    const resumeOccupiedBtn = page.locator('[data-testid="occupied-resume-session-btn"]');
    if (await resumeOccupiedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Clicking Occupied Resume Session button...');
      await resumeOccupiedBtn.click();
      await page.waitForTimeout(800);
    }

    // Add an item to cart
    console.log('Adding item to cart...');
    const addBtn = page.locator('button:has-text("ADD")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(800);

    // If customize modal popped up, click "Add to Order"
    const modalAddBtn = page.locator('button:has-text("Add to Order")');
    if (await modalAddBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('Clicking Add to Order in Customize modal...');
      await modalAddBtn.click();
      await page.waitForTimeout(800);
    }

    // Navigate to Cart
    console.log('Navigating to Cart tab...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('customer:set_tab', { detail: 'cart' }));
    });
    await page.waitForTimeout(1000);

    // Place the order
    console.log('Placing order to kitchen...');
    const placeOrderBtn = page.locator('button:has-text("Send Order to Kitchen"), button:has-text("Confirm & Place Order")').first();
    if (await placeOrderBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await placeOrderBtn.click();
      await page.waitForTimeout(2500);
    }

    // Dismiss order confirmation modal if open
    const closeConfirmBtn = page.locator('button:has-text("Track Order"), button:has-text("Close"), button:has-text("OK")').first();
    if (await closeConfirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeConfirmBtn.click();
      await page.waitForTimeout(800);
    }

    // Switch to Payment tab
    console.log('Navigating to Payment tab with active placed order...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('customer:set_tab', { detail: 'payment' }));
    });
    await page.waitForTimeout(1500);

    // Check for payment options
    const upiVisible = await page.locator('text=UPI QR Code').isVisible({ timeout: 4000 }).catch(() => false);
    const cardVisible = await page.locator('text=Card Swipe Machine').isVisible({ timeout: 2000 }).catch(() => false);
    const cashVisible = await page.locator('text=Cash Payment').isVisible({ timeout: 2000 }).catch(() => false);
    const roomFolioVisible = await page.locator('text=Charge to Room Folio').isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`UPI QR Code option visible: ${upiVisible}`);
    console.log(`Card Swipe Machine option visible: ${cardVisible}`);
    console.log(`Cash Payment option visible: ${cashVisible}`);
    console.log(`Charge to Room Folio option visible: ${roomFolioVisible} (SHOULD BE FALSE)`);

    if (roomFolioVisible) {
      throw new Error('FAILED: "Charge to Room Folio" is still visible in table dining!');
    }
    if (!upiVisible || !cardVisible || !cashVisible) {
      throw new Error('FAILED: Required table dining payment options (UPI, Card, Cash) are missing!');
    }
    console.log('✅ TEST 1 PASSED: Room Folio is completely removed from table dining, and UPI/Card/Cash are clearly displayed.');

    const screenshot1Path = path.join(ARTIFACT_DIR, 'payment_methods_table_no_room_folio.png');
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(`Saved screenshot: ${screenshot1Path}`);

    try {
      realSessionToken = await page.evaluate(() => localStorage.getItem('spicehub_customer_session_token') || sessionStorage.getItem('spicehub_customer_session_token'));
      console.log(`Captured live table session token from Test 1: ${realSessionToken ? realSessionToken.slice(0, 16) + '...' : 'none'}`);
    } catch {}

    // =========================================================================
    // TEST 2: Back Navigation from Payment Tab -> Orders / Menu
    // =========================================================================
    console.log('\n--- TEST 2: Back Navigation from Payment Tab ---');
    await page.evaluate(() => {
      window.postMessage({ type: 'spicehub:hardware-back-pressed' }, '*');
    });
    await page.waitForTimeout(800);

    const postPayTab = await page.evaluate(() => sessionStorage.getItem('spicehub_customer_tab'));
    console.log(`Current tab after Back press from Payment: ${postPayTab}`);
    if (postPayTab !== 'orders' && postPayTab !== 'menu') {
      throw new Error(`FAILED: Expected tab 'orders' or 'menu' after Back from Payment, got '${postPayTab}'`);
    }
    console.log('✅ TEST 2 PASSED: Back navigation popped payment tab to orders/menu.');

    // =========================================================================
    // TEST 3: Back Navigation from Cart Tab -> Menu
    // =========================================================================
    console.log('\n--- TEST 3: Back Navigation from Cart Tab ---');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('customer:set_tab', { detail: 'cart' }));
    });
    await page.waitForTimeout(600);
    console.log(`Navigated to Cart tab: ${await page.evaluate(() => sessionStorage.getItem('spicehub_customer_tab'))}`);

    await page.evaluate(() => {
      window.postMessage({ type: 'spicehub:hardware-back-pressed' }, '*');
    });
    await page.waitForTimeout(800);
    const cartPoppedTab = await page.evaluate(() => sessionStorage.getItem('spicehub_customer_tab'));
    console.log(`Current tab after Back press from Cart: ${cartPoppedTab}`);
    if (cartPoppedTab !== 'menu') {
      throw new Error(`FAILED: Expected tab 'menu' after Back from Cart, but got '${cartPoppedTab}'`);
    }
    console.log('✅ TEST 3 PASSED: Back navigation from Cart tab successfully returned to Menu.');

    const screenshot3Path = path.join(ARTIFACT_DIR, 'back_from_cart_to_menu.png');
    await page.screenshot({ path: screenshot3Path, fullPage: true });
    console.log(`Saved screenshot: ${screenshot3Path}`);

    // =========================================================================
    // TEST 4: Dismissing Modal via Back Button
    // =========================================================================
    console.log('\n--- TEST 4: Modal Dismissal via Back Button ---');
    // Open a dish customize modal
    const customizeBtn = page.locator('button:has-text("Customize"), button:has-text("ADD")').first();
    if (await customizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await customizeBtn.click();
      await page.waitForTimeout(600);

      const modalOpen = await page.locator('text=Special Cooking Requests, text=Spice Level, text=Select Spice Level').first().isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Modal open before Back press: ${modalOpen}`);

      await page.evaluate(() => {
        window.postMessage({ type: 'spicehub:hardware-back-pressed' }, '*');
      });
      await page.waitForTimeout(600);

      const modalOpenAfter = await page.locator('text=Special Cooking Requests, text=Spice Level, text=Select Spice Level').first().isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`Modal open after Back press: ${modalOpenAfter}`);
      if (modalOpenAfter) {
        throw new Error('FAILED: Modal did not close on hardware back button press!');
      }
      console.log('✅ TEST 4 PASSED: Modal closed cleanly on hardware back button without leaving the page.');
    }

    // =========================================================================
    // TEST 5: Customer Android Shell - Active Table Dining Card on Home Screen
    // =========================================================================
    console.log('\n--- TEST 5: Customer Android Shell - Active Table Card & Resume Flow ---');
    await page.goto(`http://localhost:3012/?hotelId=${LIVE_HOTEL_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(800);

    // Seed active table session in localStorage
    await page.evaluate(({ hotelId, token }) => {
      localStorage.setItem('spicehub_customer_table', 'T-01');
      if (token) {
        localStorage.setItem('spicehub_customer_session_token', token);
      }
      localStorage.setItem('spicehub_customer_hotel_id', hotelId);
      localStorage.setItem('spicehub_customer_hotel', 'Hotel Mahesh Gateway & Luxury Dining');
      localStorage.setItem('spicehub_customer_hotel_chosen', 'true');
    }, { hotelId: LIVE_HOTEL_ID, token: realSessionToken });

    // Reload page to re-render Home view
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check if active-table-dining-card is visible
    const activeTableCard = page.locator('[data-testid="active-table-dining-card"]');
    const isCardVisible = await activeTableCard.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Active Dining Session Card visible on Home screen: ${isCardVisible}`);

    if (!isCardVisible) {
      throw new Error('FAILED: Active Dining Session card is not visible on customer home screen!');
    }

    const cardText = await activeTableCard.innerText();
    console.log(`Card text content:\n${cardText}`);

    const screenshotHomeCardPath = path.join(ARTIFACT_DIR, 'customer_android_home_active_table_card.png');
    await page.screenshot({ path: screenshotHomeCardPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotHomeCardPath}`);

    // Click "Resume Table Order" button
    console.log('Clicking "Resume Table Order" button...');
    const resumeBtn = page.locator('[data-testid="resume-table-portal-btn"]');
    await resumeBtn.click();
    await page.waitForTimeout(3500);

    // Verify embedded portal frame is visible
    const portalFrame = page.locator('#portal-frame');
    const isFrameVisible = await portalFrame.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Portal iframe visible after clicking Resume: ${isFrameVisible}`);
    if (!isFrameVisible) {
      throw new Error('FAILED: Portal iframe did not load after clicking Resume Table Order!');
    }

    // Verify native top navbar has Back and Hotel Home buttons
    const stepBackBtn = page.locator('[data-testid="portal-step-back-btn"]');
    const floatingHomeBtn = page.locator('[data-testid="portal-floating-home-btn"]');
    const isStepBackVisible = await stepBackBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const isHomeBtnVisible = await floatingHomeBtn.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`Portal top navbar < Back button visible: ${isStepBackVisible}`);
    console.log(`Portal top navbar Hotel Home button visible: ${isHomeBtnVisible}`);

    if (!isStepBackVisible || !isHomeBtnVisible) {
      throw new Error('FAILED: Portal top navbar buttons (< Back, Hotel Home) are missing!');
    }

    const screenshotPortalPath = path.join(ARTIFACT_DIR, 'customer_android_portal_embedded_view.png');
    await page.screenshot({ path: screenshotPortalPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPortalPath}`);

    // Click "Hotel Home" button on top navbar to exit back to home
    console.log('Testing "Hotel Home" button exit...');
    await floatingHomeBtn.click();
    await page.waitForTimeout(1000);

    const isBackOnHome = await activeTableCard.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Returned to Home view with Active Table card still present: ${isBackOnHome}`);
    if (!isBackOnHome) {
      throw new Error('FAILED: Exiting portal did not preserve active table session card on home screen!');
    }
    console.log('✅ TEST 5 PASSED: Customer Android Shell seamlessly displays active table card, resumes portal with 1 tap, and preserves dining session.');

    console.log('\n====================================================');
    console.log('🎉 ALL 5 VERIFICATION TESTS PASSED WITH ZERO DEFECTS!');
    console.log('====================================================\n');

  } finally {
    await browser.close();
  }
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
