import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { ServiceRequest } from '../models/ServiceRequest';
import { User } from '../models/User';
import { UserRole } from '../types';

describe('Gate #61: 1-Tap Express Digital Departure, Atomic Master Folio Settlement & Housekeeping Turnaround', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let roomTypeA: any;
  let room102: any;
  let activeStayId: string = '';
  let activeFolioId: string = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant A
    let tenantA = await Tenant.findOne({ slug: 'taj-gateway' });
    if (!tenantA) {
      tenantA = await Tenant.create({
        name: 'Hotel Taj Gateway & Luxury Dining',
        slug: 'taj-gateway',
        contactEmail: 'reception@tajgateway.in',
        contactPhone: '9876543210',
        currency: 'INR',
      });
    }
    hotelIdA = tenantA._id as Types.ObjectId;

    // Setup Tenant B
    let tenantB = await Tenant.create({
      name: 'Grand Palace Luxury Resort',
      slug: `grand-palace-61-${Date.now()}`,
      contactEmail: `admin-61-${Date.now()}@grandpalace.in`,
      contactPhone: '9811122233',
      currency: 'INR',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    // Users & JWT Tokens
    const userA = await User.create({
      hotelId: hotelIdA,
      name: 'Sunita Sharma (Front Desk)',
      email: `sunita-61-${Date.now()}@tajgateway.com`,
      phone: '9822233344',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK', 'ROOM_CHECKIN'],
    });

    const userB = await User.create({
      hotelId: hotelIdB,
      name: 'Karan Mehra (Front Desk)',
      email: `karan-61-${Date.now()}@grandpalace.com`,
      phone: '9844455566',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK'],
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    tokenA = jwt.sign(
      { userId: userA._id.toString(), hotelId: hotelIdA.toString(), role: userA.role, permissions: userA.permissions },
      secret,
      { expiresIn: '8h' }
    );
    tokenB = jwt.sign(
      { userId: userB._id.toString(), hotelId: hotelIdB.toString(), role: userB.role, permissions: userB.permissions },
      secret,
      { expiresIn: '8h' }
    );

    // Room Type & Room 102 for Tenant A
    roomTypeA = await RoomType.findOne({ hotelId: hotelIdA });
    if (!roomTypeA) {
      roomTypeA = await RoomType.create({
        hotelId: hotelIdA,
        name: 'Royal Heritage Deluxe Villa',
        code: 'DLX-61',
        slug: `dlx-61-${Date.now()}`,
        basePriceOvernight: 3900,
        maxOccupancyAdults: 2,
      });
    }

    room102 = await Room.findOne({ hotelId: hotelIdA, roomNumber: '102' });
    if (!room102) {
      room102 = await Room.create({
        hotelId: hotelIdA,
        roomNumber: '102',
        floorNumber: 1,
        roomTypeId: roomTypeA._id,
        permanentQrCodeHash: 'room-102-hash-gate61',
        status: RoomStatus.AVAILABLE,
      });
    } else {
      room102.status = RoomStatus.AVAILABLE;
      await room102.save();
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('1. Check-In Room 102 with Couple Aadhaar and seed Room Rent into Folio', async () => {
    // Clean up any stale active stay for Room 102
    await Stay.deleteMany({ hotelId: hotelIdA, roomId: room102._id });
    await MasterFolio.deleteMany({ hotelId: hotelIdA, roomId: room102._id });

    const checkinRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomId: room102._id.toString(),
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9821098765',
        guestEmail: 'vikram.singhania@heritage.in',
        guestCountAdults: 2,
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '9988-7766-5544',
        verifiedByReceptionist: true,
        advancePaid: 3000,
      });

    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.success).toBe(true);
    expect(checkinRes.body.data.room.status).toBe('OCCUPIED');
    expect(checkinRes.body.data.stay.isCouple).toBe(true);
    expect(checkinRes.body.data.stay.idNumberMasked).toContain('5544');
    expect(checkinRes.body.data.folio.advanceCredited).toBe(3000);

    activeStayId = checkinRes.body.data.stay._id.toString();
    activeFolioId = checkinRes.body.data.folio.id.toString();
  });

  it('2. Post In-Room Dining and Billable Laundry to Master Folio', async () => {
    // 1. Post Express Laundry (₹350 + 5% GST = ₹368)
    const laundryRes = await request(app)
      .post('/api/v1/pms/frontdesk/concierge-request')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomNumber: '102',
        requestType: 'LAUNDRY',
        notes: '5 business shirts dry clean & press',
        isBillable: true,
        billableAmount: 350,
      });

    expect(laundryRes.status).toBe(201);
    expect(laundryRes.body.success).toBe(true);
    expect(laundryRes.body.data.request.billableAmount).toBe(350);

    // 2. Post In-Room Dining (₹420 + 5% GST = ₹441)
    const diningRes = await request(app)
      .post('/api/v1/pms/frontdesk/inroom-order')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomNumber: '102',
        items: [
          { dishId: 'dish-paneer-1', name: 'Paneer Tikka Angara', quantity: 1, price: 300 },
          { dishId: 'dish-naan-1', name: 'Butter Garlic Naan', quantity: 2, price: 60 },
        ],
        cookingInstructions: 'Chef spice recommendation, hot & crisp',
      });

    expect(diningRes.status).toBe(201);
    expect(diningRes.body.success).toBe(true);
    expect(diningRes.body.data.folio.totalFoodAndBeverage).toBe(420);
  });

  it('3. Guest Submits 1-Tap Express Departure Request via Room Portal (:3004/?room=102)', async () => {
    const expressRes = await request(app)
      .post('/api/v1/pms/frontdesk/express-checkout-request')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomNumber: '102',
        notes: 'Luggage assistance requested at 11:00 AM; flight at 2:00 PM',
        paymentMethodPreference: 'UPI',
        feedbackRating: 5,
        feedbackComment: 'Extraordinary luxury stay, impeccable service and cuisine!',
      });

    expect(expressRes.status).toBe(200);
    expect(expressRes.body.success).toBe(true);
    expect(expressRes.body.data.roomNumber).toBe('102');
    expect(expressRes.body.data.preferredPaymentMethod).toBe('UPI');
    expect(expressRes.body.data.feedbackRating).toBe(5);

    // Verify stay record in DB has checkoutRequested flagged
    const stay = await Stay.findById(activeStayId);
    expect(stay?.checkoutRequested).toBe(true);
    expect(stay?.checkoutFeedbackRating).toBe(5);
    expect(stay?.checkoutRequestedNotes).toContain('Luggage assistance');
  });

  it('4. Front Desk Fetches Consolidated Checkout Preview Statement by Room Number', async () => {
    const previewRes = await request(app)
      .get('/api/v1/pms/frontdesk/checkout-preview/102')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .query({ hotelId: hotelIdA.toString() });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    expect(previewRes.body.data.room.roomNumber).toBe('102');
    expect(previewRes.body.data.stay.guestName).toContain('Vikramaditya');
    expect(previewRes.body.data.stay.checkoutRequested).toBe(true);
    expect(previewRes.body.data.folio.totalRoomTariff).toBeGreaterThan(0);
    expect(previewRes.body.data.folio.totalLaundry).toBe(350);
    expect(previewRes.body.data.folio.totalFoodAndBeverage).toBe(420);
    expect(previewRes.body.data.folio.advancePaid).toBe(3000);
    expect(previewRes.body.data.folio.dueAmount).toBeGreaterThan(0);
    expect(previewRes.body.data.folio.lineItems.length).toBeGreaterThanOrEqual(3);
  });

  it('5. Settle Master Folio & Complete Room Departure (Atomic Settle, Void Keycard & Dirty Room Trigger)', async () => {
    const settleRes = await request(app)
      .post('/api/v1/pms/frontdesk/settle-and-checkout')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomNumber: '102',
        paymentMode: 'UPI',
        transactionRef: 'UPI-GATEWAY-REF-884201',
        keyCardVoided: true,
        notes: 'Full balance settled via PhonePe UPI. Keycard returned.',
      });

    expect(settleRes.status).toBe(200);
    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.data.invoiceNumber).toMatch(/^INV-\d{4}-102-\d+$/);
    expect(settleRes.body.data.balanceDue).toBe(0);
    expect(settleRes.body.data.roomStatus).toBe(RoomStatus.DIRTY);
    expect(settleRes.body.data.housekeepingTaskId).toBeDefined();

    // Verify DB MasterFolio is SETTLED with zero due
    const folio = await MasterFolio.findById(activeFolioId);
    expect(folio?.folioStatus).toBe('SETTLED');
    expect(folio?.dueAmount).toBe(0);
    expect(folio?.paidAmount).toBe(folio?.netAmountPayable);
    expect(folio?.settledAt).toBeDefined();

    // Verify DB Stay is CHECKED_OUT with taxInvoiceNumber
    const stay = await Stay.findById(activeStayId);
    expect(stay?.stayStatus).toBe(StayStatus.CHECKED_OUT);
    expect(stay?.actualCheckOutTimestamp).toBeDefined();
    expect(stay?.taxInvoiceNumber).toBe(settleRes.body.data.invoiceNumber);
    expect(stay?.keyCardVoided).toBe(true);

    // Verify Room 102 transitioned to DIRTY
    const room = await Room.findById(room102._id);
    expect(room?.status).toBe(RoomStatus.DIRTY);

    // Verify HousekeepingTask created in queue
    const hkTask = await HousekeepingTask.findById(settleRes.body.data.housekeepingTaskId);
    expect(hkTask?.taskType).toBe(HousekeepingTaskType.CHECKOUT_CLEAN);
    expect(hkTask?.status).toBe(HousekeepingTaskStatus.PENDING);
    expect(hkTask?.priority).toBe('HIGH');
  });

  it('6. Double Settlement Protection: Re-attempting checkout on settled stay fails cleanly', async () => {
    const doubleRes = await request(app)
      .post('/api/v1/pms/frontdesk/settle-and-checkout')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        hotelId: hotelIdA.toString(),
        roomNumber: '102',
        paymentMode: 'CASH',
      });

    // Room is already DIRTY and stay is CHECKED_OUT (no active stay)
    expect(doubleRes.status).toBe(404);
    expect(doubleRes.body.success).toBe(false);
    expect(doubleRes.body.errorCode).toBe('STAY_NOT_FOUND');
  });

  it('7. Negative & Multi-Tenant Isolation: Tenant B cannot access or settle Tenant A checkout', async () => {
    // Tenant B attempts to preview Tenant A's Room 102
    const isolatedPreview = await request(app)
      .get('/api/v1/pms/frontdesk/checkout-preview/102')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString())
      .query({ hotelId: hotelIdB.toString() });

    expect(isolatedPreview.status).toBe(404);
    expect(isolatedPreview.body.success).toBe(false);

    // Tenant B attempts to express checkout Tenant A's Room 102
    const isolatedExpress = await request(app)
      .post('/api/v1/pms/frontdesk/express-checkout-request')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString())
      .send({
        hotelId: hotelIdB.toString(),
        roomNumber: '102',
      });

    expect(isolatedExpress.status).toBe(404);
    expect(isolatedExpress.body.success).toBe(false);
  });
});
