const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '../artifacts/redesign');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function captureMobile(url, filename, setupFn) {
  console.log(`Capturing mobile screenshot for ${filename}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    if (setupFn) {
      await page.evaluateOnNewDocument(setupFn);
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const outPath = path.join(outputDir, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✅ Saved ${outPath}`);
  } catch (err) {
    console.error(`❌ Failed capturing ${filename}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  // Capture Customer Table Portal (:3001)
  await captureMobile('http://localhost:3001/?hotelId=6ae06d00ddbafddfbb0a8013&table=1', '03_customer_mobile_after.png', () => {
    localStorage.setItem('spicehub_customer_theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  // Capture Waiter Mobile App (:3002)
  await captureMobile('http://localhost:3002', '04_waiter_mobile_after.png', () => {
    localStorage.setItem('spicehub_waiter_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
}

run();
