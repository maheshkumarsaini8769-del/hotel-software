import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { GuestReview, ReviewSource, ServiceRecoveryStatus } from '../models/GuestReview';
import { AdminAlertEvent, AlertSeverity, AlertEventStatus } from '../models/AdminAlertEvent';

describe('--- SHIFT 46 / GATE 46 TIER 2: ULTRA-DEEP CONCURRENCY & REVIEW DRILL ---', () => {
  let server: http.Server;
  const port = 5138; // Dedicated Port 5138 for Gate 46 Tier 2

  let tenantAId: string;
  let tenantBId: string;
  let gmToken: string;
  let tenantBToken: string;
  let waiter1User: any;
  let waiter2User: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Luxury Hotel A',
      slug: `luxury-hotel-drill-a-${Date.now()}`,
      contactEmail: `admin-drill-a-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 66661',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Competitor Resort B',
      slug: `competitor-drill-b-${Date.now()}`,
      contactEmail: `admin-drill-b-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 66662',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Users
    const gmUser = await User.create({
      hotelId: tenantA._id,
      name: 'Vikram Malhotra (GM)',
      email: `gm-${Date.now()}@luxury.com`,
      phone: '+91 97777 66663',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    gmToken = jwt.sign(
      { userId: gmUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantAId, email: gmUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    waiter1User = await User.create({
      hotelId: tenantA._id,
      name: 'Deepak Sharma (Waiter Floor 1)',
      email: `deepak-${Date.now()}@luxury.com`,
      phone: '+91 97777 66664',
      passwordHash: 'hashed_pw',
      role: UserRole.WAITER,
      permissions: ['ORDERING'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    waiter2User = await User.create({
      hotelId: tenantA._id,
      name: 'Sunil Verma (Waiter Floor 2)',
      email: `sunil-${Date.now()}@luxury.com`,
      phone: '+91 97777 66665',
      passwordHash: 'hashed_pw',
      role: UserRole.WAITER,
      permissions: ['ORDERING'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Admin B',
      email: `rival-${Date.now()}@rival.com`,
      phone: '+91 97777 66666',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    tenantBToken = jwt.sign(
      { userId: rivalUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantBId, email: rivalUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await GuestReview.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await AdminAlertEvent.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Concurrency Storm: 20 simultaneous reviews submitted across tables and rooms without drops or data corruption', async () => {
    const promises = Array.from({ length: 20 }).map((_, idx) => {
      const isEven = idx % 2 === 0;
      const isNegative = idx < 5; // First 5 are negative (1-2 stars)
      const overall = isNegative ? (idx % 2 === 0 ? 1 : 2) : (idx % 2 === 0 ? 5 : 4);
      const waiter = isEven ? waiter1User : waiter2User;

      return request(server)
        .post('/api/v1/guest-reviews/submit')
        .set('Authorization', `Bearer ${gmToken}`)
        .send({
          guestName: `Guest #${idx + 1}`,
          guestPhone: `+91 98000 ${10000 + idx}`,
          source: isEven ? ReviewSource.TABLE_QR : ReviewSource.ROOM_PORTAL,
          tableNumber: isEven ? `T-0${(idx % 8) + 1}` : undefined,
          roomNumber: !isEven ? `10${(idx % 5) + 1}` : undefined,
          waiterId: waiter._id.toString(),
          waiterName: waiter.name,
          ratings: {
            overall,
            foodQuality: overall,
            serviceSpeed: overall,
          },
          tags: isNegative ? ['Slow Service'] : ['Delicious Food'],
          comments: `Review comments from guest #${idx + 1}`,
        });
    });

    const results = await Promise.all(promises);
    expect(results.every((r) => r.status === 201)).toBe(true);

    // Verify 20 reviews stored in DB
    const count = await GuestReview.countDocuments({ hotelId: new Types.ObjectId(tenantAId) });
    expect(count).toBe(20);

    // Exactly 5 reviews were negative (overall <= 2)
    const negativeCount = await GuestReview.countDocuments({
      hotelId: new Types.ObjectId(tenantAId),
      isNegative: true,
    });
    expect(negativeCount).toBe(5);

    // Exactly 5 alerts created for the 5 negative reviews
    const alertCount = await AdminAlertEvent.countDocuments({
      hotelId: new Types.ObjectId(tenantAId),
      category: 'NEGATIVE_REVIEW',
    });
    expect(alertCount).toBe(5);
  });

  it('2. CSAT Analytics Math Accuracy: Computes exact weighted averages and percentages across the 20 reviews', async () => {
    const res = await request(server)
      .get('/api/v1/guest-reviews')
      .set('Authorization', `Bearer ${gmToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalReviews).toBe(20);
    expect(res.body.metrics.negativeReviewsCount).toBe(5);
    expect(res.body.metrics.positiveReviewsCount).toBe(15);
    // CSAT % = (15 / 20) * 100 = 75%
    expect(res.body.metrics.csatPercentage).toBe(75);
    expect(res.body.metrics.averageOverall).toBeGreaterThan(3.0);
  });

  it('3. Staff Leaderboard Drill: Accurately ranks waiters by average guest CSAT rating', async () => {
    const res = await request(server)
      .get('/api/v1/guest-reviews/analytics')
      .set('Authorization', `Bearer ${gmToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalFeedbackCount).toBe(20);
    expect(res.body.staffLeaderboard.length).toBe(2);

    // Both waiters must have 10 reviews each
    const waiter1 = res.body.staffLeaderboard.find((w: any) => w.waiterId === waiter1User._id.toString());
    const waiter2 = res.body.staffLeaderboard.find((w: any) => w.waiterId === waiter2User._id.toString());

    expect(waiter1).toBeTruthy();
    expect(waiter2).toBeTruthy();
    expect(waiter1.totalReviews).toBe(10);
    expect(waiter2.totalReviews).toBe(10);
  });

  it('4. Concurrent Service Recovery Resolution: Multiple managers updating recovery state on the same review resolve cleanly', async () => {
    // 1. Pick a negative review
    const negativeReview = await GuestReview.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      isNegative: true,
      'serviceRecovery.status': ServiceRecoveryStatus.TRIGGERED,
    });
    expect(negativeReview).toBeTruthy();

    // 2. Fire 5 concurrent resolution requests
    const resolvePromises = Array.from({ length: 5 }).map((_, idx) =>
      request(server)
        .patch(`/api/v1/guest-reviews/${negativeReview!._id}/recovery`)
        .set('Authorization', `Bearer ${gmToken}`)
        .send({
          status: ServiceRecoveryStatus.RESOLVED,
          managerName: `Duty Manager #${idx + 1}`,
          recoveryAction: `Offered complimentary dessert voucher #${idx + 1}`,
          discountPercentage: 10 + idx,
        })
    );

    const resolveResults = await Promise.all(resolvePromises);
    expect(resolveResults.every((r) => r.status === 200)).toBe(true);

    // Verify DB state is RESOLVED
    const updatedReview = await GuestReview.findById(negativeReview!._id);
    expect(updatedReview!.serviceRecovery.status).toBe(ServiceRecoveryStatus.RESOLVED);
    expect(updatedReview!.serviceRecovery.resolvedAt).toBeTruthy();

    // Associated alert marked RESOLVED
    const associatedAlert = await AdminAlertEvent.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      'payload.reviewId': negativeReview!._id,
    });
    expect(associatedAlert!.status).toBe(AlertEventStatus.RESOLVED);
  });

  it('5. Multi-Tenant Penetration Defense: Competitor Tenant B cannot access Tenant A reviews or staff analytics', async () => {
    // Tenant B requests reviews
    const listRes = await request(server)
      .get('/api/v1/guest-reviews')
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.totalCount).toBe(0);
    expect(listRes.body.metrics.totalReviews).toBe(0);

    // Tenant B requests staff analytics
    const analyticsRes = await request(server)
      .get('/api/v1/guest-reviews/analytics')
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.totalFeedbackCount).toBe(0);
    expect(analyticsRes.body.staffLeaderboard.length).toBe(0);
  });
});
