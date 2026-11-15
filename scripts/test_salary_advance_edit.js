const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });

(async () => {
  console.log('--- Testing Salary Advance Edit & Delete in Hotel Admin ERP ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login to Hotel Admin ERP
  console.log('1. Navigating to http://localhost:3005 ...');
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('2. Submitting login for Bajrang Heritage Haveli...');
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'admin@bajranghaveli.com');
  await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'Bajrang@2026');

  const slugInput = await page.$('input[placeholder*="slug" i], input[name="slug"], input[placeholder*="property" i]');
  if (slugInput) {
    await slugInput.fill('bajrang-heritage-haveli');
  }

  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForTimeout(3000);

  // 3. Navigate to Payroll & Salaries
  console.log('3. Navigating to Payroll & Salaries...');
  const payrollNav = page.locator('button:has-text("Payroll & Salaries"), a:has-text("Payroll & Salaries")').first();
  await payrollNav.click();
  await page.waitForTimeout(2000);

  // 4. Click "View Ledger" for Ramesh Waiter
  console.log('4. Opening staff ledger for Ramesh Waiter...');
  const rameshLedgerBtn = page.locator('tr:has-text("Ramesh Waiter") button:has-text("View Ledger"), tr:has-text("Ramesh") button:has-text("View Ledger")').first();
  await rameshLedgerBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(SNAP_DIR, '70_ramesh_ledger_opened.png'), fullPage: false });
  console.log('Captured: 70_ramesh_ledger_opened.png');

  // 5. Click "Give Advance" button inside the ledger modal
  console.log('5. Clicking Give Advance button...');
  const giveAdvanceBtn = page.locator('button:has-text("Give Advance")').first();
  await giveAdvanceBtn.click();
  await page.waitForTimeout(1000);

  // Record initial advance
  console.log('Recording initial advance (with mistake in entry)...');
  await page.fill('input[placeholder*="15000" i], input[data-testid="txn-amount-input"]', '5000');
  await page.fill('textarea[placeholder*="settlement" i]', 'Festival advance disbursed');
  await page.click('button[data-testid="submit-transaction-btn"], button:has-text("Confirm & Disburse")');
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(SNAP_DIR, '71_advance_recorded_in_history.png'), fullPage: false });
  console.log('Captured: 71_advance_recorded_in_history.png');

  // 6. Click Edit (✏️) on the newly created advance in Transaction Audit History
  console.log('6. Clicking Edit (✏️) button on advance entry...');
  const editBtn = page.locator('button[title*="Edit Entry" i]').first();
  await editBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SNAP_DIR, '72_edit_advance_modal_opened.png'), fullPage: false });
  console.log('Captured: 72_edit_advance_modal_opened.png');

  // 7. Fix entry time, amount, and notes
  console.log('7. Fixing entry time, amount, and notes in the modal...');
  await page.fill('input[placeholder*="5000" i]', '3500');
  
  // Set corrected date/time
  const dateInput = page.locator('input[type="datetime-local"]');
  if (await dateInput.isVisible()) {
    await dateInput.fill('2026-11-14T10:30');
  }
  await page.fill('textarea[placeholder*="adjusted" i]', 'Corrected advance: ₹3,500 disbursed at 10:30 AM via UPI');

  // Submit changes
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(SNAP_DIR, '73_after_advance_edited_successfully.png'), fullPage: false });
  console.log('Captured: 73_after_advance_edited_successfully.png');

  await browser.close();
  console.log('--- Salary Advance Edit Test Completed Successfully! ---');
})();
