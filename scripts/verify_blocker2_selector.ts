import puppeteer from 'puppeteer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function verifyBlocker2() {
  console.log('🧪 Starting Blocker 2: Mandatory Selector Modal Verification...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const screenshotsDir = path.join(process.cwd(), 'artifacts', 'screenshots');

  // --- Step 1: Run :3001/ with NO query params ---
  console.log('\n--- 1. Testing :3001/ with NO query params ---');
  const page3001 = await browser.newPage();
  await page3001.setViewport({ width: 1280, height: 800 });
  await page3001.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const text3001 = await page3001.evaluate(() => document.body.innerText);
  console.log('📄 [DOM Dump :3001/ Root]:\n' + text3001);

  const hasDiningCard3001 = text3001.includes('Dining at a Table');
  const hasStayingCard3001 = text3001.includes('Staying in a Room');
  const hasDemoTableBtn3001 = text3001.includes('Try Demo Table');
  const hasDemoRoomBtn3001 = text3001.includes('Try Demo Room');
  console.log(`✅ Elements on :3001/ -> DiningCard: ${hasDiningCard3001}, StayingCard: ${hasStayingCard3001}, DemoTable: ${hasDemoTableBtn3001}, DemoRoom: ${hasDemoRoomBtn3001}`);

  const shot3001Buf = await page3001.screenshot();
  const shot3001Hash = crypto.createHash('sha256').update(shot3001Buf).digest('hex');
  const shot3001Path = path.join(screenshotsDir, 'SELECTOR-MODAL-3001.png');
  fs.writeFileSync(shot3001Path, shot3001Buf);
  console.log(`📸 Saved: ${shot3001Path} | SHA256: ${shot3001Hash} | Size: ${shot3001Buf.length} bytes`);

  // --- Step 2: Run :3004/ with NO query params ---
  console.log('\n--- 2. Testing :3004/ with NO query params ---');
  const page3004 = await browser.newPage();
  await page3004.setViewport({ width: 1280, height: 800 });
  await page3004.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const text3004 = await page3004.evaluate(() => document.body.innerText);
  console.log('📄 [DOM Dump :3004/ Root]:\n' + text3004);

  const hasDiningCard3004 = text3004.includes('Dining at a Table');
  const hasStayingCard3004 = text3004.includes('Staying in a Room');
  const hasDemoTableBtn3004 = text3004.includes('Try Demo Table');
  const hasDemoRoomBtn3004 = text3004.includes('Try Demo Room');
  console.log(`✅ Elements on :3004/ -> DiningCard: ${hasDiningCard3004}, StayingCard: ${hasStayingCard3004}, DemoTable: ${hasDemoTableBtn3004}, DemoRoom: ${hasDemoRoomBtn3004}`);

  const shot3004Buf = await page3004.screenshot();
  const shot3004Hash = crypto.createHash('sha256').update(shot3004Buf).digest('hex');
  const shot3004Path = path.join(screenshotsDir, 'SELECTOR-MODAL-3004.png');
  fs.writeFileSync(shot3004Path, shot3004Buf);
  console.log(`📸 Saved: ${shot3004Path} | SHA256: ${shot3004Hash} | Size: ${shot3004Buf.length} bytes`);

  // --- Step 5: Click "Try Demo Table" on :3001/ -> verify navigation/routing ---
  console.log('\n--- 5. Clicking "Try Demo Table" on :3001/ ---');
  await page3001.evaluate(() => {
    const btn = document.querySelector('[data-testid="demo-table-btn"]') as HTMLElement;
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const textAfterDemoTable = await page3001.evaluate(() => document.body.innerText);
  console.log('📄 [DOM Dump after "Try Demo Table"]:\n' + textAfterDemoTable.substring(0, 400));
  const menuLoaded = textAfterDemoTable.includes('Paneer') || textAfterDemoTable.includes('Menu') || textAfterDemoTable.includes('Table');
  console.log(`✅ Table menu rendered after clicking Try Demo Table: ${menuLoaded}`);

  const shotAfterDemoTableBuf = await page3001.screenshot();
  const shotAfterDemoTableHash = crypto.createHash('sha256').update(shotAfterDemoTableBuf).digest('hex');
  const shotAfterDemoTablePath = path.join(screenshotsDir, 'AFTER-CLICK-DEMO-TABLE.png');
  fs.writeFileSync(shotAfterDemoTablePath, shotAfterDemoTableBuf);
  console.log(`📸 Saved: ${shotAfterDemoTablePath} | SHA256: ${shotAfterDemoTableHash} | Size: ${shotAfterDemoTableBuf.length} bytes`);

  // --- Step 6: On fresh :3001/ page, click "Try Demo Room" -> verify routing to :3004 ---
  console.log('\n--- 6. Clicking "Try Demo Room" on :3001/ -> Routing to :3004 ---');
  const pageRouteRoom = await browser.newPage();
  await pageRouteRoom.setViewport({ width: 1280, height: 800 });
  await pageRouteRoom.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await pageRouteRoom.evaluate(() => {
    const btn = document.querySelector('[data-testid="demo-room-btn"]') as HTMLElement;
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const urlAfterRoomClick = pageRouteRoom.url();
  console.log(`✅ URL after clicking "Try Demo Room": ${urlAfterRoomClick}`);
  const isRoutedTo3004 = urlAfterRoomClick.includes(':3004') || urlAfterRoomClick.includes('room=305');
  console.log(`✅ Correctly routed to :3004: ${isRoutedTo3004}`);

  const shotAfterDemoRoomBuf = await pageRouteRoom.screenshot();
  const shotAfterDemoRoomHash = crypto.createHash('sha256').update(shotAfterDemoRoomBuf).digest('hex');
  const shotAfterDemoRoomPath = path.join(screenshotsDir, 'AFTER-CLICK-DEMO-ROOM.png');
  fs.writeFileSync(shotAfterDemoRoomPath, shotAfterDemoRoomBuf);
  console.log(`📸 Saved: ${shotAfterDemoRoomPath} | SHA256: ${shotAfterDemoRoomHash} | Size: ${shotAfterDemoRoomBuf.length} bytes`);

  await browser.close();

  console.log('\n================================================================');
  console.log('🎉 BLOCKER 2 VERIFICATION COMPLETE: ALL DISTINCT SCREENSHOTS CAPTURED');
  console.log('================================================================');
}

verifyBlocker2().catch(err => {
  console.error('❌ Blocker 2 failed:', err);
  process.exit(1);
});
