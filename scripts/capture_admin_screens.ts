import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = path.resolve(__dirname, '../../.gemini/antigravity/brain/f76158f2-1c0c-4320-9850-060c577b3195');

const SIDEBAR_ITEMS = [
  { key: 'DASHBOARD', label: 'Dashboard' },
  { key: 'ROOM_MANAGEMENT', label: 'Front Desk & PMS' },
  { key: 'STAFF_MANAGEMENT', label: 'Staff & Terminals' },
  { key: 'TABLE_MANAGEMENT', label: 'Dining Tables' },
  { key: 'POS_CASHIER', label: 'POS & Fast Billing' },
  { key: 'ORDERS_KITCHEN', label: 'Live Orders & KDS' },
  { key: 'MENU_CATALOG', label: 'Menu & Stock 86' },
  { key: 'INVENTORY_STOCK', label: 'Inventory & Stock' },
  { key: 'PURCHASES_SUPPLIERS', label: 'Purchases & Suppliers' },
  { key: 'HOUSEKEEPING', label: 'Housekeeping' },
  { key: 'DINING_RESERVATIONS', label: 'Dining Reservations' },
  { key: 'BANQUET', label: 'Banquet & Events' },
  { key: 'CORPORATE', label: 'Corporate Accounts' },
  { key: 'REVENUE_MANAGER', label: 'Revenue Manager' },
  { key: 'EXPENSES_ACCOUNTING', label: 'Night Audit & Close' },
  { key: 'MAINTENANCE', label: 'Lost & Found Vault' },
  { key: 'POLICIES_AND_USECASES', label: 'Policies & 15 SOPs' },
  { key: 'REPORTS_ANALYTICS', label: 'Reports & Revenue' },
  { key: 'SETTINGS_CONFIGURATION', label: 'Operations & Settings' },
];

async function main() {
  const res = await fetch('http://127.0.0.1:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'maheshkumarsaini8769@gmail.com',
      password: 'SpiceHub@123',
      slug: 'mahesh-hotel-4119'
    })
  });
  const data = await res.json();
  const token = data.data.token;
  const hotelId = data.data.tenant.id;
  const user = data.data.user;

  console.log('Login OK for:', user.name);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  await page.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, hotelId, user }) => {
    localStorage.setItem('spicehub_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('spicehub_hotel_id', hotelId);
    localStorage.setItem('hotelId', hotelId);
    localStorage.setItem('spicehub_auth_user', JSON.stringify(user));
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, hotelId, user });

  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  for (let i = 0; i < SIDEBAR_ITEMS.length; i++) {
    const item = SIDEBAR_ITEMS[i];
    await page.evaluate((targetLabel) => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const btn = allButtons.find(b => (b as HTMLElement).innerText && (b as HTMLElement).innerText.includes(targetLabel));
      if (btn) (btn as HTMLElement).click();
    }, item.label);

    await new Promise(r => setTimeout(r, 1500));
    const clean = item.key.toLowerCase();
    const filename = `tab_${String(i).padStart(2, '0')}_${clean}.png`;
    const dest = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`📸 ${filename} captured for [${item.label}]`);
  }

  await browser.close();
  console.log('Done capturing all tabs!');
}

main().catch(console.error);
