import puppeteer from 'puppeteer';

async function run() {
  console.log('🧪 Starting Embedded Banners (c5) verification tests...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Helper to log in as admin
    const loginAsAdmin = async (targetUrl: string) => {
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      const emailInput = await page.$('[data-testid="staff-login-email"]');
      if (emailInput) {
        await emailInput.type('admin@tajgateway.com');
        const passInput = await page.$('[data-testid="staff-login-password"]');
        await passInput?.type('SpiceHub@123');
        const submit = await page.$('[data-testid="staff-login-submit"]');
        await submit?.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    };

    // 1. Test Cashier Embedded Banner on :3005/cashier
    console.log('\n--- 1. Testing Cashier Embedded Banner (:3005/cashier) ---');
    await loginAsAdmin('http://localhost:3005/cashier');
    await page.evaluate(() => localStorage.removeItem('spicehub_dismiss_cashier_embed_banner'));
    await page.reload({ waitUntil: 'networkidle2' });

    const cashierBanner = await page.$('[data-testid="cashier-embed-banner"]');
    if (!cashierBanner) {
      throw new Error('Cashier embed banner not found on :3005/cashier');
    }
    console.log('✅ Cashier embed banner is visible');

    const cashierBox = await cashierBanner.boundingBox();
    console.log(`ℹ️ Cashier banner box: ${cashierBox?.width}x${cashierBox?.height}px`);
    if (!cashierBox || cashierBox.height > 48) {
      throw new Error(`Cashier banner height (${cashierBox?.height}px) exceeds 48px maximum limit`);
    }
    console.log(`✅ Cashier banner height is ${cashierBox.height}px (<= 48px condition SATISFIED)`);

    const cashierLink = await page.$('[data-testid="cashier-standalone-link"]');
    const cashierHref = await page.evaluate(el => el?.getAttribute('href'), cashierLink);
    console.log('✅ Cashier standalone link points to:', cashierHref);
    if (!cashierHref?.includes('3007')) {
      throw new Error(`Cashier link does not point to port 3007: ${cashierHref}`);
    }

    // Test dismissal
    const cashierCloseBtn = await page.$('[data-testid="cashier-banner-close-btn"]');
    await cashierCloseBtn?.click();
    await new Promise(r => setTimeout(r, 200));

    const cashierDismissed = await page.evaluate(() => document.querySelector('[data-testid="cashier-embed-banner"]') === null);
    console.log('✅ Cashier banner dismissed upon close click:', cashierDismissed);
    if (!cashierDismissed) throw new Error('Cashier banner failed to dismiss');

    // Test persistence
    await page.reload({ waitUntil: 'networkidle2' });
    const cashierStillHidden = await page.evaluate(() => document.querySelector('[data-testid="cashier-embed-banner"]') === null);
    console.log('✅ Cashier banner remains dismissed on page reload:', cashierStillHidden);
    if (!cashierStillHidden) throw new Error('Cashier banner did not persist dismissed state');

    // 2. Test Reception Embedded Banner on :3005/reception
    console.log('\n--- 2. Testing Reception Embedded Banner (:3005/reception) ---');
    await loginAsAdmin('http://localhost:3005/reception');
    await page.evaluate(() => localStorage.removeItem('spicehub_dismiss_reception_embed_banner'));
    await page.reload({ waitUntil: 'networkidle2' });

    const receptionBanner = await page.$('[data-testid="reception-embed-banner"]');
    if (!receptionBanner) {
      throw new Error('Reception embed banner not found on :3005/reception');
    }
    console.log('✅ Reception embed banner is visible');

    const receptionBox = await receptionBanner.boundingBox();
    console.log(`ℹ️ Reception banner box: ${receptionBox?.width}x${receptionBox?.height}px`);
    if (!receptionBox || receptionBox.height > 48) {
      throw new Error(`Reception banner height (${receptionBox?.height}px) exceeds 48px maximum limit`);
    }
    console.log(`✅ Reception banner height is ${receptionBox.height}px (<= 48px condition SATISFIED)`);

    const receptionLink = await page.$('[data-testid="reception-standalone-link"]');
    const receptionHref = await page.evaluate(el => el?.getAttribute('href'), receptionLink);
    console.log('✅ Reception standalone link points to:', receptionHref);
    if (!receptionHref?.includes('3008')) {
      throw new Error(`Reception link does not point to port 3008: ${receptionHref}`);
    }

    // Test dismissal
    const receptionCloseBtn = await page.$('[data-testid="reception-banner-close-btn"]');
    await receptionCloseBtn?.click();
    await new Promise(r => setTimeout(r, 200));

    const receptionDismissed = await page.evaluate(() => document.querySelector('[data-testid="reception-embed-banner"]') === null);
    console.log('✅ Reception banner dismissed upon close click:', receptionDismissed);
    if (!receptionDismissed) throw new Error('Reception banner failed to dismiss');

    // Test persistence
    await page.reload({ waitUntil: 'networkidle2' });
    const receptionStillHidden = await page.evaluate(() => document.querySelector('[data-testid="reception-embed-banner"]') === null);
    console.log('✅ Reception banner remains dismissed on page reload:', receptionStillHidden);
    if (!receptionStillHidden) throw new Error('Reception banner did not persist dismissed state');

    // 3. Layout Safety Check: verify terminals don't overflow or break
    console.log('\n--- 3. Testing Layout Safety Across Viewports (375, 768, 1440) ---');
    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 800 });
      await page.goto('http://localhost:3005/cashier', { waitUntil: 'networkidle2' });
      const cashierLayoutSafe = await page.evaluate(() => {
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        return Boolean(header && main && main.offsetHeight > 200);
      });
      console.log(`📱 Cashier at ${width}px -> layout intact: ${cashierLayoutSafe}`);
      if (!cashierLayoutSafe) throw new Error(`Cashier layout broken at ${width}px`);
    }

    console.log('\n🎉 ALL C5 EMBEDDED BANNER TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ C5 Test failed:', err);
  process.exit(1);
});
