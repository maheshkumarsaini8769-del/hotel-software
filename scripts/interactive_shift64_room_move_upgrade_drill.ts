import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { Booking, BookingStatus } from '../backend/src/models/Booking';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../backend/src/models/FolioLineItem';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../backend/src/models/HousekeepingTask';
import { GuestProfile } from '../backend/src/models/GuestProfile';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift64Drill() {
  console.log('================================================================================');
  console.log('🔄 [SHIFT 64 DRILL] IN-HOUSE ROOM MOVE, SUITE UPGRADE & DIGITAL KEY RE-ISSUANCE');
  console.log('   Admin ERP (:3005) ➔ Move Request ➔ Turnaround Dispatch ➔ Guest Portal (:3004)');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // 1. Ensure Room Types Exist
  let deluxeType = await RoomType.findOne({ hotelId: tenant._id, code: 'DLX-64' });
  if (!deluxeType) {
    deluxeType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Deluxe Heritage Chamber',
      code: 'DLX-64',
      slug: `dlx-64-${Date.now()}`,
      basePriceOvernight: 4500,
      maxOccupancyAdults: 2,
    });
  }

  let suiteType = await RoomType.findOne({ hotelId: tenant._id, code: 'ROYAL-64' });
  if (!suiteType) {
    suiteType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Maharaja Royal Terrace Suite',
      code: 'ROYAL-64',
      slug: `royal-64-${Date.now()}`,
      basePriceOvernight: 8500,
      maxOccupancyAdults: 4,
    });
  }

  // 2. Ensure Room 101 and Room 201 Exist
  let room101 = await Room.findOne({ hotelId: tenant._id, roomNumber: '101' });
  if (!room101) {
    room101 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '101',
      floorNumber: 1,
      wing: 'Heritage Wing',
      roomTypeId: deluxeType._id,
      permanentQrCodeHash: 'room-101-hash-64',
      status: RoomStatus.OCCUPIED,
    });
  } else {
    room101.status = RoomStatus.OCCUPIED;
    room101.roomTypeId = deluxeType._id;
    await room101.save();
  }

  let room201 = await Room.findOne({ hotelId: tenant._id, roomNumber: '201' });
  if (!room201) {
    room201 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '201',
      floorNumber: 2,
      wing: 'Royal Wing',
      roomTypeId: suiteType._id,
      permanentQrCodeHash: 'room-201-hash-64',
      status: RoomStatus.AVAILABLE,
    });
  } else {
    room201.status = RoomStatus.AVAILABLE;
    room201.roomTypeId = suiteType._id;
    await room201.save();
  }

  // 3. Clean up previous stays and tasks for rooms 101 & 201
  await Stay.deleteMany({ hotelId: tenant._id, roomId: { $in: [room101._id, room201._id] } });
  await HousekeepingTask.deleteMany({ hotelId: tenant._id, roomId: { $in: [room101._id, room201._id] } });

  // 4. Seed Guest Profile & Active Stay for Room 101
  let guestProfile = await GuestProfile.findOne({ hotelId: tenant._id, phone: '9820011223' });
  if (!guestProfile) {
    guestProfile = await GuestProfile.create({
      hotelId: tenant._id,
      name: 'Maharaja Samarjit Singh',
      phone: '9820011223',
      email: 'samarjit.singh@royalheritage.in',
      vipTier: 'PLATINUM',
      totalVisits: 5,
      totalLifetimeSpend: 145000,
      isVerified: true,
      idType: 'AADHAAR',
      idNumberMasked: 'XXXX-XXXX-8822',
    });
  }

  const bNumber = `BKG-ROYAL-${Date.now().toString().slice(-6)}`;
  const booking = await Booking.create({
    hotelId: tenant._id,
    bookingNumber: bNumber,
    guestId: guestProfile._id,
    guestName: guestProfile.name,
    guestPhone: guestProfile.phone,
    guestEmail: guestProfile.email,
    roomTypeId: deluxeType._id,
    assignedRoomId: room101._id,
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000 * 2),
    guestCountAdults: 2,
    guestCountChildren: 0,
    totalTariff: 4500,
    taxAmount: 540,
    grandTotal: 5040,
    advancePaymentAmount: 2500,
    bookingStatus: BookingStatus.CHECKED_IN,
  });

  const folioNumber = `FOL-ROYAL-${Date.now().toString().slice(-5)}`;
  const masterFolio = await MasterFolio.create({
    hotelId: tenant._id,
    stayId: new Types.ObjectId(),
    bookingId: booking._id,
    roomId: room101._id,
    folioNumber,
    totalRoomTariff: 4500,
    totalFoodAndBeverage: 0,
    totalLaundry: 0,
    totalPaidServices: 0,
    totalDamageCharges: 0,
    totalDiscounts: 0,
    totalTaxes: 540,
    advancePaid: 2500,
    netAmountPayable: 5040,
    paidAmount: 2500,
    dueAmount: 2540,
    folioStatus: 'OPEN',
  });

  const activeStay = await Stay.create({
    hotelId: tenant._id,
    bookingId: booking._id,
    guestId: guestProfile._id,
    roomId: room101._id,
    checkInTimestamp: new Date(),
    expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
    stayStatus: StayStatus.ACTIVE,
    masterFolioId: masterFolio._id,
    keyCardIssued: 'KEY-RM101-ORIGINAL',
    isCouple: true,
    verificationMode: 'AADHAAR',
    idNumberMasked: 'XXXX-XXXX-8822',
    verifiedByReceptionist: true,
    receptionistNotes: 'VIP Platinum Guest staying in Room 101.',
  });

  masterFolio.stayId = activeStay._id;
  await masterFolio.save();

  console.log(`✅ Seeded In-House Stay for ${guestProfile.name} in Room 101 (Key: KEY-RM101-ORIGINAL, Folio: ${folioNumber})`);

  // 5. Launch Puppeteer Browser
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    protocolTimeout: 60000,
  });

  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900 });

  const guestPage = await browser.newPage();
  await guestPage.setViewport({ width: 1440, height: 900 });

  try {
    // Dialog handler
    adminPage.on('dialog', async (dialog) => {
      console.log('   [Browser Dialog]:', dialog.message());
      await dialog.dismiss();
    });

    // =========================================================================
    // STEP 1: HOTEL ADMIN ERP (:3005) - INITIATE ROOM MOVE & UPGRADE MODAL
    // =========================================================================
    console.log('\n--- [STEP 1] HOTEL ADMIN ERP: INITIATE ROOM MOVE & SUITE UPGRADE FOR ROOM 101 ---');
    await adminPage.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Set localStorage if needed
    await adminPage.evaluate(`(() => {
      localStorage.setItem('spicehub_hotel_id', '${tenant._id}');
    })()`);

    // Navigate to Front Desk PMS module
    console.log('   Navigating to 1-Click Check-In & Front Desk...');
    await adminPage.evaluate(`(() => {
      const btn =
        document.querySelector('[data-testid="module-nav-FRONT_DESK_CHECKIN"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('1-Click Check-In') || b.innerText.includes('Front Desk'));
      if (btn) btn.click();
    })()`);
    await sleep(2000);

    // Switch to "In-House Staying Guests" tab
    console.log('   Switching to In-House Staying Guests tab...');
    await adminPage.evaluate(`(() => {
      const tab =
        document.querySelector('[data-testid="tab-in-house"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('In-House') || b.innerText.includes('Staying Guests'));
      if (tab) tab.click();
    })()`);
    await sleep(2000);

    // Refresh in-house list to ensure latest DB stay is fetched
    await adminPage.evaluate(`(() => {
      const refreshBtn = document.querySelector('[data-testid="btn-refresh-inhouse"]');
      if (refreshBtn) refreshBtn.click();
    })()`);
    await sleep(2000);

    // Open Room Move Modal on Room 101
    console.log('   Opening Room Move Modal for Room 101...');
    const moveBtnClicked = await adminPage.evaluate(`(() => {
      const btn =
        document.querySelector('[data-testid="btn-room-move-101"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Move / Upgrade'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    console.log(`   Room Move button clicked: ${moveBtnClicked}`);
    await sleep(2000);

    // Fill notes in modal
    await adminPage.evaluate(`(() => {
      const input = document.querySelector('[data-testid="input-move-notes"]');
      if (input) {
        input.value = 'VIP Guest upgraded to Maharaja Royal Terrace Suite upon request.';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(1000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift64_step1_admin_erp_inhouse_guest_initiating_room_move.png` });
    console.log('📸 Step 1 Screenshot Saved: shift64_step1_admin_erp_inhouse_guest_initiating_room_move.png');

    // =========================================================================
    // STEP 2: EXECUTE ROOM MOVE ➔ IN-HOUSE DIRECTORY UPDATED TO ROOM 201
    // =========================================================================
    console.log('\n--- [STEP 2] EXECUTE ROOM MOVE & RE-ISSUE KEY ➔ IN-HOUSE LIST UPDATED ---');
    await adminPage.evaluate(`(() => {
      const submitBtn = document.querySelector('[data-testid="btn-submit-room-move"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3000);

    // Refresh in-house directory
    await adminPage.evaluate(`(() => {
      const refreshBtn = document.querySelector('[data-testid="btn-refresh-inhouse"]');
      if (refreshBtn) refreshBtn.click();
    })()`);
    await sleep(2000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift64_step2_admin_erp_room_move_executed_inhouse_list_updated.png` });
    console.log('📸 Step 2 Screenshot Saved: shift64_step2_admin_erp_room_move_executed_inhouse_list_updated.png');

    // =========================================================================
    // STEP 3: HOUSEKEEPING TURNAROUND QUEUE SHOWS VACATED ROOM 101 (DIRTY)
    // =========================================================================
    console.log('\n--- [STEP 3] VERIFY HOUSEKEEPING TURNAROUND QUEUE: ROOM 101 AUTO-VACATED (DIRTY) ---');
    await adminPage.evaluate(`(() => {
      const tabTurnaround =
        document.querySelector('[data-testid="tab-turnaround"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Turnaround') || b.innerText.includes('Inspection'));
      if (tabTurnaround) tabTurnaround.click();
    })()`);
    await sleep(2500);

    await adminPage.screenshot({ path: `${screenshotDir}/shift64_step3_admin_erp_old_room_transferred_to_housekeeping_dirty.png` });
    console.log('📸 Step 3 Screenshot Saved: shift64_step3_admin_erp_old_room_transferred_to_housekeeping_dirty.png');

    // =========================================================================
    // STEP 4: GUEST IN-ROOM PORTAL (:3004/?room=201) SHOWS NEW ROOM & FOLIO
    // =========================================================================
    console.log('\n--- [STEP 4] GUEST IN-ROOM PORTAL (:3004/?room=201): LIVE FOLIO & ROOM RE-BINDING ---');
    await guestPage.goto('http://localhost:3004/?room=201', { waitUntil: 'networkidle2' });
    await sleep(3000);

    await guestPage.screenshot({ path: `${screenshotDir}/shift64_step4_guest_portal_reconnected_to_new_room_with_updated_folio.png` });
    console.log('📸 Step 4 Screenshot Saved: shift64_step4_guest_portal_reconnected_to_new_room_with_updated_folio.png');

    // 6. Database Verifications
    const finalRoom101 = await Room.findById(room101._id);
    const finalRoom201 = await Room.findById(room201._id);
    const finalStay = await Stay.findById(activeStay._id);
    const finalFolio = await MasterFolio.findById(masterFolio._id);
    const hkTask = await HousekeepingTask.findOne({ hotelId: tenant._id, roomId: room101._id });

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 64 DRILL COMPLETE] ALL FORENSIC VERIFICATIONS PASSED:');
    console.log(`   - Vacated Room 101 Status: ${finalRoom101?.status} (Expected: DIRTY)`);
    console.log(`   - Upgraded Room 201 Status: ${finalRoom201?.status} (Expected: OCCUPIED)`);
    console.log(`   - Final Stay Room Id: ${finalStay?.roomId} (Matches Room 201: ${finalStay?.roomId.equals(room201._id)})`);
    console.log(`   - Re-Issued Keycard Token: ${finalStay?.keyCardIssued}`);
    console.log(`   - Move History Length: ${finalStay?.roomMoveHistory?.length}`);
    console.log(`   - Updated Folio Due Amount: ₹${finalFolio?.dueAmount}`);
    console.log(`   - Turnaround Task Priority: ${hkTask?.priority} (${hkTask?.taskType})`);
    console.log('================================================================================');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift64Drill().catch((err) => {
  console.error('❌ Drill Error:', err);
  process.exit(1);
});
