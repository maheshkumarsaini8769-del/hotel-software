import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import {
  TableReservation,
  ReservationStatus,
} from '../models/TableReservation';
import { GuestProfile } from '../models/GuestProfile';
import { UserRole } from '../types';

describe('--- SHIFT 30 / GATE 30: RESTAURANT TABLE RESERVATION CRM & GUEST DIETARY ALLERGENS ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let maitreDToken: string;
  let competitorToken: string;
  let reservationAId: string;
  let reservationBId: string;
  let tableAId: string;
  const vipGuestPhone = '9811122233';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5110;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'ITC Maurya Bukhara & Dum Pukht',
      slug: `itc-maurya-${Date.now()}`,
      contactEmail: `itc_maurya_${Date.now()}@spicehub.com`,
      contactPhone: '9811100001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Star Lounge',
      slug: `rival-star-${Date.now()}`,
      contactEmail: `rival_star_${Date.now()}@spicehub.com`,
      contactPhone: '9811100002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. Maitre D / Hostess User for Tenant A
    const maitreD = await User.create({
      hotelId: tenantA._id,
      name: 'Maitre D Simran Kaur',
      email: `hostess_${Date.now()}@itcmaurya.com`,
      phone: '9811100003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    maitreDToken = jwt.sign(
      {
        userId: maitreD._id.toString(),
        hotelId: tenantAId,
        role: UserRole.MANAGER,
        email: maitreD.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Competitor User for Tenant B
    const competitor = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Host',
      email: `host_${Date.now()}@rivalstar.com`,
      phone: '9811100004',
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

    // 5. Setup Dining Table for Seating
    const table = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-10',
      capacity: 4,
      section: 'Royal Dining Hall',
      currentStatus: TableStatus.AVAILABLE,
    });
    tableAId = table._id.toString();
  });

  afterAll(async () => {
    await TableReservation.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await GuestProfile.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. POST /api/v1/dining-reservations: Create VIP Platinum booking with severe allergen alerts & occasion', async () => {
    const startTime = Date.now();

    const payload = {
      customerName: 'Aditya Birla',
      customerPhone: vipGuestPhone,
      customerEmail: 'aditya.birla@group.com',
      partySize: 4,
      reservationDate: new Date().toISOString(),
      timeSlot: '20:00',
      mealPeriod: 'DINNER',
      tableTypePreference: 'PRIVATE_DINING_ROOM_PDR',
      vipTier: 'PLATINUM_VIP',
      dietaryPreferences: ['VEG', 'JAIN_NO_ROOTS'],
      allergens: ['PEANUTS_TREENUTS', 'GLUTEN'],
      specialOccasion: 'ANNIVERSARY',
      chefNotes: 'Severe peanut anaphylaxis alert! Use separate sterilized cutting board.',
      depositAmount: 5000,
    };

    const res = await request(app)
      .post('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] POST VIP Dining Reservation Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation).toBeDefined();
    expect(res.body.reservation.reservationNumber).toMatch(/^RES-/);
    expect(res.body.reservation.vipTier).toBe('PLATINUM_VIP');
    expect(res.body.reservation.allergens).toContain('PEANUTS_TREENUTS');
    expect(res.body.reservation.allergens).toContain('GLUTEN');
    expect(res.body.reservation.specialOccasion).toBe('ANNIVERSARY');
    expect(res.body.reservation.depositAmount).toBe(5000);
    expect(res.body.reservation.depositStatus).toBe('PAID');

    // Auto-created CRM GuestProfile check
    expect(res.body.guestProfile).toBeDefined();
    expect(res.body.guestProfile.vipTier).toBe('PLATINUM_VIP');
    expect(res.body.guestProfile.allergies).toContain('PEANUTS_TREENUTS');

    reservationAId = res.body.reservation._id;
  });

  // TEST 2
  it('2. POST /api/v1/dining-reservations: Create Regular booking with no allergens', async () => {
    const startTime = Date.now();

    const payload = {
      customerName: 'Priya Sharma',
      customerPhone: '9822233344',
      customerEmail: 'priya@techcorp.in',
      partySize: 2,
      reservationDate: new Date().toISOString(),
      timeSlot: '13:00',
      mealPeriod: 'LUNCH',
      tableTypePreference: 'WINDOW_VIEW',
      vipTier: 'REGULAR',
      allergens: [],
      specialOccasion: 'NONE',
    };

    const res = await request(app)
      .post('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .send(payload);

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] POST Regular Reservation Latency: ${latency}ms`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation.vipTier).toBe('REGULAR');
    expect(res.body.reservation.allergens.length).toBe(0);

    reservationBId = res.body.reservation._id;
  });

  // TEST 3
  it('3. GET /api/v1/dining-reservations: Retrieve reservations with CRM KPI aggregates', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId);

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] GET Reservations Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reservations.length).toBe(2);

    // Verify KPI aggregates
    expect(res.body.metrics.totalReservationsCount).toBe(2);
    expect(res.body.metrics.confirmedCount).toBe(2);
    expect(res.body.metrics.seatedCount).toBe(0);
    expect(res.body.metrics.vipCount).toBe(1);
    expect(res.body.metrics.allergenAlertsCount).toBe(1);
  });

  // TEST 4
  it('4. GET /api/v1/dining-reservations: Filter by Meal Period and Allergen Alert', async () => {
    // Filter by Dinner
    const dinnerRes = await request(app)
      .get('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .query({ mealPeriod: 'DINNER' });

    expect(dinnerRes.status).toBe(200);
    expect(dinnerRes.body.reservations.length).toBe(1);
    expect(dinnerRes.body.reservations[0].customerName).toBe('Aditya Birla');

    // Filter by Allergen PEANUTS_TREENUTS
    const allergenRes = await request(app)
      .get('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .query({ allergen: 'PEANUTS_TREENUTS' });

    expect(allergenRes.status).toBe(200);
    expect(allergenRes.body.reservations.length).toBe(1);
    expect(allergenRes.body.reservations[0].allergens).toContain('PEANUTS_TREENUTS');
  });

  // TEST 5
  it('5. PATCH /api/v1/dining-reservations/:reservationId/seat: Seat party and assign physical table', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .patch(`/api/v1/dining-reservations/${reservationAId}/seat`)
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ tableId: tableAId });

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] PATCH Seat Reservation Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation.status).toBe(ReservationStatus.SEATED);
    expect(res.body.reservation.seatedAt).toBeDefined();

    // Verify dining table status transitioned to OCCUPIED
    const table = await DiningTable.findById(tableAId);
    expect(table?.currentStatus).toBe(TableStatus.OCCUPIED);
  });

  // TEST 6
  it('6. PATCH /api/v1/dining-reservations/:reservationId/status: Mark reservation as NO_SHOW or CANCELLED', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .patch(`/api/v1/dining-reservations/${reservationBId}/status`)
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ status: ReservationStatus.NO_SHOW, cancellationReason: 'Guest did not arrive after 20-min grace' });

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] PATCH Status Update Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation.status).toBe(ReservationStatus.NO_SHOW);
  });

  // TEST 7
  it('7. GET /api/v1/dining-reservations/guest-profile: Retrieve VIP guest profile with medical allergy history', async () => {
    const startTime = Date.now();

    const res = await request(app)
      .get('/api/v1/dining-reservations/guest-profile')
      .set('Authorization', `Bearer ${maitreDToken}`)
      .set('x-hotel-id', tenantAId)
      .query({ phone: vipGuestPhone });

    const latency = Date.now() - startTime;
    console.log(`[Gate 30 Deep Network Test] GET Guest Dietary Profile Latency: ${latency}ms`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.name).toBe('Aditya Birla');
    expect(res.body.profile.vipTier).toBe('PLATINUM_VIP');
    expect(res.body.profile.allergies).toContain('PEANUTS_TREENUTS');
    expect(res.body.profile.allergies).toContain('GLUTEN');
    expect(res.body.pastReservations.length).toBeGreaterThan(0);
  });

  // TEST 8
  it('8. Strict Multi-Tenant Isolation: Competitor cannot view or alter Tenant A bookings', async () => {
    // Competitor attempts to view Tenant A's reservations
    const getRes = await request(app)
      .get('/api/v1/dining-reservations')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.reservations.length).toBe(0);
    expect(getRes.body.metrics.totalReservationsCount).toBe(0);

    // Competitor attempts to seat Tenant A's reservation
    const seatRes = await request(app)
      .patch(`/api/v1/dining-reservations/${reservationAId}/seat`)
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId)
      .send({ tableId: tableAId });

    expect(seatRes.status).toBe(404);
    expect(seatRes.body.success).toBe(false);
    expect(seatRes.body.errorCode).toBe('RESERVATION_NOT_FOUND');

    // Competitor attempts to view Tenant A's guest profile
    const profileRes = await request(app)
      .get('/api/v1/dining-reservations/guest-profile')
      .set('Authorization', `Bearer ${competitorToken}`)
      .set('x-hotel-id', tenantBId)
      .query({ phone: vipGuestPhone });

    expect(profileRes.status).toBe(404);
    expect(profileRes.body.success).toBe(false);
    expect(profileRes.body.errorCode).toBe('PROFILE_NOT_FOUND');
  });
});
