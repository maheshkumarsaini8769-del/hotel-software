import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { Booking, BookingStatus } from '../models/Booking';
import { GuestProfile, VIPTier } from '../models/GuestProfile';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../models/HousekeepingTask';
import { UserRole } from '../types';

describe('Gate #65: Early Check-In & Late Check-Out Automated Tiered Surcharge Pipeline & Keycard Sync', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let deluxeTypeA: any;
  let room102: any;
  let room103: any;
  let platinumGuest: any;
  let activeStay102: any;
  let masterFolio102: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Heritage Grand Palace',
      slug: `heritage-grand-65a-${Date.now()}`,
      contactEmail: `hotel_65a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199350',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Inn',
      slug: `rival-65b-${Date.now()}`,
      contactEmail: `rival_65b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199351',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    tokenA = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdA.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );
    tokenB = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdB.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );

    // 3. Room Type
    deluxeTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Deluxe Heritage Room',
      code: 'DHR-65',
      slug: `dhr-65-${Date.now()}`,
      basePriceOvernight: 3000,
      maxOccupancyAdults: 2,
    });

    // 4. Physical Rooms
    room102 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '102',
      floorNumber: 1,
      wing: 'East Wing',
      roomTypeId: deluxeTypeA._id,
      permanentQrCodeHash: `room-102-hash-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });

    room103 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '103',
      floorNumber: 1,
      wing: 'East Wing',
      roomTypeId: deluxeTypeA._id,
      permanentQrCodeHash: `room-103-hash-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });

    // 5. VIP Guest Profile
    platinumGuest = await GuestProfile.create({
      hotelId: hotelIdA,
      name: 'Maharaja Digvijay Singh',
      phone: '9822338899',
      email: 'digvijay@singh-estates.com',
      vipTier: VIPTier.PLATINUM,
      totalStays: 12,
      totalSpent: 185000,
      loyaltyPoints: 3400,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
    await RoomType.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await GuestProfile.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Stay.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Booking.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await HousekeepingTask.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
  });

  it('1. Calculate Early Check-In Surcharge across all hour tiers (Full Day <6am, Half Day 6-10am, Nominal 10-12pm, Complimentary >12pm)', async () => {
    // 5:00 AM Arrival -> 100% Full Day
    const res5am = await request(app)
      .post('/api/v1/pms/frontdesk/early-checkin/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expectedCheckInTime: '05:00',
        baseTariff: 3000,
      });

    expect(res5am.status).toBe(200);
    expect(res5am.body.data.tier).toBe('FULL_DAY');
    expect(res5am.body.data.percent).toBe(100);
    expect(res5am.body.data.surchargeAmount).toBe(3000);
    expect(res5am.body.data.taxAmount).toBe(360); // 12% GST
    expect(res5am.body.data.totalCharge).toBe(3360);

    // 8:00 AM Arrival -> 50% Half Day
    const res8am = await request(app)
      .post('/api/v1/pms/frontdesk/early-checkin/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expectedCheckInTime: '08:00',
        baseTariff: 3000,
      });

    expect(res8am.status).toBe(200);
    expect(res8am.body.data.tier).toBe('HALF_DAY');
    expect(res8am.body.data.percent).toBe(50);
    expect(res8am.body.data.surchargeAmount).toBe(1500);
    expect(res8am.body.data.totalCharge).toBe(1680);

    // 11:00 AM Arrival -> 25% Nominal
    const res11am = await request(app)
      .post('/api/v1/pms/frontdesk/early-checkin/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expectedCheckInTime: '11:00',
        baseTariff: 3000,
      });

    expect(res11am.status).toBe(200);
    expect(res11am.body.data.tier).toBe('NOMINAL');
    expect(res11am.body.data.surchargeAmount).toBe(750);

    // 1:00 PM (13:00) Arrival -> 0% Complimentary
    const res1pm = await request(app)
      .post('/api/v1/pms/frontdesk/early-checkin/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expectedCheckInTime: '13:00',
        baseTariff: 3000,
      });

    expect(res1pm.status).toBe(200);
    expect(res1pm.body.data.tier).toBe('COMPLIMENTARY');
    expect(res1pm.body.data.surchargeAmount).toBe(0);
    expect(res1pm.body.data.totalCharge).toBe(0);
  });

  it('2. VIP Platinum guest automated early check-in complimentary waiver from 9am onwards', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/early-checkin/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expectedCheckInTime: '09:30',
        baseTariff: 3000,
        guestId: platinumGuest._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.vipBenefitApplied).toBe(true);
    expect(res.body.data.recommendedWaiver).toBe(true);
    expect(res.body.data.surchargeAmount).toBe(0);
    expect(res.body.data.totalCharge).toBe(0);
  });

  it('3. Calculate Late Check-Out Surcharge across hour tiers (Grace <=1pm free, Half Day 1-4pm 50%, Full Day >4pm 100%)', async () => {
    // 12:30 PM Departure -> Grace period complimentary (0%)
    const res12pm = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        requestedCheckOutTime: '12:30',
        baseTariff: 3000,
      });

    expect(res12pm.status).toBe(200);
    expect(res12pm.body.data.tier).toBe('GRACE_PERIOD_COMPLIMENTARY');
    expect(res12pm.body.data.surchargeAmount).toBe(0);
    expect(res12pm.body.data.isComplimentary).toBe(true);

    // 3:00 PM (15:00) Departure -> 50% Half Day
    const res3pm = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        requestedCheckOutTime: '15:00',
        baseTariff: 3000,
      });

    expect(res3pm.status).toBe(200);
    expect(res3pm.body.data.tier).toBe('HALF_DAY');
    expect(res3pm.body.data.surchargeAmount).toBe(1500);
    expect(res3pm.body.data.taxAmount).toBe(180);
    expect(res3pm.body.data.totalCharge).toBe(1680);

    // 5:30 PM (17:30) Departure -> 100% Full Day
    const res5pm = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/calculate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        requestedCheckOutTime: '17:30',
        baseTariff: 3000,
      });

    expect(res5pm.status).toBe(200);
    expect(res5pm.body.data.tier).toBe('FULL_DAY');
    expect(res5pm.body.data.surchargeAmount).toBe(3000);
    expect(res5pm.body.data.totalCharge).toBe(3360);
  });

  it('4. Check-in active guest into Room 102 and approve Late Check-Out with automatic Folio posting', async () => {
    // Check in Room 102
    const checkinRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        roomId: room102._id.toString(),
        guestName: 'Ananya Deshmukh',
        guestPhone: '9844001122',
        email: 'ananya@deshmukh-ventures.com',
        vipTier: 'REGULAR',
        isCouple: false,
        verificationMode: 'AADHAAR',
        idNumberMasked: 'XXXX-XXXX-4411',
        initialDeposit: 1000,
        roomTariff: 3000,
        nights: 1,
      });

    expect(checkinRes.status).toBe(201);
    activeStay102 = await Stay.findById(checkinRes.body.data.stay._id);
    masterFolio102 = await MasterFolio.findById(activeStay102.masterFolioId);
    const initialDue = masterFolio102.dueAmount;

    // Approve Late Checkout until 15:00 (3:00 PM)
    const approveRes = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: activeStay102._id.toString(),
        requestedCheckOutTime: '15:00',
        waiveSurcharge: false,
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.tier).toBe('HALF_DAY');
    expect(approveRes.body.data.surchargeAmount).toBe(1500);
    expect(approveRes.body.data.taxAmount).toBe(180);
    expect(approveRes.body.data.totalCharge).toBe(1680);
    expect(approveRes.body.data.updatedFolioDue).toBe(initialDue + 1680);

    // Verify FolioLineItem was created
    const lineItem = await FolioLineItem.findOne({
      folioId: masterFolio102._id,
      department: DepartmentType.ROOM_RENT,
      description: { $regex: /Late Check-Out Surcharge/i },
    });
    expect(lineItem).toBeDefined();
    expect(lineItem?.rate).toBe(1500);
    expect(lineItem?.taxAmount).toBe(180);
    expect(lineItem?.netAmount).toBe(1680);
  });

  it('5. Digital Keycard Expiry synchronization matches approved late checkout timestamp', async () => {
    const updatedStay = await Stay.findById(activeStay102._id);
    expect(updatedStay?.keycardExpiresAt).toBeDefined();
    expect(updatedStay?.delayedDepartureTime).toBeDefined();
    const expiryHour = new Date(updatedStay!.keycardExpiresAt!).getHours();
    expect(expiryHour).toBe(15);
  });

  it('6. Managerial VIP Waiver applies zero surcharge and logs audit reason in Stay history', async () => {
    // Check in Room 103
    const checkinRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        roomId: room103._id.toString(),
        guestName: 'Karan Mehra',
        guestPhone: '9844009988',
        vipTier: 'REGULAR',
        roomTariff: 3000,
        nights: 1,
      });

    const stay103 = await Stay.findById(checkinRes.body.data.stay._id);
    const folio103Before = await MasterFolio.findById(stay103?.masterFolioId);

    // Approve Late Checkout with waiver
    const waiveRes = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: stay103?._id.toString(),
        requestedCheckOutTime: '16:00',
        waiveSurcharge: true,
        waiverReason: 'General Manager Courtesy Waiver for Airline Delay',
      });

    expect(waiveRes.status).toBe(200);
    expect(waiveRes.body.data.waived).toBe(true);
    expect(waiveRes.body.data.surchargeAmount).toBe(0);
    expect(waiveRes.body.data.totalCharge).toBe(0);
    expect(waiveRes.body.data.waiverReason).toBe('General Manager Courtesy Waiver for Airline Delay');

    // Folio due must NOT increase
    const folio103After = await MasterFolio.findById(stay103?.masterFolioId);
    expect(folio103After?.dueAmount).toBe(folio103Before?.dueAmount);
  });

  it('7. Housekeeping Turnaround Task notes are updated with delayed departure advisory', async () => {
    // Create an initial housekeeping turnaround task for Room 102
    await HousekeepingTask.create({
      hotelId: hotelIdA,
      roomId: room102._id,
      taskType: HousekeepingTaskType.CHECKOUT_CLEAN,
      priority: 'HIGH',
      status: HousekeepingTaskStatus.PENDING,
      inspectionNotes: 'Initial turnaround task',
    });

    // Re-trigger late checkout approval to check task notes update
    await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: activeStay102._id.toString(),
        requestedCheckOutTime: '15:30',
        waiveSurcharge: false,
      });

    const task = await HousekeepingTask.findOne({
      hotelId: hotelIdA,
      roomId: room102._id,
    });
    expect(task?.inspectionNotes).toContain('DELAYED DEPARTURE');
  });

  it('8. Next arrival collision detection prevents late check-out if incoming guest arrives within turnaround window without force override', async () => {
    // Create an incoming booking arriving on Room 102 on checkout day at 15:30
    const currentStay = await Stay.findById(activeStay102._id);
    const arrivalDate = new Date(currentStay?.expectedCheckOutTimestamp || Date.now());
    arrivalDate.setHours(15, 30, 0, 0);

    const incomingBooking = await Booking.create({
      hotelId: hotelIdA,
      bookingNumber: `BK-ARRIV-65-${Date.now()}`,
      guestName: 'Rohit Khandelwal',
      guestEmail: 'rohit@khandelwal.com',
      guestPhone: '9811223344',
      roomTypeId: deluxeTypeA._id,
      allocatedRoomId: room102._id,
      checkInDate: arrivalDate,
      checkOutDate: new Date(arrivalDate.getTime() + 86400000),
      totalTariff: 3000,
      taxAmount: 360,
      grandTotal: 3360,
      guestCountAdults: 2,
      advancePaymentAmount: 1000,
      bookingStatus: BookingStatus.CONFIRMED,
    });

    // Attempt late checkout to 15:00 without forceOverride -> Should 409 Conflict
    const conflictRes = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: activeStay102._id.toString(),
        requestedCheckOutTime: '15:00',
        forceOverride: false,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.errorCode).toBe('INCOMING_ARRIVAL_CONFLICT');
    expect(conflictRes.body.conflictingBookingNumber).toBe(incomingBooking.bookingNumber);

    // With forceOverride: true -> Should succeed
    const overrideRes = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        stayId: activeStay102._id.toString(),
        requestedCheckOutTime: '15:00',
        forceOverride: true,
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.success).toBe(true);
  });

  it('9. Fetch Late Check-Out Active Schedule for Front Desk Operations', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/late-checkout/schedule')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const room102Item = res.body.data.find((item: any) => item.roomNumber === '102');
    expect(room102Item).toBeDefined();
    expect(room102Item.hoursLate).toBeDefined();
    expect(room102Item.keycardExtendedTo).toBeDefined();
  });

  it('10. Multi-tenant isolation: Tenant B cannot calculate or approve late checkout for Tenant A stays', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/late-checkout/approve')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        stayId: activeStay102._id.toString(),
        requestedCheckOutTime: '16:00',
      });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('ACTIVE_STAY_NOT_FOUND');
  });
});
