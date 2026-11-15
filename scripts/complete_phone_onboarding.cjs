const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SNAP_DIR = '/home/mahesh/.gemini/antigravity/brain/8646288b-83fa-4ce8-a522-28ad3c9ff315/device_snaps';
if (!fs.existsSync(SNAP_DIR)) {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
}

function takeDeviceScreenshot(filename) {
  const target = path.join(SNAP_DIR, filename);
  try {
    execSync(`adb exec-out screencap -p > "${target}"`, { stdio: 'inherit' });
    console.log(`[Device Screencap] Saved -> ${filename}`);
  } catch (err) {
    console.error(`Failed screencap for ${filename}:`, err.message);
  }
}

async function run() {
  console.log('=== Step 1: Checking Ports & Reverse Tunnels ===');
  execSync('adb reverse tcp:5000 tcp:5000');
  execSync('adb reverse tcp:3005 tcp:3005');
  execSync('adb reverse tcp:3006 tcp:3006');
  execSync('adb forward tcp:9222 localabstract:webview_devtools_remote_25311');

  console.log('=== Step 2: Connecting to Phone WebView ===');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  console.log('Connected! Page title:', await page.title());

  takeDeviceScreenshot('01_staff_home.png');

  // 1. Open Onboarding Modal
  console.log('Opening Onboarding Modal...');
  const openBtn = page.locator('[data-testid="open-onboard-hotel-btn"]');
  if (await openBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await openBtn.click();
    await page.waitForTimeout(1000);
  }

  takeDeviceScreenshot('02_onboard_step1_empty.png');

  // 2. Fill Details
  console.log('Filling Hotel Name and Admin Details...');
  await page.fill('#onboard-hotel-name', 'Amer Palace Heritage Haveli');
  await page.fill('#onboard-admin-name', 'Mahesh Saini');
  await page.fill('#onboard-admin-email', 'maheshsaini10101@gmail.com');
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(400);

  // 3. Email OTP
  console.log('Requesting Email OTP...');
  const [emailOtpRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/v1/auth/onboarding/send-otp') && r.status() === 200, { timeout: 15000 }),
    page.evaluate(() => {
      const b = document.querySelector('#send-onboard-email-otp-btn') || document.querySelector('[data-testid="send-onboard-email-otp-btn"]');
      if (b) b.click();
    }),
  ]);
  const emailOtpData = await emailOtpRes.json();
  const emailOtp = emailOtpData.devEmailOtp;
  console.log('Received Email OTP:', emailOtp);

  await page.fill('[data-testid="onboard-email-otp-input"]', emailOtp);
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(400);

  console.log('Verifying Email OTP...');
  const [emailVerifyRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/v1/auth/onboarding/verify-otp') && r.status() === 200, { timeout: 10000 }),
    page.evaluate(() => {
      const b = document.querySelector('#verify-onboard-email-otp-btn') || document.querySelector('[data-testid="verify-onboard-email-otp-btn"]');
      if (b) b.click();
    }),
  ]);
  console.log('Email Verified:', (await emailVerifyRes.json()).message);
  await page.waitForTimeout(500);

  // 4. Phone OTP
  console.log('Filling Phone Number...');
  await page.fill('#onboard-admin-phone', '9876543210');
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(400);

  console.log('Requesting WhatsApp OTP...');
  const [phoneOtpRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/v1/auth/onboarding/send-otp') && r.status() === 200, { timeout: 15000 }),
    page.evaluate(() => {
      const b = document.querySelector('#send-onboard-phone-otp-btn') || document.querySelector('[data-testid="send-onboard-phone-otp-btn"]');
      if (b) b.click();
    }),
  ]);
  const phoneOtpData = await phoneOtpRes.json();
  const whatsappOtp = phoneOtpData.devWhatsAppOtp || '999999';
  console.log('Received WhatsApp OTP:', whatsappOtp);

  await page.fill('[data-testid="onboard-whatsapp-otp-input"]', whatsappOtp);
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(400);

  console.log('Verifying WhatsApp OTP...');
  const [phoneVerifyRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/v1/auth/onboarding/verify-otp') && r.status() === 200, { timeout: 10000 }),
    page.evaluate(() => {
      const b = document.querySelector('#verify-onboard-phone-otp-btn') || document.querySelector('[data-testid="verify-onboard-phone-otp-btn"]');
      if (b) b.click();
    }),
  ]);
  console.log('WhatsApp Verified:', (await phoneVerifyRes.json()).message);
  await page.waitForTimeout(500);

  // 5. Password & Address
  console.log('Filling Admin Password & Address...');
  await page.fill('#onboard-admin-password', 'AmerPalace@2026');
  await page.fill('#onboard-city', 'Jaipur');
  await page.fill('#onboard-state', 'Rajasthan');
  const streetInput = page.locator('[data-testid="onboard-street-address-input"]');
  if (await streetInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await streetInput.fill('Amer Fort Road, Near Jal Mahal, Jaipur');
  }
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(600);

  takeDeviceScreenshot('03_step1_details_verified.png');

  // 6. Next: Portals
  console.log('Proceeding to Step 2: Portals...');
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="onboard-next-to-portals-btn"]');
    if (b) b.click();
  });
  await page.locator('[data-testid="onboard-next-to-bill-btn"]').waitFor({ state: 'visible', timeout: 8000 });

  takeDeviceScreenshot('04_step2_terminals.png');

  // 7. Next: Bill Summary
  console.log('Proceeding to Step 3: Plan Summary...');
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="onboard-next-to-bill-btn"]');
    if (b) b.click();
  });
  await page.locator('[data-testid="onboard-proceed-to-pay-btn"]').waitFor({ state: 'visible', timeout: 8000 });

  takeDeviceScreenshot('05_step3_plan_summary.png');

  // 8. Next: Payment
  console.log('Proceeding to Step 4: UPI Payment...');
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="onboard-proceed-to-pay-btn"]');
    if (b) b.click();
  });
  await page.locator('[data-testid="simulate-verify-payment-btn"]').waitFor({ state: 'visible', timeout: 8000 });

  takeDeviceScreenshot('06_step4_upi_payment.png');

  // 9. Complete Setup
  console.log('Submitting Hotel Registration & Verification...');
  const [registerRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/v1/auth/register') && r.status() === 201 || r.status() === 200, { timeout: 30000 }),
    page.evaluate(() => {
      const b = document.querySelector('[data-testid="simulate-verify-payment-btn"]');
      if (b) b.click();
    }),
  ]);

  const regData = await registerRes.json();
  console.log('=== Hotel Registration Created Successfully ===');
  console.log('Tenant Name:', regData.data?.tenant?.name);
  console.log('Hotel Code:', regData.data?.hotelCode);
  console.log('Admin Email:', regData.data?.adminCredentials?.email);
  console.log('Admin Password:', regData.data?.adminCredentials?.password);
  console.log('Admin Console URL:', regData.data?.adminUrl);

  const launchBtn = page.locator('[data-testid="launch-hotel-in-staff-app-btn"]');
  await launchBtn.waitFor({ state: 'visible', timeout: 15000 });

  takeDeviceScreenshot('07_step5_hotel_ready.png');

  // 10. Launch Hotel in Staff App
  console.log('Launching Created Hotel in Staff App...');
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="launch-hotel-in-staff-app-btn"]');
    if (b) b.click();
  });
  await page.waitForTimeout(3000);

  takeDeviceScreenshot('08_hotel_launched_in_staff_app.png');

  await browser.close();
  console.log('=== ALL STEPS COMPLETED ON REAL DEVICE! ===');
}

run().catch((err) => {
  console.error('Execution Failed:', err);
  process.exit(1);
});
