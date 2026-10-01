import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import {
  MenuEngineeringReport,
  MenuQuadrant,
} from '../models/MenuEngineeringReport';
import { UserRole } from '../types';

describe('--- SHIFT 28 / GATE 28: F&B MENU ENGINEERING MATRIX & BCG PROFITABILITY ANALYZER ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let fbDirectorToken: string;
  let executiveChefToken: string;
  let competitorToken: string;
  let reportAId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5108;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'The Oberoi Imperial Dining & Cellar',
      slug: `oberoi-dining-${Date.now()}`,
      contactEmail: `oberoi_fb_${Date.now()}@spicehub.com`,
      contactPhone: '9888800001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Gourmet Bistro',
      slug: `rival-gourmet-${Date.now()}`,
      contactEmail: `rival_gourmet_${Date.now()}@spicehub.com`,
      contactPhone: '9888800002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. F&B Director User for Tenant A
    const fbDirector = await User.create({
      hotelId: tenantA._id,
      name: 'F&B Director Vikram Sethi',
      email: `fb_director_${Date.now()}@oberoi.com`,
      phone: '9888800003',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    fbDirectorToken = jwt.sign(
      {
        userId: fbDirector._id.toString(),
        hotelId: tenantAId,
        role: UserRole.HOTEL_ADMIN,
        email: fbDirector.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Executive Chef User for Tenant A
    const executiveChef = await User.create({
      hotelId: tenantA._id,
      name: 'Executive Chef Manish Mehrotra',
      email: `exec_chef_${Date.now()}@oberoi.com`,
      phone: '9888800004',
      passwordHash: 'dummy_hash',
      role: UserRole.CHEF,
      isActive: true,
    });

    executiveChefToken = jwt.sign(
      {
        userId: executiveChef._id.toString(),
        hotelId: tenantAId,
        role: UserRole.CHEF,
        email: executiveChef.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Competitor User for Tenant B
    const competitor = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Bistro Manager',
      email: `manager_${Date.now()}@rivalbistro.com`,
      phone: '9888800005',
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
    await MenuEngineeringReport.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. POST /api/v1/menu-engineering/reports: Generate BCG menu engineering report classifying all 4 quadrants', async () => {
    const startTime = Date.now();

    // 4 Distinct Dishes with clear BCG quadrant profiles:
    // Avg Volume = (120 + 150 + 15 + 10) / 4 = 295 / 4 = 73.75 units
    // Total Margin = (330*120) + (110*150) + (1200*15) + (90*10) = 39600 + 16500 + 18000 + 900 = 75000
    // Avg Margin = 75000 / 295 = 254.24
    // 1. Butter Chicken: Vol 120 (>= 73.75), Margin 330 (>= 254.24) -> STAR
    // 2. Dal Makhani: Vol 150 (>= 73.75), Margin 110 (< 254.24) -> PLOWHORSE
    // 3. Tandoori Lobster: Vol 15 (< 73.75), Margin 1200 (>= 254.24) -> PUZZLE
    // 4. Okra Fry: Vol 10 (< 73.75), Margin 90 (< 254.24) -> DOG
    const payload = {
      reportTitle: 'Q3 Executive Menu Engineering Audit',
      customItems: [
        {
          itemName: 'Butter Chicken Special',
          category: 'Mughlai Curries',
          sellingPrice: 450,
          foodCost: 120,
          quantitySold: 120,
        },
        {
          itemName: 'Dal Makhani Bukhara',
          category: 'Lentils & Dal',
          sellingPrice: 250,
          foodCost: 140,
          quantitySold: 150,
        },
        {
          itemName: 'Tandoori Jumbo Lobster',
          category: 'Coastal Seafood',
          sellingPrice: 1800,
          foodCost: 600,
          quantitySold: 15,
        },
        {
          itemName: 'Crispy Okra Fry',
          category: 'Vegetarian Starters',
          sellingPrice: 200,
          foodCost: 110,
          quantitySold: 10,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/menu-engineering/reports')
      .set('Authorization', `Bearer ${fbDirectorToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 28 Deep Network Test] POST Generate BCG Report Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toBeDefined();
    expect(res.body.report.items.length).toBe(4);

    // Verify BCG summary counts
    expect(res.body.report.summaryCounts.starsCount).toBe(1);
    expect(res.body.report.summaryCounts.plowhorsesCount).toBe(1);
    expect(res.body.report.summaryCounts.puzzlesCount).toBe(1);
    expect(res.body.report.summaryCounts.dogsCount).toBe(1);

    // Verify benchmarks
    expect(res.body.report.averageVolumeBenchmark).toBe(73.75);
    expect(res.body.report.averageMarginBenchmark).toBe(254.24);

    reportAId = res.body.report._id;
  });

  // TEST 2
  it('2. Verify quadrant classifications and strategic recommendations for each dish', async () => {
    const report = await MenuEngineeringReport.findById(reportAId);
    expect(report).toBeDefined();

    const star = report?.items.find((i) => i.itemName === 'Butter Chicken Special');
    expect(star?.quadrant).toBe(MenuQuadrant.STAR);
    expect(star?.actionStrategy).toContain('Star Item');

    const plowhorse = report?.items.find((i) => i.itemName === 'Dal Makhani Bukhara');
    expect(plowhorse?.quadrant).toBe(MenuQuadrant.PLOWHORSE);
    expect(plowhorse?.actionStrategy).toContain('Plowhorse Item');

    const puzzle = report?.items.find((i) => i.itemName === 'Tandoori Jumbo Lobster');
    expect(puzzle?.quadrant).toBe(MenuQuadrant.PUZZLE);
    expect(puzzle?.actionStrategy).toContain('Puzzle Item');

    const dog = report?.items.find((i) => i.itemName === 'Crispy Okra Fry');
    expect(dog?.quadrant).toBe(MenuQuadrant.DOG);
    expect(dog?.actionStrategy).toContain('Dog Item');
  });

  // TEST 3
  it('3. GET /api/v1/menu-engineering/reports: Fetch historical reports for tenant', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/menu-engineering/reports')
      .set('Authorization', `Bearer ${executiveChefToken}`)
      .set('x-hotel-id', tenantAId);

    const latency = Date.now() - startTime;
    console.log(`[Gate 28 Deep Network Test] GET Menu Engineering Reports Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports.length).toBe(1);
    expect(res.body.reports[0]._id).toBe(reportAId);
  });

  // TEST 4
  it('4. POST /api/v1/menu-engineering/reports: Reject empty menu items payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/menu-engineering/reports')
      .set('Authorization', `Bearer ${fbDirectorToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ customItems: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('EMPTY_MENU_DATA');
  });

  // TEST 5
  it('5. POST /api/v1/menu-engineering/simulate: Simulate What-If price increase & recipe cost trim for Plowhorse', async () => {
    const startTime = Date.now();

    // Dal Makhani test:
    // Current: Price 250, Cost 140, Margin 110, Vol 150 -> Profit = 16500
    // Test: Price +15% (287.5), Cost -10% (126), Elasticity -0.5 (Vol -7.5% -> 139 units)
    // Projected Margin = 287.5 - 126 = 161.5
    // Projected Profit = 161.5 * 139 = 22448.5
    // Profit Delta = 22448.5 - 16500 = +5948.5 (+36% gain)
    const payload = {
      itemName: 'Dal Makhani Bukhara',
      currentPrice: 250,
      currentFoodCost: 140,
      currentVolume: 150,
      priceDeltaPercent: 15,
      costDeltaPercent: -10,
      volumeElasticityFactor: -0.5,
      avgVolumeBenchmark: 73.75,
      avgMarginBenchmark: 254.24,
    };

    const res = await request(app)
      .post('/api/v1/menu-engineering/simulate')
      .set('Authorization', `Bearer ${fbDirectorToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 28 Deep Network Test] POST Simulate Price Elasticity Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.simulation).toBeDefined();

    // Verify current vs projected metrics
    expect(res.body.simulation.currentState.price).toBe(250);
    expect(res.body.simulation.projectedState.price).toBe(287.5);
    expect(res.body.simulation.projectedState.cost).toBe(126);
    expect(res.body.simulation.impact.profitDifference).toBeGreaterThan(0);
    expect(res.body.simulation.impact.profitGrowthPercentage).toBeGreaterThan(20);
  });

  // TEST 6
  it('6. POST /api/v1/menu-engineering/simulate: Reject invalid simulator payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/menu-engineering/simulate')
      .set('Authorization', `Bearer ${fbDirectorToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ itemName: 'Incomplete Test' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_SIMULATION_INPUT');
  });

  // TEST 7
  it('7. Strict Multi-Tenant Isolation: Competitor cannot view or leak confidential menu reports', async () => {
    // Competitor lists reports
    const getRes = await request(app)
      .get('/api/v1/menu-engineering/reports')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.reports.length).toBe(0);

    // Direct database check: report belongs strictly to Tenant A
    const countA = await MenuEngineeringReport.countDocuments({ hotelId: tenantAId });
    const countB = await MenuEngineeringReport.countDocuments({ hotelId: tenantBId });
    expect(countA).toBe(1);
    expect(countB).toBe(0);
  });
});
