import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import {
  LeftLuggageClaim,
  LuggageStatus,
  LuggageStorageType,
} from '../models/LeftLuggageClaim';

describe('Gate #70: Front Desk Left Luggage Cloakroom & Bell Desk Baggage Tagging Pipeline', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let bellCaptainAId: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let jwtSecret: string;

  beforeAll(async () => {
    jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
    process.env.JWT_SECRET = jwtSecret;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev');
    }

    hotelIdA = new Types.ObjectId();
    hotelIdB = new Types.ObjectId();
    bellCaptainAId = new Types.ObjectId();

    await Tenant.create([
      {
        _id: hotelIdA,
        name: 'Grand Palace Hotel & Cloakroom',
        slug: `palace-cloakroom-${Date.now()}`,
        status: 'ACTIVE',
        contactPhone: '+91 9999900001',
        contactEmail: 'cloakroom-a@palace.com',
      },
      {
        _id: hotelIdB,
        name: 'The Oberoi Sky Cloakroom',
        slug: `oberoi-cloakroom-${Date.now()}`,
        status: 'ACTIVE',
        contactPhone: '+91 9999900002',
        contactEmail: 'cloakroom-b@oberoi.com',
      },
    ]);

    tokenA = jwt.sign(
      {
        userId: bellCaptainAId.toString(),
        hotelId: hotelIdA.toString(),
        role: 'HOTEL_ADMIN',
        name: 'Bell Captain Ramesh',
        email: 'bellcaptain@palace.com',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    tokenB = jwt.sign(
      {
        userId: new Types.ObjectId().toString(),
        hotelId: hotelIdB.toString(),
        role: 'HOTEL_ADMIN',
        name: 'Bell Captain Mohan',
        email: 'mohan@oberoi.com',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await LeftLuggageClaim.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  it('1. GET /api/v1/pms/luggage/claims - Auto-seeds 3 default demo claims and returns proper metrics', async () => {
    const res = await request(app)
      .get('/api/v1/pms/luggage/claims')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claims).toHaveLength(3);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalStored).toBe(3);
    expect(res.body.data.metrics.totalPiecesInVault).toBe(6); // 2 + 1 + 3 = 6 pieces
  });

  it('2. POST /api/v1/pms/luggage/tag - Tags new luggage claim with custom pieces, rack location, and PIN', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/tag')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        guestName: 'Maharaja Padmanabh Singh',
        guestPhone: '+91 9829012345',
        roomNumber: '501',
        storageType: LuggageStorageType.POST_CHECKOUT,
        rackLocation: 'CLOAKROOM-VIP-BAY-01',
        pieces: [
          {
            pieceId: 'P1',
            type: 'SUITCASE',
            colorDescription: 'Antique Monogram Trunk',
            isFragile: true,
            hasPerishables: false,
          },
          {
            pieceId: 'P2',
            type: 'GARMENT_BAG',
            colorDescription: 'Handmade Silk Sherwani Bag',
            isFragile: true,
            hasPerishables: false,
          },
        ],
        claimPin: '5566',
        notes: 'Polo trophies and ceremonial attire inside.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claimTag).toMatch(/^LLG-/);
    expect(res.body.data.guestName).toBe('Maharaja Padmanabh Singh');
    expect(res.body.data.totalPieces).toBe(2);
    expect(res.body.data.status).toBe(LuggageStatus.STORED);
    expect(res.body.data.claimPin).toBe('5566');
  });

  it('3. POST /api/v1/pms/luggage/tag - Rejects with 400 when guestName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/tag')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        guestPhone: '+91 9829012345',
        storageType: LuggageStorageType.POST_CHECKOUT,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Guest name is required');
  });

  it('4. POST /api/v1/pms/luggage/tag - Rejects with 400 when guestPhone is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/tag')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        guestName: 'Lady Mountbatten',
        storageType: LuggageStorageType.POST_CHECKOUT,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Guest contact phone is required');
  });

  it('5. POST /api/v1/pms/luggage/dispatch - Dispatches porter to room; updates status to OUT_FOR_DELIVERY', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/dispatch')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        claimTag: 'LLG-7002', // Lord Mountbatten's early arrival bag
        porterName: 'Porter Raju Sharma',
        targetLocation: 'Room 204',
        notes: 'Room ready early, bell desk delivery requested.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(LuggageStatus.OUT_FOR_DELIVERY);
    expect(res.body.data.currentPorterName).toBe('Porter Raju Sharma');
    expect(res.body.data.dispatches).toHaveLength(1);
    expect(res.body.data.dispatches[0].status).toBe('IN_TRANSIT');
  });

  it('6. POST /api/v1/pms/luggage/dispatch - Rejects dispatch if porterName is missing (400)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/dispatch')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        claimTag: 'LLG-7001',
        targetLocation: 'Room 102',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Porter name is required');
  });

  it('7. POST /api/v1/pms/luggage/complete-delivery - Marks room delivery completed with recipient acknowledgment', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/complete-delivery')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        claimTag: 'LLG-7002',
        deliveredToRoom: true,
        recipientConfirmation: 'Lord Mountbatten in Person',
        staffPin: '9921',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(LuggageStatus.DELIVERED_TO_ROOM);
    expect(res.body.data.actualReleaseTime).toBeDefined();
    expect(res.body.data.dispatches[0].status).toBe('COMPLETED');
  });

  it('8. POST /api/v1/pms/luggage/release - Rejects counter release with 403 when wrong PIN and no supervisor override', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/release')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        claimTag: 'LLG-7001',
        claimPin: '0000', // Wrong pin (correct is 7721)
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid Guest Claim PIN');
  });

  it('9. POST /api/v1/pms/luggage/release - Successfully releases luggage at counter with correct PIN', async () => {
    const res = await request(app)
      .post('/api/v1/pms/luggage/release')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        claimTag: 'LLG-7001',
        claimPin: '7721', // Correct demo pin
        releaseNotes: 'Guest verified claim ticket at counter. Both bags handed over.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(LuggageStatus.CLAIMED_AT_COUNTER);
    expect(res.body.data.actualReleaseTime).toBeDefined();
  });

  it('10. GET /api/v1/pms/luggage/audit-log/:claimTag - Enforces strict tenant isolation', async () => {
    // Tenant B attempts to fetch Tenant A luggage audit log
    const resTenantB = await request(app)
      .get('/api/v1/pms/luggage/audit-log/LLG-7001')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString());

    expect(resTenantB.status).toBe(404);
    expect(resTenantB.body.success).toBe(false);

    // Tenant A fetches own audit log successfully
    const resTenantA = await request(app)
      .get('/api/v1/pms/luggage/audit-log/LLG-7001')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(resTenantA.status).toBe(200);
    expect(resTenantA.body.success).toBe(true);
    expect(resTenantA.body.data.claimTag).toBe('LLG-7001');
    expect(resTenantA.body.data.guestName).toBe('Princess Gayatri Devi');
  });
});
