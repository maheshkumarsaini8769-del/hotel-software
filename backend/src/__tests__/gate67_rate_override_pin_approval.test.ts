import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { Booking, BookingStatus } from '../models/Booking';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { UserRole } from '../types';

describe('Gate #67: Front Desk Manager Rate Override, Complimentary Tariff Waiver & Discount PIN Security Approval Matrix', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let deluxeTypeA: any;
  let room201: any;
  let stay201: any;
  let folio201: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace Luxury',
      slug: `grand-palace-67a-${Date.now()}`,
      contactEmail: `hotel_67a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199370',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Suites',
      slug: `rival-67b-${Date.now()}`,
      contactEmail: `rival_67b_${Date.now()}@spicehub.in`,
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

    // Setup Room Type & Room for Tenant A
    deluxeTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Royal Heritage Chamber',
      code: 'RHC-67',
      slug: `rhc-67-${Date.now()}`,
      basePriceOvernight: 4000,
      maxOccupancyAdults: 2,
    });

    room201 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '201',
      floorNumber: 2,
      wing: 'Royal Wing',
      roomTypeId: deluxeTypeA._id,
      permanentQrCodeHash: `room-201-qr-${Date.now()}`,
      status: RoomStatus.OCCUPIED,
    });

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const booking201 = await Booking.create({
      hotelId: hotelIdA,
      bookingNumber: `BK-67-${Date.now().toString().slice(-5)}`,
      guestName: 'Vikramaditya Singhania',
      guestPhone: '+91 9820011223',
      guestEmail: 'vikram.singhania@apextech.com',
      roomTypeId: deluxeTypeA._id,
      allocatedRoomId: room201._id,
      checkInDate: now,
      checkOutDate: tomorrow,
      totalTariff: 4000,
      taxAmount: 480,
      grandTotal: 4480,
      advancePaymentAmount: 0,
      totalAmount: 4480,
      paidAmount: 0,
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    folio201 = await MasterFolio.create({
      hotelId: hotelIdA,
      stayId: new Types.ObjectId(), // placeholder, updated below
      bookingId: booking201._id,
      roomId: room201._id,
      folioNumber: `FOL-RM201-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 4000,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 480, // 12% GST
      advancePaid: 0,
      netAmountPayable: 4480,
      paidAmount: 0,
      dueAmount: 4480,
      folioStatus: 'OPEN',
    });

    stay201 = await Stay.create({
      hotelId: hotelIdA,
      bookingId: booking201._id,
      roomId: room201._id,
      checkInTimestamp: now,
      expectedCheckOutTimestamp: tomorrow,
      stayStatus: StayStatus.ACTIVE,
      masterFolioId: folio201._id,
      baseRatePerNight: 4000,
      effectiveRatePerNight: 4000,
    });

    folio201.stayId = stay201._id;
    await folio201.save();
  });

  afterAll(async () => {
    await Stay.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Booking.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await RoomType.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  it('1. Should calculate tiered rate overrides: Agent Self (5%), Supervisor (15%), Duty Manager (35%), GM Waiver (100%)', async () => {
    // 5% Self discount
    const res5 = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 5,
      });

    expect(res5.status).toBe(200);
    expect(res5.body.success).toBe(true);
    expect(res5.body.data.newRatePerNight).toBe(3800);
    expect(res5.body.data.discountAmount).toBe(200);
    expect(res5.body.data.approvalTier).toBe('AGENT_SELF');
    expect(res5.body.data.pinRequired).toBe(false);

    // 15% Supervisor discount
    const res15 = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 15,
      });

    expect(res15.status).toBe(200);
    expect(res15.body.data.newRatePerNight).toBe(3400);
    expect(res15.body.data.discountAmount).toBe(600);
    expect(res15.body.data.approvalTier).toBe('SUPERVISOR');
    expect(res15.body.data.pinRequired).toBe(true);

    // 35% Duty Manager discount
    const res35 = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 35,
      });

    expect(res35.status).toBe(200);
    expect(res35.body.data.newRatePerNight).toBe(2600);
    expect(res35.body.data.approvalTier).toBe('DUTY_MANAGER');
    expect(res35.body.data.pinRequired).toBe(true);

    // 100% Complimentary Waiver
    const resWaiver = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'COMPLIMENTARY_WAIVER',
      });

    expect(resWaiver.status).toBe(200);
    expect(resWaiver.body.data.newRatePerNight).toBe(0);
    expect(resWaiver.body.data.discountPercent).toBe(100);
    expect(resWaiver.body.data.approvalTier).toBe('GENERAL_MANAGER');
    expect(resWaiver.body.data.pinRequired).toBe(true);
  });

  it('2. Should authorize and apply Agent Self-Discount (5%) without requiring a security PIN', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 5,
        reason: 'PROMOTIONAL_CORPORATE',
        justification: 'Corporate tie-up seasonal standard courtesy',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.effectiveRatePerNight).toBe(3800);
    expect(res.body.data.overrideRecord.approvalTier).toBe('AGENT_SELF');
    expect(res.body.data.overrideRecord.managerPinVerified).toBe(false);

    // Verify Stay in DB
    const updatedStay = await Stay.findById(stay201._id);
    expect(updatedStay?.effectiveRatePerNight).toBe(3800);
    expect(updatedStay?.rateOverrideHistory).toHaveLength(1);
  });

  it('3. Should reject high discount (> 15%) when invalid manager PIN is provided (403 INVALID_MANAGER_PIN)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 30,
        reason: 'SERVICE_RECOVERY',
        justification: 'AC cooling defective during late evening',
        managerPin: '0000', // Invalid PIN
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_MANAGER_PIN');
  });

  it('4. Should approve Duty Manager Rate Override (Fixed Tariff ₹2,500) with valid Security PIN 9921 and update Folio', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'FIXED_TARIFF',
        newFixedRate: 2500,
        reason: 'SERVICE_RECOVERY',
        justification: 'AC cooling defective; Duty Manager negotiated tariff to ₹2,500',
        managerPin: '9921', // Valid Master PIN
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.effectiveRatePerNight).toBe(2500);
    expect(res.body.data.overrideRecord.managerPinVerified).toBe(true);
    expect(res.body.data.overrideRecord.approvalTier).toBe('DUTY_MANAGER');

    // Verify Master Folio updated
    const updatedFolio = await MasterFolio.findById(folio201._id);
    expect(updatedFolio?.totalRoomTariff).toBe(2500);
    expect(updatedFolio?.totalDiscounts).toBeGreaterThanOrEqual(1500);
    expect(updatedFolio?.dueAmount).toBeLessThan(4480);
  });

  it('5. Should approve 100% Complimentary Tariff Waiver (GM Tier) and flag stay as isComplimentaryWaiver', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'COMPLIMENTARY_WAIVER',
        reason: 'DIRECTOR_COMPLIMENTARY',
        justification: 'Managing Director VIP guest full house complimentary stay',
        managerPin: '9921',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.effectiveRatePerNight).toBe(0);
    expect(res.body.data.isComplimentaryWaiver).toBe(true);
    expect(res.body.data.overrideRecord.approvalTier).toBe('GENERAL_MANAGER');

    const updatedStay = await Stay.findById(stay201._id);
    expect(updatedStay?.effectiveRatePerNight).toBe(0);
    expect(updatedStay?.isComplimentaryWaiver).toBe(true);

    const updatedFolio = await MasterFolio.findById(folio201._id);
    expect(updatedFolio?.totalRoomTariff).toBe(0);
  });

  it('6. Should reject rate override when reason or justification is missing', async () => {
    // Missing reason
    const res1 = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 5,
        justification: 'Valid justification',
      });

    expect(res1.status).toBe(400);
    expect(res1.body.errorCode).toBe('MISSING_REASON');

    // Missing justification
    const res2 = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 5,
        reason: 'OTHER',
        justification: '',
      });

    expect(res2.status).toBe(400);
    expect(res2.body.errorCode).toBe('MISSING_JUSTIFICATION');
  });

  it('7. Should waive billable incidental line item (In-Room Dining / Laundry) with Manager PIN', async () => {
    // Post an incidental line item to folio201
    const lineItem = await FolioLineItem.create({
      hotelId: hotelIdA,
      folioId: folio201._id,
      department: DepartmentType.ROOM_SERVICE,
      description: 'Midnight Club Sandwich & French Fries',
      rate: 450,
      quantity: 1,
      taxRate: 5,
      taxAmount: 22.5,
      netAmount: 472.5,
      postedAt: new Date(),
    });

    folio201.totalFoodAndBeverage = 472.5;
    folio201.netAmountPayable += 472.5;
    folio201.dueAmount += 472.5;
    await folio201.save();

    // Waive incidental with PIN
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/waive-incidental')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        folioId: folio201._id.toString(),
        lineItemId: lineItem._id.toString(),
        waiverReason: 'SERVICE_RECOVERY',
        managerPin: '9921',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.waivedAmount).toBe(472.5);

    const updatedLineItem = await FolioLineItem.findById(lineItem._id);
    expect(updatedLineItem?.netAmount).toBe(0);
    expect(updatedLineItem?.description).toContain('[COMPLIMENTARY WAIVER - SERVICE_RECOVERY]');
  });

  it('8. Should reject incidental waiver when manager PIN is incorrect (403)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/waive-incidental')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        folioId: folio201._id.toString(),
        lineItemId: new Types.ObjectId().toString(),
        waiverReason: 'SERVICE_RECOVERY',
        managerPin: 'wrong-pin',
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('INVALID_MANAGER_PIN');
  });

  it('9. Should return complete rate override audit logs with revenue impact and reason breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/rate-override/audit-log')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalOverridesApplied).toBeGreaterThanOrEqual(3);
    expect(res.body.data.summary.totalRevenueWaived).toBeGreaterThan(0);
    expect(res.body.data.summary.complimentaryStaysCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.serviceRecoveryCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(3);
  });

  it('10. Should enforce strict multi-tenant isolation: Tenant B cannot calculate or apply overrides to Tenant A stays', async () => {
    // Tenant B calculate on Tenant A stay returns 404
    const resCalcB = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/calculate')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 10,
      });

    expect(resCalcB.status).toBe(404);
    expect(resCalcB.body.errorCode).toBe('ACTIVE_STAY_NOT_FOUND');

    // Tenant B apply on Tenant A stay returns 404
    const resApplyB = await request(app)
      .post('/api/v1/pms/frontdesk/rate-override/apply')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        stayId: stay201._id.toString(),
        overrideType: 'PERCENTAGE_DISCOUNT',
        discountPercent: 10,
        reason: 'OTHER',
        justification: 'Illegal cross-tenant hack attempt',
        managerPin: '9921',
      });

    expect(resApplyB.status).toBe(404);
    expect(resApplyB.body.errorCode).toBe('ACTIVE_STAY_NOT_FOUND');
  });
});
