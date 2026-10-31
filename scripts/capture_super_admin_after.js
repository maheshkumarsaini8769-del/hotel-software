const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_local_dev_jwt_secret_do_not_use_in_production';

const superAdminToken = jwt.sign(
  { userId: '6adcb811d58c1637ff16b355', role: 'SUPERADMIN', email: 'superadmin@spicehub.com', permissions: ['ALL'] },
  JWT_SECRET,
  { expiresIn: '4h' }
);

const outputFile = path.join(__dirname, '../artifacts/redesign/02_super_admin_after.png');

async function capture() {
  console.log('Capturing 02_super_admin_after.png at 1440x900...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_superadmin_theme', 'light');
      localStorage.setItem('spicehub_auth_user', JSON.stringify({
        id: '6adcb811d58c1637ff16b355',
        name: 'SpiceHub Super Admin',
        email: 'superadmin@spicehub.com',
        role: 'SUPERADMIN'
      }));
      document.documentElement.classList.remove('dark');
    }, superAdminToken);

    await page.goto('http://localhost:3006', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

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
