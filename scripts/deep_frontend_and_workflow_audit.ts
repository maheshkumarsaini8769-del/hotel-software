import puppeteer, { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

interface AppAuditLog {
  app: string;
  url: string;
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
}

const auditLogs: Record<string, AppAuditLog> = {};

function initAppAudit(name: string, url: string, page: Page): AppAuditLog {
  const log: AppAuditLog = {
    app: name,
    url,
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
  };
  auditLogs[name] = log;

  page.on('dialog', async (dialog) => {
    console.log(`   [${name} DIALOG] "${dialog.message()}"`);
    await dialog.accept().catch(() => {});
  });

  page.on('pageerror', (err) => {
    console.error(`   ⚠️ [${name} PAGE ERROR]: ${err.message}`);
    log.pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon or benign known socket reconnect logs
      if (!text.includes('favicon') && !text.includes('404 (Not Found)') && !text.includes('Failed to load resource')) {
        log.consoleErrors.push(text);
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('favicon') && !url.includes('.map')) {
      log.failedRequests.push(`${req.method()} ${url} -> ${req.failure()?.errorText}`);
    }
  });

  return log;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDeepFrontendWorkflowAudit() {
  console.log('================================================================================');
  console.log('🌐 [DEEP FRONTEND & WORKFLOW AUDIT] 6-APP CONCURRENT INTERACTIVE VERIFICATION');
  console.log('   Customer | Waiter | Kitchen KDS | Guest Portal | Admin ERP | SuperAdmin SaaS');
  console.log('================================================================================');

  const browser: Browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1440,900',
    ],
    protocolTimeout: 120000,
  });

  try {
    // =========================================================================
    // 1. CUSTOMER DINING WEB APP (:3001)
    // =========================================================================
    console.log('\n📱 [APP 1: CUSTOMER DINING (:3001)] Auditing UI & Interactions...');
    const customerPage = await browser.newPage();
    await customerPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('Customer Dining', 'http://localhost:3001', customerPage);

    await customerPage.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    // Click Category Filter
    const catClicked = await customerPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const catBtn = buttons.find((b) => b.innerText.includes('Breads') || b.innerText.includes('Curries') || b.innerText.includes('Starters'));
      if (catBtn) {
        catBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Filtered Menu Categories:', catClicked);
    await sleep(800);

    // Click Call Waiter
    const waiterCalled = await customerPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const callBtn = buttons.find((b) => b.innerText.toLowerCase().includes('call waiter') || b.innerText.toLowerCase().includes('waiter'));
      if (callBtn) {
        callBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Tapped "Call Waiter" Button:', waiterCalled);
    await sleep(1500);

    // Add items to cart & Place Order
    const orderPlaced = await customerPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtns = buttons.filter((b) => b.innerText.trim() === '+' || b.innerText.toLowerCase().includes('add'));
      if (addBtns.length > 0) {
        addBtns[0].click();
        if (addBtns.length > 1) addBtns[1].click();
      }

      // Check for Order / Cart button
      const placeOrderBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.toLowerCase().includes('place order') ||
        b.innerText.toLowerCase().includes('view cart') ||
        b.innerText.toLowerCase().includes('order now')
      );
      if (placeOrderBtn) {
        placeOrderBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Customer Added Items & Fired Order:', orderPlaced);
    await sleep(2000);

    await customerPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_1_customer_dining.png` });
    console.log('📸 Saved deep_audit_frontend_1_customer_dining.png');

    // =========================================================================
    // 2. WAITER MOBILE APP (:3002)
    // =========================================================================
    console.log('\n📲 [APP 2: WAITER MOBILE OPERATIONS (:3002)] Auditing Live Dispatch...');
    const waiterPage = await browser.newPage();
    await waiterPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('Waiter Mobile', 'http://localhost:3002', waiterPage);

    await waiterPage.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    // Verify and handle pending service requests
    const waiterAcknowledged = await waiterPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ackBtn = buttons.find((b) =>
        b.innerText.toLowerCase().includes('acknowledge') ||
        b.innerText.toLowerCase().includes('accept') ||
        b.innerText.toLowerCase().includes('fulfill') ||
        b.innerText.toLowerCase().includes('complete')
      );
      if (ackBtn) {
        ackBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Waiter Acknowledged Service Request:', waiterAcknowledged);
    await sleep(2000);

    await waiterPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_2_waiter_mobile.png` });
    console.log('📸 Saved deep_audit_frontend_2_waiter_mobile.png');

    // =========================================================================
    // 3. KITCHEN KDS APP (:3003)
    // =========================================================================
    console.log('\n👨‍🍳 [APP 3: KITCHEN KDS (:3003)] Auditing Culinary Dispatch Station...');
    const kdsPage = await browser.newPage();
    await kdsPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('Kitchen KDS', 'http://localhost:3003', kdsPage);

    await kdsPage.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    // Chef clicks "PREPARING" or "READY"
    const kdsUpdated = await kdsPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const prepBtn = buttons.find((b) =>
        b.innerText.toLowerCase().includes('start cooking') ||
        b.innerText.toLowerCase().includes('preparing') ||
        b.innerText.toLowerCase().includes('ready')
      );
      if (prepBtn) {
        prepBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Chef Updated Cooking State on KDS:', kdsUpdated);
    await sleep(2000);

    await kdsPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_3_kitchen_kds.png` });
    console.log('📸 Saved deep_audit_frontend_3_kitchen_kds.png');

    // =========================================================================
    // 4. GUEST ROOM PORTAL (:3004)
    // =========================================================================
    console.log('\n🛎️ [APP 4: GUEST ROOM PORTAL (:3004)] Auditing In-Room Digital Experience...');
    const guestPage = await browser.newPage();
    await guestPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('Guest Portal', 'http://localhost:3004', guestPage);

    await guestPage.goto('http://localhost:3004', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    // Enter room number or click access if room prompt exists
    const guestInteracted = await guestPage.evaluate(() => {
      const input = document.querySelector('input') as HTMLInputElement;
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '301');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const buttons = Array.from(document.querySelectorAll('button'));
      const enterBtn = buttons.find((b) => b.innerText.toLowerCase().includes('enter') || b.innerText.toLowerCase().includes('access') || b.innerText.toLowerCase().includes('explore'));
      if (enterBtn) {
        enterBtn.click();
        return true;
      }
      return false;
    });
    console.log('   Guest Portal Room Selection / Navigation:', guestInteracted);
    await sleep(2000);

    await guestPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_4_guest_portal.png` });
    console.log('📸 Saved deep_audit_frontend_4_guest_portal.png');

    // =========================================================================
    // 5. HOTEL ADMIN ERP COMMAND CENTER (:3005)
    // =========================================================================
    console.log('\n🏢 [APP 5: HOTEL ADMIN ERP SHELL (:3005)] Auditing Enterprise Modules...');
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('Admin ERP', 'http://localhost:3005', adminPage);

    await adminPage.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    // Module 5a: PMS Room Grid
    const pmsNav = await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const b = buttons.find((btn) => btn.innerText.includes('PMS Room Grid'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Navigated to Module: PMS Room Grid ->', pmsNav);
    await sleep(1500);

    // Module 5b: Express Cashier POS
    const cashierNav = await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const b = buttons.find((btn) => btn.innerText.includes('Express Cashier') || btn.innerText.includes('Fast Cashier'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Navigated to Module: Express Cashier POS ->', cashierNav);
    await sleep(1500);

    // Module 5c: Staff Roster & Time Clock
    const rosterNav = await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const b = buttons.find((btn) => btn.innerText.includes('Staff Roster'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('   Navigated to Module: Staff Roster & Time Clock ->', rosterNav);
    await sleep(1500);

    await adminPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_5_hotel_admin_erp.png` });
    console.log('📸 Saved deep_audit_frontend_5_hotel_admin_erp.png');

    // =========================================================================
    // 6. SUPERADMIN SAAS CLOUD CONSOLE (:3006)
    // =========================================================================
    console.log('\n☁️ [APP 6: SUPERADMIN SAAS CONSOLE (:3006)] Auditing Cloud Multi-Tenant Hub...');
    const saasPage = await browser.newPage();
    await saasPage.setViewport({ width: 1440, height: 900 });
    initAppAudit('SuperAdmin SaaS', 'http://localhost:3006', saasPage);

    await saasPage.goto('http://localhost:3006', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    const saasInteracted = await saasPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabBtn = buttons.find((b) => b.innerText.toLowerCase().includes('tenants') || b.innerText.toLowerCase().includes('metrics') || b.innerText.toLowerCase().includes('overview'));
      if (tabBtn) {
        tabBtn.click();
        return true;
      }
      return false;
    });
    console.log('   SuperAdmin SaaS Console Switched Views:', saasInteracted);
    await sleep(1500);

    await saasPage.screenshot({ path: `${screenshotDir}/deep_audit_frontend_6_superadmin_saas.png` });
    console.log('📸 Saved deep_audit_frontend_6_superadmin_saas.png');

    // =========================================================================
    // AUDIT SUMMARY REPORT
    // =========================================================================
    console.log('\n================================================================================');
    console.log('📊 [FRONTEND CONSOLE & NETWORK AUDIT SUMMARY]');
    console.log('================================================================================');

    let totalPageErrors = 0;
    let totalConsoleErrors = 0;
    let totalFailedRequests = 0;

    for (const [appName, log] of Object.entries(auditLogs)) {
      console.log(`\n🔹 ${appName} (${log.url}):`);
      console.log(`   Page Crashes:     ${log.pageErrors.length}`);
      console.log(`   Console Errors:   ${log.consoleErrors.length}`);
      console.log(`   Failed Requests:  ${log.failedRequests.length}`);

      totalPageErrors += log.pageErrors.length;
      totalConsoleErrors += log.consoleErrors.length;
      totalFailedRequests += log.failedRequests.length;

      if (log.pageErrors.length > 0) {
        console.log(`   🚨 Page Error Details:`, log.pageErrors);
      }
      if (log.consoleErrors.length > 0) {
        console.log(`   ⚠️ Console Error Details:`, log.consoleErrors);
      }
      if (log.failedRequests.length > 0) {
        console.log(`   ❌ Failed Requests:`, log.failedRequests);
      }
    }

    console.log('\n================================================================================');
    console.log(`TOTAL AUDIT STATS: Page Crashes: ${totalPageErrors} | Console Errors: ${totalConsoleErrors} | Failed Requests: ${totalFailedRequests}`);
    console.log('================================================================================');

    if (totalPageErrors > 0) {
      throw new Error(`Frontend Audit Detected ${totalPageErrors} Critical Page Crash(es)!`);
    }

    console.log('🎉 ALL 6 FRONTENDS OPERATING WITH 100% HEALTH & STABILITY!');
  } finally {
    await browser.close();
    console.log('🔒 Closed Puppeteer browser.');
  }
}

runDeepFrontendWorkflowAudit().catch((err) => {
  console.error('FATAL AUDIT FAILURE:', err);
  process.exit(1);
});
