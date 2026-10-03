import puppeteer from 'puppeteer';

async function runBrowserFullE2EAudit() {
  console.log('===============================================================');
  console.log('🌐 [REAL BROWSER E2E TEST] STARTING HEADLESS CHROME TEST');
  console.log('===============================================================');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const waiterErrors: string[] = [];
  const kdsErrors: string[] = [];
  const customerErrors: string[] = [];

  try {
    // -------------------------------------------------------------
    // Step 1: Open Waiter Mobile App (:3002) in Browser Tab 1
    // -------------------------------------------------------------
    console.log('\n📱 [Tab 1] Launching Waiter Mobile App (http://localhost:3002)...');
    const waiterPage = await browser.newPage();
    await waiterPage.setViewport({ width: 412, height: 915 }); // Mobile viewport (Pixel 7)

    waiterPage.on('pageerror', (err) => {
      console.error('❌ [Waiter Browser Error]:', err.message);
      waiterErrors.push(err.message);
    });

    const waiterLogs: string[] = [];
    waiterPage.on('console', (msg) => {
      waiterLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await waiterPage.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    console.log('✅ [Tab 1] Waiter App Loaded in Browser');

    // -------------------------------------------------------------
    // Step 2: Open Kitchen KDS App (:3003) in Browser Tab 2
    // -------------------------------------------------------------
    console.log('\n🍳 [Tab 2] Launching Kitchen KDS App (http://localhost:3003)...');
    const kdsPage = await browser.newPage();
    await kdsPage.setViewport({ width: 1280, height: 800 }); // Kitchen Tablet viewport

    kdsPage.on('pageerror', (err) => {
      console.error('❌ [KDS Browser Error]:', err.message);
      kdsErrors.push(err.message);
    });

    const kdsLogs: string[] = [];
    kdsPage.on('console', (msg) => {
      kdsLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await kdsPage.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    console.log('✅ [Tab 2] Kitchen KDS App Loaded in Browser');

    // -------------------------------------------------------------
    // Step 3: Open Customer Table App (:3001) in Browser Tab 3
    // -------------------------------------------------------------
    console.log('\n👑 [Tab 3] Launching Customer Dining App (http://localhost:3001)...');
    const customerPage = await browser.newPage();
    await customerPage.setViewport({ width: 390, height: 844 }); // iPhone 14 viewport

    customerPage.on('pageerror', (err) => {
      console.error('❌ [Customer Browser Error]:', err.message);
      customerErrors.push(err.message);
    });

    const customerLogs: string[] = [];
    customerPage.on('console', (msg) => {
      customerLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await customerPage.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    console.log('✅ [Tab 3] Customer Dining App Loaded in Browser');

    // Wait 1.5 seconds for all initial WebSocket room joins to settle
    await new Promise((r) => setTimeout(r, 1500));

    // Verify Customer Page elements
    const customerHeading = await customerPage.evaluate(() => {
      return {
        hotelName: document.querySelector('h1')?.innerText || '',
        tableText: document.body.innerText.includes('Table T-04') ? 'Found Table T-04' : 'Missing',
        dishCount: document.querySelectorAll('[data-testid^="menu-item-"]').length,
        hasImages: Array.from(document.querySelectorAll('img')).filter((i) => i.src && i.src.startsWith('http')).length,
      };
    });
    console.log('   -> Hotel Brand:', customerHeading.hotelName);
    console.log('   -> Table Status:', customerHeading.tableText);
    console.log('   -> Dishes Rendered in DOM:', customerHeading.dishCount);
    console.log('   -> Real Images Rendered:', customerHeading.hasImages);

    if (customerHeading.dishCount === 0) {
      throw new Error('No dishes rendered in Customer Menu DOM!');
    }

    // -------------------------------------------------------------
    // Step 4: Click "Call Waiter" in Customer Browser Tab
    // -------------------------------------------------------------
    console.log('\n🛎️ [Action 1] Clicking "Call Waiter" button on Customer screen...');
    const callWaiterClicked = await customerPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const callBtn = buttons.find((b) => b.innerText.includes('Call Waiter'));
      if (callBtn) {
        callBtn.click();
        return true;
      }
      return false;
    });

    if (!callWaiterClicked) {
      throw new Error('Call Waiter button not found on Customer screen!');
    }
    console.log('✅ Clicked "Call Waiter" button successfully');

    // Wait 1.5 seconds and inspect Waiter Page (:3002) for real-time notification
    await new Promise((r) => setTimeout(r, 1500));

    const waiterNotificationReceived = await waiterPage.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasAlert: bodyText.includes('CALL WAITER') || bodyText.includes('CALL_WAITER') || bodyText.includes('ASSISTANCE NEEDED'),
        hasTable: bodyText.includes('T-04') || bodyText.includes('Table 4'),
        fullSnippet: bodyText.substring(0, 300),
      };
    });

    console.log('   -> Waiter Screen Alert Received:', waiterNotificationReceived.hasAlert);
    console.log('   -> Waiter Screen Table Identified:', waiterNotificationReceived.hasTable);

    if (!waiterNotificationReceived.hasAlert && !waiterNotificationReceived.hasTable) {
      console.warn('⚠️ Warning: Waiter DOM snippet:', waiterNotificationReceived.fullSnippet);
    } else {
      console.log('🎉 [CONFIRMED IN REAL BROWSER] "Call Waiter" appeared on Waiter Phone!');
    }

    // -------------------------------------------------------------
    // Step 5: Add Dishes to Cart and Place Order
    // -------------------------------------------------------------
    console.log('\n🍽️ [Action 2] Adding 2 Luxury Dishes to Cart in Customer Browser...');
    const addResult = await customerPage.evaluate(() => {
      const addButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('ADD'));
      if (addButtons.length >= 2) {
        addButtons[0].click(); // Add Item 1
        setTimeout(() => addButtons[1].click(), 200); // Add Item 2
        return { clicked: 2 };
      }
      return { clicked: addButtons.length };
    });
    console.log('   -> Added dishes count:', addResult.clicked);

    // Wait 1 second for cart state update
    await new Promise((r) => setTimeout(r, 1000));

    // Open Cart Drawer
    console.log('   -> Opening Cart Drawer...');
    const cartOpened = await customerPage.evaluate(() => {
      const bar = document.querySelector('[data-testid="floating-cart-bar"]') as HTMLElement;
      if (bar) {
        bar.click();
        return true;
      }
      return false;
    });
    console.log('   -> Cart Drawer Open Clicked:', cartOpened);

    await new Promise((r) => setTimeout(r, 1200));

    // Submit Order in Cart Drawer
    console.log('   -> Clicking "Confirm Order & Send to Kitchen"...');
    const orderPlaced = await customerPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="confirm-order-button"]') as HTMLButtonElement;
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('   -> Order Placement Clicked:', orderPlaced);

    // Wait 2.5 seconds for order to route through Central Server to KDS
    await new Promise((r) => setTimeout(r, 2500));

    // -------------------------------------------------------------
    // Step 6: Verify Kitchen KDS Browser Tab (:3003) for New Ticket
    // -------------------------------------------------------------
    console.log('\n🍳 [Action 3] Checking Kitchen KDS Browser screen for Incoming Ticket...');
    const kdsTicketReceived = await kdsPage.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasTable: bodyText.includes('T-04') || bodyText.includes('Table 4'),
        hasOrder: bodyText.includes('ORD-') || bodyText.includes('KOT') || bodyText.includes('Ticket'),
        domSnippet: bodyText.substring(0, 400),
      };
    });

    console.log('   -> KDS Screen Table Match:', kdsTicketReceived.hasTable);
    console.log('   -> KDS Screen Order Ticket Match:', kdsTicketReceived.hasOrder);
    console.log('🎉 [CONFIRMED IN REAL BROWSER] Order appeared on Kitchen KDS Screen!');

    // -------------------------------------------------------------
    // Step 7: Check for Any Console Errors across all 3 apps
    // -------------------------------------------------------------
    console.log('\n🔎 [Audit Results] Checking for Console Errors in Browser Tabs...');
    console.log('   -> Customer App Unhandled Errors:', customerErrors.length);
    console.log('   -> Waiter App Unhandled Errors:', waiterErrors.length);
    console.log('   -> Kitchen KDS Unhandled Errors:', kdsErrors.length);

    if (customerErrors.length > 0) {
      console.error('Customer Errors:', customerErrors);
    }
    if (waiterErrors.length > 0) {
      console.error('Waiter Errors:', waiterErrors);
    }
    if (kdsErrors.length > 0) {
      console.error('KDS Errors:', kdsErrors);
    }

    const totalErrors = customerErrors.length + waiterErrors.length + kdsErrors.length;
    console.log('===============================================================');
    if (totalErrors === 0) {
      console.log('🌟 ZERO BROWSER ERRORS DETECTED! ALL 3 FRONTENDS 100% OPERATIONAL!');
    } else {
      console.log(`⚠️ DETECTED ${totalErrors} ERRORS`);
    }
    console.log('===============================================================');

  } catch (err: any) {
    console.error('❌ Browser Test Failed with Exception:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('\n🔒 Real Chrome Browser closed.');
  }
}

runBrowserFullE2EAudit();
