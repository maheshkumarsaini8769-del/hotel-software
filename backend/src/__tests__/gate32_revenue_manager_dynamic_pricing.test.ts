import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { RevenueStrategy } from '../models/RevenueStrategy';
import { UserRole } from '../types';

describe('--- SHIFT 32 / GATE 32: HOTEL REVENUE MANAGER & DYNAMIC PRICING YIELD ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let revenueManagerToken: string;
  let competitorToken: string;
  let roomTypeAId: string;

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

    // 1. Setup Tenant A (Luxury Palace Hotel)
    const tenantA = await Tenant.create({
      name: 'The Oberoi Rajvilas Jaipur',
      slug: `oberoi-rajvilas-${Date.now()}`,
      contactEmail: `rev_${Date.now()}@oberoirajvilas.com`,
      contactPhone: '9833300001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Hotel)
    const tenantB = await Tenant.create({
      name: 'Rival Boutique Resort',
      slug: `rival-boutique-${Date.now()}`,
      contactEmail: `rev_rival_${Date.now()}@rival.com`,
      contactPhone: '9833300002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. Revenue Manager User for Tenant A
    const revUser = await User.create({
      tenantId: tenantA._id,
      hotelId: tenantA._id,
      name: 'Ananya Sharma (Revenue Director)',
      email: `ananya_${Date.now()}@oberoirajvilas.com`,
      phone: '9833300003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    revenueManagerToken = jwt.sign(
      {
        userId: revUser._id.toString(),
        role: UserRole.MANAGER,
        hotelId: tenantAId,
        tenantId: tenantAId,
        email: revUser.email,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // 4. Competitor User for Tenant B
    const compUser = await User.create({
      tenantId: tenantB._id,
      hotelId: tenantB._id,
      name: 'Rohan Mehra (Competitor Rev Mgr)',
      email: `rohan_${Date.now()}@rival.com`,
      phone: '9833300004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    competitorToken = jwt.sign(
      {
        userId: compUser._id.toString(),
        role: UserRole.MANAGER,
        hotelId: tenantBId,
        tenantId: tenantBId,
        email: compUser.email,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // 5. Seed Room Type for Tenant A
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Premier Garden Villa',
      code: `PGV-${Date.now().toString().slice(-4)}`,
      baseCapacityAdults: 2,
      baseCapacityChildren: 1,
      maxCapacity: 3,
      basePriceOvernight: 4000,
      amenities: ['Private Pool', 'Butler Service', 'High Speed Wi-Fi'],
      images: ['villa.jpg'],
      totalRoomsCount: 10,
      isActive: true,
    });
    roomTypeAId = roomType._id.toString();
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RevenueStrategy.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
  });

  it('1. POST /api/v1/revenue-manager/strategy creates authoritative dynamic pricing strategy with surge tiers', async () => {
    const payload = {
      roomTypeId: roomTypeAId,
      strategyName: 'Premier Villa Dynamic Yield Matrix',
      basePrice: 4000,
      minPriceFloor: 2500,
      maxPriceCeiling: 9000,
      weekendMultiplier: 1.15,
      surgeTiers: [
        { tierName: 'LOW_DEMAND', minOccupancyPercent: 0, maxOccupancyPercent: 40, multiplier: 0.9 },
        { tierName: 'STANDARD', minOccupancyPercent: 40, maxOccupancyPercent: 70, multiplier: 1.0 },
        { tierName: 'HIGH_DEMAND', minOccupancyPercent: 70, maxOccupancyPercent: 85, multiplier: 1.25 },
        { tierName: 'PEAK_SURGE', minOccupancyPercent: 85, maxOccupancyPercent: 100, multiplier: 1.45 },
      ],
      notes: 'Calibrated for winter high-season peak compression',
    };

    const res = await request(app)
      .post('/api/v1/revenue-manager/strategy')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.basePrice).toBe(4000);
    expect(res.body.data.minPriceFloor).toBe(2500);
    expect(res.body.data.maxPriceCeiling).toBe(9000);
    expect(res.body.data.weekendMultiplier).toBe(1.15);
    expect(res.body.data.surgeTiers.length).toBe(4);
  });

  it('2. POST /api/v1/revenue-manager/strategy rejects invalid price bounds (Floor > Base)', async () => {
    const invalidPayload = {
      roomTypeId: roomTypeAId,
      basePrice: 4000,
      minPriceFloor: 5500, // Invalid: floor is higher than base price
      maxPriceCeiling: 9000,
    };

    const res = await request(app)
      .post('/api/v1/revenue-manager/strategy')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_BOUNDS');
  });

  it('3. GET /api/v1/revenue-manager/strategies retrieves tenant strategies populated with room type details', async () => {
    const res = await request(app)
      .get('/api/v1/revenue-manager/strategies')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].roomTypeId.name).toBe('Premier Garden Villa');
  });

  it('4. POST /api/v1/revenue-manager/quote-rate calculates dynamic rate for HIGH_DEMAND tier (80% Occupancy)', async () => {
    const quotePayload = {
      roomTypeId: roomTypeAId,
      overrideOccupancyPercent: 80,
      isWeekendOverride: false,
    };

    const res = await request(app)
      .post('/api/v1/revenue-manager/quote-rate')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(quotePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activeTierName).toBe('HIGH_DEMAND');
    expect(res.body.data.surgeMultiplier).toBe(1.25);
    // Base 4000 * 1.25 = 5000
    expect(res.body.data.finalDynamicRate).toBe(5000);
    expect(res.body.data.tax12Percent).toBe(600); // 12% GST of 5000
    expect(res.body.data.totalWithGst).toBe(5600);
  });

  it('5. POST /api/v1/revenue-manager/quote-rate applies weekend multiplier (+15%) on top of surge tier', async () => {
    const quotePayload = {
      roomTypeId: roomTypeAId,
      overrideOccupancyPercent: 80,
      isWeekendOverride: true,
    };

    const res = await request(app)
      .post('/api/v1/revenue-manager/quote-rate')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(quotePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isWeekend).toBe(true);
    // 5000 * 1.15 = 5750
    expect(res.body.data.finalDynamicRate).toBe(5750);
    expect(res.body.data.tax12Percent).toBe(690);
    expect(res.body.data.totalWithGst).toBe(6440);
  });

  it('6. POST /api/v1/revenue-manager/competitors/benchmark updates comp-set rate and computes market position delta', async () => {
    const compPayload = {
      roomTypeId: roomTypeAId,
      competitorName: 'Rambagh Palace Heritage Wing',
      benchmarkPrice: 6500,
    };

    const compRes = await request(app)
      .post('/api/v1/revenue-manager/competitors/benchmark')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(compPayload);

    expect(compRes.status).toBe(200);
    expect(compRes.body.success).toBe(true);
    expect(compRes.body.data.competitorBenchmarks.length).toBe(1);

    // Verify rate quote now compares against competitor
    const quoteRes = await request(app)
      .post('/api/v1/revenue-manager/quote-rate')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ roomTypeId: roomTypeAId, overrideOccupancyPercent: 80, isWeekendOverride: true });

    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.data.competitorAverage).toBe(6500);
    expect(quoteRes.body.data.competitorComparison.length).toBe(1);
    expect(quoteRes.body.data.competitorComparison[0].competitorName).toBe('Rambagh Palace Heritage Wing');
    // Delta = 5750 - 6500 = -750 (competitive pricing advantage)
    expect(quoteRes.body.data.competitorComparison[0].priceDelta).toBe(-750);
  });

  it('7. POST /api/v1/revenue-manager/apply-to-inventory updates live RoomType inventory rate', async () => {
    const applyPayload = {
      roomTypeId: roomTypeAId,
      newDynamicRate: 5750,
    };

    const res = await request(app)
      .post('/api/v1/revenue-manager/apply-to-inventory')
      .set('Authorization', `Bearer ${revenueManagerToken}`)
      .set('x-hotel-id', tenantAId)
      .send(applyPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.basePriceOvernight).toBe(5750);

    // Verify in database directly
    const updatedRoomType = await RoomType.findById(roomTypeAId);
    expect(updatedRoomType?.basePriceOvernight).toBe(5750);
  });

  it('8. Strict Multi-Tenant Isolation: Competitor cannot view or alter Tenant A dynamic pricing strategies', async () => {
    // Competitor attempts to view Tenant A's strategies
    const res = await request(app)
      .get('/api/v1/revenue-manager/strategies')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0); // Tenant B sees zero strategies

    // Competitor attempts to update Tenant A's room type strategy
    const hackRes = await request(app)
      .post('/api/v1/revenue-manager/strategy')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId)
      .send({
        roomTypeId: roomTypeAId, // Belongs to Tenant A
        basePrice: 1000,
        minPriceFloor: 800,
        maxPriceCeiling: 2000,
      });

    expect(hackRes.status).toBe(404);
    expect(hackRes.body.errorCode).toBe('ROOM_TYPE_NOT_FOUND');
  });
});
