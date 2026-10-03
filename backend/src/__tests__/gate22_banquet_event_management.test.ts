import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import {
  BanquetBooking,
  BanquetBookingStatus,
  BanquetTimeSlot,
  BanquetEventType,
  SeatingLayoutType,
} from '../models/BanquetBooking';
import { UserRole } from '../types';

describe('--- SHIFT 22 / GATE 22: BANQUET & EVENT MANAGEMENT (HALL/LAWN BOOKING, FUNCTION PROSPECTUS - FP & EVENT FOLIO) ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let managerToken: string;
  let rivalToken: string;
  let bookingAId: string;
  let bookingBId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant A (Grand ITC Kohinoor)
    const tenantA = await Tenant.create({
      name: 'Grand ITC Kohinoor & Convention Center',
      slug: `itc-kohinoor-${Date.now()}`,
      contactEmail: `kohinoor_${Date.now()}@spicehub.com`,
      contactPhone: '9811100001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Banquets',
      slug: `imperial-${Date.now()}`,
      contactEmail: `imperial_${Date.now()}@spicehub.com`,
      contactPhone: '9811100002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Manager User for Tenant A
    const manager = await User.create({
      hotelId: tenantA._id,
      name: 'Banquet Director Kabir Oberoi',
      email: `kabir_${Date.now()}@kohinoor.com`,
      phone: '9811100003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    // 4. Create User for Tenant B
    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Banquet Head',
      email: `rival_${Date.now()}@imperial.com`,
      phone: '9811100004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_key_12345';
    managerToken = jwt.sign(
      { id: manager._id.toString(), email: manager.email, role: manager.role, hotelId: tenantAId },
      jwtSecret,
      { expiresIn: '24h' }
    );

    rivalToken = jwt.sign(
      { id: rivalUser._id.toString(), email: rivalUser.email, role: rivalUser.role, hotelId: tenantBId },
      jwtSecret,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await BanquetBooking.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Authoritative Banquet Contract Creation with 18% GST & Event Master Folio', async () => {
    const res = await request(app)
      .post('/api/v1/banquets')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        eventName: 'Singhania-Kapoor Grand Wedding Reception',
        eventType: BanquetEventType.WEDDING_RECEPTION,
        venueName: 'Royal Kohinoor Ballroom',
        eventDate: '2026-12-15',
        timeSlot: BanquetTimeSlot.EVENING,
        guaranteedPax: 250,
        expectedPax: 300,
        pricingType: 'PER_PLATE',
        perPlateRate: 1400,
        hallRentAmount: 80000,
        decorAndAudioVisualAmount: 40000,
        advanceDepositPaid: 100000,
        organizerName: 'Jaideep Singhania',
        organizerPhone: '9819900111',
        organizerEmail: 'jaideep@singhania.example.com',
        companyName: 'Singhania Industries',
        companyGst: '27AAACS9988Z1Z2',
        functionProspectus: {
          seatingLayout: SeatingLayoutType.ROUND_TABLE_CLUSTERS,
          stageDimensions: '32ft x 18ft x 2.5ft',
          hasAudioVisual: true,
          audioVisualNotes: 'Dual 4K LED Walls + Line Array JBL + DJ Setup',
          foodServiceStartTime: '19:30',
          foodServiceEndTime: '23:30',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    bookingAId = res.body.booking._id;

    // Financial verification:
    // Catering = 250 * 1400 = 350,000
    // Subtotal = 350,000 + 80,000 + 40,000 = 470,000
    // 18% GST = 84,600
    // Grand Total = 554,600. Due after 100,000 advance = 454,600
    expect(res.body.booking.cateringSubtotal).toBe(350000);
    expect(res.body.booking.taxes).toBe(84600);
    expect(res.body.booking.totalEstimatedAmount).toBe(554600);
    expect(res.body.booking.advanceDepositPaid).toBe(100000);
    expect(res.body.booking.dueAmount).toBe(454600);
    expect(res.body.booking.status).toBe(BanquetBookingStatus.CONFIRMED);

    // Master Folio verification
    expect(res.body.masterFolio).toBeDefined();
    expect(res.body.masterFolio.folioNumber).toMatch(/^MF-BNQ-\d+/);
    expect(res.body.masterFolio.dueAmount).toBe(454600);
  });

  // TEST 2
  it('2. Guard: Prevent Venue Double-Booking Conflict for Same Date & Time Slot', async () => {
    const res = await request(app)
      .post('/api/v1/banquets')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        eventName: 'Conflicting Corporate Gala',
        eventType: BanquetEventType.CORPORATE_CONFERENCE,
        venueName: 'Royal Kohinoor Ballroom', // Same Venue!
        eventDate: '2026-12-15',               // Same Date!
        timeSlot: BanquetTimeSlot.EVENING,      // Same Evening Slot!
        guaranteedPax: 150,
        perPlateRate: 1200,
        organizerName: 'Rohan Verma',
        organizerPhone: '9819900222',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('VENUE_SLOT_CONFLICT');
  });

  // TEST 3
  it('3. Allow Same Venue on Same Date for a Different Time Slot (Morning Slot)', async () => {
    const res = await request(app)
      .post('/api/v1/banquets')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        eventName: 'Morning Medical Doctors Seminar',
        eventType: BanquetEventType.EXHIBITION_SEMINAR,
        venueName: 'Royal Kohinoor Ballroom', // Same Venue
        eventDate: '2026-12-15',               // Same Date
        timeSlot: BanquetTimeSlot.MORNING,      // Morning Slot (Allowed!)
        guaranteedPax: 100,
        perPlateRate: 850,
        hallRentAmount: 40000,
        decorAndAudioVisualAmount: 15000,
        advanceDepositPaid: 20000,
        organizerName: 'Dr. Ramesh Kulkarni',
        organizerPhone: '9819900333',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    bookingBId = res.body.booking._id;
  });

  // TEST 4
  it('4. Query Banquet Dashboard KPIs & Contract Registers', async () => {
    const res = await request(app)
      .get('/api/v1/banquets/dashboard')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.totalEvents).toBe(2);
    expect(res.body.metrics.totalPaxExpected).toBe(350); // 250 + 100
    expect(res.body.metrics.totalRevenueContracted).toBeGreaterThan(600000);
    expect(res.body.upcomingEvents).toHaveLength(2);
  });

  // TEST 5
  it('5. Function Prospectus (FP - BEO) Update & Multi-Department Sign-Offs', async () => {
    const res = await request(app)
      .patch(`/api/v1/banquets/${bookingAId}/prospectus`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        seatingLayout: SeatingLayoutType.THEATER,
        welcomeDrinksTiming: '18:45',
        starterCirculationTiming: '19:15 – 21:00',
        mainBuffetOpenTiming: '21:00',
        specialDietaryRequirements: 'Separate Jain Counter for 50 Pax + Gluten Free Desserts',
        chefSignOff: true,
        banquetManagerSignOff: true,
        electricianAvSignOff: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.functionProspectus.seatingLayout).toBe(SeatingLayoutType.THEATER);
    expect(res.body.functionProspectus.chefSignOff).toBe(true);
    expect(res.body.functionProspectus.banquetManagerSignOff).toBe(true);
    expect(res.body.functionProspectus.electricianAvSignOff).toBe(true);
  });

  // TEST 6
  it('6. Post Extra Pax & Champagne Line Item to Event Master Folio', async () => {
    // 30 extra pax plates = 30 * 1400 = 42,000 + 18% GST (7,560) = 49,560
    const res = await request(app)
      .post(`/api/v1/banquets/${bookingAId}/extra-charge`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        department: DepartmentType.PAID_AMENITY,
        description: 'Additional 30 Pax Dinner Plates beyond Guaranteed',
        rate: 1400,
        quantity: 30,
        taxRate: 0.18,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.netAmount).toBe(49560);

    // Initial due was 454,600 + 49,560 = 504,160
    expect(res.body.totalDue).toBe(504160);

    // Verify Master Folio updated
    const booking = await BanquetBooking.findById(bookingAId);
    const folio = await MasterFolio.findById(booking?.masterFolioId);
    expect(folio?.dueAmount).toBe(504160);
  });

  // TEST 7
  it('7. Financial Settlement: Settle Event Master Folio Due Balance', async () => {
    const res = await request(app)
      .post(`/api/v1/banquets/${bookingAId}/settle`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        amount: 504160,
        paymentMethod: 'BANK_TRANSFER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.remainingDue).toBe(0);

    const booking = await BanquetBooking.findById(bookingAId);
    expect(booking?.dueAmount).toBe(0);

    const folio = await MasterFolio.findById(booking?.masterFolioId);
    expect(folio?.folioStatus).toBe('SETTLED');
  });

  // TEST 8
  it('8. Complete Banquet Event & Release Ballroom Venue', async () => {
    const res = await request(app)
      .post(`/api/v1/banquets/${bookingAId}/complete`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bookingStatus).toBe(BanquetBookingStatus.COMPLETED);

    const booking = await BanquetBooking.findById(bookingAId);
    expect(booking?.status).toBe(BanquetBookingStatus.COMPLETED);
  });

  // TEST 9
  it('9. Strict Multi-Tenant Boundary: Reject Cross-Tenant Access to Banquet Contracts', async () => {
    const res = await request(app)
      .get(`/api/v1/banquets/${bookingAId}`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('EVENT_NOT_FOUND');
  });
});
