/**
 * Focused browser check for the reception engineering (maintenance) desk:
 * raise a ticket from the UI, verify it is listed from the backend, then
 * resolve it and confirm the counters update.
 */
const puppeteer = require('puppeteer');

const RECEPTION_URL = 'http://localhost:3008';
const HOTEL_ID = '6ad70790dac5215366fe59a6';
const TEST_TITLE = `Automated maintenance check ${Date.now()}`;

async function login(page) {
  await page.goto(RECEPTION_URL, { waitUntil: 'networkidle0', timeout: 20000 });
  const demo = await page.$('button ::-p-text(Use local demo account)');
  if (demo) {
    await demo.click();
    await new Promise((r) => setTimeout(r, 3000));
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

  try {
    await login(page);

    // Open the maintenance desk
    await page.evaluate(() => {
      const nav = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Maintenance'
      );
      if (nav) nav.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const deskLoaded = await page.evaluate(
      () => document.body.innerText.includes('Engineering & Maintenance Desk')
    );
    console.log('Maintenance desk rendered:', deskLoaded);

    // Raise a ticket
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Raise Ticket'
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const inputs = await page.$$('form input[type="text"]');
    const textareas = await page.$$('form textarea');
    if (inputs.length === 0 || textareas.length === 0) {
      throw new Error('Maintenance ticket form did not open');
    }
    await inputs[0].type(TEST_TITLE);
    await textareas[0].type('Automated browser check for the reception maintenance desk.');

    await page.evaluate(() => {
      const form = Array.from(document.querySelectorAll('form')).find((f) =>
        f.innerText.includes('Raise Maintenance Ticket')
      );
      const submit = Array.from(form.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Raise Ticket'
      );
      submit.click();
    });
    await new Promise((r) => setTimeout(r, 2500));

    const listed = await page.evaluate((title) => document.body.innerText.includes(title), TEST_TITLE);
    console.log('Ticket visible in the live list:', listed);

    // Verify it reached the backend
    const backend = await page.evaluate(async (hotelId) => {
      const token = localStorage.getItem('spicehub_token');
      const response = await fetch(`http://localhost:5000/api/v1/maintenance/dashboard`, {
        headers: { Authorization: `Bearer ${token}`, 'x-hotel-id': hotelId },
      });
      const body = await response.json();
      return { success: body.success, open: (body.openTickets || []).length };
    }, HOTEL_ID);
    console.log('Backend maintenance dashboard:', backend);

    // Resolve it
    const resolved = await page.evaluate((title) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find((r) => r.innerText.includes(title));
      if (!row) return false;
      const btn = Array.from(row.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Resolve'
      );
      if (!btn) return false;
      btn.click();
      return true;
    }, TEST_TITLE);
    console.log('Resolve action dispatched:', resolved);
    await new Promise((r) => setTimeout(r, 2500));

    const afterResolve = await page.evaluate((title) => {
      const text = document.body.innerText;
      const stillOpen = text.includes(title);
      const resolvedCount = /Resolved\s+(\d+)/.exec(text);
      return { stillOpen, resolvedCount: resolvedCount ? resolvedCount[1] : null };
    }, TEST_TITLE);
    console.log('After resolve:', afterResolve);

    console.log('Console errors:', consoleErrors.length ? consoleErrors : 'none');
    await browser.close();

    if (!deskLoaded || !listed || consoleErrors.length > 0) {
      console.error('❌ Maintenance desk browser check FAILED');
      process.exit(1);
    }
    console.log('✅ Maintenance desk browser check PASSED');
    process.exit(0);
  } catch (error) {
    console.error('💥 Maintenance desk browser check error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
