const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../artifacts/responsive-screenshots');

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    {
      name: 'cashier_pos_desktop_1280x800.png',
      url: 'http://localhost:3007',
      viewport: { width: 1280, height: 800 },
      description: 'Cashier POS Desktop: Left 2/3 Menu Grid & Right 1/3 Sticky Cart with POS Numpad'
    },
    {
      name: 'cashier_pos_mobile_390x844.png',
      url: 'http://localhost:3007',
      viewport: { width: 390, height: 844 },
      description: 'Cashier POS Mobile: Stacked Touchscreen Layout'
    },
    {
      name: 'kds_desktop_1280x800.png',
      url: 'http://localhost:3003',
      viewport: { width: 1280, height: 800 },
      description: 'Kitchen KDS Desktop: 3 Wide Kanban Columns Side-by-Side with Spacious Tickets'
    },
    {
      name: 'kds_mobile_390x844.png',
      url: 'http://localhost:3003',
      viewport: { width: 390, height: 844 },
      description: 'Kitchen KDS Mobile: Stage Tab Switcher & Vertical Ticket Stream'
    },
    {
      name: 'customer_app_desktop_1280x800.png',
      url: 'http://localhost:3001/?hotelId=mahesh-hotel-4119&table=T-01',
      viewport: { width: 1280, height: 800 },
      description: 'Customer Table App Desktop: Centered Phone Frame Simulator with Margins & Docked Controls'
    },
    {
      name: 'customer_app_mobile_390x844.png',
      url: 'http://localhost:3001/?hotelId=mahesh-hotel-4119&table=T-01',
      viewport: { width: 390, height: 844 },
      description: 'Customer Table App Mobile: Native Full-Width Phone Layout'
    },
    {
      name: 'guest_portal_desktop_1280x800.png',
      url: 'http://localhost:3004/?hotelId=mahesh-hotel-4119&room=101',
      viewport: { width: 1280, height: 800 },
      description: 'Guest Room Portal Desktop: Centered Phone Frame Simulator'
    }
  ];

  console.log(`🚀 Capturing ${targets.length} responsive screenshots into ${OUT_DIR}...`);

  for (const t of targets) {
    const page = await browser.newPage({
      viewport: t.viewport,
      deviceScaleFactor: 2
    });

    try {
      console.log(`\n📸 Loading ${t.url} (${t.viewport.width}x${t.viewport.height})...`);
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
        // Fallback if networkidle takes long
        await page.waitForLoadState('domcontentloaded');
      });

      // Wait 1.5s for fonts and animations to settle
      await page.waitForTimeout(1500);

      const filePath = path.join(OUT_DIR, t.name);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`✅ Saved: ${filePath} (${t.description})`);
    } catch (err) {
      console.error(`❌ Error capturing ${t.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n🎉 All responsive verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
