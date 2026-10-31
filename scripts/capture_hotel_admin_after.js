const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_local_dev_jwt_secret_do_not_use_in_production';
const HOTEL_ID = '6ae06d00ddbafddfbb0a8013';

const hotelAdminToken = jwt.sign(
  { userId: '6ae06d00ddbafddfbb0a8015', hotelId: HOTEL_ID, role: 'HOTEL_ADMIN', email: 'mahesh@hotel.com', permissions: ['ALL'] },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const outputFile = path.join(__dirname, '../artifacts/redesign/01_hotel_admin_after.png');

async function capture() {
  console.log('Capturing 01_hotel_admin_after.png at 1440x900...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((token, hotelId) => {
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_hotel_id', hotelId);
      localStorage.setItem('hotelId', hotelId);
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6ae06d00ddbafddfbb0a8015',
        name: 'Mahesh Saini',
        role: 'HOTEL_ADMIN',
        hotelId: hotelId
      }));
      document.documentElement.classList.remove('dark');
    }, hotelAdminToken, HOTEL_ID);

    await page.goto('http://localhost:3005', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    // Force remove any leftover dark class just in case
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    await page.screenshot({ path: outputFile, fullPage: false });
    console.log('✅ Screenshot captured successfully:', outputFile);
  } catch (err) {
    console.error('❌ Error capturing screenshot:', err);
  } finally {
    await browser.close();
  }
}

capture();
