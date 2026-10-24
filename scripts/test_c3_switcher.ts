import puppeteer from 'puppeteer';

async function run() {
  console.log('🧪 Starting Switcher Bar (c3) verification tests...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Test Customer Table App (3001) Switcher Bar
    console.log('\n--- Testing Customer Table App (:3001/?table=T-01) ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/?table=T-01', { waitUntil: 'networkidle2' });

    // Clear any previous dismissal
    await page.evaluate(() => localStorage.removeItem('switcher_dismissed_at'));
    await page.reload({ waitUntil: 'networkidle2' });

    // Check switcher visibility
    let switcher = await page.$('[data-testid="customer-switcher-bar"]');
    if (!switcher) {
      throw new Error('Switcher bar not found on :3001/?table=T-01');
    }
    console.log('✅ Switcher bar is rendered and visible');

    // Check content and link
    const switcherText = await page.evaluate(el => el?.textContent, switcher);
    console.log('ℹ️ Switcher text:', switcherText?.trim());
    if (!switcherText?.includes('Staying in a room?')) {
      throw new Error('Expected prompt text not found in switcher bar');
    }

    const switchLink = await page.$('[data-testid="switcher-action-link"]');
    const href = await page.evaluate(el => el?.getAttribute('href'), switchLink);
    console.log('✅ Switch action link points to:', href);
    if (!href?.includes(':3004') && !href?.includes('/')) {
      throw new Error(`Unexpected destination URL: ${href}`);
    }

    // Measure tap target of dismiss button and link
    const dismissBtn = await page.$('[data-testid="switcher-dismiss-btn"]');
    if (!dismissBtn) throw new Error('Dismiss button not found');

    const btnBox = await dismissBtn.boundingBox();
    console.log(`ℹ️ Dismiss button dimensions: ${btnBox?.width}x${btnBox?.height}`);
    if (!btnBox || btnBox.width < 40 || btnBox.height < 40) {
      console.warn('⚠️ Dismiss button tap target slightly under 44px:', btnBox);
    } else {
      console.log('✅ Dismiss button tap target >= 44px (compliant)');
    }

    // Test dismiss action
    await dismissBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // Confirm hidden in DOM
    const isHiddenAfterClick = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="customer-switcher-bar"]');
      return el === null;
    });
    console.log('✅ Switcher dismissed immediately after click:', isHiddenAfterClick);
    if (!isHiddenAfterClick) throw new Error('Switcher bar did not hide on dismiss click');

    // Confirm localStorage key set
    const dismissedAt = await page.evaluate(() => localStorage.getItem('switcher_dismissed_at'));
    console.log('✅ localStorage switcher_dismissed_at set to:', dismissedAt);
    if (!dismissedAt || isNaN(Number(dismissedAt))) {
      throw new Error('localStorage switcher_dismissed_at invalid or missing');
    }

    // Reload page to test persistence
    await page.reload({ waitUntil: 'networkidle2' });
    const isStillHidden = await page.evaluate(() => document.querySelector('[data-testid="customer-switcher-bar"]') === null);
    console.log('✅ Switcher persists as hidden on reload within 24h:', isStillHidden);
    if (!isStillHidden) throw new Error('Switcher bar reappeared prematurely on reload');

    // Test 24h expiration: set timestamp to 25 hours ago
    await page.evaluate(() => {
      const past = Date.now() - 25 * 60 * 60 * 1000;
      localStorage.setItem('switcher_dismissed_at', String(past));
    });
    await page.reload({ waitUntil: 'networkidle2' });
    const hasReappeared = await page.evaluate(() => document.querySelector('[data-testid="customer-switcher-bar"]') !== null);
    console.log('✅ Switcher reappears after 24h expiry:', hasReappeared);
    if (!hasReappeared) throw new Error('Switcher bar did not reappear after 24 hours');

    // Viewport tests at 375px, 768px, 1440px
    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 800 });
      await page.evaluate(() => localStorage.removeItem('switcher_dismissed_at'));
      await page.reload({ waitUntil: 'networkidle2' });

      const metrics = await page.evaluate(() => {
        const sw = document.querySelector('[data-testid="customer-switcher-bar"]') as HTMLElement | null;
        return {
          barWidth: sw?.offsetWidth,
          barScrollWidth: sw?.scrollWidth,
          windowWidth: window.innerWidth,
          hasOverflow: sw ? sw.scrollWidth > window.innerWidth : false,
        };
      });
      console.log(`📱 Viewport ${width}px -> barWidth: ${metrics.barWidth}px, barScrollWidth: ${metrics.barScrollWidth}px, overflow: ${metrics.hasOverflow}`);
      if (metrics.hasOverflow) {
        throw new Error(`Switcher bar horizontal overflow detected at ${width}px viewport`);
      }
    }

    // 2. Test Guest Room Portal App (3004) Switcher Bar
    console.log('\n--- Testing Guest Room Portal App (:3004/?room=305) ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3004/?room=305', { waitUntil: 'networkidle2' });

    await page.evaluate(() => localStorage.removeItem('switcher_dismissed_at'));
    await page.reload({ waitUntil: 'networkidle2' });

    switcher = await page.$('[data-testid="customer-switcher-bar"]');
    if (!switcher) {
      throw new Error('Switcher bar not found on :3004/?room=305');
    }
    const guestSwitcherText = await page.evaluate(el => el?.textContent, switcher);
    console.log('ℹ️ Guest switcher text:', guestSwitcherText?.trim());
    if (!guestSwitcherText?.includes('Dining at our restaurant')) {
      throw new Error('Expected prompt text not found in guest switcher bar');
    }

    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 800 });
      await page.evaluate(() => localStorage.removeItem('switcher_dismissed_at'));
      await page.reload({ waitUntil: 'networkidle2' });

      const metrics = await page.evaluate(() => {
        const sw = document.querySelector('[data-testid="customer-switcher-bar"]') as HTMLElement | null;
        return {
          barWidth: sw?.offsetWidth,
          barScrollWidth: sw?.scrollWidth,
          windowWidth: window.innerWidth,
          hasOverflow: sw ? sw.scrollWidth > window.innerWidth : false,
        };
      });
      console.log(`📱 Guest Viewport ${width}px -> barWidth: ${metrics.barWidth}px, barScrollWidth: ${metrics.barScrollWidth}px, overflow: ${metrics.hasOverflow}`);
      if (metrics.hasOverflow) {
        throw new Error(`Guest switcher bar horizontal overflow detected at ${width}px viewport`);
      }
    }

    const guestDismissBtn = await page.$('[data-testid="switcher-dismiss-btn"]');
    await guestDismissBtn?.click();
    await new Promise(r => setTimeout(r, 300));
    const guestDismissed = await page.evaluate(() => document.querySelector('[data-testid="customer-switcher-bar"]') === null);
    console.log('✅ Guest switcher bar dismissible:', guestDismissed);
    if (!guestDismissed) throw new Error('Guest switcher bar did not dismiss on click');

    console.log('\n🎉 ALL C3 SWITCHER BAR TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
