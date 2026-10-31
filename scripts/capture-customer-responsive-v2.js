const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureCustomerResponsive() {
  const outputDir = path.join(__dirname, '..', 'artifacts', 'customer-responsive-v2');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { label: 'mobile_390x844', width: 390, height: 844, isMobile: true },
    { label: 'tablet_768x1024', width: 768, height: 1024, isMobile: false },
    { label: 'desktop_1440x900', width: 1440, height: 900, isMobile: false },
  ];

  console.log('================================================================');
  console.log('📸 CAPTURING CUSTOMER & GUEST PORTAL RESPONSIVE AUDIT SCREENSHOTS');
  console.log('================================================================\n');

  // ===========================================================================
  // 1. Room Portal Resident Unlock Screen (§2A)
  // ===========================================================================
  console.log('--- 1. Capturing Resident Unlock Screen (Mobile & Tablet/Desktop) ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      // Go to Room Catalog view directly
      await page.goto('http://127.0.0.1:3004/?tab=ROOMS', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Click Unlock Room button if modal is not open
      const unlockBtn = page.locator('[data-testid="btn-open-unlock-modal"], button:has-text("Unlock Room")').first();
      if (await unlockBtn.isVisible()) {
        await unlockBtn.click();
        await page.waitForTimeout(600);
      }

      const filePath = path.join(outputDir, `1_room_unlock_screen_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on unlock screen ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  // ===========================================================================
  // 2. Customer Table Menu App (§2B & §3)
  // ===========================================================================
  console.log('\n--- 2. Capturing Customer Table Menu (Mobile 1-col, Tablet 2-col, Desktop 3-col) ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      await page.goto('http://127.0.0.1:3001/?table=5&hotelId=mahesh-hotel-4119', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      // Dismiss pax modal if visible
      const confirmPaxBtn = page.locator('button:has-text("Confirm"), button:has-text("Continue"), [data-testid="btn-confirm-pax"]').first();
      if (await confirmPaxBtn.isVisible()) {
        await confirmPaxBtn.click();
        await page.waitForTimeout(500);
      }

      const filePath = path.join(outputDir, `2_customer_menu_grid_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on customer menu ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  // ===========================================================================
  // 3. Customer Cart View (§3 - Bottom Sheet on Mobile, Right Drawer on Tablet/Desktop)
  // ===========================================================================
  console.log('\n--- 3. Capturing Customer Cart View (Mobile Sheet vs Tablet/Desktop Drawer) ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      await page.goto('http://127.0.0.1:3001/?table=5&hotelId=mahesh-hotel-4119', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      // Dismiss pax modal if visible
      const confirmPaxBtn = page.locator('button:has-text("Confirm"), button:has-text("Continue"), [data-testid="btn-confirm-pax"]').first();
      if (await confirmPaxBtn.isVisible()) {
        await confirmPaxBtn.click();
        await page.waitForTimeout(500);
      }

      // Add a couple items to cart
      const addBtns = page.locator('button:has-text("Add"), [data-testid^="dish-add-"]');
      const count = await addBtns.count();
      if (count > 0) {
        await addBtns.nth(0).click();
        await page.waitForTimeout(400);
        if (count > 1) {
          await addBtns.nth(1).click();
          await page.waitForTimeout(400);
        }
      }

      // Open Cart
      const cartTrigger = page.locator('[data-testid="mobile-sticky-view-cart"], [data-testid="btn-open-cart-floating"], [data-testid="btn-view-cart"], button:has-text("View Cart"), button:has-text("Cart")').first();
      if (await cartTrigger.isVisible()) {
        await cartTrigger.click();
        await page.waitForTimeout(600);
      }

      const filePath = path.join(outputDir, `3_customer_cart_view_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on cart view ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  // ===========================================================================
  // 4. Guest Room Portal - In-Room Dining & Split View (§4 & §5)
  // ===========================================================================
  console.log('\n--- 4. Capturing Guest Room Portal (Tablet Split View & Desktop Centering) ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      await page.goto('http://127.0.0.1:3004/?room=201&hotelId=mahesh-hotel-4119&tab=DINING', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const filePath = path.join(outputDir, `4_guest_room_dining_split_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on room dining ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  // ===========================================================================
  // 5. Navigation Bar Switching (§5 - Mobile Bottom Bar vs Tablet/Desktop Top Header)
  // ===========================================================================
  console.log('\n--- 5. Capturing Navigation Mode Switching ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      await page.goto('http://127.0.0.1:3004/?room=201&hotelId=mahesh-hotel-4119&tab=HOME', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const filePath = path.join(outputDir, `5_guest_navigation_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on navigation ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  // ===========================================================================
  // 6. Guest Folio / Bill View (§4 & §6 - Disabled Reception Settlement)
  // ===========================================================================
  console.log('\n--- 6. Capturing Folio View with Disabled Reception Settlement ---');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    try {
      await page.goto('http://127.0.0.1:3004/?room=201&hotelId=mahesh-hotel-4119&tab=BILL', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const filePath = path.join(outputDir, `6_guest_folio_disabled_pay_${vp.label}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✅ Saved: ${filePath}`);
    } catch (e) {
      console.error(`  ❌ Error on folio view ${vp.label}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-VIEWPORT VERIFICATION SCREENSHOTS CAPTURED!');
  console.log(`📁 Destination: ${outputDir}`);
  console.log('================================================================\n');
}

captureCustomerResponsive().catch(err => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
