import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { GuestReview, ReviewSource, ServiceRecoveryStatus } from '../models/GuestReview';
import { AdminAlertEvent, AlertEventStatus } from '../models/AdminAlertEvent';
import {
  NotificationPreference,
  AlertCategory,
  NotificationChannel,
} from '../models/NotificationPreference';

describe('--- SHIFT 46 / GATE 46: IN-APP 5-STAR RATING & INSTANT NEGATIVE REVIEW MANAGER ALERT ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAUser: any;
  let managerAUser: any;
  let negativeReviewId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Heritage Palace A',
      slug: `heritage-palace-a-${Date.now()}`,
      contactEmail: `admin-a-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 11111',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Rival Resort B',
      slug: `rival-resort-b-${Date.now()}`,
      contactEmail: `admin-b-${Date.now()}@spicehub.com`,
      contactPhone: '+91 97777 22222',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Users
    managerAUser = await User.create({
      hotelId: tenantA._id,
      name: 'Rohan Deshmukh (F&B Director)',
      email: `rohan-fnb-${Date.now()}@palace.com`,
      phone: '+91 97777 33333',
      passwordHash: 'hashed_pw',
      role: UserRole.MANAGER,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    adminAToken = jwt.sign(
      { userId: managerAUser._id.toString(), role: UserRole.MANAGER, hotelId: tenantAId, email: managerAUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    waiterAUser = await User.create({
      hotelId: tenantA._id,
      name: 'Ramesh Kumar (Waiter Table 1-10)',
      email: `ramesh-waiter-${Date.now()}@palace.com`,
      phone: '+91 97777 44444',
      passwordHash: 'hashed_pw',
      role: UserRole.WAITER,
      permissions: ['ORDERING'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    const adminBUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Admin B',
      email: `rival-${Date.now()}@rival.com`,
      phone: '+91 97777 55555',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    adminBToken = jwt.sign(
      { userId: adminBUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantBId, email: adminBUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Configure Soundbox & In-App Notification Preferences for Negative Review
    await NotificationPreference.create({
      hotelId: tenantA._id,
      userId: managerAUser._id,
      role: 'MANAGER',
      subscriptions: [
        {
          category: AlertCategory.NEGATIVE_REVIEW,
          enabled: true,
          minThreshold: 2,
          channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX],
          soundChime: true,
          urgentVibration: true,
        },
      ],
      isActive: true,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await GuestReview.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await AdminAlertEvent.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await NotificationPreference.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  it('1. POST /api/v1/guest-reviews/submit - Submits a 5-star positive review with Google Review boost prompted', async () => {
    const res = await request(app)
      .post('/api/v1/guest-reviews/submit')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        guestName: 'Ananya Roy',
        guestPhone: '+91 98765 00001',
        source: ReviewSource.TABLE_QR,
        tableNumber: 'T-04',
        waiterId: waiterAUser._id.toString(),
        waiterName: waiterAUser.name,
        ratings: {
          overall: 5,
          foodQuality: 5,
          serviceSpeed: 5,
          ambienceCleanliness: 5,
          valueForMoney: 4,
        },
        tags: ['Rich Authentic Flavors', 'Exemplary Service', 'Prompt Delivery'],
        comments: 'Amazing Paneer Butter Masala! Loved the service by Ramesh.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.ratings.overall).toBe(5);
    expect(res.body.review.isNegative).toBe(false);
    expect(res.body.review.serviceRecovery.status).toBe(ServiceRecoveryStatus.NONE);
    expect(res.body.googleReviewPrompt).toBeTruthy();
    expect(res.body.googleReviewPrompt.prompted).toBe(true);
  });

  it('2. POST /api/v1/guest-reviews/submit - Submits a 1-star negative review triggering Service Recovery', async () => {
    const res = await request(app)
      .post('/api/v1/guest-reviews/submit')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        guestName: 'Vikram Joshi',
        guestPhone: '+91 98765 00002',
        source: ReviewSource.TABLE_QR,
        tableNumber: 'T-07',
        waiterId: waiterAUser._id.toString(),
        waiterName: waiterAUser.name,
        ratings: {
          overall: 1,
          foodQuality: 1,
          serviceSpeed: 2,
          ambienceCleanliness: 3,
        },
        tags: ['Slow Kitchen Delivery', 'Food Served Lukewarm'],
        comments: 'Starters arrived cold after 35 minutes. Very disappointed.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.ratings.overall).toBe(1);
    expect(res.body.review.isNegative).toBe(true);
    expect(res.body.review.serviceRecovery.status).toBe(ServiceRecoveryStatus.TRIGGERED);
    expect(res.body.serviceRecoveryTriggered).toBe(true);
    expect(res.body.googleReviewPrompt).toBeNull();

    negativeReviewId = res.body.review._id;
  });

  it('3. Automated Manager Escalation: Negative review automatically generates Critical AdminAlertEvent', async () => {
    const alert = await AdminAlertEvent.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      category: AlertCategory.NEGATIVE_REVIEW,
      'payload.reviewId': new Types.ObjectId(negativeReviewId),
    });

    expect(alert).toBeTruthy();
    expect(alert!.severity).toBe('CRITICAL');
    expect(alert!.title).toContain('Table T-07');
    expect(alert!.message).toContain('Vikram Joshi');
    expect(alert!.status).toBe(AlertEventStatus.ACTIVE);
  });

  it('4. Soundbox Voice Broadcast: Dispatches spoken audio text to Floor Soundbox', async () => {
    const alert = await AdminAlertEvent.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      category: AlertCategory.NEGATIVE_REVIEW,
      'payload.reviewId': new Types.ObjectId(negativeReviewId),
    });

    expect(alert!.soundboxDispatched).toBe(true);
    expect(alert!.soundboxSpeech).toContain('Table T-07');
    expect(alert!.soundboxSpeech).toContain('Vikram Joshi');
  });

  it('5. In-Room Stay Negative Review: Submits 2-star review from Room 302 and verifies Room context', async () => {
    const res = await request(app)
      .post('/api/v1/guest-reviews/submit')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        guestName: 'Dr. Priya Mehta',
        source: ReviewSource.ROOM_PORTAL,
        roomNumber: '302',
        ratings: {
          overall: 2,
          serviceSpeed: 1,
          foodQuality: 3,
        },
        tags: ['Missing Item / Request'],
        comments: 'Requested extra towels 1 hour ago, still not delivered.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.isNegative).toBe(true);
    expect(res.body.review.roomNumber).toBe('302');
  });

  it('6. GET /api/v1/guest-reviews - Returns paginated review feed with calculated CSAT summary metrics', async () => {
    const res = await request(app)
      .get('/api/v1/guest-reviews')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalCount).toBe(3);
    expect(res.body.metrics.totalReviews).toBe(3);
    expect(res.body.metrics.negativeReviewsCount).toBe(2);
    expect(res.body.metrics.positiveReviewsCount).toBe(1);
    expect(res.body.metrics.averageOverall).toBeGreaterThan(0);
  });

  it('7. PATCH /api/v1/guest-reviews/:reviewId/recovery - Manager transitions status to MANAGER_VISITING', async () => {
    const res = await request(app)
      .patch(`/api/v1/guest-reviews/${negativeReviewId}/recovery`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        status: ServiceRecoveryStatus.MANAGER_VISITING,
        managerName: 'Rohan Deshmukh (F&B Director)',
        recoveryNotes: 'Attending Table 7 personally to apologize for food temperature delay',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.review.serviceRecovery.status).toBe(ServiceRecoveryStatus.MANAGER_VISITING);
    expect(res.body.review.serviceRecovery.assignedManagerName).toBe('Rohan Deshmukh (F&B Director)');
  });

  it('8. PATCH /api/v1/guest-reviews/:reviewId/recovery - Manager offers complimentary item & resolves recovery atomically', async () => {
    const res = await request(app)
      .patch(`/api/v1/guest-reviews/${negativeReviewId}/recovery`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        status: ServiceRecoveryStatus.RESOLVED,
        recoveryAction: 'Complimentary Hot Sizzling Brownie with Ice Cream provided + 15% discount applied',
        discountPercentage: 15,
        recoveryNotes: 'Guest Vikram Joshi was delighted with the fresh brownie and thanked management',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.review.serviceRecovery.status).toBe(ServiceRecoveryStatus.RESOLVED);
    expect(res.body.review.serviceRecovery.discountPercentage).toBe(15);
    expect(res.body.review.serviceRecovery.resolvedAt).toBeTruthy();

    // Verify associated AdminAlertEvent also marked RESOLVED
    const alert = await AdminAlertEvent.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      'payload.reviewId': new Types.ObjectId(negativeReviewId),
    });
    expect(alert!.status).toBe(AlertEventStatus.RESOLVED);
  });

  it('9. POST /api/v1/guest-reviews/:reviewId/track-google - Tracks Google review conversion button click', async () => {
    // Find the positive 5-star review
    const positiveReview = await GuestReview.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      isNegative: false,
    });

    const res = await request(app)
      .post(`/api/v1/guest-reviews/${positiveReview!._id}/track-google`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.review.googleReviewClicked).toBe(true);
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot access or update Tenant A reviews or CSAT metrics', async () => {
    // Tenant B attempts to update Tenant A review recovery
    const unauthUpdate = await request(app)
      .patch(`/api/v1/guest-reviews/${negativeReviewId}/recovery`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ status: ServiceRecoveryStatus.RESOLVED });

    expect(unauthUpdate.status).toBe(404);

    // Tenant B reviews list must be empty
    const listB = await request(app)
      .get('/api/v1/guest-reviews')
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(listB.status).toBe(200);
    expect(listB.body.totalCount).toBe(0);
    expect(listB.body.metrics.totalReviews).toBe(0);
  });
});
