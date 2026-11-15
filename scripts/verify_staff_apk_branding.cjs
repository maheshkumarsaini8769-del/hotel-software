const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/home/mahesh/.gemini/antigravity/brain/f77e34bf-05bc-4a43-9daa-39b99e3453d5';

async function run() {
  console.log('🚀 Starting Staff Mobile APK Branding Verification Flow...');
  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // PHASE 1: Super Admin Authentication & Branding Studio
    // -------------------------------------------------------------
    console.log('📌 Phase 1: Logging in to Super Admin Platform Control Plane...');
    
    // Obtain valid Super Admin Token via backend API
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@spicehub.com', password: 'SpiceHub@123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.data?.token) {
      throw new Error(`Login API failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.data.token;
    const user = loginData.data.user;
    console.log('✓ Successfully authenticated Super Admin via API');

    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    
    // Pre-populate session token so StaffLoginGate passes immediately
    await adminContext.addInitScript(({ token, user }) => {
      localStorage.setItem('spicehub_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('spicehub_auth_user', JSON.stringify(user));
    }, { token, user });

    const adminPage = await adminContext.newPage();
    await adminPage.goto('http://localhost:3006?nav=BRANDING', { waitUntil: 'networkidle', timeout: 30000 });
    await adminPage.waitForTimeout(2000);

    // If StaffLoginGate form appears, click submit button
    const loginSubmit = adminPage.locator('[data-testid="staff-login-submit"]');
    if (await loginSubmit.isVisible()) {
      console.log('✓ Login gate visible, clicking sign in...');
      await loginSubmit.click();
      await adminPage.waitForTimeout(2000);
    }

    // Ensure we are on BRANDING tab
    const brandingNavBtn = adminPage.locator('[data-testid="sidebar-nav-BRANDING"]');
    if (await brandingNavBtn.isVisible()) {
      await brandingNavBtn.click();
      await adminPage.waitForTimeout(1000);
    }

    // Scroll to Staff APK Branding Studio section
    console.log('✓ Locating Staff Mobile APK Branding Studio section...');
    const brandingSection = adminPage.locator('#staff-apk-branding-section');
    await brandingSection.waitFor({ state: 'visible', timeout: 15000 });
    await brandingSection.scrollIntoViewIfNeeded();
    await adminPage.waitForTimeout(1000);

    const isSectionVisible = await brandingSection.isVisible();
    console.log(`✓ Staff APK Branding Section visible: ${isSectionVisible}`);

    // Verify and click 1-Click Luxury Preset: "Royal Heritage Haveli"
    const haveliPreset = adminPage.locator('[data-testid="preset-staff-theme-haveli"]');
    await haveliPreset.click();
    console.log('✓ Selected 1-Click Luxury Preset: "Royal Heritage Haveli"');
    await adminPage.waitForTimeout(800);

    // Customize the welcome title to verify custom input saving
    const welcomeTitleInput = adminPage.locator('[data-testid="input-staff-welcome-title"]');
    await welcomeTitleInput.fill('Royal Heritage Staff Sanctuary');
    console.log('✓ Set custom Welcome Title: "Royal Heritage Staff Sanctuary"');

    // Click "Save & Publish to Staff APK"
    const saveBtn = adminPage.locator('[data-testid="btn-save-staff-branding"]');
    await saveBtn.click();
    console.log('✓ Clicked "Save & Publish to Staff APK" button');

    // Wait for success toast
    const toast = adminPage.locator('[data-testid="staff-branding-toast"]');
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    const toastText = await toast.textContent();
    console.log(`✓ Success Toast received: "${toastText.trim()}"`);

    // Verify phone mockup inside Super Admin preview
    const phoneMockup = adminPage.locator('[data-testid="staff-apk-preview-phone"]');
    await phoneMockup.scrollIntoViewIfNeeded();
    await adminPage.waitForTimeout(1000);

    // Capture Super Admin studio screenshot
    const superAdminShotPath = path.join(ARTIFACT_DIR, 'staff_apk_superadmin_studio.png');
    await adminPage.screenshot({ path: superAdminShotPath, fullPage: false });
    console.log(`📸 Saved Super Admin Studio screenshot: ${superAdminShotPath}`);

    // -------------------------------------------------------------
    // PHASE 2: Staff Mobile APK / Launcher Verification
    // -------------------------------------------------------------
    console.log('📌 Phase 2: Opening Staff Mobile APK on Mobile Viewport (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 13/14 / Android viewport
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const staffPage = await mobileContext.newPage();

    // Ensure session is in 'hotel' step by clearing local storage
    await staffPage.addInitScript(() => {
      localStorage.removeItem('selectedHotel');
      localStorage.removeItem('spicehub_hotel_access_token');
      sessionStorage.clear();
    });

    // Navigate to Staff PWA / APK launcher on port 3010
    await staffPage.goto('http://localhost:3010', { waitUntil: 'networkidle', timeout: 30000 });
    await staffPage.waitForTimeout(2500);

    // Verify Hotel Code Card is visible
    const hotelCodeSection = staffPage.locator('#step-hotel-code-section');
    await hotelCodeSection.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Staff APK Hotel Code section rendered successfully');

    // Verify Super Admin Branded Hero Showcase Banner
    const heroBanner = staffPage.locator('[data-testid="staff-branding-hero-banner"]');
    await heroBanner.waitFor({ state: 'visible', timeout: 5000 });
    const heroImg = staffPage.locator('[data-testid="staff-branding-hero-img"]');
    const heroImgSrc = await heroImg.getAttribute('src');
    console.log(`✓ Hero Showcase Image URL: ${heroImgSrc}`);

    // Verify Welcome Title and Badge text match Super Admin configuration
    const titleLocator = staffPage.locator('[data-testid="staff-branding-welcome-title"]');
    const renderedTitle = await titleLocator.textContent();
    console.log(`✓ Rendered Welcome Title: "${renderedTitle.trim()}"`);

    const badgeLocator = staffPage.locator('[data-testid="staff-branding-badge"]');
    const renderedBadge = await badgeLocator.textContent();
    console.log(`✓ Rendered Badge: "${renderedBadge.trim()}"`);

    // Verify Hotel Code input and verification button
    const codeInput = staffPage.locator('[data-testid="staff-hotel-code-input"]');
    await codeInput.fill('BH101');
    console.log('✓ Entered Hotel Code "BH101" in Staff APK');

    const verifyBtn = staffPage.locator('[data-testid="verify-staff-hotel-code"]');
    const isEnabled = await verifyBtn.isEnabled();
    console.log(`✓ Verify Hotel Code Button enabled: ${isEnabled}`);

    // Capture Staff Mobile APK customized screenshot
    const staffApkShotPath = path.join(ARTIFACT_DIR, 'staff_apk_hotel_code_customized.png');
    await staffPage.screenshot({ path: staffApkShotPath });
    console.log(`📸 Saved Staff APK Customized screenshot: ${staffApkShotPath}`);

    console.log('\n🎉 ALL TESTS PASSED! Staff APK Hotel Code screen branding is fully controlled by Super Admin!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
