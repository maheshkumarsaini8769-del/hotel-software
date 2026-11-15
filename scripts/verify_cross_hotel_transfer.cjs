const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = '/home/mahesh/.gemini/antigravity/brain/f77e34bf-05bc-4a43-9daa-39b99e3453d5';

const HOTEL_1_ID = '6af93b65a11bc972a8d566c8'; // Hotel Mahesh Gateway & Luxury Dining
const HOTEL_1_NAME = 'Hotel Mahesh Gateway & Luxury Dining';
const HOTEL_1_TABLE = 'T-01';

const HOTEL_2_ID = '6af93b65a11bc972a8d56730'; // Hotel Royal Palace Jaipur
const HOTEL_2_NAME = 'Hotel Royal Palace Jaipur';
const HOTEL_2_TABLE = 'T-02';
const HOTEL_2_TABLE_ID = '6af93b66a11bc972a8d5673d';

async function verifyCrossHotelTransfer() {
  console.log('🚀 Starting Cross-Hotel QR Auto-Transfer Verification...');

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
    console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
  });

  try {
    // =========================================================================
    // STEP 1: Customer sits at Hotel 1 (Hotel Mahesh Gateway) & Adds Item to Cart
    // =========================================================================
    console.log('\n--- STEP 1: Customer initial session at Hotel 1 (Hotel Mahesh Gateway) ---');
    await page.goto(`http://localhost:3001/?hotelId=${HOTEL_1_ID}&table=${HOTEL_1_TABLE}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(1500);

    // Dismiss Pax Modal if open
    const paxConfirmBtn = page.locator('button:has-text("Confirm & View Menu")');
    if (await paxConfirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paxConfirmBtn.click();
      await page.waitForTimeout(600);
    }

    // Add 1 item to cart at Hotel 1
    const addBtn = page.locator('button:has-text("ADD")').first();
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    const modalAddBtn = page.locator('button:has-text("Add to Order")');
    if (await modalAddBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await modalAddBtn.click();
      await page.waitForTimeout(600);
    }

    const hotel1Header = await page.locator('header').innerText();
    console.log(`Initial Hotel 1 loaded. Header text contains: ${hotel1Header.includes('Mahesh') ? 'Hotel Mahesh Gateway' : hotel1Header}`);

    const storedHotelIdStep1 = await page.evaluate(() => localStorage.getItem('spicehub_customer_hotel_id'));
    const storedTableStep1 = await page.evaluate(() => localStorage.getItem('spicehub_customer_table'));
    console.log(`Hotel 1 Storage: hotelId=${storedHotelIdStep1}, table=${storedTableStep1}`);

    const screenshot1Path = path.join(ARTIFACT_DIR, 'cross_hotel_step1_hotel_mahesh.png');
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(`Saved screenshot 1: ${screenshot1Path}`);

    // =========================================================================
    // STEP 2: Customer walks into Hotel 2 (Hotel Royal Palace) & Scans Table T-02
    // =========================================================================
    console.log('\n--- STEP 2: Customer mistakenly/intentionally scans Hotel 2 (Hotel Royal Palace) ---');
    // Direct navigation simulating scanning Hotel 2's QR standee
    await page.goto(`http://localhost:3001/?hotelId=${HOTEL_2_ID}&table=${HOTEL_2_TABLE}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // Confirm pax if open
    if (await paxConfirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paxConfirmBtn.click();
      await page.waitForTimeout(600);
    }

    // Verify cross-hotel toast notification or banner
    const storedHotelIdStep2 = await page.evaluate(() => localStorage.getItem('spicehub_customer_hotel_id'));
    const storedTableStep2 = await page.evaluate(() => localStorage.getItem('spicehub_customer_table'));
    const storedHotelNameStep2 = await page.evaluate(() => localStorage.getItem('spicehub_customer_hotel'));

    console.log(`Transferred Storage: hotelId=${storedHotelIdStep2}, hotelName=${storedHotelNameStep2}, table=${storedTableStep2}`);

    if (storedHotelIdStep2 !== HOTEL_2_ID) {
      throw new Error(`FAILED: Expected hotelId to be transferred to ${HOTEL_2_ID}, but got ${storedHotelIdStep2}`);
    }
    if (storedTableStep2 !== HOTEL_2_TABLE) {
      throw new Error(`FAILED: Expected table to be transferred to ${HOTEL_2_TABLE}, but got ${storedTableStep2}`);
    }

    // Verify Hotel 2's name is on screen
    const pageText = await page.innerText('body');
    const isHotel2Displayed = pageText.includes('Hotel Royal Palace') || pageText.includes('Royal Palace');
    console.log(`Hotel 2 ("Hotel Royal Palace") is visibly displayed on screen: ${isHotel2Displayed}`);

    if (!isHotel2Displayed) {
      throw new Error('FAILED: "Hotel Royal Palace" is not displayed on customer screen after scan!');
    }

    const screenshot2Path = path.join(ARTIFACT_DIR, 'cross_hotel_step2_hotel_royal_transferred.png');
    await page.screenshot({ path: screenshot2Path, fullPage: true });
    console.log(`Saved screenshot 2: ${screenshot2Path}`);

    // =========================================================================
    // STEP 3: Test Cross-Hotel Scan by Standee Table ID (Missing hotelId in URL)
    // =========================================================================
    console.log('\n--- STEP 3: Scan Standee with only tableId of Hotel 2 while stored hotel was Hotel 1 ---');
    // Reset back storage to Hotel 1
    await page.evaluate((h1Id) => {
      localStorage.setItem('spicehub_customer_hotel_id', h1Id);
      localStorage.setItem('spicehub_customer_hotel', 'Hotel Mahesh Gateway & Luxury Dining');
      localStorage.setItem('spicehub_customer_table', 'T-01');
    }, HOTEL_1_ID);

    // Now visit with Hotel 2's physical tableId and NO hotelId (or Hotel 1's hotelId)
    await page.goto(`http://localhost:3001/?tableId=${HOTEL_2_TABLE_ID}&hotelId=${HOTEL_1_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    if (await paxConfirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paxConfirmBtn.click();
      await page.waitForTimeout(600);
    }

    const autoResolvedHotelId = await page.evaluate(() => localStorage.getItem('spicehub_customer_hotel_id'));
    const autoResolvedHotelName = await page.evaluate(() => localStorage.getItem('spicehub_customer_hotel'));
    console.log(`Backend Auto-Transfer Result: hotelId=${autoResolvedHotelId}, hotelName=${autoResolvedHotelName}`);

    if (autoResolvedHotelId !== HOTEL_2_ID) {
      throw new Error(`FAILED: Backend did not auto-transfer to ${HOTEL_2_ID} when foreign tableId was scanned! Got: ${autoResolvedHotelId}`);
    }

    const screenshot3Path = path.join(ARTIFACT_DIR, 'cross_hotel_step3_backend_auto_transferred.png');
    await page.screenshot({ path: screenshot3Path, fullPage: true });
    console.log(`Saved screenshot 3: ${screenshot3Path}`);

    // =========================================================================
    // STEP 4: Test in Customer Android Shell
    // =========================================================================
    console.log('\n--- STEP 4: Customer Android Shell - Auto Transfer on Scan ---');
    await page.goto(`http://localhost:3012/?hotelId=${HOTEL_1_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForFunction(() => Boolean(window.__spicehub && window.__spicehub.handleQrDetected), { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Simulate scanning Hotel 2's table standee QR via __spicehub.handleQrDetected
    console.log('Simulating QR scan of Hotel 2 Table Standee inside Customer Android Shell...');
    const scanResult = await page.evaluate(({ h2Id, h2Table }) => {
      const qrPayload = `http://localhost:3001/?hotelId=${h2Id}&table=${h2Table}`;
      return window.__spicehub.handleQrDetected(qrPayload);
    }, { h2Id: HOTEL_2_ID, h2Table: HOTEL_2_TABLE });

    console.log(`Scan detection result: ${scanResult}`);
    await page.waitForTimeout(3000);

    // Verify embedded portal frame is visible
    const portalFrame = page.locator('#portal-frame');
    const isFrameVisible = await portalFrame.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Portal frame visible after cross-hotel scan: ${isFrameVisible}`);

    // Verify navbar displays Hotel Royal Palace & Table T-02
    const navbarText = await page.locator('[data-testid="portal-step-back-btn"]').locator('..').locator('..').innerText();
    console.log(`Top Navbar text:\n${navbarText}`);

    const hasRoyalPalace = navbarText.includes('Hotel Royal') || navbarText.includes('Royal');
    const hasT02 = navbarText.includes('Table T-02') || navbarText.includes('T-02');

    console.log(`Navbar shows Hotel Royal Palace: ${hasRoyalPalace}`);
    console.log(`Navbar shows Table T-02: ${hasT02}`);

    if (!hasRoyalPalace || !hasT02) {
      throw new Error('FAILED: Customer Android shell top navbar did not switch to Hotel Royal Palace T-02!');
    }

    const screenshot4Path = path.join(ARTIFACT_DIR, 'cross_hotel_step4_android_shell_transferred.png');
    await page.screenshot({ path: screenshot4Path, fullPage: true });
    console.log(`Saved screenshot 4: ${screenshot4Path}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL CROSS-HOTEL AUTO-TRANSFER TESTS PASSED WITH ZERO DEFECTS!');
    console.log('=============================================================\n');

  } finally {
    await browser.close();
  }
}

verifyCrossHotelTransfer().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
