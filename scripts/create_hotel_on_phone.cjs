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
  console.log('=== Step 1: Ensure adb reverse & forward tunnels ===');
  execSync('adb reverse tcp:5000 tcp:5000');
  execSync('adb reverse tcp:3005 tcp:3005');
  execSync('adb reverse tcp:3006 tcp:3006');
  execSync('adb forward tcp:9222 localabstract:webview_devtools_remote_25311');

  console.log('=== Step 2: Connect to Phone WebView via CDP ===');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  console.log('Connected! Page title:', await page.title(), 'URL:', page.url());

  page.on('console', msg => console.log('[Phone Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[Phone PageError]', err.message));

  // Verify host in phone localStorage
  const currentHost = await page.evaluate(() => localStorage.getItem('spicehub_server_host'));
  console.log('Current localStorage spicehub_server_host:', currentHost);
  if (currentHost !== 'http://127.0.0.1:5000') {
    await page.evaluate(() => localStorage.setItem('spicehub_server_host', 'http://127.0.0.1:5000'));
    await page.reload();
    await page.waitForTimeout(2000);
  }

  takeDeviceScreenshot('01_phone_staff_home.png');

  // Check if we are on the initial screen with Onboard Property button
  const openOnboardBtn = page.locator('[data-testid="open-onboard-hotel-btn"]');
  if (await openOnboardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Clicking "Onboard Property & Setup Terminals"...');
    await openOnboardBtn.click();
    await page.waitForTimeout(1000);
  } else {
    console.log('Already on onboarding screen or inside modal.');
  }

  takeDeviceScreenshot('02_onboard_step1_empty.png');

  console.log('=== Step 3: Filling Step 1 Hotel & Admin Details ===');
  const hotelName = 'Amer Palace Heritage Haveli';
  const adminName = 'Mahesh Saini';
  const adminEmail = 'maheshsaini10101@gmail.com';
  const adminPhone = '9876543210';
  const adminPassword = 'AmerPalace@2026';
  const city = 'Jaipur';
  const state = 'Rajasthan';
  const address = 'Amer Fort Road, Near Jal Mahal, Jaipur';

  console.log(`Setting Hotel Name: ${hotelName}`);
  await page.fill('#onboard-hotel-name', hotelName);
  await page.waitForTimeout(200);

  console.log(`Setting Admin Name: ${adminName}`);
  await page.fill('#onboard-admin-name', adminName);
  await page.waitForTimeout(200);

  console.log(`Setting Admin Email: ${adminEmail}`);
  await page.fill('#onboard-admin-email', adminEmail);
  await page.waitForTimeout(300);

  // Send Email OTP & intercept response
  console.log('Sending Email OTP to local backend...');
  const sendEmailOtpBtn = page.locator('[data-testid="send-onboard-email-otp-btn"]');
  const [emailOtpResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/auth/onboarding/send-otp') && res.status() === 200, { timeout: 15000 }),
    sendEmailOtpBtn.click(),
  ]);

  const emailOtpData = await emailOtpResponse.json();
  console.log('Email OTP Response:', emailOtpData);
  const emailOtp = emailOtpData.devEmailOtp;

  if (!emailOtp) {
    throw new Error('Could not retrieve devEmailOtp from send-otp response!');
  }

  // Fill and verify email OTP
  console.log(`Entering Email OTP (${emailOtp})...`);
  const emailOtpInput = page.locator('[data-testid="onboard-email-otp-input"]');
  await emailOtpInput.waitFor({ state: 'visible', timeout: 8000 });
  await emailOtpInput.fill(emailOtp);
  await page.waitForTimeout(300);

  console.log('Clicking Verify Email OTP...');
  const verifyEmailOtpBtn = page.locator('[data-testid="verify-onboard-email-otp-btn"]');
  const [verifyEmailRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/auth/onboarding/verify-otp') && res.status() === 200, { timeout: 10000 }),
    verifyEmailOtpBtn.click(),
  ]);
  console.log('Email Verify Response:', await verifyEmailRes.json());
  await page.waitForTimeout(500);

  // Phone number and WhatsApp OTP
  console.log(`Filling Phone Number: ${adminPhone}`);
  await page.fill('#onboard-admin-phone', adminPhone);
  await page.waitForTimeout(300);

  console.log('Sending WhatsApp OTP...');
  const sendPhoneOtpBtn = page.locator('[data-testid="send-onboard-phone-otp-btn"]');
  const [phoneOtpResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/auth/onboarding/send-otp') && res.status() === 200, { timeout: 15000 }),
    sendPhoneOtpBtn.click(),
  ]);
  const phoneOtpData = await phoneOtpResponse.json();
  console.log('Phone OTP Response:', phoneOtpData);
  const whatsappOtp = phoneOtpData.devWhatsAppOtp || '999999';

  console.log(`Entering WhatsApp OTP (${whatsappOtp})...`);
  const whatsappOtpInput = page.locator('[data-testid="onboard-whatsapp-otp-input"]');
  await whatsappOtpInput.waitFor({ state: 'visible', timeout: 8000 });
  await whatsappOtpInput.fill(whatsappOtp);
  await page.waitForTimeout(300);

  console.log('Clicking Verify WhatsApp OTP...');
  const verifyPhoneOtpBtn = page.locator('[data-testid="verify-onboard-phone-otp-btn"]');
  const [verifyPhoneRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/auth/onboarding/verify-otp') && res.status() === 200, { timeout: 10000 }),
    verifyPhoneOtpBtn.click(),
  ]);
  console.log('Phone Verify Response:', await verifyPhoneRes.json());
  await page.waitForTimeout(500);

  // Admin Password
  console.log('Filling Admin Password...');
  await page.fill('#onboard-admin-password', adminPassword);
  await page.waitForTimeout(200);

  // Address Details
  console.log('Filling City and Address...');
  await page.fill('#onboard-city', city);
  await page.waitForTimeout(200);
  await page.fill('#onboard-state', state);
  await page.waitForTimeout(200);

  const addressInput = page.locator('[data-testid="onboard-street-address-input"]');
  if (await addressInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await addressInput.fill(address);
  }

  takeDeviceScreenshot('03_onboard_step1_filled_and_verified.png');

  // Move to Step 2: Portals
  console.log('=== Step 4: Proceeding to Terminals / Portals ===');
  const nextToPortalsBtn = page.locator('[data-testid="onboard-next-to-portals-btn"]');
  await nextToPortalsBtn.click();
  await page.waitForTimeout(1000);

  takeDeviceScreenshot('04_onboard_step2_terminals.png');

  // Move to Step 3: Plan Summary
  console.log('=== Step 5: Proceeding to Plan Summary ===');
  const nextToBillBtn = page.locator('[data-testid="onboard-next-to-bill-btn"]');
  await nextToBillBtn.waitFor({ state: 'visible', timeout: 5000 });
  await nextToBillBtn.click();
  await page.waitForTimeout(1000);

  takeDeviceScreenshot('05_onboard_step3_plan_summary.png');

  // Move to Step 4: Payment
  console.log('=== Step 6: Proceeding to UPI Payment Simulation ===');
  const proceedToPayBtn = page.locator('[data-testid="onboard-proceed-to-pay-btn"]');
  await proceedToPayBtn.waitFor({ state: 'visible', timeout: 5000 });
  await proceedToPayBtn.click();
  await page.waitForTimeout(1000);

  takeDeviceScreenshot('06_onboard_step4_upi_payment.png');

  // Complete Payment & Setup Hotel
  console.log('=== Step 7: Submitting Hotel Registration & Completing Setup ===');
  const completePaymentBtn = page.locator('[data-testid="simulate-verify-payment-btn"]');
  await completePaymentBtn.waitFor({ state: 'visible', timeout: 5000 });

  const [registerResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/v1/auth/register'), { timeout: 30000 }),
    completePaymentBtn.click(),
  ]);

  const registerData = await registerResponse.json();
  console.log('Register Response Status:', registerResponse.status(), 'Body:', JSON.stringify(registerData, null, 2));

  // Wait for Success screen
  console.log('Waiting for Hotel Ready / Success screen...');
  const launchHotelBtn = page.locator('[data-testid="launch-hotel-in-staff-app-btn"]');
  await launchHotelBtn.waitFor({ state: 'visible', timeout: 15000 });

  takeDeviceScreenshot('07_onboard_step5_hotel_ready.png');

  // Launch newly onboarded hotel in Staff App
  console.log('=== Step 8: Launching Hotel in Staff App ===');
  await launchHotelBtn.click();
  await page.waitForTimeout(3000);

  takeDeviceScreenshot('08_hotel_launched_in_staff_app.png');

  await browser.close();
  console.log('=== Onboarding Flow Completed Successfully on Device! ===');
}

run().catch((err) => {
  console.error('Fatal Error during execution:', err);
  process.exit(1);
});
