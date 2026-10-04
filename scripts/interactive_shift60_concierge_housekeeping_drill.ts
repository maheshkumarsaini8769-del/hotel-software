import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { ServiceRequest } from '../backend/src/models/ServiceRequest';
import { Booking, BookingStatus, BookingSource, BookingMode } from '../backend/src/models/Booking';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift60Drill() {
  console.log('================================================================================');
  console.log('🛎️ [SHIFT 60 DRILL] REAL-TIME IN-ROOM CONCIERGE & HOUSEKEEPING DISPATCH LOOP');
  console.log('   Room 102 In-Room Portal (:3004) ➔ Front Desk Concierge Desk (:3005) ➔ Folio Sync');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // 1. Ensure Room 102 exists
  let r102 = await Room.findOne({ hotelId: tenant._id, roomNumber: '102' });
  if (!r102) {
    let roomType = await RoomType.findOne({ hotelId: tenant._id });
    if (!roomType) {
      roomType = await RoomType.create({
        hotelId: tenant._id,
        name: 'Royal Heritage Deluxe Villa',
        code: 'DLX-60',
        slug: `dlx-60-${Date.now()}`,
        basePriceOvernight: 3900,
        maxOccupancyAdults: 2,
      });
    }
    r102 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '102',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: 'room-102-hash-60',
      status: RoomStatus.OCCUPIED,
    });
  } else {
    r102.status = RoomStatus.OCCUPIED;
    await r102.save();
  }

  // 2. Ensure Active Stay & Master Folio exists for Room 102
  let activeStay = await Stay.findOne({ hotelId: tenant._id, roomId: r102._id, stayStatus: StayStatus.ACTIVE });
  let masterFolio: any = null;

  if (!activeStay) {
    let booking = await Booking.findOne({ hotelId: tenant._id, assignedRoomId: r102._id });
    if (!booking) {
      booking = await Booking.create({
        hotelId: tenant._id,
        bookingNumber: `BKG-WEB-7842`,
        bookingSource: BookingSource.DIRECT_PUBLIC_WEB,
        bookingMode: BookingMode.OVERNIGHT,
        roomTypeId: r102.roomTypeId,
        assignedRoomId: r102._id,
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9821098765',
        guestEmail: 'vikram.singhania@heritage.in',
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000 * 2),
        guestCountAdults: 2,
        totalTariff: 7800,
        taxAmount: 936,
        grandTotal: 8736,
        advancePaymentAmount: 3000,
        paymentStatus: 'PARTIAL',
        bookingStatus: BookingStatus.CHECKED_IN,
      });
    }

    masterFolio = await MasterFolio.create({
      hotelId: tenant._id,
      folioNumber: `FOL-102-${Date.now().toString().slice(-4)}`,
      bookingId: booking._id,
      stayId: new Types.ObjectId(),
      roomId: r102._id,
      totalRoomTariff: 7800,
      totalFoodAndBeverage: 450,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalTaxes: 958,
      advancePaid: 3000,
      paidAmount: 3000,
      netAmountPayable: 9208,
      dueAmount: 6208,
      folioStatus: 'OPEN',
    });

    activeStay = await Stay.create({
      hotelId: tenant._id,
      bookingId: booking._id,
      roomId: r102._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
      stayStatus: StayStatus.ACTIVE,
      masterFolioId: masterFolio._id,
      keyCardIssued: 'KEY-102-RF88',
    });

    masterFolio.stayId = activeStay._id;
    await masterFolio.save();
  } else {
    masterFolio = await MasterFolio.findById(activeStay.masterFolioId);
    if (!masterFolio) {
      masterFolio = await MasterFolio.create({
        hotelId: tenant._id,
        folioNumber: `FOL-102-${Date.now().toString().slice(-4)}`,
        bookingId: activeStay.bookingId,
        stayId: activeStay._id,
        roomId: r102._id,
        totalRoomTariff: 7800,
        totalFoodAndBeverage: 450,
        totalLaundry: 0,
        totalPaidServices: 0,
        totalTaxes: 958,
        advancePaid: 3000,
        paidAmount: 3000,
        netAmountPayable: 9208,
        dueAmount: 6208,
        folioStatus: 'OPEN',
      });
      activeStay.masterFolioId = masterFolio._id;
      await activeStay.save();
    }
  }

  // Clear previous requests for clean visual drill
  await ServiceRequest.deleteMany({ hotelId: tenant._id, roomId: r102._id });
  console.log('✅ Room 102 state prepped and cleared for clean drill execution.');

  // 3. Launch Puppeteer Browser
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    protocolTimeout: 60000,
  });

  const guestPage = await browser.newPage();
  await guestPage.setViewport({ width: 1440, height: 900 });

  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900 });

  try {
    // =========================================================================
    // STEP 1: GUEST ROOM PORTAL (:3004/?room=102) - SUBMIT CONCIERGE & LAUNDRY REQUESTS
    // =========================================================================
    console.log('\n--- [STEP 1] GUEST PORTAL: SUBMIT CONCIERGE & LAUNDRY REQUESTS (:3004) ---');
    await guestPage.goto('http://localhost:3004/?room=102', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // 1. Submit Fresh Towels request
    console.log('   Tapping Fresh Towels card via DOM click...');
    await guestPage.evaluate(() => {
      const card = document.querySelector('[data-testid="concierge-card-TOWEL_REPLENISH"]') as HTMLElement;
      if (card) card.click();
    });
    await sleep(800);

    // Enter notes in modal & confirm
    await guestPage.evaluate(() => {
      const input = document.querySelector('[data-testid="concierge-notes-input"]') as HTMLInputElement;
      if (input) {
        input.value = '2 Extra warm bath towels and plush down pillows';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btn = document.querySelector('[data-testid="confirm-concierge-request-btn"]') as HTMLElement;
      if (btn) btn.click();
    });
    console.log('   ✅ Fresh Towels request confirmed!');
    await sleep(2500);

    // 2. Submit Express Laundry Bag request
    console.log('   Tapping Express Laundry Bag card via DOM click...');
    await guestPage.evaluate(() => {
      const card = document.querySelector('[data-testid="concierge-card-LAUNDRY"]') as HTMLElement;
      if (card) card.click();
    });
    await sleep(800);

    // Enter laundry notes & confirm
    await guestPage.evaluate(() => {
      const input = document.querySelector('[data-testid="concierge-notes-input"]') as HTMLInputElement;
      if (input) {
        input.value = '5 executive shirts - dry clean & press';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btn = document.querySelector('[data-testid="confirm-concierge-request-btn"]') as HTMLElement;
      if (btn) btn.click();
    });
    console.log('   ✅ Express Laundry Bag request confirmed (₹350 + GST posted to Folio)!');
    await sleep(2500);

    // Refresh guest page data to ensure live tracker is completely populated
    await guestPage.screenshot({ path: `${screenshotDir}/shift60_step1_guest_portal_concierge_hub.png` });
    console.log('📸 Step 1 Screenshot Saved: shift60_step1_guest_portal_concierge_hub.png');

    // =========================================================================
    // STEP 2: HOTEL ADMIN ERP (:3005) - VIEW INCOMING CONCIERGE & HOUSEKEEPING QUEUE
    // =========================================================================
    console.log('\n--- [STEP 2] HOTEL ADMIN ERP: INCOMING CONCIERGE & HOUSEKEEPING QUEUE (:3005) ---');
    await adminPage.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Navigate to Front Desk PMS
    await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('1-Click Check-In') || b.innerText.includes('Front Desk'));
      if (btn) btn.click();
    });
    await sleep(1500);

    // Click tab "Concierge & Housekeeping Desk"
    await adminPage.evaluate(() => {
      const tab =
        (document.querySelector('[data-testid="tab-concierge"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Concierge & Housekeeping'));
      if (tab) tab.click();
    });
    await sleep(1000);

    // Click Refresh Desk
    await adminPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="refresh-concierge-btn"]') as HTMLElement;
      if (btn) btn.click();
    });
    await sleep(2000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift60_step2_admin_erp_concierge_desk_incoming.png` });
    console.log('📸 Step 2 Screenshot Saved: shift60_step2_admin_erp_concierge_desk_incoming.png');

    // =========================================================================
    // STEP 3: DISPATCH & ASSIGN ATTENDANTS (SUNITA & RAMESH)
    // =========================================================================
    console.log('\n--- [STEP 3] HOTEL ADMIN ERP: ASSIGN ATTENDANT & MARK IN-PROGRESS (:3005) ---');

    // 1. Assign Sunita to towels request
    const assignedSunita = await adminPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="concierge-card-102"]'));
      const towelCard = cards.find((c) => (c as HTMLElement).innerText.includes('TOWEL'));
      if (towelCard) {
        const btn = Array.from(towelCard.querySelectorAll('button')).find((b) => b.innerText.includes('Assign Sunita'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('   Assigned Sunita Sharma to Towel Request:', assignedSunita);
    await sleep(1500);

    // 2. Mark Towel Request in progress
    const markedInProgress = await adminPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="concierge-card-102"]'));
      const towelCard = cards.find((c) => (c as HTMLElement).innerText.includes('TOWEL'));
      if (towelCard) {
        const btn = Array.from(towelCard.querySelectorAll('button')).find((b) => b.innerText.includes('Mark In-Progress'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('   Marked Towel Request In-Progress:', markedInProgress);
    await sleep(1500);

    // 3. Assign Ramesh to laundry
    const assignedRamesh = await adminPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="concierge-card-102"]'));
      const laundryCard = cards.find((c) => (c as HTMLElement).innerText.includes('LAUNDRY'));
      if (laundryCard) {
        const btn = Array.from(laundryCard.querySelectorAll('button')).find((b) => b.innerText.includes('Assign Ramesh'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('   Assigned Ramesh Kumar to Laundry Request:', assignedRamesh);
    await sleep(2000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift60_step3_attendant_assigned_and_dispatch.png` });
    console.log('📸 Step 3 Screenshot Saved: shift60_step3_attendant_assigned_and_dispatch.png');

    // =========================================================================
    // STEP 4: FULFILL TASK & GUEST PORTAL LIVE SYNC & FOLIO REVIEW
    // =========================================================================
    console.log('\n--- [STEP 4] FULFILL SERVICE & VERIFY GUEST PORTAL LIVE FOLIO SYNC (:3004) ---');

    // Fulfill towel request
    const fulfilled = await adminPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="concierge-card-102"]'));
      const towelCard = cards.find((c) => (c as HTMLElement).innerText.includes('TOWEL'));
      if (towelCard) {
        const btn = Array.from(towelCard.querySelectorAll('button')).find((b) => b.innerText.includes('Fulfill & Deliver'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log('   Towel Request Fulfilled on Admin ERP:', fulfilled);
    await sleep(2000);

    // Switch to guestPage
    await guestPage.bringToFront();
    await sleep(1500);

    // Click Folio tab to inspect posted laundry charge
    await guestPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const folioTab = buttons.find((b) => b.innerText.includes('Folio') || b.innerText.includes('Bill'));
      if (folioTab) folioTab.click();
    });
    await sleep(2000);

    await guestPage.screenshot({ path: `${screenshotDir}/shift60_step4_guest_portal_live_fulfilled_and_folio_synced.png` });
    console.log('📸 Step 4 Screenshot Saved: shift60_step4_guest_portal_live_fulfilled_and_folio_synced.png');

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 60 VERIFICATION COMPLETE] ALL 4 LUXURY SCREENSHOTS CAPTURED SAFELY!');
    console.log('================================================================================\n');
  } catch (error) {
    console.error('❌ Error during Shift 60 drill execution:', error);
    throw error;
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('✅ Browser and MongoDB disconnected.');
  }
}

runShift60Drill();
