import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { LostAndFound, LostAndFoundStatus, LostAndFoundCategory } from '../models/LostAndFound';
import { UserRole } from '../types';

describe('Gate #72: Front Desk Lost & Found Vault Workstation, Digital Custody Chain & Multi-Tenant Isolation', () => {
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
      name: 'SpiceHub Grand Palace Lost & Found Desk',
      slug: `grand-palace-72a-${Date.now()}`,
      contactEmail: `frontdesk_72a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199370',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Lost & Found Desk',
      slug: `rival-72b-${Date.now()}`,
      contactEmail: `frontdesk_72b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199371',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    const jwtSecret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
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

  // 1. Inward Logging
  it('1. POST /api/v1/pms/frontdesk/lost-and-found/inward - Logs standard found item with auto-tag LF-YYYY-XXXXX & 90-day retention', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/lost-and-found/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        description: 'Ray-Ban Polarized Aviator Sunglasses (Gold Frame)',
        category: LostAndFoundCategory.OTHER,
        foundLocation: 'Room 204 Bedside Table',
        guestName: 'Ananya Verma',
        storageLocation: 'Front Desk Holding Shelf B',
        estimatedValue: 12000,
        retentionDays: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.trackingNumber).toMatch(/^LF-\d{4}-\d{5}$/);
    expect(res.body.item.status).toBe(LostAndFoundStatus.LOGGED);
    expect(res.body.item.custodyChain).toHaveLength(1);
    expect(res.body.item.custodyChain[0].action).toBe('MOVED_TO_VAULT'); // estimatedValue >= 5000 is high-value

    standardItemIdA = res.body.item._id;
  });

  // 2. Reject Missing Mandatory Fields
  it('2. POST /api/v1/pms/frontdesk/lost-and-found/inward - Strictly rejects payload missing description or location (400)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/lost-and-found/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: LostAndFoundCategory.CLOTHING,
        // description missing
        // foundLocation missing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('MISSING_FIELDS');
  });

  // 3. High-Value Valuables Vault Allocation
  it('3. POST /api/v1/pms/frontdesk/lost-and-found/inward - Logs high-value jewelry and auto-allocates to secure digital vault', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/lost-and-found/inward')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        description: 'Rolex Submariner Date (Oystersteel & Gold)',
        category: LostAndFoundCategory.JEWELRY,
        foundLocation: 'Presidential Suite Safe Drawer',
        guestName: 'Vikramaditya Singhania',
        estimatedValue: 850000,
        secureVaultLocker: 'VAULT-LOCKER-A-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.isHighValue).toBe(true);
    expect(res.body.item.secureVaultLocker).toBe('VAULT-LOCKER-A-01');
    expect(res.body.item.storageLocation).toContain('Secure Vault Locker: VAULT-LOCKER-A-01');
    expect(res.body.item.custodyChain[0].action).toBe('MOVED_TO_VAULT');
    expect(res.body.item.custodyChain[0].notes).toContain('High-value asset');

    highValueItemIdA = res.body.item._id;
  });

  // 4. Guest Inquiry Matching
  it('4. POST /api/v1/pms/frontdesk/lost-and-found/inquire - Matches lost items via keyword or category search', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/lost-and-found/inquire')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        category: LostAndFoundCategory.JEWELRY,
        keyword: 'Rolex',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(res.body.matchedItems.some((item: any) => item._id === highValueItemIdA)).toBe(true);
  });

  // 5. Claim Verification
  it('5. POST /api/v1/pms/frontdesk/lost-and-found/:itemId/verify-claim - Verifies ownership with Aadhaar ID and serial match', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${highValueItemIdA}/verify-claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        claimantName: 'Vikramaditya Singhania',
        claimantPhone: '+91 9820011223',
        claimantEmail: 'vikram.singhania@apextech.com',
        idProofType: 'AADHAAR',
        idProofNumber: '4829-1029-4491',
        verificationNotes: 'Rolex purchase invoice matches warranty serial card',
        serialNumberMatched: true,
        matchConfidenceScore: 100,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.VERIFIED_PENDING_DISPATCH);
    expect(res.body.item.claimVerification.idProofNumber).toBe('4829-1029-4491');
    expect(res.body.item.custodyChain).toHaveLength(2);
    expect(res.body.item.custodyChain[1].action).toBe('VERIFIED');
  });

  // 6. Reject Claim Missing Info
  it('6. POST /api/v1/pms/frontdesk/lost-and-found/:itemId/verify-claim - Rejects verification missing ID proof (400)', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${standardItemIdA}/verify-claim`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        claimantName: 'Ananya Verma',
        // phone and ID missing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('MISSING_CLAIMANT_INFO');
  });

  // 7. Counter Handover In-Person
  it('7. POST /api/v1/pms/frontdesk/lost-and-found/:itemId/handover - Completes in-person counter handover to verified guest', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${standardItemIdA}/handover`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        claimantName: 'Ananya Verma',
        contactNumber: '+91 9811122334',
        idProof: 'PASSPORT-Z9928172',
        notes: 'Handed over at Reception counter after physical identification',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.CLAIMED_IN_PERSON);
    expect(res.body.item.claimedBy.claimantName).toBe('Ananya Verma');
    expect(res.body.item.custodyChain.some((c: any) => c.action === 'HANDOVER')).toBe(true);
  });

  // 8. Outward Courier Dispatch
  it('8. POST /api/v1/pms/frontdesk/lost-and-found/:itemId/dispatch-courier - Dispatches verified high-value item via express courier', async () => {
    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${highValueItemIdA}/dispatch-courier`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        courierPartner: 'BLUE_DART',
        waybillNumber: 'BLUEDART-882910482',
        recipientName: 'Vikramaditya Singhania',
        recipientPhone: '+91 9820011223',
        shippingAddress: {
          street: '42, Altamount Road, Cumballa Hill',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400026',
          country: 'India',
        },
        shippingFeePaidBy: 'GUEST',
        shippingFeeAmount: 2500,
        notes: 'High-value insured courier dispatch',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.COURIER_DISPATCHED);
    expect(res.body.item.courierDispatch.waybillNumber).toBe('BLUEDART-882910482');
    expect(res.body.item.courierDispatch.courierStatus).toBe('PICKED_UP');
  });

  // 9. Unclaimed Item Disposal
  it('9. POST /api/v1/pms/frontdesk/lost-and-found/:itemId/dispose - Disposes or auctions unclaimed item after retention', async () => {
    // Create an expired item
    const expiredItem = await LostAndFound.create({
      hotelId: hotelIdA,
      trackingNumber: `LF-2025-99999`,
      description: 'Old Broken Travel Umbrella',
      category: LostAndFoundCategory.OTHER,
      foundLocation: 'Lobby Porch',
      foundByUserId: new Types.ObjectId(),
      storageLocation: 'Disposal Bin',
      retentionExpiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // Expired 30 days ago
      status: LostAndFoundStatus.LOGGED,
      custodyChain: [],
    });

    const res = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${expiredItem._id}/dispose`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        action: 'DISPOSED',
        disposalNotes: 'Retention window expired without claimant. Authorized commercial waste disposal.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(LostAndFoundStatus.DISPOSED);
  });

  // 10. Front Desk Vault Directory & KPI Metrics
  it('10. GET /api/v1/pms/frontdesk/lost-and-found/vault - Computes accurate front desk vault KPI metrics', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/lost-and-found/vault')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalLogged).toBeGreaterThanOrEqual(3);
    expect(res.body.metrics.claimedInPerson).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.courierDispatched).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.disposed).toBeGreaterThanOrEqual(1);
  });

  // 11. Custody Audit Log
  it('11. GET /api/v1/pms/frontdesk/lost-and-found/audit-log/:itemId - Returns complete tamper-evident custody chain', async () => {
    const res = await request(app)
      .get(`/api/v1/pms/frontdesk/lost-and-found/audit-log/${highValueItemIdA}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.trackingNumber).toBeDefined();
    expect(res.body.custodyChain.length).toBeGreaterThanOrEqual(3);
    expect(res.body.custodyChain[0].action).toBe('MOVED_TO_VAULT');
    expect(res.body.custodyChain[1].action).toBe('VERIFIED');
    expect(res.body.custodyChain[2].action).toBe('DISPATCH_PREPARED');
  });

  // 12. Strict Multi-Tenant Isolation
  it('12. Strict Multi-Tenant Isolation - Tenant B cannot view or manipulate Tenant A items', async () => {
    // Tenant B tries to view Tenant A vault item audit log
    const auditRes = await request(app)
      .get(`/api/v1/pms/frontdesk/lost-and-found/audit-log/${highValueItemIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(auditRes.status).toBe(404);

    // Tenant B tries to claim Tenant A item
    const claimRes = await request(app)
      .post(`/api/v1/pms/frontdesk/lost-and-found/${highValueItemIdA}/handover`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        claimantName: 'Fraudulent Infiltrator',
        contactNumber: '+91 9999999999',
        idProof: 'FAKE-ID',
      });

    expect(claimRes.status).toBe(404);
  });
});
