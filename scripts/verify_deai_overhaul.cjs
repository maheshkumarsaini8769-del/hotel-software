const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const DEV_SECRET = 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

async function verifyDeAiOverhaul() {
  const token = jwt.sign(
    {
      userId: '6af54b0821eda67921e4288a',
      email: 'maheshsaini10101@gmail.com',
      role: 'HOTEL_ADMIN',
      hotelId: '6af54b0821eda67921e42888',
      hotelSlug: 'shree-shyam',
    },
    DEV_SECRET,
    { expiresIn: '2h' }
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.on('dialog', async d => await d.dismiss());

  await page.goto('http://localhost:3005/login');
  await page.evaluate(({ token }) => {
    localStorage.setItem('spicehub_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('spicehub_user', JSON.stringify({
      id: '6af54b0821eda67921e4288a',
      email: 'maheshsaini10101@gmail.com',
      name: 'Mahesh Admin',
      role: 'HOTEL_ADMIN',
      hotelId: '6af54b0821eda67921e42888',
      hotelSlug: 'shree-shyam',
    }));
    localStorage.setItem('hotelId', '6af54b0821eda67921e42888');
    localStorage.setItem('spicehub_hotel_id', '6af54b0821eda67921e42888');
    localStorage.setItem('spicehub_active_hotel_id', '6af54b0821eda67921e42888');
  }, { token });

  await page.goto('http://localhost:3005');
  await page.waitForTimeout(2000);

  const outDir = path.join('/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315', 'deai_verification');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Dashboard
  console.log('1. Capturing Dashboard...');
  await page.screenshot({ path: path.join(outDir, '01_dashboard_clean.png'), fullPage: false });

  const targets = [
    { name: 'Front Desk & PMS', file: '02_front_desk_luxury_photos.png' },
    { name: 'Dining Tables', file: '03_dining_tables_clean.png' },
    { name: 'Live Orders & KDS', file: '04_live_orders_kds_console.png' },
    { name: 'Revenue Manager', file: '05_revenue_manager_clean.png' },
    { name: 'Night Audit & Close', file: '06_night_audit_professional.png' },
    { name: 'Reports & Revenue', file: '07_reports_revenue_clean.png' },
  ];

  for (const t of targets) {
    console.log(`Navigating to ${t.name}...`);
    const btn = page.locator(`button:has-text("${t.name}")`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, t.file), fullPage: false });
      console.log(`Captured ${t.file}`);
    } else {
      console.log(`Button for ${t.name} not found!`);
    }
  }

  console.log('All verification screenshots captured successfully!');
  await browser.close();
}

verifyDeAiOverhaul().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
