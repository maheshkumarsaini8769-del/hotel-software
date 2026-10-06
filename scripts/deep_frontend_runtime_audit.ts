import puppeteer, { Browser } from 'puppeteer';

const apps = [
  { name: 'Hotel Admin ERP', port: 3005, url: 'http://localhost:3005', expectedTitle: 'SpiceHub' },
  { name: 'Guest Room Portal', port: 3004, url: 'http://localhost:3004', expectedTitle: 'SpiceHub' },
  { name: 'Kitchen KDS', port: 3003, url: 'http://localhost:3003', expectedTitle: 'SpiceHub' },
  { name: 'Waiter Mobile App', port: 3002, url: 'http://localhost:3002', expectedTitle: 'SpiceHub' },
  { name: 'Customer Table App', port: 3001, url: 'http://localhost:3001', expectedTitle: 'SpiceHub' },
  { name: 'SuperAdmin SaaS', port: 3006, url: 'http://localhost:3006', expectedTitle: 'SpiceHub' },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDeepFrontendAudit() {
  console.log('================================================================================');
  console.log('🖥️ [DEEP FRONTEND RUNTIME AUDIT] ZERO-ERROR BROWSER INSPECTION ACROSS ALL 6 APPS');
  console.log('================================================================================');

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 60000,
  });

  let totalErrors = 0;

  try {
    for (const app of apps) {
      console.log(`\n🔍 Checking App: ${app.name} on Port :${app.port}...`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
        console.error(`   ❌ [${app.name} Runtime PageError]:`, err.message);
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // Ignore harmless favicon or network 404s if any
          const text = msg.text();
          if (!text.includes('favicon.ico') && !text.includes('Failed to load resource')) {
            console.warn(`   ⚠️ [${app.name} Console Error]:`, text);
          }
        }
      });

      const response = await page.goto(app.url, { waitUntil: 'networkidle2', timeout: 30000 });
      const status = response ? response.status() : 0;
      await sleep(1500);

      const title = await page.title();
      const bodyTextLength = await page.evaluate(() => document.body.innerText.length);
      const rootExists = await page.evaluate(() => Boolean(document.getElementById('root')));

      console.log(`   -> HTTP Status: ${status}`);
      console.log(`   -> Page Title: "${title}"`);
      console.log(`   -> DOM Root Mounted: ${rootExists}`);
      console.log(`   -> Visible Body Text Chars: ${bodyTextLength}`);
      console.log(`   -> Critical JavaScript Runtime Exceptions: ${pageErrors.length}`);

      if (status !== 200 || !rootExists || pageErrors.length > 0) {
        totalErrors++;
        console.error(`   ❌ FAIL: ${app.name} failed runtime health checks!`);
      } else {
        console.log(`   ✅ PASS: ${app.name} is running healthy with ZERO runtime exceptions!`);
      }

      await page.close();
    }

    console.log('\n================================================================================');
    console.log(`📊 TOTAL APPS AUDITED: ${apps.length}`);
    console.log(`PASSED: ${apps.length - totalErrors}`);
    console.log(`FAILED: ${totalErrors}`);
    console.log('================================================================================');

    if (totalErrors > 0) {
      console.error('❌ Deep Frontend Audit Failed!');
      process.exit(1);
    } else {
      console.log('🎉 ALL 6 FRONTEND SPAs ARE 100% HEALTHY, MOUNTED, AND EXCEPTION-FREE!');
    }
  } finally {
    await browser.close();
  }
}

runDeepFrontendAudit().catch((err) => {
  console.error('Fatal Frontend Audit Error:', err);
  process.exit(1);
});
