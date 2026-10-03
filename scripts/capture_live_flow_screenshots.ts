import puppeteer from 'puppeteer';

async function captureActiveScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const waiterPage = await browser.newPage();
  await waiterPage.setViewport({ width: 412, height: 915 });
  await waiterPage.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });

  const kdsPage = await browser.newPage();
  await kdsPage.setViewport({ width: 1280, height: 800 });
  await kdsPage.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });

  const customerPage = await browser.newPage();
  await customerPage.setViewport({ width: 390, height: 844 });
  await customerPage.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });

  await new Promise((r) => setTimeout(r, 1500));

  // 1. Customer calls waiter
  await customerPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const callBtn = buttons.find((b) => b.innerText.includes('Call Waiter'));
    if (callBtn) callBtn.click();
  });

  // 2. Customer adds dishes & submits order
  await customerPage.evaluate(() => {
    const addButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('ADD'));
    if (addButtons.length >= 2) {
      addButtons[0].click();
      addButtons[1].click();
    }
  });

  await new Promise((r) => setTimeout(r, 1000));

  await customerPage.evaluate(() => {
    const bar = document.querySelector('[data-testid="floating-cart-bar"]') as HTMLElement;
    if (bar) bar.click();
  });

  await new Promise((r) => setTimeout(r, 1000));

  await customerPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="confirm-order-button"]') as HTMLButtonElement;
    if (btn) btn.click();
  });

  // Wait 1.5s for real-time propagation across tabs
  await new Promise((r) => setTimeout(r, 1500));

  // Screenshot all 3 screens during ACTIVE state!
  await customerPage.screenshot({
    path: '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227/customer_active_order.png',
  });
  await waiterPage.screenshot({
    path: '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227/waiter_active_alert.png',
  });
  await kdsPage.screenshot({
    path: '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227/kds_active_ticket.png',
  });

  console.log('✅ Active state screenshots captured successfully!');
  await browser.close();
}

captureActiveScreenshots();
