const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = path.join(__dirname, '../artifacts/ui-100-audit/screenshots');
const BROKEN_OUT = path.join(OUT, 'broken');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(BROKEN_OUT, { recursive: true });
fs.mkdirSync(path.join(__dirname, '../artifacts/ui-100-audit/db'), { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const SCREENS = [
  // --- APP 1: Superadmin SaaS (Port 3006) - 15 screens ---
  { app: 'superadmin', screen: 'dashboard', url: 'http://localhost:3006/?nav=DASHBOARD' },
  { app: 'superadmin', screen: 'branches', url: 'http://localhost:3006/?nav=BRANCHES' },
  { app: 'superadmin', screen: 'branding', url: 'http://localhost:3006/?nav=BRANDING' },
  { app: 'superadmin', screen: 'hotel-admin', url: 'http://localhost:3006/?nav=HOTEL_ADMIN' },
  { app: 'superadmin', screen: 'users-roles', url: 'http://localhost:3006/?nav=USERS_ROLES' },
  { app: 'superadmin', screen: 'subscriptions', url: 'http://localhost:3006/?nav=SUBSCRIPTIONS' },
  { app: 'superadmin', screen: 'system-config', url: 'http://localhost:3006/?nav=SYSTEM_CONFIG' },
  { app: 'superadmin', screen: 'menu-templates', url: 'http://localhost:3006/?nav=MENU_TEMPLATES' },
  { app: 'superadmin', screen: 'inventory', url: 'http://localhost:3006/?nav=INVENTORY' },
  { app: 'superadmin', screen: 'analytics', url: 'http://localhost:3006/?nav=ANALYTICS' },
  { app: 'superadmin', screen: 'franchise', url: 'http://localhost:3006/?nav=FRANCHISE' },
  { app: 'superadmin', screen: 'rooms-pms', url: 'http://localhost:3006/?nav=ROOMS_PMS' },
  { app: 'superadmin', screen: 'hardware', url: 'http://localhost:3006/?nav=HARDWARE' },
  { app: 'superadmin', screen: 'security', url: 'http://localhost:3006/?nav=SECURITY' },
  { app: 'superadmin', screen: 'decoupling-80-1', url: 'http://localhost:3006/?nav=DECOUPLING' },

  // --- APP 2: Admin ERP (Port 3005) - 25 screens ---
  { app: 'admin', screen: 'dashboard', url: 'http://localhost:3005/?module=DASHBOARD' },
  { app: 'admin', screen: 'staff-management', url: 'http://localhost:3005/?module=STAFF_MANAGEMENT' },
  { app: 'admin', screen: 'rooms-frontdesk', url: 'http://localhost:3005/?module=ROOM_MANAGEMENT' },
  { app: 'admin', screen: 'table-management', url: 'http://localhost:3005/?module=TABLE_MANAGEMENT' },
  { app: 'admin', screen: 'live-orders-kitchen', url: 'http://localhost:3005/?module=ORDERS_KITCHEN' },
  { app: 'admin', screen: 'pos-cashier', url: 'http://localhost:3005/?module=POS_CASHIER' },
  { app: 'admin', screen: 'menu-catalog', url: 'http://localhost:3005/?module=MENU_CATALOG' },
  { app: 'admin', screen: 'inventory-stock', url: 'http://localhost:3005/?module=INVENTORY_STOCK' },
  { app: 'admin', screen: 'purchases-suppliers', url: 'http://localhost:3005/?module=PURCHASES_SUPPLIERS' },
  { app: 'admin', screen: 'housekeeping', url: 'http://localhost:3005/?module=HOUSEKEEPING' },
  { app: 'admin', screen: 'night-audit', url: 'http://localhost:3005/?module=EXPENSES_ACCOUNTING' },
  { app: 'admin', screen: 'policies-sops', url: 'http://localhost:3005/?module=POLICIES_AND_USECASES' },
  { app: 'admin', screen: 'revenue-manager', url: 'http://localhost:3005/?module=REPORTS_ANALYTICS' },
  { app: 'admin', screen: 'tax-compliance', url: 'http://localhost:3005/?module=TAX_COMPLIANCE' },
  { app: 'admin', screen: 'restaurant-operations', url: 'http://localhost:3005/?module=SETTINGS_CONFIGURATION' },
  { app: 'admin', screen: 'front-desk-checkin', url: 'http://localhost:3005/?module=GUESTS_BOOKINGS' },
  { app: 'admin', screen: 'lost-and-found', url: 'http://localhost:3005/?module=MAINTENANCE' },
  { app: 'admin', screen: 'notification-center', url: 'http://localhost:3005/?module=NOTIFICATIONS' },
  { app: 'admin', screen: 'restaurant-outlets', url: 'http://localhost:3005/?module=RESTAURANTS_OUTLETS' },
  { app: 'admin', screen: 'banquet-management', url: 'http://localhost:3005/?module=BANQUET' },
  { app: 'admin', screen: 'corporate-folio', url: 'http://localhost:3005/?module=CORPORATE' },
  { app: 'admin', screen: 'dining-reservations', url: 'http://localhost:3005/?module=DINING_RESERVATIONS' },
  { app: 'admin', screen: 'kot-void-audit', url: 'http://localhost:3005/?module=KOT_VOID' },
  { app: 'admin', screen: 'recipe-costing', url: 'http://localhost:3005/?module=RECIPE_COSTING' },
  { app: 'admin', screen: 'store-requisitions', url: 'http://localhost:3005/?module=STORE_REQUISITIONS' },

  // --- APP 3: Waiter Mobile App (Port 3002) - 20 screens ---
  { app: 'waiter', screen: 'login-roster', url: 'http://localhost:3002/', noAuth: true },
  { app: 'waiter', screen: 'login-pin-pad', url: 'http://localhost:3002/', noAuth: true, action: 'open_pin' },
  { app: 'waiter', screen: 'my-tables', url: 'http://localhost:3002/?tab=My+Tables', authWaiter: true },
  { app: 'waiter', screen: 'other-tables', url: 'http://localhost:3002/?tab=Other+Tables', authWaiter: true },
  { app: 'waiter', screen: 'new-orders', url: 'http://localhost:3002/?tab=New+Orders', authWaiter: true },
  { app: 'waiter', screen: 'active-orders', url: 'http://localhost:3002/?tab=Active+Orders', authWaiter: true },
  { app: 'waiter', screen: 'live-kot', url: 'http://localhost:3002/?tab=Live+Orders+%26+KOT', authWaiter: true },
  { app: 'waiter', screen: 'kot-status', url: 'http://localhost:3002/?tab=KOT+%26+Status', authWaiter: true },
  { app: 'waiter', screen: 'table-billing', url: 'http://localhost:3002/?tab=Table+Billing', authWaiter: true },
  { app: 'waiter', screen: 'split-bill', url: 'http://localhost:3002/?tab=Split+Bill', authWaiter: true },
  { app: 'waiter', screen: 'table-transfer', url: 'http://localhost:3002/?tab=Table+Transfer', authWaiter: true },
  { app: 'waiter', screen: 'room-service', url: 'http://localhost:3002/?tab=Room+Service', authWaiter: true },
  { app: 'waiter', screen: 'guest-requests', url: 'http://localhost:3002/?tab=Guest+Requests', authWaiter: true },
  { app: 'waiter', screen: 'call-kitchen', url: 'http://localhost:3002/?tab=Call+Kitchen', authWaiter: true },
  { app: 'waiter', screen: 'order-history', url: 'http://localhost:3002/?tab=Order+History', authWaiter: true },
  { app: 'waiter', screen: 'menu-items-86', url: 'http://localhost:3002/?tab=Menu+%26+Stock', authWaiter: true },
  { app: 'waiter', screen: 'notifications', url: 'http://localhost:3002/?tab=Notifications', authWaiter: true },
  { app: 'waiter', screen: 'my-profile', url: 'http://localhost:3002/?tab=My+Profile', authWaiter: true },
  { app: 'waiter', screen: 'help-support', url: 'http://localhost:3002/?tab=Help+%26+Support', authWaiter: true },
  { app: 'waiter', screen: 'settings', url: 'http://localhost:3002/?tab=Settings', authWaiter: true },

  // --- APP 4: Kitchen KDS (Port 3003) - 5 screens ---
  { app: 'kds', screen: 'all-stations', url: 'http://localhost:3003/' },
  { app: 'kds', screen: 'bakery-station', url: 'http://localhost:3003/', action: 'kds_bakery' },
  { app: 'kds', screen: 'tandoor-station', url: 'http://localhost:3003/', action: 'kds_tandoor' },
  { app: 'kds', screen: 'curry-station', url: 'http://localhost:3003/', action: 'kds_curry' },
  { app: 'kds', screen: '86-stockout-drawer', url: 'http://localhost:3003/', action: 'kds_86' },

  // --- APP 5: Cashier POS (Port 3007) - 10 screens ---
  { app: 'cashier', screen: 'open-bills', url: 'http://localhost:3007/?tab=Open+Bills' },
  { app: 'cashier', screen: 'fast-pos-terminal', url: 'http://localhost:3007/?tab=POS+%2F+Billing' },
  { app: 'cashier', screen: 'split-bills', url: 'http://localhost:3007/?tab=Split+Bills' },
  { app: 'cashier', screen: 'cash-drawer', url: 'http://localhost:3007/?tab=Cash+Drawer' },
  { app: 'cashier', screen: 'payment-history', url: 'http://localhost:3007/?tab=Payment+History' },
  { app: 'cashier', screen: 'receipts-invoices', url: 'http://localhost:3007/?tab=Receipts' },
  { app: 'cashier', screen: 'room-charges-pos', url: 'http://localhost:3007/?tab=Room+Charges+(F%26B)' },
  { app: 'cashier', screen: 'shift-management', url: 'http://localhost:3007/?tab=Shift+Management' },
  { app: 'cashier', screen: 'expenses-pettycash', url: 'http://localhost:3007/?tab=Expenses+(Front+Desk)' },
  { app: 'cashier', screen: 'hardware-settings', url: 'http://localhost:3007/?tab=Settings' },

  // --- APP 6: Reception FrontDesk PMS (Port 3008) - 10 screens ---
  { app: 'reception', screen: 'room-dashboard', url: 'http://localhost:3008/?tab=Room+Dashboard' },
  { app: 'reception', screen: 'room-booking', url: 'http://localhost:3008/?tab=Room+Booking' },
  { app: 'reception', screen: 'walkin-checkin', url: 'http://localhost:3008/?tab=Walk-in+Check-in' },
  { app: 'reception', screen: 'checkin-checkout', url: 'http://localhost:3008/?tab=Check-in+%2F+Check-out' },
  { app: 'reception', screen: 'room-allocation', url: 'http://localhost:3008/?tab=Room+Allocation' },
  { app: 'reception', screen: 'room-status', url: 'http://localhost:3008/?tab=Room+Status' },
  { app: 'reception', screen: 'guest-management', url: 'http://localhost:3008/?tab=Guest+Management' },
  { app: 'reception', screen: 'room-types-rates', url: 'http://localhost:3008/?tab=Room+Types+%26+Rates' },
  { app: 'reception', screen: 'extra-services', url: 'http://localhost:3008/?tab=Extra+Services' },
  { app: 'reception', screen: 'reception-settings', url: 'http://localhost:3008/?tab=Settings' },

  // --- APP 7: Customer Table App (Port 3001) - 8 screens ---
  { app: 'customer', screen: 'table-menu', url: 'http://localhost:3001/?table=T-01' },
  { app: 'customer', screen: 'category-carousel', url: 'http://localhost:3001/?table=T-01', action: 'cust_category' },
  { app: 'customer', screen: 'food-type-filter', url: 'http://localhost:3001/?table=T-01', action: 'cust_veg' },
  { app: 'customer', screen: 'item-customization-modal', url: 'http://localhost:3001/?table=T-01', action: 'cust_item' },
  { app: 'customer', screen: 'cart-drawer', url: 'http://localhost:3001/?table=T-01', action: 'cust_cart' },
  { app: 'customer', screen: 'universal-shell', url: 'http://localhost:3001/?table=T-01&mode=universal' },
  { app: 'customer', screen: 'mode-selector', url: 'http://localhost:3001/?table=T-01', action: 'cust_mode' },
  { app: 'customer', screen: 'cooking-service-tracker', url: 'http://localhost:3001/?table=T-01&view=tracker' },

  // --- APP 8: Guest Room Portal IRD (Port 3004) - 7 screens ---
  { app: 'guest-ird', screen: 'room-dashboard', url: 'http://localhost:3004/?room=305' },
  { app: 'guest-ird', screen: 'in-room-dining-menu', url: 'http://localhost:3004/?room=305', action: 'ird_menu' },
  { app: 'guest-ird', screen: 'concierge-services', url: 'http://localhost:3004/?room=305', action: 'ird_concierge' },
  { app: 'guest-ird', screen: 'folio-review-modal', url: 'http://localhost:3004/?room=305', action: 'ird_folio' },
  { app: 'guest-ird', screen: 'delivery-tracker-modal', url: 'http://localhost:3004/?room=305', action: 'ird_tracker' },
  { app: 'guest-ird', screen: 'header-quick-actions', url: 'http://localhost:3004/?room=305' },
  { app: 'guest-ird', screen: 'room-checkout-view', url: 'http://localhost:3004/?room=305&view=checkout' },
];

let superToken = '';
let superUser = null;
let hotelToken = '';
let hotelUser = null;

async function authenticate() {
  try {
    const res1 = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@spicehub.com', password: 'SpiceHub@123' }),
    });
    const j1 = await res1.json();
    if (j1.success) {
      superToken = j1.data.token;
      superUser = j1.data.user;
    }
  } catch (e) {
    console.warn('Superadmin auth fetch error:', e.message);
  }

  try {
    const res2 = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tajgateway.com', password: 'SpiceHub@123' }),
    });
    const j2 = await res2.json();
    if (j2.success) {
      hotelToken = j2.data.token;
      hotelUser = j2.data.user;
    }
  } catch (e) {
    console.warn('Hotel Admin auth fetch error:', e.message);
  }
}

