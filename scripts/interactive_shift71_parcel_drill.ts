import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import {
  GuestParcelLog,
  ParcelDirection,
  CourierPartner,
  ParcelPackageType,
  ParcelStatus,
} from '../backend/src/models/GuestParcelLog';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runShift71ParcelDrill() {
  console.log('================================================================================');
  console.log('📦 [SHIFT 71 DRILL] FRONT DESK PARCEL & COURIER LOGGING & DELIVERY PIPELINE');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Primary Tenant not found');
  console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure realistic parcel records exist for demo property
  await GuestParcelLog.deleteMany({ hotelId: tenant._id });

  const demoParcels = [
    {
      hotelId: tenant._id,
      parcelTag: 'PCL-2026-1001',
      direction: ParcelDirection.INWARD,
      courierPartner: CourierPartner.AMAZON,
      trackingAwb: 'AMZ-IN-88912340',
      senderInfo: {
        name: 'Amazon Prime Fulfillment Hub',
        organization: 'Amazon India',
        contactPhone: '+91 80000 11223',
      },
      recipientInfo: {
        guestName: 'Vikram Malhotra',
        roomNumber: '304',
        guestPhone: '+91 98765 43210',
        guestEmail: 'vikram.m@example.com',
      },
      packageType: ParcelPackageType.BOX,
      pieceCount: 1,
      isHighValue: false,
      storageLocation: 'PARCEL-BAY-02',
      status: ParcelStatus.RECEIVED_AT_DESK,
      receivedAt: new Date(Date.now() - 3600000 * 3),
      receivedByStaffName: 'Concierge Anita Sharma',
      verificationPin: '4192',
      auditTrail: [
        {
          timestamp: new Date(Date.now() - 3600000 * 3),
          action: 'INWARD_LOGGED',
          performedBy: 'Concierge Anita Sharma',
          details: 'Received from Amazon Logistics courier partner',
        },
      ],
    },
    {
      hotelId: tenant._id,
      parcelTag: 'PCL-2026-1002',
      direction: ParcelDirection.INWARD,
      courierPartner: CourierPartner.BLUE_DART,
      trackingAwb: 'BLUEDART-55410928',
      senderInfo: {
        name: 'Apollo Pharmacy Express',
        organization: 'Apollo Healthcare',
        contactPhone: '+91 1800 200 4455',
      },
      recipientInfo: {
        guestName: 'Dr. Sunita Deshmukh',
        roomNumber: '512',
        guestPhone: '+91 98111 22334',
      },
      packageType: ParcelPackageType.MEDICINE_PERISHABLE,
      pieceCount: 1,
      isHighValue: true,
      storageLocation: 'CONCIERGE-COOLER-01',
      status: ParcelStatus.GUEST_NOTIFIED,
      receivedAt: new Date(Date.now() - 3600000 * 1.5),
      receivedByStaffName: 'Front Desk Rajesh Kumar',
      verificationPin: '8831',
      auditTrail: [
        {
          timestamp: new Date(Date.now() - 3600000 * 1.5),
          action: 'INWARD_LOGGED',
          performedBy: 'Front Desk Rajesh Kumar',
          details: 'Critical temperature-controlled insulin package stored in cold locker',
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 1.2),
          action: 'GUEST_NOTIFIED',
          performedBy: 'Front Desk Rajesh Kumar',
          details: 'Urgent SMS notification and Guest Room Portal alert delivered',
        },
      ],
    },
    {
      hotelId: tenant._id,
      parcelTag: 'PCL-2026-1003',
      direction: ParcelDirection.INWARD,
      courierPartner: CourierPartner.DHL,
      trackingAwb: 'DHL-EXPRESS-99217',
      senderInfo: {
        name: 'Legal Counsel Chambers',
        organization: 'Shardul Amarchand & Co',
        contactPhone: '+91 11 4159 0000',
      },
      recipientInfo: {
        guestName: 'Ananya Singhania',
        roomNumber: '601',
        guestPhone: '+91 99222 33445',
      },
      packageType: ParcelPackageType.DOCUMENT,
      pieceCount: 1,
      isHighValue: true,
      storageLocation: 'FRONTDESK-SAFE-DRAWER',
      status: ParcelStatus.OUT_FOR_ROOM_DELIVERY,
      receivedAt: new Date(Date.now() - 3600000 * 2),
      receivedByStaffName: 'Bell Captain Ramesh',
      verificationPin: '6520',
      dispatchInfo: {
        dispatchedAt: new Date(Date.now() - 1800000),
        porterName: 'Porter Sunil K',
        targetLocation: 'Room 601',
        notes: 'Urgent legal contract handover',
      },
      auditTrail: [
        {
          timestamp: new Date(Date.now() - 3600000 * 2),
          action: 'INWARD_LOGGED',
          performedBy: 'Bell Captain Ramesh',
          details: 'Confidential sealed envelope',
        },
        {
          timestamp: new Date(Date.now() - 1800000),
          action: 'DISPATCHED_TO_ROOM',
          performedBy: 'Bell Captain Ramesh',
          details: 'Dispatched with Porter Sunil K to Room 601',
        },
      ],
    },
    {
      hotelId: tenant._id,
      parcelTag: 'OUT-2026-2001',
      direction: ParcelDirection.OUTWARD,
      courierPartner: CourierPartner.FEDEX,
      trackingAwb: 'FDX-EXP-4412903',
      senderInfo: {
        name: 'Pooja Hegde',
        organization: 'Guest Room 204',
        contactPhone: '+91 97777 88899',
        address: 'Room 204, Grand Palace Hotel',
      },
      recipientInfo: {
        guestName: 'Vogue Studios International',
        guestPhone: '+1 212 555 0199',
        guestEmail: 'wardrobe@voguestudios.com',
      },
      packageType: ParcelPackageType.CRATE,
      pieceCount: 2,
      isHighValue: true,
      storageLocation: 'OUTWARD-DISPATCH-BAY',
      status: ParcelStatus.OUTWARD_BOOKED,
      receivedAt: new Date(Date.now() - 3600000 * 4),
      receivedByStaffName: 'Concierge Anita Sharma',
      verificationPin: '9002',
      outwardDetails: {
        destinationAddress: '4 World Trade Center, New York, NY 10007, USA',
        estimatedCharge: 4200,
        folioPosted: true,
      },
      auditTrail: [
        {
          timestamp: new Date(Date.now() - 3600000 * 4),
          action: 'OUTWARD_BOOKED',
          performedBy: 'Concierge Anita Sharma',
          details: 'Guest booked international courier; ₹4,200 posted to Room 204 Folio',
        },
      ],
    },
  ];

  await GuestParcelLog.insertMany(demoParcels);
  console.log(`✅ Seeded ${demoParcels.length} demonstration parcels.`);

  // Generate Admin JWT token
  const token = jwt.sign(
    {
      userId: new Types.ObjectId().toString(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Duty Concierge Manager',
    },
    JWT_SECRET,
    { expiresIn: '4h' }
  );

  console.log('🚀 Launching Puppeteer browser...');
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to hotel admin ERP (:3005)
  console.log('🌐 Opening Hotel Admin ERP on http://localhost:3005 ...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle2', timeout: 30000 });

  // Inject token and hotel context into localStorage
  await page.evaluate(
    (t, hid) => {
      localStorage.setItem('spicehub_token', t);
      localStorage.setItem('token', t);
      localStorage.setItem('spicehub_hotel_id', hid);
      localStorage.setItem('hotelId', hid);
    },
    token,
    tenant._id.toString()
  );

  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1500);

  // Click Front Desk Check-in Navigation Menu
  console.log('🛎️ Navigating to Front Desk Check-In & Reception Hub...');
  const frontDeskNav = await page.$('button[data-testid="nav-frontdesk"], button[data-testid="nav-front-desk"]');
  if (frontDeskNav) {
    await frontDeskNav.click();
    await sleep(1000);
  } else {
    // Try clicking by text "Front Desk"
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fd = btns.find((b) => b.innerText.includes('Front Desk') || b.innerText.includes('Check-In'));
      if (fd) {
        fd.click();
        return true;
      }
      return false;
    });
    if (clicked) await sleep(1000);
  }

  // Click Parcels Tab
  console.log('📦 Switching to Parcels & Courier Desk tab...');
  const tabParcels = await page.waitForSelector('button[data-testid="tab-parcels"]', { timeout: 10000 });
  if (tabParcels) {
    await tabParcels.click();
    await sleep(1500);
  }

  // Step 1: Capture Parcels Workspace & Holding Inventory
  const ss1 = `${screenshotDir}/shift71_step1_frontdesk_parcel_workspace_and_holding_inventory.png`;
  await page.screenshot({ path: ss1, fullPage: false });
  console.log(`📸 Captured: ${ss1}`);

  // Step 2: Open Log Inward Parcel Modal
  console.log('➕ Opening Log Inward Parcel Modal...');
  const btnLogInward = await page.waitForSelector('button[data-testid="btn-open-log-inward-parcel"]', { timeout: 5000 });
  if (btnLogInward) {
    await btnLogInward.click();
    await sleep(1000);
  }

  const ss2 = `${screenshotDir}/shift71_step2_log_inward_courier_modal_open.png`;
  await page.screenshot({ path: ss2, fullPage: false });
  console.log(`📸 Captured: ${ss2}`);

  // Close modal by clicking cancel
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find((b) => b.innerText === 'Cancel');
    if (cancel) cancel.click();
  });
  await sleep(800);

  // Step 3: Open Handover & Digital Signature Modal on PCL-2026-1001
  console.log('✍️ Opening Guest Handover & Digital Signature Modal on PCL-2026-1001...');
  const btnHandover = await page.waitForSelector('button[data-testid="btn-complete-delivery-PCL-2026-1001"]', { timeout: 5000 });
  if (btnHandover) {
    await btnHandover.click();
    await sleep(1000);
  }

  const ss3 = `${screenshotDir}/shift71_step3_handover_and_digital_signature_modal_open.png`;
  await page.screenshot({ path: ss3, fullPage: false });
  console.log(`📸 Captured: ${ss3}`);

  // Close handover modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find((b) => b.innerText === 'Cancel');
    if (cancel) cancel.click();
  });
  await sleep(800);

  // Step 4: Open Book Outward Courier Modal
  console.log('📤 Opening Book Outward Courier Modal...');
  const btnBookOutward = await page.waitForSelector('button[data-testid="btn-open-book-outward-courier"]', { timeout: 5000 });
  if (btnBookOutward) {
    await btnBookOutward.click();
    await sleep(1000);
  }

  const ss4 = `${screenshotDir}/shift71_step4_book_outward_guest_courier_modal_open.png`;
  await page.screenshot({ path: ss4, fullPage: false });
  console.log(`📸 Captured: ${ss4}`);

  await browser.close();
  await mongoose.disconnect();
  console.log('🏆 SHIFT 71 PARCEL DRILL COMPLETED WITH 100% SUCCESS!');
}

runShift71ParcelDrill().catch((err) => {
  console.error('Drill Error:', err);
  process.exit(1);
});
