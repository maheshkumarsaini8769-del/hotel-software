import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { LoyaltyTransaction, LoyaltyTxType, LoyaltyReferenceType } from '../models/LoyaltyTransaction';
import { MarketingCampaign, CampaignStatus, CampaignChannel } from '../models/MarketingCampaign';
import { UserRole } from '../types';

describe('--- SHIFT 9 / GATE 9: ADVANCED CRM, LOYALTY ENGINE & MARKETING BROADCASTS ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let managerToken: string;
  let tenantBToken: string;
  let createdGuestProfileId: string;
  let createdCampaignId: string;
  let globalSocket: Socket;
  let testServerUrl: string;
  const guestPhone = '+91-98765-43210';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5089;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Royal Heritage Resort',
      slug: `heritage-${Date.now()}`,
      contactEmail: `heritage_${Date.now()}@spicehub.com`,
      contactPhone: '9888877791',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Beachfront Hotel',
      slug: `beachfront-${Date.now()}`,
      contactEmail: `beachfront_${Date.now()}@spicehub.com`,
      contactPhone: '9888877792',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Managers
    const manager = await User.create({
      hotelId: tenantA._id,
      name: 'CRM Director Sophia',
      email: `sophia_${Date.now()}@heritage.com`,
      phone: '9888877793',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const rivalManager = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Manager Leo',
      email: `leo_${Date.now()}@beachfront.com`,
      phone: '9888877794',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

    managerToken = jwt.sign(
      { userId: manager._id.toString(), hotelId: tenantAId, role: manager.role, email: manager.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    tenantBToken = jwt.sign(
      { userId: rivalManager._id.toString(), hotelId: tenantBId, role: rivalManager.role, email: rivalManager.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    // Connect global socket
    globalSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => globalSocket.on('connect', () => resolve()));
    globalSocket.emit('join_tenant_room', { hotelId: tenantAId });
  });

  afterAll(async () => {
    if (globalSocket) globalSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await GuestProfile.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await LoyaltyTransaction.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MarketingCampaign.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await mongoose.connection.close();
  });

  // TEST 1: Register Guest Profile 360 with Dietary Preferences, Allergies & VIP Tags
  test('1. Register Guest Profile 360 with allergies, dietary preferences, and custom tags', async () => {
    const res = await request(app)
      .post('/api/v1/crm/profiles')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Sir Charles Montgomery',
        phone: guestPhone,
        email: 'charles.montgomery@royalty.co.uk',
        allergies: ['Peanuts', 'Shellfish'],
        dietaryPreferences: ['Vegan', 'Gluten-Free'],
        specialNotes: 'Prefers quiet high-floor suites facing east',
        tags: ['HIGH_NET_WORTH', 'REPEAT_GUEST'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.name).toBe('Sir Charles Montgomery');
    expect(res.body.profile.vipTier).toBe(VIPTier.REGULAR);
    expect(res.body.profile.allergies).toContain('Peanuts');
    expect(res.body.profile.dietaryPreferences).toContain('Vegan');
    createdGuestProfileId = res.body.profile._id;

    // View Profile 360 Endpoint
    const viewRes = await request(app)
      .get(`/api/v1/crm/profiles/${createdGuestProfileId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(viewRes.status).toBe(200);
    expect(viewRes.body.profile.phone).toBe(guestPhone);
    expect(viewRes.body.profile.tags).toContain('HIGH_NET_WORTH');
  });

  // TEST 2: Loyalty Earn Points & Automated VIP Tier Promotion (SILVER threshold)
  test('2. Guest spends $5,500 on restaurant dining: earns 550 points and auto-promotes to SILVER', async () => {
    const res = await request(app)
      .post('/api/v1/crm/loyalty/earn')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        phone: guestPhone,
        amountSpent: 5500,
        referenceType: LoyaltyReferenceType.RESTAURANT_BILL,
        notes: 'Celebratory gala dinner in private dining hall',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pointsEarned).toBe(550); // 1 point per $10
    expect(res.body.newBalance).toBe(550);
    expect(res.body.vipTier).toBe(VIPTier.SILVER); // >= $5,000 promoted to SILVER!

    // Verify database record
    const profile = await GuestProfile.findById(createdGuestProfileId);
    expect(profile?.vipTier).toBe(VIPTier.SILVER);
    expect(profile?.totalLifetimeSpend).toBe(5500);
    expect(profile?.loyaltyPointsBalance).toBe(550);
  });

  // TEST 3: Multi-Transaction Loyalty & Promotion to GOLD Tier ($20,000 threshold)
  test('3. Second spend of $16,000 promotes guest to GOLD tier with cumulative point balance', async () => {
    const res = await request(app)
      .post('/api/v1/crm/loyalty/earn')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        phone: guestPhone,
        amountSpent: 16000,
        referenceType: LoyaltyReferenceType.ROOM_FOLIO,
        notes: 'Presidential suite booking settlement',
      });

    expect(res.status).toBe(200);
    expect(res.body.pointsEarned).toBe(1600); // 1600 points
    expect(res.body.newBalance).toBe(550 + 1600); // 2150 points
    expect(res.body.vipTier).toBe(VIPTier.GOLD); // Total spend = 21,500 >= 20,000

    const profile = await GuestProfile.findById(createdGuestProfileId);
    expect(profile?.vipTier).toBe(VIPTier.GOLD);
    expect(profile?.totalLifetimeSpend).toBe(21500);
  });

  // TEST 4: Loyalty Points Burn / Redemption with Exact Balance Recalculation
  test('4. Redeem 500 points for $500 bill discount and verify balance and audit ledger', async () => {
    const redeemRes = await request(app)
      .post('/api/v1/crm/loyalty/redeem')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        phone: guestPhone,
        pointsToRedeem: 500,
        referenceType: LoyaltyReferenceType.RESTAURANT_BILL,
        notes: 'Loyalty discount applied on lunch order',
      });

    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body.success).toBe(true);
    expect(redeemRes.body.pointsRedeemed).toBe(500);
    expect(redeemRes.body.discountAmount).toBe(500);
    expect(redeemRes.body.remainingBalance).toBe(2150 - 500); // 1650 points remaining

    const profile = await GuestProfile.findById(createdGuestProfileId);
    expect(profile?.loyaltyPointsBalance).toBe(1650);
    expect(profile?.pointsRedeemedLifetime).toBe(500);
  });

  // TEST 5: Over-Redemption Defense (Prevent Negative Point Balance)
  test('5. Attempting to redeem more points than available balance is strictly rejected with 400', async () => {
    const overdrawRes = await request(app)
      .post('/api/v1/crm/loyalty/redeem')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        phone: guestPhone,
        pointsToRedeem: 5000, // Balance is only 1650!
      });

    expect(overdrawRes.status).toBe(400);
    expect(overdrawRes.body.errorCode).toBe('INSUFFICIENT_LOYALTY_POINTS');

    // Balance remains intact
    const profile = await GuestProfile.findById(createdGuestProfileId);
    expect(profile?.loyaltyPointsBalance).toBe(1650);
  });

  // TEST 6: Loyalty Audit Ledger History
  test('6. Guest Loyalty Ledger lists all EARN and REDEEM transactions in reverse chronological order', async () => {
    const ledgerRes = await request(app)
      .get(`/api/v1/crm/loyalty/ledger?phone=${encodeURIComponent(guestPhone)}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.success).toBe(true);
    expect(ledgerRes.body.currentPoints).toBe(1650);
    expect(ledgerRes.body.totalEarnedLifetime).toBe(2150);
    expect(ledgerRes.body.totalRedeemedLifetime).toBe(500);
    expect(ledgerRes.body.transactions.length).toBe(3); // 2 Earn + 1 Redeem
  });

  // TEST 7: CRM Directory Search & VIP Filters
  test('7. Search directory by partial name and filter by VIP tier (GOLD)', async () => {
    const searchRes = await request(app)
      .get('/api/v1/crm/search?query=Charles&vipTier=GOLD')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.guests.length).toBe(1);
    expect(searchRes.body.guests[0].name).toBe('Sir Charles Montgomery');
  });

  // TEST 8: Targeted Marketing Campaign Creation & Live Personalized Broadcast Dispatch
  test('8. Create and dispatch targeted SMS campaign to GOLD VIP members with real-time socket event', async () => {
    // 8a. Create Campaign
    const campRes = await request(app)
      .post('/api/v1/crm/campaigns')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        campaignName: 'Exclusive Autumn Wine Tasting Invitation',
        channel: CampaignChannel.SMS,
        targetVipTier: 'GOLD',
        minimumSpendFilter: 10000,
        messageTemplate: 'Dear {{guestName}}, as a distinguished {{vipTier}} member with {{points}} loyalty points, you are invited to our Exclusive Autumn Wine Gala this Friday!',
      });

    expect(campRes.status).toBe(201);
    expect(campRes.body.campaign.status).toBe(CampaignStatus.DRAFT);
    createdCampaignId = campRes.body.campaign._id;

    // 8b. Setup live socket listener for dispatch notification
    const socketEventPromise = new Promise<any>((resolve) => {
      globalSocket.on('marketing:campaign_dispatched', (data) => resolve(data));
    });

    // 8c. Dispatch Campaign
    const dispatchRes = await request(app)
      .post(`/api/v1/crm/campaigns/${createdCampaignId}/dispatch`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.success).toBe(true);
    expect(dispatchRes.body.recipientCount).toBeGreaterThanOrEqual(1);

    // Verify message personalization
    const sample = dispatchRes.body.sampleDispatches[0];
    expect(sample.guestPhone).toBe(guestPhone);
    expect(sample.message).toContain('Dear Sir Charles Montgomery');
    expect(sample.message).toContain('GOLD member');
    expect(sample.message).toContain('1650 loyalty points');

    // Verify socket event was received live
    const socketData = await socketEventPromise;
    expect(socketData.campaignId).toBe(createdCampaignId);
    expect(socketData.recipientCount).toBeGreaterThanOrEqual(1);
  });

  // TEST 9: Multi-Tenant Boundary Security
  test('9. Multi-Tenant Isolation: Rival hotel manager cannot access Tenant A CRM profiles or loyalty ledger', async () => {
    // Attempt to access Tenant A's guest profile with Tenant B's token
    const crossProfileRes = await request(app)
      .get(`/api/v1/crm/profiles/${createdGuestProfileId}`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(crossProfileRes.status).toBe(404);
    expect(crossProfileRes.body.errorCode).toBe('GUEST_NOT_FOUND');

    // Attempt to dispatch Tenant A's campaign with Tenant B's token
    const crossDispatchRes = await request(app)
      .post(`/api/v1/crm/campaigns/${createdCampaignId}/dispatch`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(crossDispatchRes.status).toBe(404);
    expect(crossDispatchRes.body.errorCode).toBe('CAMPAIGN_NOT_FOUND');
  });
});
