import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import {
  InventoryAuditSession,
  AuditType,
  AuditSessionStatus,
  VarianceReason,
} from '../models/InventoryAuditSession';
import { UserRole } from '../types';

describe('--- SHIFT 27 / GATE 27: PHYSICAL INVENTORY AUDIT, BLIND STOCKTAKE & RECONCILIATION ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let storeManagerToken: string;
  let financialControllerToken: string;
  let competitorToken: string;
  let auditSessionAId: string;
  let blindAuditSessionId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'Taj Gateway Grand & Central Reserves',
      slug: `taj-reserves-${Date.now()}`,
      contactEmail: `taj_reserves_${Date.now()}@spicehub.com`,
      contactPhone: '9877700001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Sovereign Hotel',
      slug: `rival-sovereign-${Date.now()}`,
      contactEmail: `rival_sovereign_${Date.now()}@spicehub.com`,
      contactPhone: '9877700002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. Create Store Manager User for Tenant A
    const storeManager = await User.create({
      hotelId: tenantA._id,
      name: 'Store Manager Amit Sharma',
      email: `store_${Date.now()}@taj.com`,
      phone: '9877700003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    storeManagerToken = jwt.sign(
      {
        userId: storeManager._id.toString(),
        hotelId: tenantAId,
        role: UserRole.MANAGER,
        email: storeManager.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Create Financial Controller User for Tenant A
    const financialController = await User.create({
      hotelId: tenantA._id,
      name: 'Financial Controller Priya Nair',
      email: `finance_${Date.now()}@taj.com`,
      phone: '9877700004',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    financialControllerToken = jwt.sign(
      {
        userId: financialController._id.toString(),
        hotelId: tenantAId,
        role: UserRole.HOTEL_ADMIN,
        email: financialController.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Create Competitor User for Tenant B
    const competitor = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Auditor',
      email: `auditor_${Date.now()}@rival.com`,
      phone: '9877700005',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    competitorToken = jwt.sign(
      {
        userId: competitor._id.toString(),
        hotelId: tenantBId,
        role: UserRole.MANAGER,
        email: competitor.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await InventoryAuditSession.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. POST /api/v1/inventory-audits/sessions: Successfully initiate standard audit session', async () => {
    const startTime = Date.now();

    const payload = {
      auditType: AuditType.FULL_MONTH_END,
      storeLocation: 'Central Dry & Cold Store',
      isBlindStocktake: false,
      items: [
        {
          itemName: 'A-Grade Basmati Rice',
          sku: 'GRN-001',
          category: 'Dry Grains',
          unit: 'kg',
          systemBookQuantity: 100,
          unitCost: 95,
        },
        {
          itemName: 'Pure Ghee Desi Tin',
          sku: 'DAI-002',
          category: 'Dairy Products',
          unit: 'ltr',
          systemBookQuantity: 50,
          unitCost: 550,
        },
        {
          itemName: 'Single Malt Whisky 12YO',
          sku: 'LIQ-003',
          category: 'Beverages & Spirits',
          unit: 'bottle',
          systemBookQuantity: 24,
          unitCost: 3200,
        },
      ],
      notes: 'End of Month Wall-to-Wall Store Audit',
    };

    const res = await request(app)
      .post('/api/v1/inventory-audits/sessions')
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] POST Standard Audit Session Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.auditNumber).toMatch(/^AUD-/);
    expect(res.body.session.status).toBe(AuditSessionStatus.IN_PROGRESS);
    expect(res.body.session.items.length).toBe(3);
    expect(res.body.session.isBlindStocktake).toBe(false);

    auditSessionAId = res.body.session._id;
  });

  // TEST 2
  it('2. POST /api/v1/inventory-audits/sessions: Initiate Blind Stocktake with anti-collusion protection', async () => {
    const startTime = Date.now();

    const payload = {
      auditType: AuditType.HIGH_VALUE_CYCLIC,
      storeLocation: 'Main Bar Cellar',
      isBlindStocktake: true,
      items: [
        {
          itemName: 'Imported Champagne Brut',
          sku: 'BAR-001',
          category: 'Liquor',
          unit: 'bottle',
          systemBookQuantity: 12,
          unitCost: 6500,
        },
        {
          itemName: 'Aged Single Malt 18YO',
          sku: 'BAR-002',
          category: 'Liquor',
          unit: 'bottle',
          systemBookQuantity: 8,
          unitCost: 9500,
        },
      ],
      notes: 'Blind Surprise Spot Count by Audit Team',
    };

    const res = await request(app)
      .post('/api/v1/inventory-audits/sessions')
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] POST Blind Stocktake Session Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.session.isBlindStocktake).toBe(true);
    expect(res.body.session.storeLocation).toBe('Main Bar Cellar');

    blindAuditSessionId = res.body.session._id;
  });

  // TEST 3
  it('3. POST /api/v1/inventory-audits/sessions: Reject empty audit items payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/inventory-audits/sessions')
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        storeLocation: 'Central Store',
        items: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('EMPTY_AUDIT_ITEMS');
  });

  // TEST 4
  it('4. GET /api/v1/inventory-audits/sessions: Fetch audit sessions list & procurement KPIs', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/inventory-audits/sessions')
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] GET Audit Sessions Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBe(2);

    // Verify KPI aggregates
    expect(res.body.metrics.totalAuditsCount).toBe(2);
    expect(res.body.metrics.openAuditsCount).toBe(2);
    expect(res.body.metrics.reconciledCount).toBe(0);
  });

  // TEST 5
  it('5. POST /api/v1/inventory-audits/sessions/:auditId/count: Submit physical counts matching book stock exactly', async () => {
    const startTime = Date.now();

    // In the blind session, book quantities are 12 and 8.
    // Shelf counter counts 12 and 8 perfectly.
    const payload = {
      countedItems: [
        { itemName: 'Imported Champagne Brut', physicalCountQuantity: 12 },
        { itemName: 'Aged Single Malt 18YO', physicalCountQuantity: 8 },
      ],
    };

    const res = await request(app)
      .post(`/api/v1/inventory-audits/sessions/${blindAuditSessionId}/count`)
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] POST Perfect Match Counts Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe(AuditSessionStatus.SUBMITTED);
    expect(res.body.session.totalShortageValue).toBe(0);
    expect(res.body.session.totalSurplusValue).toBe(0);
    expect(res.body.session.netDiscrepancyValue).toBe(0);
  });

  // TEST 6
  it('6. POST /api/v1/inventory-audits/sessions/:auditId/count: Submit physical counts with variances & auto-flag discrepancies', async () => {
    const startTime = Date.now();

    // Session A book quantities:
    // Basmati Rice: 100 kg, unitCost: 95. Physical count: 90 kg -> Shortage -10 kg = -950
    // Pure Ghee: 50 ltr, unitCost: 550. Physical count: 52 ltr -> Surplus +2 ltr = +1100
    // Single Malt: 24 bottles, unitCost: 3200. Physical count: 22 bottles -> Shortage -2 bottles = -6400
    // Total Shortage: 950 + 6400 = 7350
    // Total Surplus: 1100
    // Net Discrepancy: 1100 - 7350 = -6250
    const payload = {
      countedItems: [
        { itemName: 'A-Grade Basmati Rice', physicalCountQuantity: 90 },
        { itemName: 'Pure Ghee Desi Tin', physicalCountQuantity: 52 },
        { itemName: 'Single Malt Whisky 12YO', physicalCountQuantity: 22 },
      ],
    };

    const res = await request(app)
      .post(`/api/v1/inventory-audits/sessions/${auditSessionAId}/count`)
      .set('Authorization', `Bearer ${storeManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] POST Variance Discrepancy Counts Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe(AuditSessionStatus.DISCREPANCY_FLAGGED);
    expect(res.body.session.totalShortageValue).toBe(7350);
    expect(res.body.session.totalSurplusValue).toBe(1100);
    expect(res.body.session.netDiscrepancyValue).toBe(-6250);

    // Verify item-level computed variance
    const whisky = res.body.session.items.find((i: any) => i.itemName === 'Single Malt Whisky 12YO');
    expect(whisky).toBeDefined();
    expect(whisky.physicalCountQuantity).toBe(22);
    expect(whisky.varianceQuantity).toBe(-2);
    expect(whisky.varianceValue).toBe(-6400);
  });

  // TEST 7
  it('7. PATCH /api/v1/inventory-audits/sessions/:auditId/reconcile: Financial Controller reconciles discrepancies into General Ledger', async () => {
    const startTime = Date.now();

    const payload = {
      itemResolutions: [
        {
          itemName: 'A-Grade Basmati Rice',
          varianceReason: VarianceReason.NORMAL_SHRINKAGE,
          actionTaken: 'ADJUST_BOOK_STOCK',
        },
        {
          itemName: 'Pure Ghee Desi Tin',
          varianceReason: VarianceReason.COUNTING_ERROR,
          actionTaken: 'ADJUST_BOOK_STOCK',
        },
        {
          itemName: 'Single Malt Whisky 12YO',
          varianceReason: VarianceReason.PILFERAGE_THEFT,
          actionTaken: 'WRITE_OFF_TO_P_AND_L',
        },
      ],
      notes: 'Investigated by Financial Controller & F&B Director. 2 bottles single malt confirmed pilfered; written off to P&L.',
    };

    const res = await request(app)
      .patch(`/api/v1/inventory-audits/sessions/${auditSessionAId}/reconcile`)
      .set('Authorization', `Bearer ${financialControllerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 27 Deep Network Test] PATCH Reconcile Audit Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe(AuditSessionStatus.RECONCILED);
    expect(res.body.session.approvedByUserId).toBeDefined();
    expect(res.body.session.reconciledAt).toBeDefined();

    // Verify reasons and actions persisted
    const whisky = res.body.session.items.find((i: any) => i.itemName === 'Single Malt Whisky 12YO');
    expect(whisky.varianceReason).toBe(VarianceReason.PILFERAGE_THEFT);
    expect(whisky.actionTaken).toBe('WRITE_OFF_TO_P_AND_L');

    const rice = res.body.session.items.find((i: any) => i.itemName === 'A-Grade Basmati Rice');
    expect(rice.varianceReason).toBe(VarianceReason.NORMAL_SHRINKAGE);
    expect(rice.actionTaken).toBe('ADJUST_BOOK_STOCK');
  });

  // TEST 8
  it('8. Strict Multi-Tenant Isolation: Competitor cannot view or alter Tenant A audit sessions', async () => {
    // Competitor lists audit sessions
    const getRes = await request(app)
      .get('/api/v1/inventory-audits/sessions')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.sessions.length).toBe(0);
    expect(getRes.body.metrics.totalAuditsCount).toBe(0);

    // Competitor attempts to submit physical counts to Tenant A's session
    const countRes = await request(app)
      .post(`/api/v1/inventory-audits/sessions/${auditSessionAId}/count`)
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId)
      .send({ countedItems: [{ itemName: 'Pure Ghee Desi Tin', physicalCountQuantity: 100 }] });

    expect(countRes.status).toBe(404);
    expect(countRes.body.success).toBe(false);
    expect(countRes.body.errorCode).toBe('AUDIT_NOT_FOUND');

    // Competitor attempts to reconcile Tenant A's audit
    const reconcileRes = await request(app)
      .patch(`/api/v1/inventory-audits/sessions/${auditSessionAId}/reconcile`)
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId)
      .send({ notes: 'Malicious reconciliation' });

    expect(reconcileRes.status).toBe(404);
    expect(reconcileRes.body.success).toBe(false);
    expect(reconcileRes.body.errorCode).toBe('AUDIT_NOT_FOUND');
  });
});
