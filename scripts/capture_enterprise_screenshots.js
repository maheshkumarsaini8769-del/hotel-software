const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

async function main() {
  const artifactsDir = path.resolve(__dirname, '../artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const token = jwt.sign(
    {
      userId: '6ae06d00ddbafddfbb0a8015',
      hotelId: '6ae06d00ddbafddfbb0a8013',
      role: 'HOTEL_ADMIN',
      email: 'mahesh@hotel.com',
    },
    'spicehub_local_dev_jwt_secret_do_not_use_in_production',
    { expiresIn: '30d' }
  );

  const browser = await puppeteer.launch({
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  // =========================================================================
  // Screenshot 1: Hotel Admin ERP - Reports (GSTR-1 & RevPAR/ADR Chart)
  // =========================================================================
  console.log('[Puppeteer] Navigating to Hotel Admin ERP at http://localhost:3005...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });

  await page.evaluate((jwtToken) => {
    localStorage.setItem('spicehub_token', jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('spicehub_hotel_id', '6ae06d00ddbafddfbb0a8013');
    localStorage.setItem('hotelId', '6ae06d00ddbafddfbb0a8013');
    localStorage.setItem('spicehub_erp_theme', 'light');
    localStorage.setItem(
      'spicehub_auth_user',
      JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8015',
        name: 'Mahesh Saini',
        role: 'HOTEL_ADMIN',
        email: 'mahesh@hotel.com',
        hotelId: '6ae06d00ddbafddfbb0a8013',
      })
    );
  }, token);

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Click on "Reports & Revenue" in sidebar
  const clickedReports = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, a')).find(
      (b) => b.textContent && b.textContent.includes('Reports & Revenue')
    );
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log(`[Puppeteer] Clicked Reports & Revenue: ${clickedReports}`);

  await page.waitForSelector('[data-testid="card-gstr1-export"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  const reportsPath = path.join(artifactsDir, 'admin_erp_reports_gstr1_revpar.png');
  await page.screenshot({ path: reportsPath, fullPage: false });
  console.log(`[Puppeteer] Saved Screenshot 1: ${reportsPath}`);

  // =========================================================================
  // Screenshot 2: Hotel Admin ERP - Settings (Integrations Tab)
  // =========================================================================
  console.log('[Puppeteer] Navigating to Operations & Settings...');
  const clickedSettings = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, a')).find(
      (b) => b.textContent && b.textContent.includes('Operations & Settings')
    );
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log(`[Puppeteer] Clicked Operations & Settings: ${clickedSettings}`);
  await new Promise((r) => setTimeout(r, 1500));

  // Click on "Integrations" tab inside RestaurantOperationsHub
  const clickedIntegrationsTab = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find((b) => b.textContent && b.textContent.trim() === 'Integrations');
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log(`[Puppeteer] Clicked Integrations Tab: ${clickedIntegrationsTab}`);

  await page.waitForSelector('[data-testid="tab-content-integrations"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  const integrationsPath = path.join(artifactsDir, 'admin_erp_settings_integrations.png');
  await page.screenshot({ path: integrationsPath, fullPage: false });
  console.log(`[Puppeteer] Saved Screenshot 2: ${integrationsPath}`);

  // =========================================================================
  // Screenshot 3: Reception Frontdesk App - DPDP Consent Checkbox
  // =========================================================================
  console.log('[Puppeteer] Navigating to Reception Frontdesk App at http://localhost:3008...');
  await page.goto('http://localhost:3008', { waitUntil: 'networkidle2' });

  await page.evaluate((jwtToken) => {
    localStorage.setItem('spicehub_token', jwtToken);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('spicehub_hotel_id', '6ae06d00ddbafddfbb0a8013');
    localStorage.setItem('hotelId', '6ae06d00ddbafddfbb0a8013');
  }, token);

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Click on "Walk-in Check-in" in Reception sidebar
  const clickedWalkIn = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, a')).find(
      (b) => b.textContent && b.textContent.includes('Walk-in Check-in')
    );
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log(`[Puppeteer] Clicked Walk-in Check-in: ${clickedWalkIn}`);

  await page.waitForSelector('[data-testid="checkbox-dpdp-consent"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  const receptionPath = path.join(artifactsDir, 'reception_dpdp_consent_checkbox.png');
  await page.screenshot({ path: receptionPath, fullPage: false });
  console.log(`[Puppeteer] Saved Screenshot 3: ${receptionPath}`);

  await browser.close();
  console.log('\n[Puppeteer] ALL THREE HIGH-RESOLUTION SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('[Puppeteer Error]', err);
  process.exit(1);
});
