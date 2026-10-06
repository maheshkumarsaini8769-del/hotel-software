import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import { SafeDepositBox, SDBStatus, SDBSize } from '../backend/src/models/SafeDepositBox';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runShift69SDBDrill() {
  console.log('================================================================================');
  console.log('🔒 [SHIFT 69 DRILL] FRONT DESK SAFE DEPOSIT BOX (SDB) VAULT MANAGEMENT & DUO-KEY');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Primary Tenant not found');
  console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure fresh SDB boxes for this property
  await SafeDepositBox.deleteMany({ hotelId: tenant._id });

  const defaultSizes: SDBSize[] = [
    SDBSize.SMALL, SDBSize.SMALL, SDBSize.SMALL, SDBSize.SMALL,
    SDBSize.MEDIUM, SDBSize.MEDIUM, SDBSize.MEDIUM, SDBSize.MEDIUM,
    SDBSize.LARGE, SDBSize.LARGE, SDBSize.EXTRA_LARGE, SDBSize.EXTRA_LARGE
  ];

  for (let i = 1; i <= 12; i++) {
    const boxNum = `SDB-${100 + i}`;
    await SafeDepositBox.create({
      hotelId: tenant._id,
      boxNumber: boxNum,
      size: defaultSizes[i - 1],
      status: SDBStatus.AVAILABLE,
      masterKeySerial: `MK-VAULT-${100 + i}`,
      keyDepositAmount: 2000,
      notes: `Standard high-security vault box ${boxNum}`,
    });
  }
  console.log(`✅ Seeded 12 fresh Safe Deposit Boxes for ${tenant.name}`);

  const managerToken = jwt.sign(
    {
      userId: new Types.ObjectId(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Chief Security Officer R. Rathore',
      email: 'security.rathore@tajhotels.com',
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

    // Click SDB Vault Tab
    console.log('Clicking "🔒 Safe Deposit Vault (SDB)" tab...');
    await page.evaluate(`(() => {
      const tab =
        document.querySelector('[data-testid="tab-sdb"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Safe Deposit') || b.innerText.includes('SDB'));
      if (tab) tab.click();
    })()`);
    await sleep(2000);

    // STEP 1: Capture Locker Grid & Vault Overview
    console.log('Step 1: Capturing SDB Vault workspace and locker grid...');
    const step1Path = `${screenshotDir}/shift69_step1_sdb_vault_workspace_and_locker_grid.png`;
    await page.screenshot({ path: step1Path, fullPage: true });
    console.log('📸 Screenshot 1 saved to:', step1Path);

    // STEP 2: Open Allotment Modal & Duo-Key issue
    console.log('Step 2: Opening Box Allotment modal for SDB-101...');
    await page.evaluate(`(() => {
      const allotBtn = document.querySelector('[data-testid="btn-open-sdb-allot"]');
      if (allotBtn) allotBtn.click();
    })()`);
    await sleep(1000);

    const step2Path = `${screenshotDir}/shift69_step2_sdb_box_allotment_modal_and_duo_key_issue.png`;
    await page.screenshot({ path: step2Path, fullPage: true });
    console.log('📸 Screenshot 2 saved to:', step2Path);

    // Submit allotment
    console.log('Submitting SDB allotment to Princess Gayatri Devi...');
    await page.evaluate(`(() => {
      const submitBtn = document.querySelector('[data-testid="btn-confirm-allot-sdb"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(2500);

    // STEP 3: Log Access Visit
    console.log('Step 3: Opening Access Visit Modal...');
    await page.evaluate(`(() => {
      const accessBtn = document.querySelector('[data-testid="btn-open-sdb-access"]');
      if (accessBtn) accessBtn.click();
    })()`);
    await sleep(1000);

    // Authorize & Log Access
    console.log('Submitting Access Visit authorization...');
    await page.evaluate(`(() => {
      const submitAccessBtn = document.querySelector('[data-testid="btn-confirm-access-sdb"]');
      if (submitAccessBtn) submitAccessBtn.click();
    })()`);
    await sleep(2500);

    const step3Path = `${screenshotDir}/shift69_step3_sdb_duo_key_access_visit_logged.png`;
    await page.screenshot({ path: step3Path, fullPage: true });
    console.log('📸 Screenshot 3 saved to:', step3Path);

    // STEP 4: Open Surrender Modal & Empty Box Verification
    console.log('Step 4: Opening Surrender & Empty Verification modal...');
    await page.evaluate(`(() => {
      const surrenderBtn = document.querySelector('[data-testid="btn-open-sdb-surrender"]');
      if (surrenderBtn) surrenderBtn.click();
    })()`);
    await sleep(1000);

    const step4Path = `${screenshotDir}/shift69_step4_sdb_box_surrender_and_empty_verification.png`;
    await page.screenshot({ path: step4Path, fullPage: true });
    console.log('📸 Screenshot 4 saved to:', step4Path);

    // Submit Surrender
    console.log('Submitting Box Surrender & Deposit Refund...');
    await page.evaluate(`(() => {
      const submitSurrenderBtn = document.querySelector('[data-testid="btn-confirm-surrender-sdb"]');
      if (submitSurrenderBtn) submitSurrenderBtn.click();
    })()`);
    await sleep(2500);

    console.log('🎉 Shift 69 SDB Vault Drill successfully completed!');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift69SDBDrill().catch((err) => {
  console.error('❌ Error during Shift 69 SDB drill:', err);
  process.exit(1);
});
