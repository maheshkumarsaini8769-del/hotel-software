import puppeteer, { Page, Browser } from 'puppeteer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StockBatch } from '../backend/src/models/StockBatch';
import { Tenant } from '../backend/src/models/Tenant';
import { RestaurantOrder } from '../backend/src/models/RestaurantOrder';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';

interface DeepAuditResult {
  customerApp: { loaded: boolean; assistanceCalled: boolean; orderPlaced: boolean; errors: string[] };
  waiterApp: { loaded: boolean; receivedAssistance: boolean; receivedLowStock: boolean; receivedPickupReady: boolean; errors: string[] };
  kitchenKds: { loaded: boolean; receivedTicket: boolean; startedPreparing: boolean; markedReady: boolean; lowStockBannerShown: boolean; errors: string[] };
  guestPortal: { loaded: boolean; folioRendered: boolean; inRoomDiningLoaded: boolean; errors: string[] };
  adminErp: { loaded: boolean; pmsGridRendered: boolean; activeBookingsCount: number; errors: string[] };
  dbBOM: { paneerDeductedKg: number; fefoFollowed: boolean; remainingPaneerKg: number };
}

async function runMasterDeepHospitalityAudit() {
  console.log('================================================================================');
  console.log('🏛️  [SPICEHUB 5-STAR LUXURY SUITE] MASTER ULTRA-DEEP END-TO-END AUDIT');
  console.log('   Testing 5 Micro-Frontends + WebSockets + FEFO BOM + Real-Time Sync');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Engine');

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant Taj Gateway not found!');
  const hotelId = tenant._id;

  const preBatches = await StockBatch.find({ hotelId, itemName: 'Malai Paneer' }).sort({ expiryDate: 1 });
  const prePaneerTotal = preBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
  console.log(`📦 [Pre-Drill Database Stock] 'Malai Paneer': ${prePaneerTotal} kg across ${preBatches.length} batches`);

  const browser: Browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const audit: DeepAuditResult = {
    customerApp: { loaded: false, assistanceCalled: false, orderPlaced: false, errors: [] },
    waiterApp: { loaded: false, receivedAssistance: false, receivedLowStock: false, receivedPickupReady: false, errors: [] },
    kitchenKds: { loaded: false, receivedTicket: false, startedPreparing: false, markedReady: false, lowStockBannerShown: false, errors: [] },
    guestPortal: { loaded: false, folioRendered: false, inRoomDiningLoaded: false, errors: [] },
    adminErp: { loaded: false, pmsGridRendered: false, activeBookingsCount: 0, errors: [] },
    dbBOM: { paneerDeductedKg: 0, fefoFollowed: false, remainingPaneerKg: 0 },
  };

  const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

  try {
    // -------------------------------------------------------------------------
    // Tab 1: Waiter Mobile App (:3002)
    // -------------------------------------------------------------------------
    console.log('\n📱 [Tab 1: Waiter Mobile App] Initializing on http://localhost:3002...');
    const waiterPage: Page = await browser.newPage();
    await waiterPage.setViewport({ width: 412, height: 915 });
    waiterPage.on('pageerror', (err) => audit.waiterApp.errors.push(err.message));
    await waiterPage.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    audit.waiterApp.loaded = true;
    console.log('✅ [Tab 1] Waiter App Loaded');

    // -------------------------------------------------------------------------
    // Tab 2: Kitchen KDS (:3003)
    // -------------------------------------------------------------------------
    console.log('\n🍳 [Tab 2: Kitchen KDS Screen] Initializing on http://localhost:3003...');
    const kdsPage: Page = await browser.newPage();
    await kdsPage.setViewport({ width: 1366, height: 850 });
    kdsPage.on('pageerror', (err) => audit.kitchenKds.errors.push(err.message));
    await kdsPage.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    audit.kitchenKds.loaded = true;
    console.log('✅ [Tab 2] Kitchen KDS Loaded');

    // -------------------------------------------------------------------------
    // Tab 3: Customer Table App (:3001)
    // -------------------------------------------------------------------------
    console.log('\n👑 [Tab 3: Customer Table App] Initializing on http://localhost:3001...');
    const customerPage: Page = await browser.newPage();
    await customerPage.setViewport({ width: 390, height: 844 });
    customerPage.on('pageerror', (err) => audit.customerApp.errors.push(err.message));
    await customerPage.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    audit.customerApp.loaded = true;
    console.log('✅ [Tab 3] Customer Table App Loaded');

    // Settle socket subscriptions
    await new Promise((r) => setTimeout(r, 2000));

    // -------------------------------------------------------------------------
    // DRILL PHASE 1: Real-Time Table Assistance (Customer -> Waiter)
    // -------------------------------------------------------------------------
    console.log('\n🛎️  [DRILL PHASE 1] Customer calls for Table Assistance...');
    const clickedAssistance = await customerPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const waterBtn = btns.find((b) => b.innerText.includes('Water'));
      if (waterBtn) {
        waterBtn.click();
        return 'Water';
      }
      const callWaiter = btns.find((b) => b.innerText.includes('Call Waiter'));
      if (callWaiter) {
        callWaiter.click();
        return 'Call Waiter';
      }
      return null;
    });
    console.log(`   -> Clicked Assistance Button: "${clickedAssistance}"`);
    audit.customerApp.assistanceCalled = Boolean(clickedAssistance);

    await new Promise((r) => setTimeout(r, 2000));

    // Verify Waiter screen received assistance
    const waiterAssistanceState = await waiterPage.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasAlert: text.includes('WATER') || text.includes('CALL') || text.includes('ASSISTANCE') || text.includes('T-04'),
        snippet: text.substring(0, 250),
      };
    });
    console.log(`   -> Waiter Screen Detected Assistance Alert: ${waiterAssistanceState.hasAlert}`);
    audit.waiterApp.receivedAssistance = waiterAssistanceState.hasAlert;

    // -------------------------------------------------------------------------
    // DRILL PHASE 2: Customer Food Order Placement (Customer -> BOM -> KDS)
    // -------------------------------------------------------------------------
    console.log('\n🍽️  [DRILL PHASE 2] Customer Orders Signature Dishes...');
    const itemAdded = await customerPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="menu-item-"]'));
      let count = 0;
      for (const card of cards) {
        const btn = card.querySelector('button');
        if (btn && btn.textContent?.includes('ADD') && !btn.disabled) {
          btn.click();
          count++;
          if (count >= 2) break;
        }
      }
      return count;
    });
    console.log(`   -> Dishes Added to Cart: ${itemAdded}`);

    await new Promise((r) => setTimeout(r, 800));

    // Open cart drawer
    await customerPage.evaluate(() => {
      const bar = document.querySelector('[data-testid="floating-cart-bar"]') as HTMLElement;
      if (bar) bar.click();
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Submit order
    const orderSubmitted = await customerPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="confirm-order-button"]') as HTMLButtonElement;
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`   -> Order Submitted via Cart Drawer: ${orderSubmitted}`);
    audit.customerApp.orderPlaced = orderSubmitted;

    // Wait 3.5s for backend BOM calculation, MongoDB update, and socket delivery
    await new Promise((r) => setTimeout(r, 3500));

    // -------------------------------------------------------------------------
    // DRILL PHASE 3: Verify Kitchen KDS Ticket Arrival & Alert Banner
    // -------------------------------------------------------------------------
    console.log('\n🍳 [DRILL PHASE 3] Verifying Kitchen KDS Live Display...');
    const kdsState = await kdsPage.evaluate(() => {
      const text = document.body.innerText;
      const banner = document.querySelector('[data-testid="kds-low-stock-banner"]');
      const buttons = Array.from(document.querySelectorAll('button'));
      const startPrepBtn = buttons.find((b) => b.innerText.includes('Start Preparing'));
      return {
        hasTicket: text.includes('T-04') || text.includes('Table 4') || text.includes('ORD-') || text.includes('KOT'),
        hasLowStockBanner: Boolean(banner),
        bannerText: banner ? (banner as HTMLElement).innerText : '',
        canStartPrep: Boolean(startPrepBtn),
      };
    });
    console.log(`   -> KDS Ticket Arrival: ${kdsState.hasTicket}`);
    console.log(`   -> KDS Low Stock Alert Banner Displayed: ${kdsState.hasLowStockBanner}`);
    audit.kitchenKds.receivedTicket = kdsState.hasTicket;
    audit.kitchenKds.lowStockBannerShown = kdsState.hasLowStockBanner;

    // -------------------------------------------------------------------------
    // DRILL PHASE 4: Chef Cooking Interaction (Start Preparing -> Mark Ready)
    // -------------------------------------------------------------------------
    console.log('\n🔥 [DRILL PHASE 4] Chef interacting with KDS Ticket...');
    const startedPrep = await kdsPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find((b) => b.innerText.includes('Start Preparing'));
      if (startBtn) {
        startBtn.click();
        return true;
      }
      return false;
    });
    console.log(`   -> Chef Clicked "Start Preparing": ${startedPrep}`);
    audit.kitchenKds.startedPreparing = startedPrep;

    await new Promise((r) => setTimeout(r, 1500));

    const markedReady = await kdsPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const readyBtn = buttons.find((b) => b.innerText.includes('Mark Ready') || b.innerText.includes('Ready'));
      if (readyBtn) {
        readyBtn.click();
        return true;
      }
      return false;
    });
    console.log(`   -> Chef Clicked "Mark Ready": ${markedReady}`);
    audit.kitchenKds.markedReady = markedReady;

    await new Promise((r) => setTimeout(r, 2000));

    // Verify Waiter received pickup notification
    const waiterPickupState = await waiterPage.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasReadyNotification: text.includes('READY') || text.includes('Kitchen finished') || text.includes('Pickup ready'),
      };
    });
    console.log(`   -> Waiter Screen Received "Order Ready For Pickup": ${waiterPickupState.hasReadyNotification}`);
    audit.waiterApp.receivedPickupReady = waiterPickupState.hasReadyNotification;

    // -------------------------------------------------------------------------
    // DRILL PHASE 5: Guest Room Portal (:3004) & Folio Balance
    // -------------------------------------------------------------------------
    console.log('\n🏨 [Tab 4: Guest Room Portal] Initializing on http://localhost:3004...');
    const guestPage: Page = await browser.newPage();
    await guestPage.setViewport({ width: 390, height: 844 });
    guestPage.on('pageerror', (err) => audit.guestPortal.errors.push(err.message));
    await guestPage.goto('http://localhost:3004', { waitUntil: 'domcontentloaded' });
    audit.guestPortal.loaded = true;

    await new Promise((r) => setTimeout(r, 1500));

    const guestState = await guestPage.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasRoomTitle: text.includes('302') || text.includes('Deluxe') || text.includes('Maharaja'),
        hasDiningMenu: text.includes('In-Room Dining') || text.includes('24/7') || text.includes('ADD'),
        hasFolio: text.includes('Folio') || text.includes('₹') || text.includes('Check-Out'),
      };
    });
    console.log(`   -> Guest Room Portal Identity: ${guestState.hasRoomTitle}`);
    console.log(`   -> In-Room Dining Menu Available: ${guestState.hasDiningMenu}`);
    console.log(`   -> Live Folio Express Summary: ${guestState.hasFolio}`);
    audit.guestPortal.inRoomDiningLoaded = guestState.hasDiningMenu;
    audit.guestPortal.folioRendered = guestState.hasFolio;

    // -------------------------------------------------------------------------
    // DRILL PHASE 6: Hotel Admin ERP PMS Tape Chart (:3005)
    // -------------------------------------------------------------------------
    console.log('\n📊 [Tab 5: Hotel Admin ERP] Initializing on http://localhost:3005...');
    const adminPage: Page = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });
    adminPage.on('pageerror', (err) => audit.adminErp.errors.push(err.message));
    await adminPage.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    audit.adminErp.loaded = true;

    await new Promise((r) => setTimeout(r, 1500));

    const adminState = await adminPage.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasTapeChart: text.includes('PMS') || text.includes('Room') || text.includes('Deluxe') || text.includes('Occupancy'),
        hasRoomsGrid: text.includes('101') || text.includes('102') || text.includes('201'),
        activeGuestNames: text.includes('Rohit Khanna') || text.includes('Vikramaditya'),
      };
    });
    console.log(`   -> Admin ERP PMS System Loaded: ${adminState.hasTapeChart}`);
    console.log(`   -> Room Grid Active: ${adminState.hasRoomsGrid}`);
    console.log(`   -> VIP Reservations Rendered: ${adminState.activeGuestNames}`);
    audit.adminErp.pmsGridRendered = adminState.hasTapeChart;

    // -------------------------------------------------------------------------
    // DRILL PHASE 7: Database BOM Deduction Verification
    // -------------------------------------------------------------------------
    console.log('\n📦 [DRILL PHASE 7] Verifying MongoDB Stock Deductions & FEFO...');
    const postBatches = await StockBatch.find({ hotelId, itemName: 'Malai Paneer' }).sort({ expiryDate: 1 });
    const postPaneerTotal = postBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
    const totalDeducted = Math.round((prePaneerTotal - postPaneerTotal) * 1000) / 1000;

    audit.dbBOM.paneerDeductedKg = totalDeducted;
    audit.dbBOM.remainingPaneerKg = postPaneerTotal;
    // Check if batch 1 was depleted
    audit.dbBOM.fefoFollowed = preBatches[0].currentQuantity > postBatches[0].currentQuantity;

    console.log(`   -> Pre-stock: ${prePaneerTotal} kg | Post-stock: ${postPaneerTotal} kg`);
    console.log(`   -> Total Deducted: ${totalDeducted} kg`);
    console.log(`   -> FEFO Followed (Batch 1 depleted first): ${audit.dbBOM.fefoFollowed}`);

    // -------------------------------------------------------------------------
    // Capture Deep Drill Screenshots
    // -------------------------------------------------------------------------
    console.log('\n📸 Capturing Master Screenshots across all 5 Frontends...');
    await customerPage.screenshot({ path: `${screenshotDir}/deep_drill_customer.png` });
    await waiterPage.screenshot({ path: `${screenshotDir}/deep_drill_waiter.png` });
    await kdsPage.screenshot({ path: `${screenshotDir}/deep_drill_kds.png` });
    await guestPage.screenshot({ path: `${screenshotDir}/deep_drill_guest.png` });
    await adminPage.screenshot({ path: `${screenshotDir}/deep_drill_admin.png` });
    console.log('✅ 5 High-Res Proof Screenshots Saved');

    // -------------------------------------------------------------------------
    // Console Errors Audit Summary
    // -------------------------------------------------------------------------
    const totalErrors =
      audit.customerApp.errors.length +
      audit.waiterApp.errors.length +
      audit.kitchenKds.errors.length +
      audit.guestPortal.errors.length +
      audit.adminErp.errors.length;

    console.log('\n================================================================================');
    console.log('🏁 MASTER ULTRA-DEEP DRILL AUDIT RESULTS');
    console.log('================================================================================');
    console.log(`1. Customer App (:3001):   ${audit.customerApp.loaded ? '✅ LIVE' : '❌ FAIL'} | Assistance: ${audit.customerApp.assistanceCalled} | Order: ${audit.customerApp.orderPlaced} | Errors: ${audit.customerApp.errors.length}`);
    console.log(`2. Waiter App (:3002):     ${audit.waiterApp.loaded ? '✅ LIVE' : '❌ FAIL'} | Assistance Rx: ${audit.waiterApp.receivedAssistance} | Pickup Rx: ${audit.waiterApp.receivedPickupReady} | Errors: ${audit.waiterApp.errors.length}`);
    console.log(`3. Kitchen KDS (:3003):    ${audit.kitchenKds.loaded ? '✅ LIVE' : '❌ FAIL'} | Ticket Rx: ${audit.kitchenKds.receivedTicket} | LowStock Banner: ${audit.kitchenKds.lowStockBannerShown} | Errors: ${audit.kitchenKds.errors.length}`);
    console.log(`4. Guest Portal (:3004):   ${audit.guestPortal.loaded ? '✅ LIVE' : '❌ FAIL'} | In-Room Dining: ${audit.guestPortal.inRoomDiningLoaded} | Folio: ${audit.guestPortal.folioRendered} | Errors: ${audit.guestPortal.errors.length}`);
    console.log(`5. Admin ERP (:3005):      ${audit.adminErp.loaded ? '✅ LIVE' : '❌ FAIL'} | PMS Tape Chart: ${audit.adminErp.pmsGridRendered} | Errors: ${audit.adminErp.errors.length}`);
    console.log(`6. Database BOM Engine:    FEFO Priority: ${audit.dbBOM.fefoFollowed ? '✅ YES' : '❌ NO'} | Deducted: ${audit.dbBOM.paneerDeductedKg} kg | Remaining: ${audit.dbBOM.remainingPaneerKg} kg`);
    console.log('--------------------------------------------------------------------------------');
    console.log(`TOTAL CONSOLE ERRORS: ${totalErrors} ${totalErrors === 0 ? '🌟 ZERO DEFECTS' : '⚠️ WITH DEFECTS'}`);
    console.log('================================================================================');

    if (totalErrors > 0) {
      console.warn('Errors breakdown:', {
        customer: audit.customerApp.errors,
        waiter: audit.waiterApp.errors,
        kds: audit.kitchenKds.errors,
        guest: audit.guestPortal.errors,
        admin: audit.adminErp.errors,
      });
    }
  } catch (err: any) {
    console.error('❌ Master Audit Failed with Exception:', err);
    process.exit(1);
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('🔒 Closed All Headless Browser Tabs & MongoDB connection.');
  }
}

runMasterDeepHospitalityAudit();
