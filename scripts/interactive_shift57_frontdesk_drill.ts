import puppeteer, { Browser } from 'puppeteer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenant } from '../backend/src/models/Tenant';
import { Room } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay } from '../backend/src/models/Stay';
import { GuestProfile } from '../backend/src/models/GuestProfile';
import { Booking } from '../backend/src/models/Booking';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { User } from '../backend/src/models/User';
import jwt from 'jsonwebtoken';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift57FrontDeskDrill() {
  console.log('================================================================================');
  console.log('🛎️ [SHIFT 57 DRILL] FLEXIBLE FRONT DESK CHECK-IN, COUPLE AADHAAR & GUEST HISTORY');
  console.log('   1-Click Direct Check-In | Couple Verification | Masked Aadhaar | Lifetime CRM');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant Taj Gateway not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure RoomType exists
  let deluxeType = await RoomType.findOne({ hotelId: tenant._id, code: 'DLX' });
  if (!deluxeType) {
    deluxeType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Deluxe Heritage Room',
      code: 'DLX',
      basePriceOvernight: 4500,
      basePriceDayUse: 2500,
      basePriceHourly: 800,
      maxOccupancy: 2,
    });
  }

  // Ensure Room 101 and 102 exist and are set to AVAILABLE
  let r101 = await Room.findOne({ hotelId: tenant._id, roomNumber: '101' });
  if (!r101) {
    r101 = await Room.create({
      hotelId: tenant._id,
      roomTypeId: deluxeType._id,
      roomNumber: '101',
      floorNumber: 1,
      status: 'AVAILABLE',
      isActive: true,
    });
  } else {
    r101.status = 'AVAILABLE';
    await r101.save();
  }

  let r102 = await Room.findOne({ hotelId: tenant._id, roomNumber: '102' });
  if (!r102) {
    r102 = await Room.create({
      hotelId: tenant._id,
      roomTypeId: deluxeType._id,
      roomNumber: '102',
      floorNumber: 1,
      status: 'AVAILABLE',
      isActive: true,
    });
  } else {
    r102.status = 'AVAILABLE';
    await r102.save();
  }

  // Clean prior active stays for Room 101 and 102 so clean test run
  await Stay.deleteMany({ hotelId: tenant._id, roomId: { $in: [r101._id, r102._id] }, stayStatus: 'ACTIVE' });
  await Room.updateMany({ hotelId: tenant._id, _id: { $in: [r101._id, r102._id] } }, { status: 'AVAILABLE' });

  // Ensure Guest Profile with prior stay history exists for phone 9811223344
  let arjunProfile = await GuestProfile.findOne({ hotelId: tenant._id, phone: '9811223344' });
  if (!arjunProfile) {
    arjunProfile = await GuestProfile.create({
      hotelId: tenant._id,
      name: 'Arjun & Simran Verma',
      phone: '9811223344',
      email: 'arjun.verma@example.com',
      vipTier: 'GOLD',
      totalVisits: 3,
      totalLifetimeSpend: 24500,
      lastVisitDate: new Date(Date.now() - 30 * 86400000),
      isVerified: true,
      idType: 'AADHAAR',
      idNumberMasked: 'XXXX-XXXX-4589',
      specialNotes: 'Prefers quiet corner room on higher floors. High-value repeat couple.',
    });
  }

  const pastStayCount = await Stay.countDocuments({ hotelId: tenant._id, guestId: arjunProfile._id });
  if (pastStayCount === 0) {
    const pastBooking = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: 'RES-HIST-9811',
      guestName: 'Arjun & Simran Verma',
      guestPhone: '9811223344',
      guestEmail: 'arjun.verma@example.com',
      roomTypeId: deluxeType._id,
      allocatedRoomId: r101._id,
      checkInDate: new Date(Date.now() - 30 * 86400000),
      checkOutDate: new Date(Date.now() - 28 * 86400000),
      totalNights: 2,
      bookingStatus: 'CHECKED_OUT',
      bookingSource: 'WALK_IN',
      bookingMode: 'OVERNIGHT',
      totalTariff: 9000,
      taxAmount: 1080,
      grandTotal: 10080,
      paymentStatus: 'PAID',
    });

    await Stay.create({
      hotelId: tenant._id,
      bookingId: pastBooking._id,
      guestId: arjunProfile._id,
      roomId: r101._id,
      checkInTimestamp: new Date(Date.now() - 30 * 86400000),
      expectedCheckOutTimestamp: new Date(Date.now() - 28 * 86400000),
      actualCheckOutTimestamp: new Date(Date.now() - 28 * 86400000),
      stayStatus: 'CHECKED_OUT',
      isCouple: true,
      verificationMode: 'AADHAAR',
      idNumberMasked: 'XXXX-XXXX-4589',
      verifiedByReceptionist: true,
      receptionistNotes: 'Checked in during Diwali holiday. Original Aadhaar inspected.',
    });
    console.log('✅ Seeded past completed stay for Arjun & Simran Verma');
  }

  // Generate Admin JWT Token
  const managerUser = (await User.findOne({ hotelId: tenant._id, role: 'HOTEL_ADMIN' })) || (await User.findOne({ hotelId: tenant._id }));
  const token = jwt.sign(
    {
      userId: managerUser?._id?.toString() || 'admin-test',
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
    },
    process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921',
    { expiresIn: '12h' }
  );

  console.log('✅ Generated JWT Token for Hotel Admin');

  const browser: Browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1440,900',
    ],
    protocolTimeout: 120000,
  });

  try {
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });

    adminPage.on('dialog', async (dialog) => {
      console.log(`   🔔 Auto-dismissed dialog: "${dialog.message()}"`);
      await dialog.accept().catch(() => {});
    });

    // Set local storage before navigating
    await adminPage.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await adminPage.evaluate((t, hid) => {
      localStorage.setItem('spicehub_token', t);
      localStorage.setItem('token', t);
      localStorage.setItem('spicehub_hotel_id', hid);
      localStorage.setItem('hotelId', hid);
    }, token, tenant._id.toString());

    await adminPage.goto('http://localhost:3005', { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    console.log('✅ Hotel Admin ERP loaded (:3005)');

    // =========================================================================
    // STEP 1: NAVIGATE TO 1-CLICK CHECK-IN & KYC MODULE
    // =========================================================================
    console.log('\n🛎️ [STEP 1] Navigating to 1-Click Check-In & KYC Terminal...');

    const checkInNavClicked = await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) =>
        b.innerText.includes('1-Click Check-In') ||
        b.innerText.includes('1-Click Check-In & KYC')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('   Navigated to Front Desk 1-Click Terminal:', checkInNavClicked);
    await sleep(2000);

    // Fill in Guest Details for Room 101 (Direct 1-Click Walk-in - NO DOCS)
    await adminPage.waitForSelector('[data-testid="input-guest-name"]');
    await adminPage.click('[data-testid="input-guest-name"]');
    await adminPage.type('[data-testid="input-guest-name"]', 'Kabir Malhotra');

    await adminPage.click('[data-testid="input-guest-phone"]');
    await adminPage.type('[data-testid="input-guest-phone"]', '9876543210');

    await sleep(1000);
    await adminPage.screenshot({ path: `${screenshotDir}/shift57_step1_frontdesk_checkin_terminal.png` });
    console.log('📸 Saved shift57_step1_frontdesk_checkin_terminal.png');

    // Submit Direct Check-In for Kabir
    await adminPage.click('[data-testid="btn-submit-checkin"]');
    console.log('   Submitted 1-Click Direct Check-In (No Docs)');
    await sleep(3500);

    // =========================================================================
    // STEP 2: COUPLE CHECK-IN WITH AADHAAR VERIFICATION ON ROOM 102
    // =========================================================================
    console.log('\n👫 [STEP 2] Performing Couple Aadhaar Verification Check-In for Room 102...');

    // Select CheckIn Tab again if switched
    await adminPage.click('[data-testid="tab-checkin"]');
    await sleep(1000);

    // Select Room 102 card
    await adminPage.evaluate(() => {
      const roomCards = Array.from(document.querySelectorAll('button'));
      const r102Card = roomCards.find((b) => b.innerText.includes('Room 102'));
      if (r102Card) r102Card.click();
    });
    await sleep(1000);

    // Fill form for Room 102 Couple
    await adminPage.click('[data-testid="input-guest-name"]', { clickCount: 3 });
    await adminPage.keyboard.press('Backspace');
    await adminPage.type('[data-testid="input-guest-name"]', 'Vikramaditya & Ananya Singhania');

    await adminPage.click('[data-testid="input-guest-phone"]', { clickCount: 3 });
    await adminPage.keyboard.press('Backspace');
    await adminPage.type('[data-testid="input-guest-phone"]', '9811223344');

    // Toggle Couple Mode checkbox
    await adminPage.click('#coupleToggle');
    await sleep(1000);

    // Fill Aadhaar input
    await adminPage.waitForSelector('[data-testid="input-aadhaar"]');
    await adminPage.click('[data-testid="input-aadhaar"]');
    await adminPage.type('[data-testid="input-aadhaar"]', '5421 8890 4589');

    await sleep(1000);
    await adminPage.screenshot({ path: `${screenshotDir}/shift57_step2_couple_aadhaar_verification.png` });
    console.log('📸 Saved shift57_step2_couple_aadhaar_verification.png');

    // Confirm & Check-In Couple
    await adminPage.click('[data-testid="btn-submit-checkin"]');
    console.log('   Submitted Couple Aadhaar Check-In');
    await sleep(3500);

    // =========================================================================
    // STEP 3: IN-HOUSE STAYING GUESTS DIRECTORY
    // =========================================================================
    console.log('\n🏨 [STEP 3] Opening In-House Staying Guests Directory...');

    await adminPage.click('[data-testid="tab-in-house"]');
    await sleep(3000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift57_step3_inhouse_guests_board.png` });
    console.log('📸 Saved shift57_step3_inhouse_guests_board.png');

    // =========================================================================
    // STEP 4: GUEST STAY HISTORY & CRM LEDGER
    // =========================================================================
    console.log('\n📖 [STEP 4] Searching Guest Stay History & Lifetime CRM Ledger...');

    await adminPage.click('[data-testid="tab-history"]');
    await sleep(1500);

    // Type 9811223344 in search input and click Search
    await adminPage.waitForSelector('[data-testid="input-search-history"]');
    await adminPage.click('[data-testid="input-search-history"]');
    await adminPage.type('[data-testid="input-search-history"]', '9811223344');
    await adminPage.click('[data-testid="btn-search-history"]');
    await sleep(3000);

    await adminPage.screenshot({ path: `${screenshotDir}/shift57_step4_guest_stay_history.png` });
    console.log('📸 Saved shift57_step4_guest_stay_history.png');

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 57 COMPLETE] ALL 4 VERIFICATION DRILLS EXECUTED & VISUALIZED!');
    console.log('================================================================================');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift57FrontDeskDrill().catch((err) => {
  console.error('❌ Error executing Shift 57 Drill:', err);
  process.exit(1);
});
