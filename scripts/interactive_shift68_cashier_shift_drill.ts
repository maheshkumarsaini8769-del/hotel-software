import puppeteer, { Browser } from 'puppeteer';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Tenant } from '../backend/src/models/Tenant';
import { CashierShiftFloat, CashierShiftStatus, ShiftType } from '../backend/src/models/CashierShiftFloat';

dotenv.config({ path: 'backend/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
const screenshotDir = '/home/mahesh/.gemini/antigravity/brain/5e63cf4d-8c6a-43c4-832c-412322646227';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runShift68CashierDrill() {
  console.log('================================================================================');
  console.log('💼 [SHIFT 68 DRILL] FRONT DESK CASHIER SHIFT HANDOVER & DRAWER BALANCING');
  console.log('================================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  const tenant = (await Tenant.findOne({ slug: 'taj-gateway' })) || (await Tenant.findOne());
  if (!tenant) throw new Error('Primary Tenant not found');
  console.log(`✅ Tenant: ${tenant.name} (${tenant._id})`);

  // Ensure active cashier shift on FD_COUNTER_01 for Taj Gateway
  await CashierShiftFloat.deleteMany({ hotelId: tenant._id, terminalId: 'FD_COUNTER_01' });

  const activeShift = await CashierShiftFloat.create({
    hotelId: tenant._id,
    shiftNumber: `FD-SFT-68-${Date.now().toString().slice(-4)}`,
    cashierId: new Types.ObjectId(),
    cashierName: 'Morning Receptionist Ananya',
    terminalId: 'FD_COUNTER_01',
    status: CashierShiftStatus.OPEN,
    shiftType: ShiftType.MORNING,
    openingFloat: 5000,
    expectedCashInDrawer: 5000,
    totalCashCollected: 0,
    notes: 'Morning shift active on FD_COUNTER_01.',
    openedAt: new Date(),
  });
  console.log(`✅ Seeded Active Cashier Shift: ${activeShift.shiftNumber} (Float: ₹${activeShift.openingFloat})`);

  const managerToken = jwt.sign(
    {
      userId: new Types.ObjectId(),
      hotelId: tenant._id.toString(),
      role: 'HOTEL_ADMIN',
      name: 'Duty Manager Vikram',
      email: 'manager.vikram@tajhotels.com',
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

    // Click Cashier Drawer & Shift Handover Tab
    console.log('Clicking "💼 Cashier Drawer & Shift Handover" tab...');
    await page.evaluate(`(() => {
      const tab =
        document.querySelector('[data-testid="tab-cashier"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Cashier') || b.innerText.includes('Drawer'));
      if (tab) tab.click();
    })()`);
    await sleep(2000);

    // STEP 1: Screenshot Active Shift Workspace
    const shot1 = `${screenshotDir}/shift68_step1_cashier_drawer_workspace_and_active_shift.png`;
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('📸 [Step 1 Screenshot Saved]:', shot1);

    // STEP 2: Preset standard float (10x ₹500 = ₹5,000)
    console.log('Clicking Preset Standard Float button...');
    await page.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="btn-preset-float-5000"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    // Verify & Preview Drawer
    console.log('Clicking Verify & Preview Drawer Balancing button...');
    await page.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="btn-verify-reconcile-drawer"]');
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    const shot2 = `${screenshotDir}/shift68_step2_physical_denominations_counted_and_balanced.png`;
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('📸 [Step 2 Screenshot Saved]:', shot2);

    // STEP 3: Safe Drop of ₹15,000 and discrepancy justification
    console.log('Simulating end-of-shift large collection: Safe drop ₹15,000 with supervisor PIN 9921...');
    await page.evaluate(`(() => {
      // 40x ₹500 = 20,000 counted cash
      const i500 = document.querySelector('[data-testid="input-denom-500"]');
      if (i500) {
        i500.value = '40';
        i500.dispatchEvent(new Event('input', { bubbles: true }));
        i500.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Safe drop ₹15,000
      const dropInput = document.querySelector('[data-testid="input-safe-drop-amount"]');
      if (dropInput) {
        dropInput.value = '15000';
        dropInput.dispatchEvent(new Event('input', { bubbles: true }));
        dropInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Safe drop receipt
      const rcptInput = document.querySelector('[data-testid="input-safe-drop-receipt"]');
      if (rcptInput) {
        rcptInput.value = 'DROP-SAFE-68-001';
        rcptInput.dispatchEvent(new Event('input', { bubbles: true }));
        rcptInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Retained float ₹5,000
      const retInput = document.querySelector('[data-testid="input-retained-float"]');
      if (retInput) {
        retInput.value = '5000';
        retInput.dispatchEvent(new Event('input', { bubbles: true }));
        retInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Incoming cashier
      const cashierInput = document.querySelector('[data-testid="input-handover-cashier-name"]');
      if (cashierInput) {
        cashierInput.value = 'Evening Receptionist Rohan';
        cashierInput.dispatchEvent(new Event('input', { bubbles: true }));
        cashierInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Supervisor PIN 9921
      const pinInput = document.querySelector('[data-testid="input-cashier-supervisor-pin"]');
      if (pinInput) {
        pinInput.value = '9921';
        pinInput.dispatchEvent(new Event('input', { bubbles: true }));
        pinInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(1500);

    const shot3 = `${screenshotDir}/shift68_step3_discrepancy_reason_and_supervisor_pin_terminal.png`;
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('📸 [Step 3 Screenshot Saved]:', shot3);

    // STEP 4: Finalize Shift Handover & Lock Drawer
    console.log('Clicking Finalize Shift Handover & Lock Drawer button...');
    await page.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="btn-execute-shift-handover"]');
      if (btn) btn.click();
    })()`);
    await sleep(2500);

    // Scroll to Audit Register Table to view closed shifts, safe drop vouchers and handover
    await page.evaluate(`(() => {
      const el = document.querySelector('[data-testid="table-cashier-history"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(1200);

    const shot4 = `${screenshotDir}/shift68_step4_shift_handover_completed_and_audit_register_verified.png`;
    await page.screenshot({ path: shot4, fullPage: false });
    console.log('📸 [Step 4 Screenshot Saved]:', shot4);

    console.log('\n================================================================================');
    console.log('🎉 [SHIFT 68 DRILL SUCCESS] ALL 4 CASHIER HANDOVER DRILL SCREENSHOTS SAVED!');
    console.log('================================================================================');
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runShift68CashierDrill().catch((err) => {
  console.error('Fatal Drill Error:', err);
  process.exit(1);
});
