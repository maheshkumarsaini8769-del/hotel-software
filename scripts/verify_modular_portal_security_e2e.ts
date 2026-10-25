process.env.NODE_ENV = 'test';

import assert from 'node:assert';
import mongoose from 'mongoose';
import { requirePortal } from '../backend/src/middlewares/portalGate';
import { Tenant } from '../backend/src/models/Tenant';
import { PortalPricing, ensureDefaultPortalPricing } from '../backend/src/models/PortalPricing';
import { SubscriptionInvoice } from '../backend/src/models/SubscriptionInvoice';
import {
  getPortalPricingCatalog,
  updatePortalPricing,
  getSubscriptionInvoices,
  generateSubscriptionInvoice,
  settleSubscriptionInvoice,
} from '../backend/src/controllers/superAdminController';
import { UserRole } from '../backend/src/types';
import { DEFAULT_PORTAL_CATALOG } from '@spicehub/shared-types';

console.log('========================================================================');
console.log('🛡️ RUNNING END-TO-END SECURITY, PORTAL GATING & BILLING AUDIT SUITE');
console.log('========================================================================\n');

async function runSecuritySuite() {
  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // TEST 1: Backend Route-Level Middleware requirePortal Gating (Gap 1)
  // ---------------------------------------------------------------------------
  console.log('▶ Test 1: Testing route-level requirePortal middleware gating enforcement...');

  const mockTenantId = new mongoose.Types.ObjectId();
  const mockTenantWithoutRoomsOrKitchen: any = {
    _id: mockTenantId,
    name: 'Quick-Bite Express Cafe',
    status: 'ACTIVE',
    enabledPortals: ['admin', 'cashier', 'customer'], // NO reception, NO kds, NO waiter, NO guest
    subscriptionMonthlyINR: 3897,
    billingCycle: 'MONTHLY',
    featureFlags: {
      pmsEnabled: false,
      posEnabled: true,
      kdsEnabled: false,
      waiterEnabled: false,
      qrDineInEnabled: true,
      roomServiceEnabled: false,
    },
  };

  const originalFindById = Tenant.findById;
  Tenant.findById = (async (id: any) => {
    if (id && id.toString() === mockTenantId.toString()) return mockTenantWithoutRoomsOrKitchen;
    return null;
  }) as any;

  try {
    // 1.1 Try accessing PMS Reception endpoint -> must be BLOCKED with 403 PORTAL_NOT_SUBSCRIBED
    let statusPms = 0;
    let jsonPms: any = null;
    let nextCalledPms = false;

    const reqPms: any = {
      hotelId: mockTenantId,
      headers: {},
      method: 'GET',
    };
    const resPms: any = {
      status: (code: number) => {
        statusPms = code;
        return resPms;
      },
      json: (data: any) => {
        jsonPms = data;
        return resPms;
      },
    };

    await requirePortal('reception')(reqPms, resPms, () => {
      nextCalledPms = true;
    });

    assert.strictEqual(nextCalledPms, false, 'PMS endpoint must not proceed when reception portal is disabled');
    assert.strictEqual(statusPms, 403, 'Must return HTTP 403 for unsubscribed reception portal');
    assert.strictEqual(jsonPms?.errorCode, 'PORTAL_NOT_SUBSCRIBED');
    assert.strictEqual(jsonPms?.portal, 'reception');
    console.log('  ✔ REST call to PMS route blocked: HTTP 403 PORTAL_NOT_SUBSCRIBED');

    // 1.2 Try accessing KDS endpoint -> must be BLOCKED with 403 PORTAL_NOT_SUBSCRIBED
    let statusKds = 0;
    let jsonKds: any = null;
    let nextCalledKds = false;

    const reqKds: any = {
      hotelId: mockTenantId,
      headers: {},
      method: 'GET',
    };
    const resKds: any = {
      status: (code: number) => {
        statusKds = code;
        return resKds;
      },
      json: (data: any) => {
        jsonKds = data;
        return resKds;
      },
    };

    await requirePortal('kds')(reqKds, resKds, () => {
      nextCalledKds = true;
    });

    assert.strictEqual(nextCalledKds, false, 'KDS route must not proceed when kds portal is disabled');
    assert.strictEqual(statusKds, 403);
    assert.strictEqual(jsonKds?.errorCode, 'PORTAL_NOT_SUBSCRIBED');
    assert.strictEqual(jsonKds?.portal, 'kds');
    console.log('  ✔ REST call to KDS route blocked: HTTP 403 PORTAL_NOT_SUBSCRIBED');

    // 1.3 Try accessing Cashier POS endpoint -> must SUCCEED (allowed)
    let nextCalledPos = false;
    const reqPos: any = {
      hotelId: mockTenantId,
      headers: {},
      method: 'GET',
    };
    const resPos: any = {
      status: () => resPos,
      json: () => resPos,
    };

    await requirePortal('cashier')(reqPos, resPos, () => {
      nextCalledPos = true;
    });
    assert.strictEqual(nextCalledPos, true, 'Cashier POS endpoint must proceed for subscribed cashier portal');
    console.log('  ✔ REST call to Cashier POS allowed: next() invoked');

    // 1.4 Try accessing Customer QR endpoint -> must SUCCEED (allowed)
    let nextCalledCustomer = false;
    await requirePortal('customer')(reqPos, resPos, () => {
      nextCalledCustomer = true;
    });
    assert.strictEqual(nextCalledCustomer, true, 'Customer QR endpoint must proceed for subscribed customer portal');
    console.log('  ✔ REST call to Customer QR allowed: next() invoked');

    passedCount++;
  } finally {
    Tenant.findById = originalFindById;
  }

  // ---------------------------------------------------------------------------
  // TEST 2: SuperAdmin Cross-Tenant Bypass & Security Boundaries
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 2: Testing SuperAdmin bypass on requirePortal...');
  let nextCalledAdminBypass = false;
  const reqSuperAdmin: any = {
    user: { role: UserRole.SUPERADMIN },
    method: 'GET',
  };
  const resSuperAdmin: any = {};

  await requirePortal('reception')(reqSuperAdmin, resSuperAdmin, () => {
    nextCalledAdminBypass = true;
  });
  assert.strictEqual(nextCalledAdminBypass, true, 'SuperAdmin must bypass portal restriction for cross-tenant management');
  console.log('  ✔ SuperAdmin role correctly bypasses portal restrictions for diagnostic/support work.');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 3: Unauthenticated / Missing Tenant Context Handling
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 3: Verifying missing tenant identification handling...');
  let statusNoTenant = 0;
  let jsonNoTenant: any = null;
  let nextCalledNoTenant = false;

  const reqNoTenant: any = {
    headers: {},
    method: 'GET',
  };
  const resNoTenant: any = {
    status: (code: number) => {
      statusNoTenant = code;
      return resNoTenant;
    },
    json: (data: any) => {
      jsonNoTenant = data;
      return resNoTenant;
    },
  };

  await requirePortal('reception')(reqNoTenant, resNoTenant, () => {
    nextCalledNoTenant = true;
  });
  assert.strictEqual(nextCalledNoTenant, false);
  assert.strictEqual(statusNoTenant, 403);
  assert.strictEqual(jsonNoTenant?.errorCode, 'TENANT_REQUIRED');
  console.log('  ✔ Direct request with missing tenant context rejected with HTTP 403 TENANT_REQUIRED.');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 4: Single Source of Truth Mongoose Pre-Save Hook (Gap 2 & 4)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 4: Testing Mongoose pre-save single-source-of-truth auto-sync hook...');

  const tenantRecord = new Tenant({
    name: 'Single Source Test Hotel',
    slug: 'single-source-hotel',
    contactEmail: 'admin@singlesource.com',
    contactPhone: '9988776655',
    enabledPortals: ['admin', 'reception', 'cashier'], // Only Rooms & Cashier
    subscriptionMonthlyINR: 4697,
    billingCycle: 'ANNUAL',
  });

  // Trigger pre-save hook manually by executing registered pre-save middleware
  const preSaveFns = (Tenant.schema as any).s?.hooks?._pres?.get('save') || [];
  const customSyncHook = preSaveFns.find((h: any) => !h.fn.name || h.fn.name === 'syncPortalsAndPricing');
  assert.ok(customSyncHook, 'Custom single-source-of-truth pre-save hook must be registered');
  await new Promise<void>((resolve) => {
    customSyncHook.fn.call(tenantRecord, () => resolve());
  });

  // Check featureFlags auto-sync
  assert.strictEqual(tenantRecord.featureFlags.pmsEnabled, true, 'pmsEnabled must be true');
  assert.strictEqual(tenantRecord.featureFlags.posEnabled, true, 'posEnabled must be true');
  assert.strictEqual(tenantRecord.featureFlags.kdsEnabled, false, 'kdsEnabled must be false');
  assert.strictEqual(tenantRecord.featureFlags.waiterEnabled, false, 'waiterEnabled must be false');
  assert.strictEqual(tenantRecord.featureFlags.qrDineInEnabled, false, 'qrDineInEnabled must be false');
  assert.strictEqual(tenantRecord.featureFlags.roomServiceEnabled, false, 'roomServiceEnabled must be false');

  // Check structured subscription object auto-sync
  assert.ok(tenantRecord.subscription, 'Structured subscription object must be populated');
  assert.strictEqual(tenantRecord.subscription.billingCycle, 'ANNUAL');
  assert.strictEqual(tenantRecord.subscription.monthlyRateINR, 4697);
  assert.strictEqual(tenantRecord.subscription.annualRateINR, 46970);
  assert.strictEqual(tenantRecord.subscription.effectiveRateINR, 46970);
  assert.strictEqual(tenantRecord.subscription.paymentStatus, 'PAID');
  console.log('  ✔ Mongoose pre-save hook successfully auto-synced featureFlags and structured subscription.');
  passedCount++;

  // ---------------------------------------------------------------------------
  // TEST 5: Database-Backed Portal Pricing Catalog (Gap 3)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 5: Testing DB-backed PortalPricing collection and Super Admin catalog endpoints...');

  const mockCatalogStore: any[] = DEFAULT_PORTAL_CATALOG.map((p) => ({
    portalKey: p.id,
    name: p.name,
    role: p.role,
    port: p.port,
    category: p.category,
    categoryLabel: p.categoryLabel,
    defaultMonthlyPriceINR: p.defaultMonthlyPriceINR,
    isActive: true,
  }));

  const origPricingFind = PortalPricing.find;
  const origPricingFindOneAndUpdate = PortalPricing.findOneAndUpdate;
  const origPricingCount = PortalPricing.countDocuments;

  PortalPricing.find = (() => ({
    sort: () => ({
      lean: async () => mockCatalogStore,
    }),
  })) as any;

  PortalPricing.countDocuments = (async () => mockCatalogStore.length) as any;
  PortalPricing.findOneAndUpdate = (async (filter: any, update: any) => {
    const item = mockCatalogStore.find((p) => p.portalKey === filter.portalKey);
    if (item) {
      if (update.defaultMonthlyPriceINR !== undefined) {
        item.defaultMonthlyPriceINR = update.defaultMonthlyPriceINR;
      }
      return item;
    }
    return null;
  }) as any;

  try {
    // 5.1 Test getPortalPricingCatalog
    let catalogStatus = 0;
    let catalogJson: any = null;
    const mockCatalogRes: any = {
      status: (c: number) => {
        catalogStatus = c;
        return mockCatalogRes;
      },
      json: (d: any) => {
        catalogJson = d;
        return mockCatalogRes;
      },
    };

    await getPortalPricingCatalog({} as any, mockCatalogRes);
    assert.strictEqual(catalogStatus, 200);
    assert.strictEqual(catalogJson.catalog.length, 7);
    console.log('  ✔ getPortalPricingCatalog returned 7 active workstation items from DB catalog');

    // 5.2 Test updatePortalPricing
    let updateStatus = 0;
    let updateJson: any = null;
    const mockUpdateRes: any = {
      status: (c: number) => {
        updateStatus = c;
        return mockUpdateRes;
      },
      json: (d: any) => {
        updateJson = d;
        return mockUpdateRes;
      },
    };

    await updatePortalPricing(
      {
        body: { portalKey: 'waiter', defaultMonthlyPriceINR: 1199 },
      } as any,
      mockUpdateRes
    );
    assert.strictEqual(updateStatus, 200);
    const updatedWaiter = mockCatalogStore.find((p) => p.portalKey === 'waiter');
    assert.strictEqual(updatedWaiter.defaultMonthlyPriceINR, 1199);
    console.log('  ✔ updatePortalPricing successfully updated DB pricing for waiter module to ₹1,199/mo');

    passedCount++;
  } finally {
    PortalPricing.find = origPricingFind;
    PortalPricing.findOneAndUpdate = origPricingFindOneAndUpdate;
    PortalPricing.countDocuments = origPricingCount;
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Subscription Invoicing & Manual Payment Settlement (Gap 6)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 6: Testing subscription invoice generation and payment settlement lifecycle...');

  const mockTenantForInvoice: any = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Heritage Palace & Spa',
    slug: 'heritage-palace',
    enabledPortals: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
    subscriptionMonthlyINR: 7693,
    billingCycle: 'MONTHLY',
    customPricingAdjustmentINR: -193, // Rounded to ₹7,500
  };

  const invoiceStore: any[] = [];
  const origTenantFindByIdForInv = Tenant.findById;
  const origInvoiceCreate = SubscriptionInvoice.create;
  const origInvoiceFindById = SubscriptionInvoice.findById;
  const origTenantFindByIdAndUpdate = Tenant.findByIdAndUpdate;

  Tenant.findById = (async (id: any) => {
    if (id.toString() === mockTenantForInvoice._id.toString()) return mockTenantForInvoice;
    return null;
  }) as any;

  SubscriptionInvoice.create = (async (doc: any) => {
    const inv = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      save: async function () {
        return this;
      },
    };
    invoiceStore.push(inv);
    return inv;
  }) as any;

  SubscriptionInvoice.findById = (async (id: any) => {
    return invoiceStore.find((i) => i._id.toString() === id.toString()) || null;
  }) as any;

  Tenant.findByIdAndUpdate = (async () => ({})) as any;

  try {
    // 6.1 Generate Invoice
    let genStatus = 0;
    let genJson: any = null;
    const mockGenRes: any = {
      status: (c: number) => {
        genStatus = c;
        return mockGenRes;
      },
      json: (d: any) => {
        genJson = d;
        return mockGenRes;
      },
    };

    await generateSubscriptionInvoice(
      {
        body: { tenantId: mockTenantForInvoice._id.toString(), notes: 'October 2026 Monthly Subscription' },
      } as any,
      mockGenRes
    );

    assert.strictEqual(genStatus, 201);
    assert.strictEqual(genJson.success, true);
    const invoice = genJson.invoice;
    assert.strictEqual(invoice.hotelName, 'Heritage Palace & Spa');
    assert.strictEqual(invoice.baseAmountINR, 7693);
    assert.strictEqual(invoice.customAdjustmentINR, -193);
    const expectedSubtotal = 7500;
    const expectedTax = Math.round(7500 * 0.18); // 1350
    assert.strictEqual(invoice.taxAmountINR, expectedTax);
    assert.strictEqual(invoice.totalAmountINR, expectedSubtotal + expectedTax);
    assert.strictEqual(invoice.status, 'PENDING');
    console.log(`  ✔ Generated Invoice ${invoice.invoiceNumber}: Subtotal ₹${expectedSubtotal} + 18% GST ₹${expectedTax} = ₹${invoice.totalAmountINR} (Status: PENDING)`);

    // 6.2 Settle Invoice with manual UPI payment
    let settleStatus = 0;
    let settleJson: any = null;
    const mockSettleRes: any = {
      status: (c: number) => {
        settleStatus = c;
        return mockSettleRes;
      },
      json: (d: any) => {
        settleJson = d;
        return mockSettleRes;
      },
    };

    await settleSubscriptionInvoice(
      {
        params: { invoiceId: invoice._id.toString() },
        body: {
          paymentMethod: 'UPI',
          paymentReference: 'UPI/20261024/9876543210',
          notes: 'Paid via HDFC Merchant QR',
        },
      } as any,
      mockSettleRes
    );

    assert.strictEqual(settleStatus, 200);
    assert.strictEqual(settleJson.success, true);
    assert.strictEqual(settleJson.invoice.status, 'PAID');
    assert.strictEqual(settleJson.invoice.paymentMethod, 'UPI');
    assert.strictEqual(settleJson.invoice.paymentReference, 'UPI/20261024/9876543210');
    assert.ok(settleJson.invoice.paidAt, 'paidAt timestamp must be recorded');
    console.log('  ✔ Settle Invoice lifecycle verified: marked as PAID with UPI transaction reference.');

    passedCount++;
  } finally {
    Tenant.findById = origTenantFindByIdForInv;
    SubscriptionInvoice.create = origInvoiceCreate;
    SubscriptionInvoice.findById = origInvoiceFindById;
    Tenant.findByIdAndUpdate = origTenantFindByIdAndUpdate;
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedCount}/6 ENTERPRISE SECURITY & BILLING TESTS PASSED (100% GREEN)`);
  console.log('========================================================================\n');
}

runSecuritySuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Audit suite failed with error:', err);
    process.exit(1);
  });
