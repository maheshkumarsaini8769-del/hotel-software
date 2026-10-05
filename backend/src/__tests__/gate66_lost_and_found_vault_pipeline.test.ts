import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { LostAndFound, LostAndFoundStatus, LostAndFoundCategory } from '../models/LostAndFound';
import { UserRole } from '../types';

describe('Gate #66: Hotel Housekeeping Lost & Found Digital Vault, Claim Verification & Courier Dispatch Pipeline', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let standardItemIdA: string = '';
  let highValueItemIdA: string = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace Vault',
      slug: `grand-palace-66a-${Date.now()}`,
      contactEmail: `hotel_66a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199360',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Lost & Found',
      slug: `rival-66b-${Date.now()}`,
      contactEmail: `rival_66b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199361',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    tokenA = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdA.toString(), role: UserRole.HOTEL_ADMIN, name: 'Duty Manager Sharma' },
      jwtSecret,
      { expiresIn: '2h' }
    );
    tokenB = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdB.toString(), role: UserRole.HOTEL_ADMIN, name: 'Duty Manager Verma' },
      jwtSecret,
      { expiresIn: '2h' }
    );
  });

  afterAll(async () => {
    await LostAndFound.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  it('1. Should log a standard lost item with auto-generated tracking code LF-YYYY-XXXXX and 90-day retention expiry', async () => {
    const res = await request(app)
      .post('/api/v1/housekeeping/lost-and-found')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        description: 'Navy Blue Silk Scarf with Gold Borders',
        category: LostAndFoundCategory.CLOTHING,
        foundLocation: 'Lobby Lounge Sofa #4',
        guestName: 'Ananya Verma',
        storageLocation: 'Front Office Bin #12',
        estimatedValue: 1500,
        retentionDays: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.trackingNumber).toMatch(/^LF-\d{4}-\d{5}$/);
    expect(res.body.item.status).toBe(LostAndFoundStatus.LOGGED);
    expect(res.body.item.isHighValue).toBe(false);
    expect(res.body.item.custodyChain).toHaveLength(1);
    expect(res.body.item.custodyChain[0].action).toBe('LOGGED');

    const expiryDate = new Date(res.body.item.retentionExpiryDate);
    const now = new Date();
    const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBeGreaterThanOrEqual(89);

    standardItemIdA = res.body.item._id;
  });

  it('2. Should log a high-value asset and automatically secure it into digital vault locker with MOVED_TO_VAULT custody', async () => {
    const res = await request(app)
      .post('/api/v1/housekeeping/lost-and-found')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        description: 'Apple MacBook Pro 16-inch M3 Max (Space Black) in Leather Sleeve',
        category: LostAndFoundCategory.ELECTRONICS,
        foundLocation: 'Suite 502 Conference Desk',
        guestName: 'Vikramaditya Singhania',
        estimatedValue: 245000,
        secureVaultLocker: 'VAULT-LOCKER-M3-09',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.isHighValue).toBe(true);
    expect(res.body.item.secureVaultLocker).toBe('VAULT-LOCKER-M3-09');
    expect(res.body.item.storageLocation).toContain('Secure Vault Locker: VAULT-LOCKER-M3-09');
    expect(res.body.item.custodyChain[0].action).toBe('MOVED_TO_VAULT');
    expect(res.body.item.custodyChain[0].notes).toContain('High-value asset');

    highValueItemIdA = res.body.item._id;
  });

  it('3. Should search and match lost items via guest inquiry API', async () => {
    const res = await request(app)
      .post('/api/v1/housekeeping/lost-and-found/inquire')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: LostAndFoundCategory.ELECTRONICS,
        keyword: 'MacBook',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(res.body.matchedItems.some((item: any) => item._id === highValueItemIdA)).toBe(true);
  });

  it('4. Should verify guest claim with Aadhaar ID, serial match confidence and transition to VERIFIED_PENDING_DISPATCH', async () => {
    const res = await request(app)
      .put(`/api/v1/housekeeping/lost-and-found/${highValueItemIdA}/verify-claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        claimantName: 'Vikramaditya Singhania',
        claimantPhone: '+91 9820011223',
        claimantEmail: 'vikram.singhania@apextech.com',
        idProofType: 'AADHAAR',
        idProofNumber: '4829-1029-4491',
        serialNumberMatched: true,
        matchConfidenceScore: 98,
        verificationNotes: 'Guest provided Apple ID invoice and matched MacBook serial number C02G41...',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.VERIFIED_PENDING_DISPATCH);
    expect(res.body.item.claimVerification).toBeDefined();
    expect(res.body.item.claimVerification.claimantName).toBe('Vikramaditya Singhania');
    expect(res.body.item.claimVerification.matchConfidenceScore).toBe(98);
    expect(res.body.item.custodyChain).toHaveLength(2);
    expect(res.body.item.custodyChain[1].action).toBe('VERIFIED');
  });

  it('5. Should dispatch verified high-value item via Blue Dart courier with waybill and shipping fee audit', async () => {
    const res = await request(app)
      .post(`/api/v1/housekeeping/lost-and-found/${highValueItemIdA}/dispatch-courier`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: 'BLUE_DART',
        waybillNumber: 'BLUEDART-EXP-889912004',
        recipientName: 'Vikramaditya Singhania',
        recipientPhone: '+91 9820011223',
        shippingAddress: {
          street: 'Penthouse 18, Worli Sea Face',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400018',
          country: 'India',
        },
        shippingFeePaidBy: 'GUEST',
        shippingFeeAmount: 1850,
        notes: 'Fragile high-value tamper-evident tamper seal #BD-9912 applied',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.COURIER_DISPATCHED);
    expect(res.body.item.courierDispatch).toBeDefined();
    expect(res.body.item.courierDispatch.waybillNumber).toBe('BLUEDART-EXP-889912004');
    expect(res.body.item.courierDispatch.shippingAddress.city).toBe('Mumbai');
    expect(res.body.item.courierDispatch.shippingFeeAmount).toBe(1850);
    expect(res.body.item.custodyChain).toHaveLength(3);
    expect(res.body.item.custodyChain[2].action).toBe('DISPATCH_PREPARED');
  });

  it('6. Should prevent duplicate courier dispatch or claim verification on already dispatched item', async () => {
    const res = await request(app)
      .post(`/api/v1/housekeeping/lost-and-found/${highValueItemIdA}/dispatch-courier`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: 'FEDEX',
        waybillNumber: 'FEDEX-9999999',
        recipientName: 'Another Person',
        recipientPhone: '9999999999',
        shippingAddress: { street: 'Test', city: 'Delhi' },
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_STATUS_FOR_DISPATCH');
  });

  it('7. Should execute front desk in-person handover for standard item with claimant ID verification', async () => {
    const res = await request(app)
      .put(`/api/v1/housekeeping/lost-and-found/${standardItemIdA}/handover`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        claimantName: 'Ananya Verma',
        contactNumber: '+91 9911223344',
        idProof: 'DRIVING_LICENSE-DL-0420110099',
        notes: 'Handed over directly at Concierge desk after photo match',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.CLAIMED_IN_PERSON);
    expect(res.body.item.claimedBy.claimantName).toBe('Ananya Verma');
    expect(res.body.item.custodyChain).toHaveLength(2);
    expect(res.body.item.custodyChain[1].action).toBe('HANDOVER');
  });

  it('8. Should dispose or auction an expired unclaimed item with audit trail', async () => {
    // Log an old item
    const expiredItem = await LostAndFound.create({
      hotelId: hotelIdA,
      trackingNumber: `LF-${new Date().getFullYear()}-00099`,
      description: 'Generic Black Travel Umbrella',
      category: LostAndFoundCategory.OTHER,
      foundLocation: 'Lobby Porch',
      foundByUserId: new Types.ObjectId(),
      storageLocation: 'Disposal Bin C',
      retentionExpiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 95), // 95 days ago
      status: LostAndFoundStatus.LOGGED,
      isHighValue: false,
      custodyChain: [{ action: 'LOGGED', timestamp: new Date() }],
    });

    const res = await request(app)
      .post(`/api/v1/housekeeping/lost-and-found/${expiredItem._id}/dispose`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'AUCTIONED',
        disposalNotes: 'Sold in annual employee welfare charity auction',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.AUCTIONED);
    expect(res.body.item.disposalNotes).toBe('Sold in annual employee welfare charity auction');
    expect(res.body.item.custodyChain[1].action).toBe('DISPOSED');
  });

  it('9. Should return complete digital vault metrics and filter by status and high-value', async () => {
    const res = await request(app)
      .get('/api/v1/housekeeping/lost-and-found/vault')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalLogged).toBeGreaterThanOrEqual(3);
    expect(res.body.metrics.courierDispatched).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.claimedInPerson).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.highValueSecured).toBeGreaterThanOrEqual(1);

    // Filter by high value
    const highValRes = await request(app)
      .get('/api/v1/housekeeping/lost-and-found/vault?isHighValue=true')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(highValRes.status).toBe(200);
    expect(highValRes.body.items.every((i: any) => i.isHighValue)).toBe(true);
  });

  it('10. Should enforce strict multi-tenant isolation: Tenant B cannot access or modify Tenant A vault items', async () => {
    // Tenant B cannot view Tenant A items in vault
    const resVaultB = await request(app)
      .get('/api/v1/housekeeping/lost-and-found/vault')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resVaultB.status).toBe(200);
    expect(resVaultB.body.count).toBe(0);
    expect(resVaultB.body.items).toHaveLength(0);

    // Tenant B cannot dispatch Tenant A item
    const resDispatchB = await request(app)
      .post(`/api/v1/housekeeping/lost-and-found/${highValueItemIdA}/dispatch-courier`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        courierPartner: 'FEDEX',
        waybillNumber: 'FEDEX-ILLEGAL-001',
        recipientName: 'Hacker',
        recipientPhone: '9999999999',
        shippingAddress: { street: 'Unknown', city: 'Hacked' },
      });

    expect(resDispatchB.status).toBe(404);
    expect(resDispatchB.body.errorCode).toBe('ITEM_NOT_FOUND');
  });
});
