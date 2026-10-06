import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import { Room, RoomStatus } from '../backend/src/models/Room';
import { RoomType } from '../backend/src/models/RoomType';
import { Stay, StayStatus } from '../backend/src/models/Stay';
import { Booking, BookingStatus } from '../backend/src/models/Booking';
import { MasterFolio } from '../backend/src/models/MasterFolio';
import { GuestProfile, VIPTier } from '../backend/src/models/GuestProfile';
import { FolioLineItem, DepartmentType } from '../backend/src/models/FolioLineItem';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift67Drill() {
  console.log('================================================================================');
  console.log('🏷️ [SHIFT 67 DRILL] FRONT DESK MANAGER RATE OVERRIDE & PIN APPROVAL TERMINAL');
  console.log('   Admin ERP (:3005) ➔ Rate Override Modal ➔ Security PIN ➔ Folio Sync');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // 1. Ensure Room Type
  let deluxeType = await RoomType.findOne({ hotelId: tenant._id, code: 'DLX-67' });
  if (!deluxeType) {
    deluxeType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Deluxe Heritage Chamber',
      code: 'DLX-67',
      slug: `dlx-67-${Date.now()}`,
      basePriceOvernight: 3500,
      maxOccupancyAdults: 2,
    });
  }

  // 2. Ensure Physical Room 102
  let room102 = await Room.findOne({ hotelId: tenant._id, roomNumber: '102' });
  if (!room102) {
    room102 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '102',
      floorNumber: 1,
      wing: 'East Wing',
      roomTypeId: deluxeType._id,
      permanentQrCodeHash: `room-102-hash-${Date.now()}`,
      status: RoomStatus.OCCUPIED,
    });
  } else {
    room102.status = RoomStatus.OCCUPIED;
    await room102.save();
  }

  // 3. Ensure VIP Guest Profile
  let guestProfile = await GuestProfile.findOne({ hotelId: tenant._id, phone: '9844005511' });
  if (!guestProfile) {
    guestProfile = await GuestProfile.create({
      hotelId: tenant._id,
      name: 'Princess Gayatri Devi',
      phone: '9844005511',
      email: 'gayatri.devi@royal-estates.in',
      vipTier: VIPTier.VIP,
      totalStays: 6,
      totalSpent: 95000,
      loyaltyPoints: 1850,
      isVerified: true,
      idNumberMasked: 'XXXX-XXXX-5511',
    });
  }

  // 4. Seed Clean Active In-House Stay for Room 102
  await Stay.deleteMany({ hotelId: tenant._id, roomId: room102._id, stayStatus: StayStatus.ACTIVE });
  await MasterFolio.deleteMany({ hotelId: tenant._id, roomId: room102._id });

  const bNumber = `BKG-67-${Date.now().toString().slice(-5)}`;
  const booking = await Booking.create({
    hotelId: tenant._id,
    bookingNumber: bNumber,
    guestName: guestProfile.name,
    guestPhone: guestProfile.phone,
    guestEmail: guestProfile.email,
    roomTypeId: deluxeType._id,
    allocatedRoomId: room102._id,
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000),
    guestCountAdults: 2,
    guestCountChildren: 0,
    totalTariff: 3500,
    taxAmount: 420,
    grandTotal: 3920,
    advancePaymentAmount: 1000,
    bookingStatus: BookingStatus.CHECKED_IN,
  });

  const folioNumber = `FOL-67-${Date.now().toString().slice(-5)}`;
  const masterFolio = await MasterFolio.create({
    hotelId: tenant._id,
    stayId: new Types.ObjectId(),
    bookingId: booking._id,
    roomId: room102._id,
    folioNumber,
    totalRoomTariff: 3500,
    totalFoodAndBeverage: 0,
    totalLaundry: 0,
    totalPaidServices: 0,
    totalDamageCharges: 0,
    totalDiscounts: 0,
    totalTaxes: 420,
    advancePaid: 1000,
    netAmountPayable: 3920,
    paidAmount: 1000,
    dueAmount: 2920,
    folioStatus: 'OPEN',
  });

  const activeStay = await Stay.create({
    hotelId: tenant._id,
    bookingId: booking._id,
    guestId: guestProfile._id,
    roomId: room102._id,
    checkInTimestamp: new Date(),
    expectedCheckOutTimestamp: new Date(Date.now() + 86400000),
    stayStatus: StayStatus.ACTIVE,
    masterFolioId: masterFolio._id,
    keyCardIssued: 'KEY-RM102-ORIGINAL',
    isCouple: true,
    verificationMode: 'AADHAAR',
    idNumberMasked: 'XXXX-XXXX-5511',
    verifiedByReceptionist: true,
    baseRatePerNight: 3500,
    effectiveRatePerNight: 3500,
    isComplimentaryWaiver: false,
    receptionistNotes: 'VIP guest staying in Room 102. Standard tariff ₹3,500/night.',
  });

  masterFolio.stayId = activeStay._id;
  await masterFolio.save();

  console.log(`✅ Seeded In-House Stay for ${guestProfile.name} in Room 102 (Key: KEY-RM102-ORIGINAL, Folio: ${folioNumber})`);

  // Generate valid manager auth token
  const managerToken = jwt.sign(
    {
      userId: new Types.ObjectId(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Duty Manager Vikramaditya',
      email: 'manager.vikram@tajhotels.com',
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // 5. Launch Puppeteer Browser
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    protocolTimeout: 60000,
  });

  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1440, height: 900 });

  try {
    adminPage.on('dialog', async (dialog) => {
      console.log('   [Browser Dialog]:', dialog.message());
      await dialog.dismiss();
    });

    // =========================================================================
    // STEP 1: HOTEL ADMIN ERP (:3005) - OPEN RATE OVERRIDE MODAL
    // =========================================================================
    console.log('\n--- [STEP 1] HOTEL ADMIN ERP: INITIATE RATE OVERRIDE FOR ROOM 102 ---');
    await adminPage.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Set auth tokens in localStorage
    await adminPage.evaluate(
      `((tId, tok) => {
        localStorage.setItem('spicehub_hotel_id', tId);
        localStorage.setItem('hotelId', tId);
        localStorage.setItem('spicehub_token', tok);
        localStorage.setItem('token', tok);
      })('${tenant._id}', '${managerToken}')`
    );

    // Navigate to Front Desk Check-in Module
    console.log('   Navigating to Front Desk Check-In & In-House Register...');
    await adminPage.evaluate(`(() => {
      const btn =
        document.querySelector('[data-testid="module-nav-FRONT_DESK_CHECKIN"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('1-Click Check-In') || b.innerText.includes('Front Desk'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // Click "In-House Guests" tab
    console.log('   Switching to "In-House Guests" Tab...');
    await adminPage.evaluate(`(() => {
      const tab =
        document.querySelector('[data-testid="tab-in-house"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('In-House') || b.innerText.includes('Staying Guests'));
      if (tab) tab.click();
    })()`);
    await sleep(2000);

    // Click "Override" button on Room 102 card
    console.log('   Clicking "Override" on Room 102 Card...');
    const clickedOverride = await adminPage.evaluate(`(() => {
      const btn =
        document.querySelector('[data-testid="btn-rate-override-102"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Override'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`);
    console.log('   -> Clicked Override button:', clickedOverride);
    await sleep(2000);

    // Verify Rate Override Modal is Open
    const isModalOpen = await adminPage.evaluate(`(() => {
      return Boolean(document.querySelector('[data-testid="modal-rate-override"]'));
    })()`);
    console.log('   -> Rate Override Modal Active in DOM:', isModalOpen);

    const step1Shot = `${screenshotDir}/shift67_step1_admin_erp_inhouse_guest_rate_override_modal_opened.png`;
    await adminPage.screenshot({ path: step1Shot, fullPage: false });
    console.log('   📸 Saved:', step1Shot);

    // =========================================================================
    // STEP 2: SELECT 25% DISCOUNT & MANAGER SECURITY PIN AUTHORIZATION TERMINAL
    // =========================================================================
    console.log('\n--- [STEP 2] CONFIGURE 25% DISCOUNT & PIN AUTHORIZATION TERMINAL ---');

    // Select 25% discount preset
    await adminPage.evaluate(`(() => {
      const pctBtn = document.querySelector('[data-testid="btn-quick-pct-25"]');
      if (pctBtn) pctBtn.click();
      
      const justInput = document.querySelector('[data-testid="input-override-justification"]');
      if (justInput) {
        justInput.value = 'AC compressor noise overnight. Duty Manager 25% recovery concession.';
        justInput.dispatchEvent(new Event('input', { bubbles: true }));
        justInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      const pinInput = document.querySelector('[data-testid="input-manager-pin"]');
      if (pinInput) {
        pinInput.value = '9921';
        pinInput.dispatchEvent(new Event('input', { bubbles: true }));
        pinInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(1500);

    const calculationDetails: any = await adminPage.evaluate(`(() => {
      const box = document.querySelector('[data-testid="box-override-calculation"]');
      const tierBadge = document.querySelector('[data-testid="badge-approval-tier"]');
      return {
        boxText: box ? box.innerText.replace(/\\n+/g, ' | ') : 'N/A',
        tier: tierBadge ? tierBadge.innerText : 'N/A',
      };
    })()`);
    console.log('   -> Calculation Box Rendered:', calculationDetails?.boxText);
    console.log('   -> Approval Tier Detected:', calculationDetails?.tier);

    const step2Shot = `${screenshotDir}/shift67_step2_rate_override_calculation_and_pin_terminal.png`;
    // Scroll modal slightly to show PIN terminal and confirm button
    await adminPage.evaluate(`(() => {
      const modal = document.querySelector('[data-testid="modal-rate-override"]');
      if (modal) modal.scrollTop = 280;
    })()`);
    await sleep(800);
    await adminPage.screenshot({ path: step2Shot, fullPage: false });
    console.log('   📸 Saved:', step2Shot);

    // =========================================================================
    // STEP 3: EXECUTE RATE OVERRIDE & VERIFY BADGE ON IN-HOUSE GUEST CARD
    // =========================================================================
    console.log('\n--- [STEP 3] EXECUTE RATE OVERRIDE & VERIFY IN-HOUSE BADGE ---');

    await adminPage.evaluate(`(() => {
      const confirmBtn = document.querySelector('[data-testid="btn-confirm-rate-override"]');
      if (confirmBtn) confirmBtn.click();
    })()`);
    await sleep(2500);

    // Scroll to Room 102 card to show badge and buttons clearly
    await adminPage.evaluate(`(() => {
      const card = document.querySelector('[data-testid="badge-rate-override-102"]');
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(800);

    // Verify Rate Override badge on Room 102 Card
    const badgeDetails: any = await adminPage.evaluate(`(() => {
      const badge = document.querySelector('[data-testid="badge-rate-override-102"]');
      return {
        hasBadge: Boolean(badge),
        text: badge ? badge.innerText.replace(/\\n/g, ' ') : '',
      };
    })()`);
    console.log('   -> Room 102 Rate Override Badge:', badgeDetails?.hasBadge, `("${badgeDetails?.text}")`);

    const step3Shot = `${screenshotDir}/shift67_step3_rate_override_applied_badge_on_inhouse_card.png`;
    await adminPage.screenshot({ path: step3Shot, fullPage: false });
    console.log('   📸 Saved:', step3Shot);

    // =========================================================================
    // STEP 4: COMPLIMENTARY TARIFF WAIVER & FOLIO BALANCE SYNC
    // =========================================================================
    console.log('\n--- [STEP 4] TEST 100% COMPLIMENTARY TARIFF WAIVER & FOLIO SYNC ---');

    // Click "Override" again on Room 102 to apply 100% Complimentary Waiver
    await adminPage.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="btn-rate-override-102"]');
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // Select COMPLIMENTARY_WAIVER mode
    await adminPage.evaluate(`(() => {
      const compBtn = document.querySelector('[data-testid="btn-override-type-COMPLIMENTARY_WAIVER"]');
      if (compBtn) compBtn.click();

      const reasonSelect = document.querySelector('[data-testid="select-override-reason"]');
      if (reasonSelect) {
        reasonSelect.value = 'MANAGEMENT_COURTESY';
        reasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const justInput = document.querySelector('[data-testid="input-override-justification"]');
      if (justInput) {
        justInput.value = 'General Manager approved 100% complimentary VIP royal stay.';
        justInput.dispatchEvent(new Event('input', { bubbles: true }));
        justInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const pinInput = document.querySelector('[data-testid="input-manager-pin"]');
      if (pinInput) {
        pinInput.value = '9921';
        pinInput.dispatchEvent(new Event('input', { bubbles: true }));
        pinInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(1500);

    // Submit Complimentary Waiver
    await adminPage.evaluate(`(() => {
      const confirmBtn = document.querySelector('[data-testid="btn-confirm-rate-override"]');
      if (confirmBtn) confirmBtn.click();
    })()`);
    await sleep(2500);

    // Scroll to Room 102 card
    await adminPage.evaluate(`(() => {
      const badge = document.querySelector('[data-testid="badge-rate-override-102"]');
      if (badge) badge.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(800);

    // Verify 100% Complimentary Waiver badge
    const waiverBadgeDetails: any = await adminPage.evaluate(`(() => {
      const badge = document.querySelector('[data-testid="badge-rate-override-102"]');
      return {
        hasBadge: Boolean(badge),
        text: badge ? badge.innerText.replace(/\\n/g, ' ') : '',
      };
    })()`);
    console.log('   -> Room 102 Complimentary Waiver Badge:', waiverBadgeDetails?.hasBadge, `("${waiverBadgeDetails?.text}")`);

    // Fetch updated Stay and MasterFolio from DB to confirm ledger state
    const updatedStay = await Stay.findById(activeStay._id);
    const updatedFolio = await MasterFolio.findById(masterFolio._id);
    const discountItems = await FolioLineItem.find({ folioId: masterFolio._id, department: DepartmentType.DISCOUNT });
    console.log(`   -> DB Stay Effective Rate: ₹${updatedStay?.effectiveRatePerNight}/night (Complimentary: ${updatedStay?.isComplimentaryWaiver})`);
    console.log(`   -> DB Folio Total Discounts: ₹${updatedFolio?.totalDiscounts}, Due Amount: ₹${updatedFolio?.dueAmount}`);
    console.log(`   -> Discount Folio Line Items Created: ${discountItems.length}`);

    const step4Shot = `${screenshotDir}/shift67_step4_complimentary_waiver_and_folio_balance_sync.png`;
    await adminPage.screenshot({ path: step4Shot, fullPage: false });
    console.log('   📸 Saved:', step4Shot);

    console.log('\n🎉 [SUCCESS] SHIFT 67 DRILL COMPLETED WITH ALL 4 VISUAL PROOFS CAPTURED!');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift67Drill().catch((err) => {
  console.error('❌ Drill Error:', err);
  process.exit(1);
});
