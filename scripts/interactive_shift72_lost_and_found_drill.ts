/// <reference lib="dom" />
import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import {
  LostAndFound,
  LostAndFoundCategory,
  LostAndFoundStatus,
} from '../backend/src/models/LostAndFound';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runShift72LostAndFoundDrill() {
  console.log('================================================================================');
  console.log('🔍 [SHIFT 72 DRILL] FRONT DESK LOST & FOUND VAULT & CHAIN OF CUSTODY WORKSTATION');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Primary Tenant not found');
  console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

  // Reset and seed realistic items for demo property
  await LostAndFound.deleteMany({ hotelId: tenant._id });

  const demoItems = [
    {
      hotelId: tenant._id,
      trackingNumber: 'LF-2026-7201',
      description: 'Apple MacBook Pro 16" M3 Max Space Black with charger',
      category: LostAndFoundCategory.ELECTRONICS,
      foundLocation: 'Presidential Suite 501 Desk',
      foundByUserId: new Types.ObjectId(),
      guestName: 'Rohit Singhania',
      storageLocation: 'Vault Safe Locker Bay A',
      secureVaultLocker: 'VAULT-A01',
      estimatedValue: 245000,
      isHighValue: true,
      retentionExpiryDate: new Date(Date.now() + 90 * 86400000),
      status: LostAndFoundStatus.LOGGED,
      custodyChain: [
        {
          action: 'LOGGED',
          performedByName: 'Housekeeping Supervisor Sunita',
          fromLocation: 'Presidential Suite 501',
          toLocation: 'Front Desk Vault',
          timestamp: new Date(Date.now() - 3600000 * 4),
          notes: 'Found in study desk drawer post check-out',
        },
        {
          action: 'MOVED_TO_VAULT',
          performedByName: 'Duty Manager Sharma',
          fromLocation: 'Front Desk Vault',
          toLocation: 'VAULT-A01',
          timestamp: new Date(Date.now() - 3600000 * 3.5),
          notes: 'Secured inside digital high-value safe locker VAULT-A01',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      hotelId: tenant._id,
      trackingNumber: 'LF-2026-7202',
      description: 'Tanishq 22K Gold Diamond Solitaire Ring in velvet box',
      category: LostAndFoundCategory.JEWELRY,
      foundLocation: 'Infinity Pool Deck Cabana 3',
      foundByUserId: new Types.ObjectId(),
      guestName: 'Ananya Mehra',
      storageLocation: 'Vault Safe Locker Bay A',
      secureVaultLocker: 'VAULT-A02',
      estimatedValue: 180000,
      isHighValue: true,
      retentionExpiryDate: new Date(Date.now() + 90 * 86400000),
      status: LostAndFoundStatus.CLAIMED,
      claimVerification: {
        claimantName: 'Ananya Mehra',
        claimantPhone: '+91 98765 43210',
        claimantEmail: 'ananya.mehra@example.com',
        idProofType: 'AADHAAR',
        idProofNumber: '5432-8765-1234',
        verificationNotes: 'Invoice matched with hallmark & diamond certificate serial',
        verifiedAt: new Date(Date.now() - 3600000 * 1),
        serialNumberMatched: true,
        matchConfidenceScore: 100,
      },
      custodyChain: [
        {
          action: 'LOGGED',
          performedByName: 'Pool Attendant Ramesh',
          fromLocation: 'Pool Cabana 3',
          toLocation: 'Front Desk Counter',
          timestamp: new Date(Date.now() - 3600000 * 6),
          notes: 'Found under sunbed cushion',
        },
        {
          action: 'MOVED_TO_VAULT',
          performedByName: 'Duty Manager Sharma',
          fromLocation: 'Front Desk Counter',
          toLocation: 'VAULT-A02',
          timestamp: new Date(Date.now() - 3600000 * 5.5),
          notes: 'High-value safe locked with tamper seal #7721',
        },
        {
          action: 'VERIFIED',
          performedByName: 'Front Desk Lead Anita',
          fromLocation: 'VAULT-A02',
          toLocation: 'Verification Counter',
          timestamp: new Date(Date.now() - 3600000 * 1),
          notes: 'Claimant identity and invoice authenticated',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 6),
    },
    {
      hotelId: tenant._id,
      trackingNumber: 'LF-2026-7203',
      description: 'Diplomatic Passport & Business Visa Dossier (UK)',
      category: LostAndFoundCategory.DOCUMENTS,
      foundLocation: 'Grand Ballroom VIP Lounge Table 4',
      foundByUserId: new Types.ObjectId(),
      guestName: 'Sir Arthur Sterling',
      storageLocation: 'Vault Safe Locker Bay B',
      secureVaultLocker: 'VAULT-B01',
      estimatedValue: 50000,
      isHighValue: true,
      retentionExpiryDate: new Date(Date.now() + 90 * 86400000),
      status: LostAndFoundStatus.CLAIMED,
      claimVerification: {
        claimantName: 'Sir Arthur Sterling',
        claimantPhone: '+44 7911 123456',
        claimantEmail: 'arthur.sterling@consulate.gov.uk',
        idProofType: 'PASSPORT',
        idProofNumber: 'UK-9920148',
        verificationNotes: 'Biometric photo match confirmed via diplomatic consulate hotline',
        verifiedAt: new Date(Date.now() - 3600000 * 2),
        serialNumberMatched: true,
        matchConfidenceScore: 100,
      },
      custodyChain: [
        {
          action: 'LOGGED',
          performedByName: 'Banquet Lead Vikram',
          fromLocation: 'Grand Ballroom',
          toLocation: 'Vault B',
          timestamp: new Date(Date.now() - 3600000 * 8),
          notes: 'Found post UN conference meeting',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 8),
    },
    {
      hotelId: tenant._id,
      trackingNumber: 'LF-2026-7204',
      description: 'Burberry Cashmere Trench Coat (Honey Color, Size M)',
      category: LostAndFoundCategory.CLOTHING,
      foundLocation: 'Lobby Lounge Chesterfield Sofa',
      foundByUserId: new Types.ObjectId(),
      guestName: 'Priya Kapoor',
      storageLocation: 'LOST-BAY-04',
      estimatedValue: 45000,
      isHighValue: false,
      retentionExpiryDate: new Date(Date.now() + 90 * 86400000),
      status: LostAndFoundStatus.CLAIMED_IN_PERSON,
      claimedBy: {
        claimantName: 'Priya Kapoor',
        contactNumber: '+91 99887 76655',
        idProof: 'Aadhaar 9912-3344-5566',
        claimedAt: new Date(Date.now() - 3600000 * 2),
        notes: 'Handover completed in person at Front Desk counter',
      },
      custodyChain: [
        {
          action: 'LOGGED',
          performedByName: 'Concierge Anita Sharma',
          fromLocation: 'Lobby Lounge',
          toLocation: 'LOST-BAY-04',
          timestamp: new Date(Date.now() - 3600000 * 12),
          notes: 'Found draped over lounge chair',
        },
        {
          action: 'HANDOVER',
          performedByName: 'Duty Receptionist Mohan',
          fromLocation: 'LOST-BAY-04',
          toLocation: 'Guest Possession',
          timestamp: new Date(Date.now() - 3600000 * 2),
          notes: 'Released to guest Priya Kapoor with photo ID verification',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      hotelId: tenant._id,
      trackingNumber: 'LF-2026-7205',
      description: 'Ray-Ban Polarized Aviator Sunglasses in leather case',
      category: LostAndFoundCategory.OTHER,
      foundLocation: 'Fitness Center Treadmill Bay 2',
      foundByUserId: new Types.ObjectId(),
      storageLocation: 'LOST-BAY-08',
      estimatedValue: 12000,
      isHighValue: false,
      retentionExpiryDate: new Date(Date.now() - 86400000 * 5), // Expired retention
      status: LostAndFoundStatus.DISPOSED,
      disposedAt: new Date(Date.now() - 3600000 * 5),
      disposalNotes: 'Exceeded statutory 90-day retention window. Donated to charitable hospice trust.',
      custodyChain: [
        {
          action: 'LOGGED',
          performedByName: 'Gym Trainer Kabir',
          fromLocation: 'Fitness Center',
          toLocation: 'LOST-BAY-08',
          timestamp: new Date(Date.now() - 86400000 * 95),
          notes: 'Logged into standard storage bay',
        },
        {
          action: 'DISPOSED',
          performedByName: 'General Manager Kapoor',
          fromLocation: 'LOST-BAY-08',
          toLocation: 'Charity Trust Donation',
          timestamp: new Date(Date.now() - 3600000 * 5),
          notes: 'Lawful disposal authorized under retention policy',
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 95),
    },
  ];

  const seeded = await LostAndFound.insertMany(demoItems);
  console.log(`✅ Seeded ${seeded.length} realistic Lost & Found Vault records.`);

  // Generate Admin JWT token
  const token = jwt.sign(
    {
      userId: new Types.ObjectId().toString(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Duty Vault Manager',
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
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fd = btns.find((b) => b.innerText.includes('Front Desk') || b.innerText.includes('Check-In'));
      if (fd) fd.click();
    });
    await sleep(1000);
  }

  // Click Lost & Found Vault Tab
  console.log('🔍 Switching to Lost & Found Vault tab...');
  const tabLostFound = await page.waitForSelector('button[data-testid="tab-lost-found"]', { timeout: 10000 });
  if (tabLostFound) {
    await tabLostFound.click();
    await sleep(1500);
  }

  // Step 1: Capture Lost & Found Workspace & Vault Register
  const ss1 = `${screenshotDir}/shift72_step1_frontdesk_lost_found_vault_workspace.png`;
  await page.screenshot({ path: ss1, fullPage: false });
  console.log(`📸 Captured: ${ss1}`);

  // Step 2: Open Log Found Item Modal
  console.log('➕ Opening Log Found Item Modal...');
  const btnLogItem = await page.waitForSelector('button[data-testid="btn-open-log-lost-modal"]', { timeout: 5000 });
  if (btnLogItem) {
    await btnLogItem.click();
    await sleep(1000);
  }

  const ss2 = `${screenshotDir}/shift72_step2_log_found_item_modal_open.png`;
  await page.screenshot({ path: ss2, fullPage: false });
  console.log(`📸 Captured: ${ss2}`);

  // Close modal by clicking cancel
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find((b) => b.innerText === 'Cancel');
    if (cancel) cancel.click();
  });
  await sleep(800);

  // Step 3: Open Verify Ownership Claim Modal on LF-2026-7201
  const item1 = seeded[0];
  console.log(`🔍 Opening Verify Ownership Claim Modal on ${item1.trackingNumber}...`);
  const btnClaim = await page.waitForSelector(`button[data-testid="btn-claim-${item1._id}"]`, { timeout: 5000 });
  if (btnClaim) {
    await btnClaim.click();
    await sleep(1000);
  }

  const ss3 = `${screenshotDir}/shift72_step3_verify_ownership_claim_modal_open.png`;
  await page.screenshot({ path: ss3, fullPage: false });
  console.log(`📸 Captured: ${ss3}`);

  // Close claim modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find((b) => b.innerText === 'Cancel');
    if (cancel) cancel.click();
  });
  await sleep(800);

  // Step 4: Open Outward Courier Dispatch Modal on LF-2026-7202
  const item2 = seeded[1];
  console.log(`🚚 Opening Courier Dispatch Modal on ${item2.trackingNumber}...`);
  const btnDispatch = await page.waitForSelector(`button[data-testid="btn-dispatch-${item2._id}"]`, { timeout: 5000 });
  if (btnDispatch) {
    await btnDispatch.click();
    await sleep(1000);
  }

  const ss4 = `${screenshotDir}/shift72_step4_outward_courier_dispatch_modal_open.png`;
  await page.screenshot({ path: ss4, fullPage: false });
  console.log(`📸 Captured: ${ss4}`);

  // Close courier dispatch modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancel = btns.find((b) => b.innerText === 'Cancel');
    if (cancel) cancel.click();
  });
  await sleep(800);

  // Step 5: Open Digital Chain of Custody Audit Modal on LF-2026-7202
  console.log(`📜 Opening Digital Chain of Custody Audit Modal on ${item2.trackingNumber}...`);
  const btnAudit = await page.waitForSelector(`button[data-testid="btn-audit-${item2._id}"]`, { timeout: 5000 });
  if (btnAudit) {
    await btnAudit.click();
    await sleep(1000);
  }

  const ss5 = `${screenshotDir}/shift72_step5_digital_chain_of_custody_audit_modal_open.png`;
  await page.screenshot({ path: ss5, fullPage: false });
  console.log(`📸 Captured: ${ss5}`);

  await browser.close();
  await mongoose.disconnect();
  console.log('🏆 SHIFT 72 LOST & FOUND DRILL COMPLETED WITH 100% SUCCESS!');
}

runShift72LostAndFoundDrill().catch((err) => {
  console.error('Drill Error:', err);
  process.exit(1);
});
