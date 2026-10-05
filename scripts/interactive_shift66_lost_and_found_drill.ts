import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import { LostAndFound, LostAndFoundStatus, LostAndFoundCategory } from '../backend/src/models/LostAndFound';
import { UserRole } from '../backend/src/types';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShift66Drill() {
  console.log('================================================================================');
  console.log('🔐 [SHIFT 66 DRILL] LOST & FOUND DIGITAL VAULT, CLAIM VERIFICATION & COURIER PIPELINE');
  console.log('   Admin ERP (:3005) ➔ Secure Vault ➔ Duty Verification ➔ Courier Dispatch');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Tenant not found in database');
  console.log(`✅ Operating for Tenant: ${tenant.name} (${tenant._id})`);

  // Seed sample initial items in vault if none exist
  const existingCount = await LostAndFound.countDocuments({ hotelId: tenant._id });
  if (existingCount === 0) {
    await LostAndFound.create([
      {
        hotelId: tenant._id,
        trackingNumber: `LF-2026-10482`,
        description: 'Navy Blue Silk Scarf with Gold Zari Borders',
        category: LostAndFoundCategory.CLOTHING,
        foundLocation: 'Lobby Lounge Sofa #3',
        guestName: 'Ananya Verma',
        storageLocation: 'Front Office Bin #04',
        estimatedValue: 1800,
        isHighValue: false,
        retentionExpiryDate: new Date(Date.now() + 85 * 86400000),
        status: LostAndFoundStatus.LOGGED,
        foundByUserId: new Types.ObjectId(),
        custodyChain: [
          {
            action: 'LOGGED',
            performedByName: 'Radhika (Housekeeper)',
            fromLocation: 'Lobby Lounge Sofa #3',
            toLocation: 'Front Office Bin #04',
            timestamp: new Date(),
            notes: 'Found during morning lobby turnover',
          },
        ],
      },
      {
        hotelId: tenant._id,
        trackingNumber: `LF-2026-99210`,
        description: 'Rolex Oyster Perpetual Datejust 36mm (Fluted Bezel, Jubilee Bracelet)',
        category: LostAndFoundCategory.JEWELRY,
        foundLocation: 'Presidential Suite 501 Safe',
        guestName: 'Rajesh K. Singhania',
        storageLocation: 'Secure Vault Locker: VAULT-LOCKER-A3',
        secureVaultLocker: 'VAULT-LOCKER-A3',
        estimatedValue: 850000,
        isHighValue: true,
        retentionExpiryDate: new Date(Date.now() + 89 * 86400000),
        status: LostAndFoundStatus.LOGGED,
        foundByUserId: new Types.ObjectId(),
        custodyChain: [
          {
            action: 'MOVED_TO_VAULT',
            performedByName: 'Amitabh Sen (Security Chief)',
            fromLocation: 'Presidential Suite 501',
            toLocation: 'Secure Vault Locker: VAULT-LOCKER-A3',
            timestamp: new Date(),
            notes: 'High-value asset (Est. ₹8,50,000) locked in master safe',
          },
        ],
      },
    ]);
    console.log('✅ Seeded sample vault assets');
  }

  // Generate valid JWT token for Hotel Admin
  const jwtSecret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
  const authToken = jwt.sign(
    {
      userId: new Types.ObjectId().toString(),
      hotelId: tenant._id.toString(),
      role: UserRole.HOTEL_ADMIN,
      name: 'Duty Manager Sharma',
    },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050 });

  try {
    console.log('\n--- Step 1: Navigate to Admin ERP & Open Lost & Found Digital Vault ---');
    await page.goto('http://localhost:3005', { waitUntil: 'networkidle2', timeout: 30000 });

    // Set localStorage tokens
    await page.evaluate(
      (tok, hId) => {
        localStorage.setItem('spicehub_token', tok);
        localStorage.setItem('token', tok);
        localStorage.setItem('spicehub_hotel_id', hId);
        localStorage.setItem('hotelId', hId);
      },
      authToken,
      tenant._id.toString()
    );

    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2000);

    // Click Lost & Found module in sidebar
    await page.waitForSelector('[data-testid="module-nav-LOST_AND_FOUND"]', { timeout: 10000 });
    await page.click('[data-testid="module-nav-LOST_AND_FOUND"]');
    await sleep(2500);

    const step1Path = `${screenshotDir}/shift66_step1_lost_and_found_vault_dashboard.png`;
    await page.screenshot({ path: step1Path, fullPage: false });
    console.log(`📸 Captured: ${step1Path}`);

    console.log('\n--- Step 2: Open Log Found Asset Modal & Enter High-Value MacBook ---');
    await page.waitForSelector('[data-testid="btn-log-found-item"]', { timeout: 10000 });
    await page.click('[data-testid="btn-log-found-item"]');
    await sleep(1000);

    await page.waitForSelector('[data-testid="input-log-description"]', { timeout: 5000 });
    await page.type('[data-testid="input-log-description"]', 'Apple MacBook Pro 16-inch M3 Max (Space Black) in Leather Sleeve');
    await page.select('[data-testid="select-log-category"]', 'ELECTRONICS');
    await page.type('[data-testid="input-log-location"]', 'Suite 502 Conference Desk');
    await page.type('[data-testid="input-log-value"]', '245000');
    await page.type('[data-testid="input-log-locker"]', 'VAULT-LOCKER-M3-09');
    await page.type('[data-testid="input-log-guest"]', 'Vikramaditya Singhania');
    await sleep(1000);

    const step2Path = `${screenshotDir}/shift66_step2_log_high_value_item_modal.png`;
    await page.screenshot({ path: step2Path, fullPage: false });
    console.log(`📸 Captured: ${step2Path}`);

    // Submit log modal
    await page.click('[data-testid="btn-submit-log-item"]');
    await sleep(3000);

    console.log('\n--- Step 3: Duty Manager Verify Claim Modal ---');
    await page.waitForSelector('button[data-testid^="btn-verify-"]', { timeout: 15000 });
    const verifyButtons = await page.$$('button[data-testid^="btn-verify-"]');
    if (verifyButtons.length > 0) {
      await verifyButtons[0].click();
      await sleep(1500);

      await page.waitForSelector('[data-testid="input-verify-name"]', { timeout: 5000 });
      // Clear and fill claimant info using pure browser JS
      await page.evaluate(() => {
        const inputName = document.querySelector('input[data-testid="input-verify-name"]');
        if (inputName) (inputName as any).value = '';
      });
      await page.type('[data-testid="input-verify-name"]', 'Vikramaditya Singhania');
      await page.type('[data-testid="input-verify-phone"]', '+91 9820011223');
      await page.type('[data-testid="input-verify-id"]', '4829-1029-4491');
      await sleep(1000);

      const step3Path = `${screenshotDir}/shift66_step3_verify_claim_and_courier_dispatch_modal.png`;
      await page.screenshot({ path: step3Path, fullPage: false });
      console.log(`📸 Captured: ${step3Path}`);

      // Submit verification
      await page.click('[data-testid="btn-submit-verify-claim"]');
      await sleep(3000);
    }

    console.log('\n--- Step 4: Dispatch Courier & View Chain of Custody Audit Log ---');
    await page.waitForSelector('button[data-testid^="btn-dispatch-"]', { timeout: 15000 });
    const dispatchButtons = await page.$$('button[data-testid^="btn-dispatch-"]');
    if (dispatchButtons.length > 0) {
      await dispatchButtons[0].click();
      await sleep(1500);

      await page.waitForSelector('[data-testid="input-courier-waybill"]', { timeout: 5000 });
      await page.type('[data-testid="input-courier-waybill"]', 'BLUEDART-EXP-889912004');
      await page.type('[data-testid="input-shipping-street"]', 'Penthouse 18, Worli Sea Face');
      await page.type('[data-testid="input-shipping-city"]', 'Mumbai');
      await page.type('[data-testid="input-shipping-fee"]', '1850');
      await sleep(1000);

      // Submit dispatch
      await page.click('[data-testid="btn-submit-courier-dispatch"]');
      await sleep(3000);

      // Now click Custody Trail button on the dispatched card
      await page.waitForSelector('button[data-testid^="btn-custody-"]', { timeout: 15000 });
      const custodyButtons = await page.$$('button[data-testid^="btn-custody-"]');
      if (custodyButtons.length > 0) {
        await custodyButtons[0].click();
        await sleep(2000);
      }
    }

    const step4Path = `${screenshotDir}/shift66_step4_courier_dispatched_and_chain_of_custody.png`;
    await page.screenshot({ path: step4Path, fullPage: false });
    console.log(`📸 Captured: ${step4Path}`);

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 66 DRILL COMPLETE] ALL 4 VERIFICATION PROOFS CAPTURED SUCCESSFULLY!');
    console.log('================================================================================');
  } catch (err) {
    console.error('❌ Drill Error:', err);
    throw err;
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift66Drill().catch((err) => {
  console.error(err);
  process.exit(1);
});
