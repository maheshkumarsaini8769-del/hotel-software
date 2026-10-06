import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import {
  LeftLuggageClaim,
  LuggageStatus,
  LuggageStorageType,
} from '../backend/src/models/LeftLuggageClaim';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runShift70LuggageDrill() {
  console.log('================================================================================');
  console.log('🧳 [SHIFT 70 DRILL] FRONT DESK LEFT LUGGAGE CLOAKROOM & BELL DESK PIPELINE');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Primary Tenant not found');
  console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure fresh luggage claims for demo property
  await LeftLuggageClaim.deleteMany({ hotelId: tenant._id });

  const demoClaims = [
    {
      hotelId: tenant._id,
      claimTag: 'LLG-7001',
      guestName: 'Princess Gayatri Devi',
      guestPhone: '+91 9844005511',
      roomNumber: '102',
      storageType: LuggageStorageType.POST_CHECKOUT,
      status: LuggageStatus.STORED,
      rackLocation: 'CLOAKROOM-RACK-A01',
      totalPieces: 2,
      pieces: [
        {
          pieceId: 'P1',
          type: 'SUITCASE',
          colorDescription: 'Rose Gold Rimowa Trunk with Velvet Dust Cover',
          isFragile: true,
          hasPerishables: false,
        },
        {
          pieceId: 'P2',
          type: 'GARMENT_BAG',
          colorDescription: 'Black Louis Vuitton Monogram Hanging Suiter',
          isFragile: false,
          hasPerishables: false,
        },
      ],
      claimPin: '7721',
      expectedPickupTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
      receivedByStaffName: 'Concierge Lead Arjun',
    },
    {
      hotelId: tenant._id,
      claimTag: 'LLG-7002',
      guestName: 'Lord Mountbatten',
      guestPhone: '+44 7911 123456',
      roomNumber: '204',
      storageType: LuggageStorageType.EARLY_ARRIVAL,
      status: LuggageStatus.STORED,
      rackLocation: 'CLOAKROOM-BAY-02',
      totalPieces: 1,
      pieces: [
        {
          pieceId: 'P1',
          type: 'SUITCASE',
          colorDescription: 'British Racing Green Globe-Trotter Leather Carry-On',
          isFragile: false,
          hasPerishables: false,
        },
      ],
      claimPin: '3349',
      expectedPickupTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
      receivedByStaffName: 'Bell Captain Desk',
    },
    {
      hotelId: tenant._id,
      claimTag: 'LLG-7003',
      guestName: 'Corporate Delegate Vikram',
      guestPhone: '+91 9822001199',
      roomNumber: '310',
      storageType: LuggageStorageType.TRANSIT_HOLD,
      status: LuggageStatus.STORED,
      rackLocation: 'CLOAKROOM-RACK-C04',
      totalPieces: 3,
      pieces: [
        {
          pieceId: 'P1',
          type: 'SUITCASE',
          colorDescription: 'Silver Aluminum Tumi Spinner',
          isFragile: false,
          hasPerishables: false,
        },
        {
          pieceId: 'P2',
          type: 'BACKPACK',
          colorDescription: 'Black Leather Laptop Backpack',
          isFragile: true,
          hasPerishables: false,
        },
        {
          pieceId: 'P3',
          type: 'CARTON',
          colorDescription: 'Kashmir Saffron & Wine Presentation Box',
          isFragile: true,
          hasPerishables: true,
        },
      ],
      claimPin: '8812',
      expectedPickupTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
      receivedByStaffName: 'Bell Captain Desk',
    },
  ];

  await LeftLuggageClaim.insertMany(demoClaims);
  console.log(`✅ Seeded 3 fresh demo Left Luggage claims for ${tenant.name}`);

  const managerToken = jwt.sign(
    {
      userId: new Types.ObjectId(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Head Concierge Vikramaditya',
      email: 'concierge.lead@tajhotels.com',
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto('http://localhost:3005', { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Set Manager Auth & Tenant context
    await page.evaluate(
      `((tId, tok) => {
        localStorage.setItem('spicehub_hotel_id', tId);
        localStorage.setItem('hotelId', tId);
        localStorage.setItem('spicehub_token', tok);
        localStorage.setItem('token', tok);
      })('${tenant._id}', '${managerToken}')`
    );

    // Navigate to Front Desk module
    console.log('Navigating to Front Desk Check-in Module...');
    await page.evaluate(`(() => {
      const btn =
        document.querySelector('[data-testid="module-nav-FRONT_DESK_CHECKIN"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('1-Click Check-In') || b.innerText.includes('Front Desk'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // Click Left Luggage Tab
    console.log('Clicking "🧳 Left Luggage & Bell Desk" tab...');
    await page.evaluate(`(() => {
      const tab =
        document.querySelector('[data-testid="tab-luggage"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Left Luggage') || b.innerText.includes('Bell Desk'));
      if (tab) tab.click();
    })()`);
    await sleep(2000);

    // STEP 1: Capture Left Luggage Workspace & Claims List
    console.log('Step 1: Capturing Left Luggage workspace and claims list...');
    const step1Path = `${screenshotDir}/shift70_step1_cloakroom_workspace_and_claims_list.png`;
    await page.screenshot({ path: step1Path, fullPage: true });
    console.log('📸 Screenshot 1 saved to:', step1Path);

    // STEP 2: Open Tag New Luggage Modal
    console.log('Step 2: Opening Tag New Luggage Modal...');
    await page.evaluate(`(() => {
      const tagBtn = document.querySelector('[data-testid="btn-open-tag-luggage"]');
      if (tagBtn) tagBtn.click();
    })()`);
    await sleep(1000);

    const step2Path = `${screenshotDir}/shift70_step2_tag_new_luggage_modal_open.png`;
    await page.screenshot({ path: step2Path, fullPage: true });
    console.log('📸 Screenshot 2 saved to:', step2Path);

    // Submit Luggage Tagging
    console.log('Submitting Luggage Tagging...');
    await page.evaluate(`(() => {
      const submitBtn = document.querySelector('[data-testid="btn-submit-tag-luggage"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(2500);

    // STEP 3: Dispatch Porter to Room for LLG-7002
    console.log('Step 3: Selecting LLG-7002 and opening Porter Dispatch Modal...');
    await page.evaluate(`(() => {
      const card = document.querySelector('[data-testid="card-luggage-LLG-7002"]');
      if (card) card.click();
    })()`);
    await sleep(1000);

    await page.evaluate(`(() => {
      const dispBtn = document.querySelector('[data-testid="btn-open-dispatch-luggage"]');
      if (dispBtn) dispBtn.click();
    })()`);
    await sleep(1000);

    console.log('Submitting Porter Dispatch...');
    await page.evaluate(`(() => {
      const submitDisp = document.querySelector('[data-testid="btn-submit-dispatch-luggage"]');
      if (submitDisp) submitDisp.click();
    })()`);
    await sleep(2500);

    const step3Path = `${screenshotDir}/shift70_step3_dispatch_porter_to_room_modal_and_in_transit.png`;
    await page.screenshot({ path: step3Path, fullPage: true });
    console.log('📸 Screenshot 3 saved to:', step3Path);

    // STEP 4: Select LLG-7001 and Open Counter Release Modal
    console.log('Step 4: Selecting LLG-7001 and opening Counter Release Modal...');
    await page.evaluate(`(() => {
      const card = document.querySelector('[data-testid="card-luggage-LLG-7001"]');
      if (card) card.click();
    })()`);
    await sleep(1000);

    await page.evaluate(`(() => {
      const relBtn = document.querySelector('[data-testid="btn-open-release-luggage"]');
      if (relBtn) relBtn.click();
    })()`);
    await sleep(1000);

    const step4Path = `${screenshotDir}/shift70_step4_counter_release_modal_and_surrender_verified.png`;
    await page.screenshot({ path: step4Path, fullPage: true });
    console.log('📸 Screenshot 4 saved to:', step4Path);

    // Submit Counter Release
    console.log('Submitting Counter Release...');
    await page.evaluate(`(() => {
      const submitRel = document.querySelector('[data-testid="btn-submit-release-luggage"]');
      if (submitRel) submitRel.click();
    })()`);
    await sleep(2500);

    console.log('🎉 Shift 70 Left Luggage Drill successfully completed!');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift70LuggageDrill().catch((err) => {
  console.error('❌ Error during Shift 70 drill:', err);
  process.exit(1);
});
