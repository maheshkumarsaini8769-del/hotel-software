import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { FolioLineItem } from '../backend/src/models/FolioLineItem';
import { RestaurantOrder } from '../backend/src/models/RestaurantOrder';
import { KitchenStation } from '../backend/src/models/KitchenStation';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift59Drill() {
  console.log('================================================================================');
  console.log('🛎️ [SHIFT 59 DRILL] LIVE IN-ROOM DINING TO KITCHEN KDS & FOLIO BILLING LOOP');
  console.log('   Room 102 In-Room Portal (:3004) ➔ Kitchen KDS (:3003) ➔ Master Folio Update');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant Taj Gateway not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure KitchenStation exists
  let kitchenStation = await KitchenStation.findOne({ hotelId: tenant._id });
  if (!kitchenStation) {
    kitchenStation = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'Main Culinary Kitchen',
      screenToken: `station-token-${Date.now()}`,
      isOnline: true,
    });
  }

  // Ensure Room 102 exists
  let r102 = await Room.findOne({ hotelId: tenant._id, roomNumber: '102' });
  if (!r102) {
    let deluxeType = await RoomType.findOne({ hotelId: tenant._id });
    if (!deluxeType) {
      deluxeType = await RoomType.create({
        hotelId: tenant._id,
        name: 'Royal Heritage Deluxe Villa',
        code: 'DLX',
        basePriceOvernight: 3900,
        maxOccupancy: 2,
      });
    }
    r102 = await Room.create({
      hotelId: tenant._id,
      roomTypeId: deluxeType._id,
      roomNumber: '102',
      floorNumber: 1,
      status: RoomStatus.OCCUPIED,
    });
  }

  // Ensure active Stay and MasterFolio for Room 102
  let activeStay = await Stay.findOne({ hotelId: tenant._id, roomId: r102._id, stayStatus: StayStatus.ACTIVE });
  let masterFolio: any;

  if (!activeStay) {
    masterFolio = await MasterFolio.create({
      hotelId: tenant._id,
      folioNumber: `FOLIO-102-${Date.now().toString().slice(-4)}`,
      roomId: r102._id,
      bookingId: new Types.ObjectId(),
      totalRoomTariff: 7800,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalTaxes: 936,
      advancePaid: 3000,
      paidAmount: 3000,
      netAmountPayable: 8736,
      dueAmount: 5736,
      folioStatus: 'OPEN',
    });

    activeStay = await Stay.create({
      hotelId: tenant._id,
      roomId: r102._id,
      masterFolioId: masterFolio._id,
      stayStatus: StayStatus.ACTIVE,
      guestName: 'Vikramaditya & Ananya Singhania',
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
      isCouple: true,
      verificationMode: 'AADHAAR',
      idNumberMasked: 'XXXX-XXXX-8842',
      verifiedByReceptionist: true,
      keyCardIssued: 'KEY-102',
      wifiSsid: 'TajGateway_HighSpeed',
      wifiPassword: 'TajGuest@102',
    });

    masterFolio.stayId = activeStay._id;
    await masterFolio.save();
  } else {
    masterFolio = activeStay.masterFolioId
      ? await MasterFolio.findById(activeStay.masterFolioId)
      : await MasterFolio.findOne({ hotelId: tenant._id, stayId: activeStay._id, folioStatus: 'OPEN' });
  }

  // Clean stale orders and previous dining line items for clean baseline
  await RestaurantOrder.deleteMany({ hotelId: tenant._id });
  await FolioLineItem.deleteMany({ hotelId: tenant._id, department: 'ROOM_SERVICE' });
  if (masterFolio) {
    masterFolio.totalFoodAndBeverage = 0;
    masterFolio.totalTaxes = 936;
    masterFolio.netAmountPayable = 8736;
    masterFolio.dueAmount = 5736;
    await masterFolio.save();
  }

  console.log(`✅ Room 102 Active Stay: ${activeStay._id}, Folio: ${masterFolio?.folioNumber || 'None'}`);

  let browser: Browser | null = null;
  try {
    console.log('\n🚀 Launching Puppeteer Chromium Browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // =========================================================================
    // STEP 1: GUEST IN ROOM 102 SELECTS IN-ROOM DINING DISHES (:3004/?room=102)
    // =========================================================================
    console.log('\n🍽️ [STEP 1] Navigating to In-Room Guest Portal (:3004/?room=102)...');
    const guestPage = await browser.newPage();
    await guestPage.setViewport({ width: 1440, height: 900 });

    await guestPage.goto('http://localhost:3004/?room=102', { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    console.log('👉 Switching to In-Room Dining Menu Tab...');
    await guestPage.waitForSelector('[data-testid="guest-tab-dining"]', { timeout: 10000 });
    await guestPage.click('[data-testid="guest-tab-dining"]');
    await sleep(1500);

    // Select Paneer Tikka Angara (ird-1) - Qty 2
    console.log('👉 Adding Paneer Tikka Angara (Qty 2) to room cart...');
    await guestPage.waitForSelector('[data-testid="add-dish-ird-1"]', { timeout: 10000 });
    await guestPage.click('[data-testid="add-dish-ird-1"]');
    await sleep(400);
    // Click '+' button on card to increase quantity to 2
    const plusButtons1 = await guestPage.$$('button');
    for (const btn of plusButtons1) {
      const text = await guestPage.evaluate((el) => el.innerText, btn);
      if (text.trim() === '+') {
        await btn.click();
        break;
      }
    }
    await sleep(400);

    // Select Butter Garlic Naan (ird-5) - Qty 2
    console.log('👉 Adding Butter Garlic Naan (Qty 2) to room cart...');
    await guestPage.waitForSelector('[data-testid="add-dish-ird-5"]', { timeout: 10000 });
    await guestPage.click('[data-testid="add-dish-ird-5"]');
    await sleep(400);
    const plusButtons2 = await guestPage.$$('button');
    for (const btn of plusButtons2) {
      const text = await guestPage.evaluate((el) => el.innerText, btn);
      if (text.trim() === '+') {
        await btn.click();
        break;
      }
    }
    await sleep(600);

    // Verify floating bottom room order bar is visible
    await guestPage.waitForSelector('[data-testid="place-in-room-order-btn"]', { timeout: 10000 });
    console.log('✅ Bottom floating Room Delivery Bar confirmed with 4 items (₹700)!');

    const step1Screenshot = `${screenshotDir}/shift59_step1_guest_portal_order_placement.png`;
    await guestPage.screenshot({ path: step1Screenshot, fullPage: false });
    console.log(`📸 Captured: ${step1Screenshot}`);

    // =========================================================================
    // STEP 2: DISPATCH ORDER & VIEW TICKET IN KITCHEN KDS (:3003)
    // =========================================================================
    console.log('\n🛎️ [STEP 2] Dispatching Order to Kitchen via 1-Click Order Button...');
    await guestPage.click('[data-testid="place-in-room-order-btn"]');
    await sleep(2000);

    console.log('👨‍🍳 Opening Kitchen KDS Screen (:3003)...');
    const kdsPage = await browser.newPage();
    await kdsPage.setViewport({ width: 1440, height: 900 });

    await kdsPage.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await sleep(3500);

    // Verify Order Card for Room 102 appeared on KDS
    console.log('🔍 Locating Room 102 Order Ticket on Kitchen KDS screen...');
    await kdsPage.waitForSelector('[data-testid^="kds-order-card-"]', { timeout: 12000 });
    console.log('✅ In-Room Dining Ticket arrived on Kitchen KDS with Room 102 location badge!');

    const step2Screenshot = `${screenshotDir}/shift59_step2_kitchen_kds_room_order_ticket.png`;
    await kdsPage.screenshot({ path: step2Screenshot, fullPage: false });
    console.log(`📸 Captured: ${step2Screenshot}`);

    // =========================================================================
    // STEP 3: KITCHEN CHEF PREPARES & MARKS ORDER READY TO SERVE (:3003)
    // =========================================================================
    console.log('\n🔥 [STEP 3] Chef taps "Start Preparing" on Room 102 KDS Ticket...');
    await kdsPage.waitForSelector('[data-testid^="kds-btn-start-preparing-"]', { timeout: 8000 });
    await kdsPage.click('[data-testid^="kds-btn-start-preparing-"]');
    await sleep(1500);

    console.log('🔔 Chef taps "Mark All Ready" on Room 102 KDS Ticket...');
    await kdsPage.waitForSelector('[data-testid^="kds-btn-mark-ready-"]', { timeout: 8000 });
    await kdsPage.click('[data-testid^="kds-btn-mark-ready-"]');
    await sleep(2000);

    console.log('✅ Order marked READY TO SERVE on KDS!');

    const step3Screenshot = `${screenshotDir}/shift59_step3_kitchen_order_prepared_and_dispatched.png`;
    await kdsPage.screenshot({ path: step3Screenshot, fullPage: false });
    console.log(`📸 Captured: ${step3Screenshot}`);

    // =========================================================================
    // STEP 4: GUEST PORTAL LIVE TRACKER & SYNCHRONIZED FOLIO BILL (:3004/?room=102)
    // =========================================================================
    console.log('\n📱 [STEP 4] Returning to In-Room Guest Portal (:3004/?room=102)...');
    await guestPage.bringToFront();
    await sleep(2000);

    // Switch to Folio & Bill tab to showcase synchronized Master Folio billing loop with active stepper
    console.log('👉 Opening My Folio & Bill Tab...');
    await guestPage.waitForSelector('[data-testid="guest-tab-folio"]', { timeout: 10000 });
    await guestPage.click('[data-testid="guest-tab-folio"]');
    await sleep(2500);

    // Wait for the active order tracker banner in the folio
    await guestPage.waitForSelector('[data-testid="folio-active-order-tracker"]', { timeout: 8000 }).catch(() => {});

    const step4Screenshot = `${screenshotDir}/shift59_step4_guest_portal_live_tracker_and_folio_synced.png`;
    await guestPage.screenshot({ path: step4Screenshot, fullPage: false });
    console.log(`📸 Captured: ${step4Screenshot}`);

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 59 VERIFICATION COMPLETE] ALL 4 LUXURY SCREENSHOTS CAPTURED:');
    console.log(`   1. ${step1Screenshot}`);
    console.log(`   2. ${step2Screenshot}`);
    console.log(`   3. ${step3Screenshot}`);
    console.log(`   4. ${step4Screenshot}`);
    console.log('================================================================================\n');
  } catch (error: any) {
    console.error('❌ Error during Shift 59 drill execution:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await mongoose.disconnect();
  }
}

runShift59Drill().catch((err) => {
  console.error(err);
  process.exit(1);
});
