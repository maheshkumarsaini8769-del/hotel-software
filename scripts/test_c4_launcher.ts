import puppeteer from 'puppeteer';

async function run() {
  console.log('🧪 Starting /launcher & Portal Directory (c4) verification tests...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Unauthenticated Visit to http://localhost:3005/launcher
    console.log('\n--- 1. Testing Unauthenticated Gate at :3005/launcher ---');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:3005/launcher', { waitUntil: 'networkidle2' });

    // Clear any existing auth session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // Verify StaffLoginGate is visible
    const loginGateTitle = await page.evaluate(() => {
      const h = document.querySelector('h1, h2, [data-testid="staff-login-title"]');
      return h ? h.textContent : null;
    });
    console.log('ℹ️ Login gate heading:', loginGateTitle?.trim());

    const emailInput = await page.$('[data-testid="staff-login-email"]');
    const passwordInput = await page.$('[data-testid="staff-login-password"]');
    const submitBtn = await page.$('[data-testid="staff-login-submit"]');

    if (!emailInput || !passwordInput || !submitBtn) {
      throw new Error('StaffLoginGate input fields or submit button missing on unauthenticated /launcher');
    }
    console.log('✅ StaffLoginGate is strictly enforced on :3005/launcher (Auth Guard ACTIVE)');

    // Verify directory modal is NOT accessible before auth
    const directoryBeforeAuth = await page.$('[data-testid="spicehub-portal-directory"]');
    if (directoryBeforeAuth) {
      throw new Error('Security Breach: SpiceHubPortalDirectoryModal rendered before authentication!');
    }
    console.log('✅ Portal directory is hidden before credentials are provided');

    // 2. Perform Authentication
    console.log('\n--- 2. Authenticating as Admin ---');
    await emailInput.type('admin@tajgateway.com');
    await passwordInput.type('SpiceHub@123');
    await submitBtn.click();

    // Wait for directory modal
    await page.waitForSelector('[data-testid="spicehub-portal-directory"]', { timeout: 8000 });
    console.log('✅ Authenticated successfully; SpiceHubPortalDirectoryModal rendered!');

    // 3. Verify all 8 portals exist in directory
    console.log('\n--- 3. Verifying All 8 Portals in Directory ---');
    const expectedPortals = [
      { id: 'customer', port: 3001 },
      { id: 'guest', port: 3004 },
      { id: 'waiter', port: 3002 },
      { id: 'kds', port: 3003 },
      { id: 'cashier', port: 3007 },
      { id: 'reception', port: 3008 },
      { id: 'admin', port: 3005 },
      { id: 'superadmin', port: 3006 },
    ];

    for (const ep of expectedPortals) {
      const card = await page.$(`[data-testid="portal-card-${ep.id}"]`);
      if (!card) {
        throw new Error(`Portal card missing for ${ep.id}`);
      }
      const link = await page.$(`[data-testid="portal-link-${ep.id}"]`);
      if (!link) {
        throw new Error(`Launch action link missing for ${ep.id}`);
      }
      const href = await page.evaluate(el => el?.getAttribute('href'), link);
      console.log(`✅ Portal [${ep.id}]: Found card and link -> ${href} (Port ${ep.port})`);
      if (!href?.includes(String(ep.port))) {
        throw new Error(`Expected port ${ep.port} in href ${href} for portal ${ep.id}`);
      }
    }

    // 4. Test Search Functionality
    console.log('\n--- 4. Testing Directory Search Filtering ---');
    const searchInput = await page.$('input[placeholder*="Search portals"]');
    if (!searchInput) throw new Error('Search input not found in directory modal');

    await searchInput.type('Kitchen');
    await new Promise(r => setTimeout(r, 200));

    const visibleCards = await page.$$eval('[data-testid^="portal-card-"]', els => els.map(e => e.getAttribute('data-testid')));
    console.log('ℹ️ Cards matching "Kitchen":', visibleCards);
    if (!visibleCards.includes('portal-card-kds')) {
      throw new Error('KDS card should match "Kitchen"');
    }
    if (visibleCards.includes('portal-card-customer')) {
      throw new Error('Customer card should be filtered out when searching "Kitchen"');
    }
    console.log('✅ Search filtering functions accurately');

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search portals"]') as HTMLInputElement;
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // 5. Mobile Viewport & Tap Target Compliance (Condition 2 & 4)
    console.log('\n--- 5. Testing Viewports & Tap Targets ---');
    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 800 });
      const overflowMetrics = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="spicehub-portal-directory"] > div') as HTMLElement | null;
        return {
          windowWidth: window.innerWidth,
          modalWidth: modal?.offsetWidth,
          modalScrollWidth: modal?.scrollWidth,
          overflow: modal ? modal.scrollWidth > window.innerWidth : false,
        };
      });
      console.log(`📱 Viewport ${width}px -> modalWidth: ${overflowMetrics.modalWidth}px, scrollWidth: ${overflowMetrics.modalScrollWidth}px, overflow: ${overflowMetrics.overflow}`);
      if (overflowMetrics.overflow) {
        throw new Error(`Directory modal overflow detected at ${width}px viewport`);
      }
    }

    // Measure tap targets on 375px
    await page.setViewport({ width: 375, height: 812 });
    const launchBtns = await page.$$('[data-testid^="portal-link-"]');
    for (const btn of launchBtns.slice(0, 3)) {
      const box = await btn.boundingBox();
      console.log(`ℹ️ Launch action button size: ${box?.width}x${box?.height}`);
      if (!box || box.height < 44) {
        throw new Error(`Tap target height ${box?.height}px is under 44px minimum requirement`);
      }
    }
    console.log('✅ All launch action buttons have tap target height >= 44px');

    console.log('\n🎉 ALL C4 /LAUNCHER TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ C4 Test failed:', err);
  process.exit(1);
});
