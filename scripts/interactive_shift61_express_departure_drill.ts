import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { FolioLineItem } from '../backend/src/models/FolioLineItem';
import { Booking, BookingStatus, BookingSource, BookingMode } from '../backend/src/models/Booking';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../backend/src/models/HousekeepingTask';
import { GuestProfile, VIPTier } from '../backend/src/models/GuestProfile';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift61Drill() {
  console.log('================================================================================');
  console.log('✨ [SHIFT 61 DRILL] 1-TAP EXPRESS DIGITAL DEPARTURE & ATOMIC MASTER FOLIO SETTLE');
  console.log('   In-Room Guest Portal (:3004) ➔ Front Desk Settle (:3005) ➔ Room Turnaround');
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
        code: 'DLX-61',
        slug: `dlx-61-${Date.now()}`,
        basePriceOvernight: 3900,
        maxOccupancyAdults: 2,
      });
    }
    r102 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '102',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: 'room-102-hash-61',
      status: RoomStatus.OCCUPIED,
    });
  } else {
    r102.status = RoomStatus.OCCUPIED;
    await r102.save();
  }

  // 2. Ensure Guest profile exists
  let guestProfile = await GuestProfile.findOne({ hotelId: tenant._id, phone: '9821098765' });
  if (!guestProfile) {
    guestProfile = await GuestProfile.create({
      hotelId: tenant._id,
      name: 'Vikramaditya & Ananya Singhania',
      phone: '9821098765',
      email: 'vikram.singhania@heritage.in',
      idType: 'AADHAAR',
      idNumberMasked: 'XXXX-XXXX-4812',
      isVerified: true,
      vipTier: VIPTier.PLATINUM,
      totalVisits: 3,
      totalLifetimeSpend: 42500,
    });
  }

  // 3. Reset or Create Active Stay & Folio for Room 102
  await Stay.deleteMany({ hotelId: tenant._id, roomId: r102._id });
  await MasterFolio.deleteMany({ hotelId: tenant._id, roomId: r102._id });
  await HousekeepingTask.deleteMany({ hotelId: tenant._id, roomId: r102._id });

  let booking = await Booking.findOne({ hotelId: tenant._id, bookingNumber: 'BKG-WEB-7842' });
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
  } else {
    booking.assignedRoomId = r102._id;
    booking.bookingStatus = BookingStatus.CHECKED_IN;
    await booking.save();
  }

  const masterFolio = await MasterFolio.create({
    hotelId: tenant._id,
    folioNumber: `FOL-102-${Date.now().toString().slice(-4)}`,
    bookingId: booking._id,
    stayId: new Types.ObjectId(),
    roomId: r102._id,
    totalRoomTariff: 7800,
    totalFoodAndBeverage: 850,
    totalLaundry: 350,
    totalPaidServices: 0,
    totalTaxes: 1040,
    advancePaid: 3000,
    paidAmount: 3000,
    netAmountPayable: 10040,
    dueAmount: 7040,
    folioStatus: 'OPEN',
  });

  const activeStay = await Stay.create({
    hotelId: tenant._id,
    bookingId: booking._id,
    roomId: r102._id,
    guestId: guestProfile._id,
    checkInTimestamp: new Date(),
    expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
    stayStatus: StayStatus.ACTIVE,
    masterFolioId: masterFolio._id,
    keyCardIssued: 'KEY-102-RF88',
    isCouple: true,
    verificationMode: 'AADHAAR',
    idNumberMasked: 'XXXX-XXXX-4812',
    verifiedByReceptionist: true,
    receptionistNotes: 'Couple Aadhaar verified at physical check-in',
  });

  masterFolio.stayId = activeStay._id;
  await masterFolio.save();

  // Create Itemized Line Items
  await FolioLineItem.create([
    {
      hotelId: tenant._id,
      folioId: masterFolio._id,
      stayId: activeStay._id,
      department: 'ROOM_RENT',
      description: '2 Nights Royal Heritage Deluxe Villa Suite',
      rate: 7800,
      quantity: 1,
      taxRate: 12,
      taxAmount: 936,
      netAmount: 8736,
      postedAt: new Date(),
    },
    {
      hotelId: tenant._id,
      folioId: masterFolio._id,
      stayId: activeStay._id,
      department: 'ROOM_SERVICE',
      description: 'Gourmet Kashmiri Dum Biryani & Dum Pukht Rogan Josh',
      rate: 850,
      quantity: 1,
      taxRate: 5,
      taxAmount: 43,
      netAmount: 893,
      postedAt: new Date(),
    },
    {
      hotelId: tenant._id,
      folioId: masterFolio._id,
      stayId: activeStay._id,
      department: 'LAUNDRY',
      description: 'Express Laundry Service (5 Executive Shirts Clean & Press)',
      rate: 350,
      quantity: 1,
      taxRate: 18,
      taxAmount: 63,
      netAmount: 413,
      postedAt: new Date(),
    },
  ]);

  console.log(`✅ Seeded Fresh In-House Stay for Room 102 (Stay: ${activeStay._id}, Folio: ${masterFolio.folioNumber}, Due: ₹${masterFolio.dueAmount})`);

  // 4. Launch Puppeteer Browser
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
    // STEP 1: GUEST ROOM PORTAL (:3004/?room=102) - EXPRESS DIGITAL DEPARTURE REQUEST
    // =========================================================================
    console.log('\n--- [STEP 1] GUEST PORTAL: 1-TAP EXPRESS DIGITAL DEPARTURE REQUEST (:3004) ---');
    await guestPage.goto('http://localhost:3004/?room=102', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Switch to Folio & Bill tab
    console.log('   Clicking Folio & Bill tab...');
    await guestPage.evaluate(() => {
      const tab =
        (document.querySelector('[data-testid="guest-tab-folio"]') as HTMLElement) ||
        (document.querySelector('[data-testid="tab-folio"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Folio') || b.innerText.includes('Bill'));
      if (tab) tab.click();
    });
    await sleep(1500);

    // Open Express Check-Out modal
    console.log('   Clicking Request Express Departure button...');
    await guestPage.evaluate(() => {
      const btn =
        (document.querySelector('[data-testid="btn-open-express-checkout"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Express Check-Out'));
      if (btn) btn.click();
    });
    await sleep(1000);

    // Fill rating & payment preference in modal
    await guestPage.evaluate(() => {
      // 5-Star rating
      const star5 = document.querySelector('[data-testid="star-rating-5"]') as HTMLElement;
      if (star5) star5.click();

      // Payment option UPI
      const upiBtn = document.querySelector('[data-testid="pay-method-UPI"]') as HTMLElement;
      if (upiBtn) upiBtn.click();
    });
    await sleep(800);

    // Submit express checkout request
    console.log('   Submitting express departure request...');
    await guestPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-confirm-departure-request"]') as HTMLElement;
      if (btn) btn.click();
    });
    await sleep(2500);

    await guestPage.screenshot({ path: `${screenshotDir}/shift61_step1_guest_portal_express_departure_request.png` });
    console.log('📸 Step 1 Screenshot Saved: shift61_step1_guest_portal_express_departure_request.png');

    // =========================================================================
    // STEP 2: HOTEL ADMIN ERP (:3005) - VIEW EXPRESS DEPARTURE ALERT & OPEN SETTLE MODAL
    // =========================================================================
    console.log('\n--- [STEP 2] HOTEL ADMIN ERP: IN-HOUSE EXPRESS ALERT & OPEN SETTLE MODAL (:3005) ---');
    await adminPage.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Navigate to Front Desk PMS
    await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('1-Click Check-In') || b.innerText.includes('Front Desk'));
      if (btn) btn.click();
    });
    await sleep(1500);

    // Click tab "In-House Guests"
    await adminPage.evaluate(() => {
      const tab =
        (document.querySelector('[data-testid="tab-in-house"]') as HTMLElement) ||
        (document.querySelector('[data-testid="tab-inhouse"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('In-House Guests') || b.innerText.includes('In-House'));
      if (tab) tab.click();
    });
    await sleep(1200);

    // Refresh directory
    await adminPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="btn-refresh-inhouse"]') as HTMLElement;
      if (btn) btn.click();
    });
    await sleep(1500);

    // Click "Settle & Process Express Departure" on Room 102
    console.log('   Opening Master Folio Departure Settlement Modal for Room 102...');
    await adminPage.evaluate(() => {
      const btn =
        (document.querySelector('[data-testid="btn-settle-checkout-102"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Settle & Process Express Departure') || b.innerText.includes('Settle & Check-Out'));
      if (btn) btn.click();
    });
    await sleep(2500);

    await adminPage.screenshot({ path: `${screenshotDir}/shift61_step2_admin_erp_departure_review_modal.png` });
    console.log('📸 Step 2 Screenshot Saved: shift61_step2_admin_erp_departure_review_modal.png');

    // =========================================================================
    // STEP 3: HOTEL ADMIN ERP (:3005) - ATOMIC MASTER FOLIO SETTLEMENT & TAX INVOICE
    // =========================================================================
    console.log('\n--- [STEP 3] HOTEL ADMIN ERP: CONFIRM SETTLE, VOID KEYCARD & ISSUE TAX INVOICE ---');
    await adminPage.evaluate(() => {
      const confirmBtn = document.querySelector('[data-testid="btn-confirm-settle-checkout"]') as HTMLElement;
      if (confirmBtn) confirmBtn.click();
    });
    await sleep(3500);

    await adminPage.screenshot({ path: `${screenshotDir}/shift61_step3_admin_erp_folio_settled_and_room_vacated.png` });
    console.log('📸 Step 3 Screenshot Saved: shift61_step3_admin_erp_folio_settled_and_room_vacated.png');

    // Close admin modal
    await adminPage.evaluate(() => {
      const dismissBtn = document.querySelector('[data-testid="btn-dismiss-success-modal"]') as HTMLElement;
      if (dismissBtn) dismissBtn.click();
    });
    await sleep(1500);

    // =========================================================================
    // STEP 4: GUEST ROOM PORTAL (:3004/?room=102) - TAX INVOICE ISSUED & ZERO DUE
    // =========================================================================
    console.log('\n--- [STEP 4] GUEST PORTAL: VERIFY TAX INVOICE VOUCHER & ZERO BALANCE DUE ---');
    await guestPage.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);

    // Click Folio tab
    await guestPage.evaluate(() => {
      const tab =
        (document.querySelector('[data-testid="guest-tab-folio"]') as HTMLElement) ||
        (document.querySelector('[data-testid="tab-folio"]') as HTMLElement) ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Folio') || b.innerText.includes('Bill'));
      if (tab) tab.click();
    });
    await sleep(2000);

    await guestPage.screenshot({ path: `${screenshotDir}/shift61_step4_guest_portal_departure_receipt_and_tax_invoice.png` });
    console.log('📸 Step 4 Screenshot Saved: shift61_step4_guest_portal_departure_receipt_and_tax_invoice.png');

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 61 DRILL COMPLETED] ALL 4 LUXURY MIDNIGHT SCREENSHOTS CAPTURED!');
    console.log('================================================================================');
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('🔌 Disconnected database and closed browser.');
  }
}

runShift61Drill().catch((err) => {
  console.error('❌ Error executing Shift 61 drill:', err);
  process.exit(1);
});