let screenIndex = 0;
const log = [];

async function auditScreen(browser, item) {
  screenIndex++;
  const n = String(screenIndex).padStart(3, '0');
  const slug = `${item.app}-${item.screen}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    try {
      // Setup LocalStorage Pre-Auth Scripts
      await page.addInitScript(
        ({ app, superToken, superUser, hotelToken, hotelUser, noAuth, authWaiter }) => {
          if (app === 'superadmin' && superToken) {
            window.localStorage.setItem('spicehub_token', superToken);
            window.localStorage.setItem('token', superToken);
            window.localStorage.setItem('spicehub_auth_user', JSON.stringify(superUser));
          } else if (['admin', 'cashier', 'reception', 'kds'].includes(app) && hotelToken) {
            window.localStorage.setItem('spicehub_token', hotelToken);
            window.localStorage.setItem('token', hotelToken);
            window.localStorage.setItem('spicehub_hotel_id', '6adcb811d58c1637ff16b357');
            window.localStorage.setItem('hotelId', '6adcb811d58c1637ff16b357');
            window.localStorage.setItem('spicehub_auth_user', JSON.stringify(hotelUser));
          } else if (app === 'waiter') {
            if (noAuth) {
              window.localStorage.removeItem('spicehub_waiter_session');
            } else if (authWaiter) {
              const waiterProfile = {
                staffId: 'waiter-01',
                name: 'Waiter John',
                role: 'Senior Waiter',
                assignedTableStart: 1,
                assignedTableEnd: 10,
                assignedTableCount: 10,
                assignedSection: 'Indoor AC Dining Hall',
                shift: 'Morning Shift (09:00 AM - 05:00 PM)',
              };
              window.localStorage.setItem('spicehub_waiter_session', JSON.stringify(waiterProfile));
            }
          }
        },
        { app: item.app, superToken, superUser, hotelToken, hotelUser, noAuth: item.noAuth, authWaiter: item.authWaiter }
      );

      // 1. Initial navigation
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(600);

      // Handle specific tab / module events if needed
      if (item.app === 'superadmin' && item.url.includes('nav=')) {
        const nav = item.url.split('nav=')[1].split('&')[0];
        await page.evaluate((navKey) => {
          window.dispatchEvent(new CustomEvent('superadmin:set_nav', { detail: navKey }));
        }, nav);
      } else if (item.app === 'admin' && item.url.includes('module=')) {
        const mod = item.url.split('module=')[1].split('&')[0];
        await page.evaluate((modKey) => {
          window.dispatchEvent(new CustomEvent('erp:set_module', { detail: modKey }));
        }, mod);
      } else if (item.app === 'cashier' && item.url.includes('tab=')) {
        const tab = decodeURIComponent(item.url.split('tab=')[1].split('&')[0]);
        await page.evaluate((tabName) => {
          window.dispatchEvent(new CustomEvent('cashier:set_tab', { detail: tabName }));
        }, tab);
      } else if (item.app === 'reception' && item.url.includes('tab=')) {
        const tab = decodeURIComponent(item.url.split('tab=')[1].split('&')[0]);
        await page.evaluate((tabName) => {
          window.dispatchEvent(new CustomEvent('reception:set_tab', { detail: tabName }));
        }, tab);
      } else if (item.app === 'waiter' && item.url.includes('tab=')) {
        const tab = decodeURIComponent(item.url.split('tab=')[1].split('&')[0]);
        await page.evaluate((tabName) => {
          window.dispatchEvent(new CustomEvent('waiter:set_tab', { detail: tabName }));
        }, tab);
      }

      // Handle action triggers (modals, drawers, sub-tabs)
      if (item.action === 'open_pin') {
        const card = page.locator('button:has-text("Senior Waiter"), button:has-text("Captain"), button:has-text("Waiter")').first();
        if (await card.isVisible().catch(() => false)) await card.click();
      } else if (item.action === 'kds_bakery') {
        const btn = page.locator('button:has-text("Bakery"), button:has-text("BAKERY")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'kds_tandoor') {
        const btn = page.locator('button:has-text("Tandoor"), button:has-text("TANDOOR")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'kds_curry') {
        const btn = page.locator('button:has-text("Curry"), button:has-text("MAIN")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'kds_86') {
        const btn = page.locator('button:has-text("86"), button:has-text("Stock")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'cust_category') {
        const btn = page.locator('button:has-text("Starters"), button:has-text("Breads"), button:has-text("Main")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'cust_veg') {
        const btn = page.locator('button:has-text("Veg Only"), button:has-text("Veg")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'cust_item') {
        const btn = page.locator('button:has-text("Add"), button:has-text("+")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'cust_cart') {
        const btn = page.locator('button:has-text("Cart"), button:has-text("View Cart")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'ird_menu') {
        const btn = page.locator('button:has-text("Order Food"), button:has-text("Dining")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'ird_concierge') {
        const btn = page.locator('button:has-text("Concierge"), button:has-text("Housekeeping")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'ird_folio') {
        const btn = page.locator('button:has-text("Folio"), button:has-text("Bill")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      } else if (item.action === 'ird_tracker') {
        const btn = page.locator('button:has-text("Track"), button:has-text("Status")').first();
        if (await btn.isVisible().catch(() => false)) await btn.click();
      }

      await page.waitForTimeout(600);

      // Detect layout issues
      const issues = await page.evaluate(() => {
        const problems = [];
        // 1. Horizontal overflow
        const docScrollW = document.documentElement.scrollWidth;
        const docClientW = document.documentElement.clientWidth;
        if (docScrollW > docClientW + 2) {
          problems.push({
            type: 'horizontal-overflow',
            detail: `document scrollWidth ${docScrollW} > clientWidth ${docClientW}`,
          });
        }
        // 2. Elements wider than viewport (excluding intentional horizontal scroll containers)
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 5 && rect.width > 0) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className || '').toString().slice(0, 40);
            if (tag !== 'html' && tag !== 'body') {
              // Check if inside an intentional horizontal scroll container
              let isScrollChild = false;
              let p = el.parentElement;
              while (p && p !== document.body && p !== document.documentElement) {
                const s = window.getComputedStyle(p);
                if (s.overflowX === 'auto' || s.overflowX === 'scroll' || (p.className && p.className.includes && p.className.includes('overflow-x'))) {
                  isScrollChild = true;
                  break;
                }
                p = p.parentElement;
              }
              if (!isScrollChild) {
                problems.push({
                  type: 'element-overflow',
                  detail: `${tag}.${cls} right=${Math.round(rect.right)} > vw=${window.innerWidth}`,
                });
                if (problems.filter((pr) => pr.type === 'element-overflow').length >= 3) break;
              }
            }
          }
        }
        // 3. Empty/blank page detection
        const bodyText = (document.body.innerText || '').trim();
        if (bodyText.length < 5) {
          problems.push({ type: 'blank-page', detail: `body text length: ${bodyText.length}` });
        }
        return problems;
      });

      const file = path.join(OUT, `${n}-${slug}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const buffer = fs.readFileSync(file);
      const sha = crypto.createHash('sha256').update(buffer).digest('hex');
      const size = fs.statSync(file).size;

      if (issues.length > 0 || size < 10000) {
        fs.writeFileSync(path.join(BROKEN_OUT, `${n}-${slug}-${vp.name}.png`), buffer);
      }

      log.push({
        index: n,
        app: item.app,
        screen: item.screen,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        url: item.url,
        file: path.relative(path.join(__dirname, '..'), file),
        sha,
        size,
        issues,
        consoleErrors: consoleErrors.slice(0, 3),
        status: size < 10000 ? 'BLANK' : issues.length > 0 ? 'ISSUES' : 'OK',
      });

      console.log(
        `[${n}/100] ${item.app} / ${item.screen} / ${vp.name}: ${size}B | Status: ${
          size < 10000 ? 'BLANK' : issues.length > 0 ? 'ISSUES (' + issues.length + ')' : 'OK'
        }`
      );
    } catch (e) {
      log.push({
        index: n,
        app: item.app,
        screen: item.screen,
        viewport: vp.name,
        url: item.url,
        error: e.message,
        status: 'ERROR',
      });
      console.log(`[${n}/100] ${item.app} / ${item.screen} / ${vp.name}: ERROR - ${e.message}`);
    }
    await ctx.close();
  }
}

(async () => {
  console.log('====================================================');
  console.log(`STARTING 100-SCREEN AUDIT: ${SCREENS.length} SCREENS × 3 VIEWPORTS`);
  console.log('====================================================\n');

  await authenticate();

  const browser = await chromium.launch({
    executablePath: '/home/mahesh/.cache/puppeteer/chrome/linux-155.0.8059.84/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const startTime = Date.now();
  for (const s of SCREENS) {
    await auditScreen(browser, s);
  }
  await browser.close();
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  fs.writeFileSync(
    path.join(__dirname, '../artifacts/ui-100-audit/screenshots-log.json'),
    JSON.stringify(log, null, 2)
  );

  console.log('\n====================================================');
  console.log(`AUDIT FINISHED IN ${elapsed}s`);
  const ok = log.filter((x) => x.status === 'OK').length;
  const issues = log.filter((x) => x.status === 'ISSUES').length;
  const blank = log.filter((x) => x.status === 'BLANK').length;
  const errors = log.filter((x) => x.status === 'ERROR').length;
  console.log(`SUMMARY: Total: ${log.length} captures | OK: ${ok} | ISSUES: ${issues} | BLANK: ${blank} | ERROR: ${errors}`);
  console.log('====================================================');
})();
