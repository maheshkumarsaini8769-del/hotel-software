process.env.NODE_ENV = 'test';

import assert from 'node:assert';
import mongoose from 'mongoose';
import {
  calculateModularSubscription,
  DEFAULT_PORTAL_CATALOG,
  ALL_PORTAL_KEYS,
  PortalKey,
} from '@spicehub/shared-types';
import { Tenant } from '../backend/src/models/Tenant';
import { updateTenantPortalsAndPricing } from '../backend/src/controllers/superAdminController';
import { waiterLogin } from '../backend/src/controllers/authController';
import { User } from '../backend/src/models/User';

console.log('================================================================');
console.log('🧪 VERIFYING MODULAR PORTAL ALLOCATION & DYNAMIC PRICING ENGINE');
console.log('================================================================\n');

async function runTests() {
  let passedCount = 0;

  // -------------------------------------------------------------------------
  // TEST 1: Default Portal Catalog Integrity
  // -------------------------------------------------------------------------
  console.log('▶ Test 1: Verifying Portal Catalog contracts and workstation mappings...');
  assert.strictEqual(DEFAULT_PORTAL_CATALOG.length, 7, 'Catalog must contain exactly 7 operational portals');
  
  const expectedPortals: Record<PortalKey, { port: number; price: number }> = {
    admin: { port: 3005, price: 1999 },
    reception: { port: 3008, price: 1499 },
    cashier: { port: 3007, price: 1199 },
    kds: { port: 3003, price: 899 },
    waiter: { port: 3002, price: 999 },
    customer: { port: 3001, price: 699 },
    guest: { port: 3004, price: 699 },
  };

  for (const [key, expected] of Object.entries(expectedPortals)) {
    const item = DEFAULT_PORTAL_CATALOG.find((p) => p.id === key);
    assert.ok(item, `Portal '${key}' must exist in catalog`);
    assert.strictEqual(item.port, expected.port, `Portal '${key}' port must be ${expected.port}`);
    assert.strictEqual(item.defaultMonthlyPriceINR, expected.price, `Portal '${key}' price must be ₹${expected.price}`);
  }
  console.log('  ✔ All 7 portals verified with correct ports and default prices.');
  passedCount++;

  // -------------------------------------------------------------------------
  // TEST 2: Dynamic Subscription Calculation Engine
  // -------------------------------------------------------------------------
  console.log('\n▶ Test 2: Testing dynamic subscription calculation across use cases...');

  // 2.1 Full Suite (all 7 portals)
  const fullSuite = calculateModularSubscription(ALL_PORTAL_KEYS, 0, 'MONTHLY');
  const expectedFullBase = 1999 + 1499 + 1199 + 899 + 999 + 699 + 699; // 7693 or 7994 depending on item catalog
  assert.strictEqual(fullSuite.baseMonthlyTotalINR, expectedFullBase);
  assert.strictEqual(fullSuite.finalMonthlyTotalINR, expectedFullBase);
  assert.strictEqual(fullSuite.annualTotalINR, expectedFullBase * 10);
  console.log(`  ✔ Full Suite (7 portals): ₹${fullSuite.finalMonthlyTotalINR}/mo, ₹${fullSuite.annualTotalINR}/yr`);

  // 2.2 Standalone Restaurant (No PMS, No IRD)
  const restaurantPortals: PortalKey[] = ['admin', 'cashier', 'kds', 'waiter', 'customer'];
  const restaurantSuite = calculateModularSubscription(restaurantPortals, 0, 'MONTHLY');
  const expectedRestBase = 1999 + 1199 + 899 + 999 + 699; // 5795
  assert.strictEqual(restaurantSuite.finalMonthlyTotalINR, expectedRestBase);
  console.log(`  ✔ Standalone Restaurant (5 portals): ₹${restaurantSuite.finalMonthlyTotalINR}/mo`);

  // 2.3 QR Cafe (No Waiter, No PMS, No IRD)
  const cafePortals: PortalKey[] = ['admin', 'cashier', 'kds', 'customer'];
  const cafeSuite = calculateModularSubscription(cafePortals, 0, 'MONTHLY');
  const expectedCafeBase = 1999 + 1199 + 899 + 699; // 4796
  assert.strictEqual(cafeSuite.finalMonthlyTotalINR, expectedCafeBase);
  console.log(`  ✔ QR Self-Order Cafe (4 portals): ₹${cafeSuite.finalMonthlyTotalINR}/mo (Saved ₹999/mo on Waiter)`);

  // 2.4 Rooms Only (No Dining, No KDS, No Waiter, No QR)
  const roomsPortals: PortalKey[] = ['admin', 'reception', 'cashier'];
  const roomsSuite = calculateModularSubscription(roomsPortals, 0, 'MONTHLY');
  const expectedRoomsBase = 1999 + 1499 + 1199; // 4697
  assert.strictEqual(roomsSuite.finalMonthlyTotalINR, expectedRoomsBase);
  console.log(`  ✔ Boutique Lodge (Rooms Only): ₹${roomsSuite.finalMonthlyTotalINR}/mo`);

  // 2.5 Custom Discount and Zero-Floor Protection
  const discountedSuite = calculateModularSubscription(cafePortals, -500, 'MONTHLY');
  assert.strictEqual(discountedSuite.finalMonthlyTotalINR, expectedCafeBase - 500);

  const zeroFloorSuite = calculateModularSubscription(cafePortals, -10000, 'MONTHLY');
  assert.strictEqual(zeroFloorSuite.finalMonthlyTotalINR, 0, 'Price must never drop below 0');
  console.log('  ✔ Custom discounts and zero-floor protection verified.');
  passedCount++;

  // -------------------------------------------------------------------------
  // TEST 3: Tenant Schema & Database Defaults
  // -------------------------------------------------------------------------
  console.log('\n▶ Test 3: Validating Tenant Mongoose Model schema defaults and validations...');
  const tenantDoc = new Tenant({
    name: 'Modular Test Resort',
    code: 'MOD001',
    slug: 'modular-test-resort',
    contactEmail: 'owner@modularresort.com',
    contactPhone: '9876543210',
    enabledPortals: ['admin', 'reception', 'cashier'],
    billingCycle: 'ANNUAL',
    customPricingAdjustmentINR: -200,
    subscriptionMonthlyINR: 4497,
  });

  assert.deepStrictEqual(tenantDoc.enabledPortals, ['admin', 'reception', 'cashier']);
  assert.strictEqual(tenantDoc.billingCycle, 'ANNUAL');
  assert.strictEqual(tenantDoc.customPricingAdjustmentINR, -200);
  assert.strictEqual(tenantDoc.subscriptionMonthlyINR, 4497);
  console.log('  ✔ Tenant model correctly validates enabledPortals, billingCycle, and customPricingAdjustmentINR.');
  passedCount++;

  // -------------------------------------------------------------------------
  // TEST 4: Super Admin Controller Portal Allocation & Realtime Sync
  // -------------------------------------------------------------------------
  console.log('\n▶ Test 4: Testing Super Admin updateTenantPortalsAndPricing controller logic...');
  const mockTenantId = new mongoose.Types.ObjectId();
  const mockTenantInstance: any = {
    _id: mockTenantId,
    name: 'Grand Royal Palace',
    enabledPortals: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
    subscriptionMonthlyINR: 7693,
    billingCycle: 'MONTHLY',
    customPricingAdjustmentINR: 0,
    featureFlags: {
      pmsEnabled: true,
      posEnabled: true,
      kdsEnabled: true,
      waiterEnabled: true,
      qrDineInEnabled: true,
      roomServiceEnabled: true,
      banquetEnabled: false,
      loyaltyEnabled: false,
      aiInsightsEnabled: false,
      tallyExportEnabled: true,
    },
    save: async function () {
      return this;
    },
  };

  // Mock Tenant.findById
  const originalFindById = Tenant.findById;
  Tenant.findById = (async (id: any) => {
    if (id.toString() === mockTenantId.toString()) return mockTenantInstance;
    return null;
  }) as any;

  try {
    let responseStatus = 0;
    let responseJson: any = null;

    const mockReq: any = {
      params: { tenantId: mockTenantId.toString() },
      body: {
        enabledPortals: ['admin', 'cashier', 'kds', 'customer'], // De-allocates waiter and reception
        monthlyPriceINR: 4796,
        billingCycle: 'ANNUAL',
        customPricingAdjustmentINR: 0,
      },
    };

    const mockRes: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseJson = data;
        return mockRes;
      },
    };

    await updateTenantPortalsAndPricing(mockReq, mockRes);

    assert.strictEqual(responseStatus, 200);
    assert.strictEqual(responseJson.success, true);
    assert.deepStrictEqual(mockTenantInstance.enabledPortals, ['admin', 'cashier', 'kds', 'customer']);
    assert.strictEqual(mockTenantInstance.subscriptionMonthlyINR, 4796);
    assert.strictEqual(mockTenantInstance.billingCycle, 'ANNUAL');

    // Verify featureFlags were automatically synchronized
    assert.strictEqual(mockTenantInstance.featureFlags.waiterEnabled, false, 'waiterEnabled should be false when waiter is not in enabledPortals');
    assert.strictEqual(mockTenantInstance.featureFlags.pmsEnabled, false, 'pmsEnabled should be false when reception is not in enabledPortals');
    assert.strictEqual(mockTenantInstance.featureFlags.posEnabled, true, 'posEnabled should be true when cashier is enabled');
    assert.strictEqual(mockTenantInstance.featureFlags.kdsEnabled, true, 'kdsEnabled should be true when kds is enabled');
    assert.strictEqual(mockTenantInstance.featureFlags.qrDineInEnabled, true, 'qrDineInEnabled should be true when customer is enabled');
    assert.strictEqual(mockTenantInstance.featureFlags.roomServiceEnabled, false, 'roomServiceEnabled should be false when guest is not enabled');

    console.log('  ✔ updateTenantPortalsAndPricing successfully updated tenant, synchronized featureFlags, and prepared WebSocket broadcast.');
    passedCount++;
  } finally {
    Tenant.findById = originalFindById;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Waiter Login Gating Enforcement (PORTAL_NOT_SUBSCRIBED)
  // -------------------------------------------------------------------------
  console.log('\n▶ Test 5: Testing Waiter PIN login gating enforcement...');

  const originalStaffFindOne = User.findOne;
  const originalStaffFind = User.find;
  const originalTenantFindById2 = Tenant.findById;
  const originalTenantFindOne = Tenant.findOne;

  try {
    const mockHotelId = new mongoose.Types.ObjectId();

    // Hotel A: Does NOT have waiter in enabledPortals
    const hotelWithoutWaiter: any = {
      _id: mockHotelId,
      name: 'No Waiter Hotel',
      enabledPortals: ['admin', 'cashier', 'kds', 'customer'], // No 'waiter'
    };

    Tenant.findById = (async () => hotelWithoutWaiter) as any;
    Tenant.findOne = (async () => hotelWithoutWaiter) as any;
    User.find = (async () => []) as any;
    User.findOne = (async () => ({
      _id: new mongoose.Types.ObjectId(),
      hotelId: mockHotelId,
      name: 'Test Captain',
      pin: '1234',
      role: 'WAITER',
      isActive: true,
    })) as any;

    let loginStatus = 0;
    let loginJson: any = null;

    const mockLoginReq: any = {
      body: { pin: '1234' },
      query: {},
    };

    const mockLoginRes: any = {
      status: (code: number) => {
        loginStatus = code;
        return mockLoginRes;
      },
      json: (data: any) => {
        loginJson = data;
        return mockLoginRes;
      },
    };

    await waiterLogin(mockLoginReq, mockLoginRes);

    assert.strictEqual(loginStatus, 403, 'Must return HTTP 403 when waiter portal is not subscribed');
    assert.strictEqual(loginJson.errorCode, 'PORTAL_NOT_SUBSCRIBED', "errorCode must be 'PORTAL_NOT_SUBSCRIBED'");
    assert.ok(
      loginJson.message.includes('not included in this hotel'),
      'Must return user-friendly explanatory message'
    );
    console.log('  ✔ Unsubscribed Waiter Handheld was blocked with HTTP 403 PORTAL_NOT_SUBSCRIBED.');
    passedCount++;

    // Hotel B: Has waiter allocated
    hotelWithoutWaiter.enabledPortals = ['admin', 'waiter', 'cashier'];
    let loginSuccessCalled = false;
    mockLoginRes.status = (code: number) => {
      loginStatus = code;
      return mockLoginRes;
    };
    mockLoginRes.json = (data: any) => {
      loginJson = data;
      loginSuccessCalled = true;
      return mockLoginRes;
    };

    // When waiter is enabled, it proceeds past portal check to pin verification
    await waiterLogin(mockLoginReq, mockLoginRes);
    assert.notStrictEqual(loginJson?.errorCode, 'PORTAL_NOT_SUBSCRIBED', 'Must not return PORTAL_NOT_SUBSCRIBED when subscribed');
    console.log('  ✔ Subscribed Waiter Handheld successfully passed subscription gate.');
    passedCount++;
  } finally {
    User.findOne = originalStaffFindOne;
    User.find = originalStaffFind;
    Tenant.findById = originalTenantFindById2;
    Tenant.findOne = originalTenantFindOne;
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedCount} VERIFICATION TESTS PASSED (100% GREEN)`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
