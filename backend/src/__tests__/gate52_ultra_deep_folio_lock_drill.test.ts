import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { UserRole, ShiftStatus, RoomStatus } from '@spicehub/shared-types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem } from '../models/FolioLineItem';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

describe('--- SHIFT 52 ULTRA-DEEP CONCURRENCY DRILL: FOLIO LOCK & CHARGE SWEEP RACE CONDITIONS ---', () => {
  let tenantId: string;
  let testServerUrl: string;
  let receptionistToken: string;

  let roomType: any;
  let room: any;
  let stay: any;
  let folio: any;
  let menuItem: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }
    const addr = server.address() as any;
    testServerUrl = `http://localhost:${addr.port}`;

    const tenant = await Tenant.create({
      name: 'SpiceHub Ultra Concurrency Palace',
      slug: `ultra-sweep-${Date.now()}`,
      contactEmail: `admin.ultra.${Date.now()}@spicehub.com`,
      contactPhone: '9855566677',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const user = await User.create({
      hotelId: tenant._id,
      name: 'Deep Concurrency Guard',
      email: `guard.${Date.now()}@spicehub.com`,
      phone: '9855500001',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    receptionistToken = jwt.sign(
      {
        userId: user._id.toString(),
        hotelId: tenantId,
        role: user.role,
        email: user.email,
        permissions: ['PMS_FRONT_DESK'],
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Presidential Penthouse',
      code: 'PPH',
      basePriceOvernight: 15000,
      isActive: true,
    });

    room = await Room.create({
      hotelId: tenant._id,
      roomNumber: '501',
      roomTypeId: roomType._id,
      floorNumber: 5,
      status: RoomStatus.OCCUPIED,
      keyCardNumber: 'RFID-501-ULTRA',
      permanentQrCodeHash: `hash_qr_501_${Date.now()}`,
    });

    const booking = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: `BK-DRILL-${Date.now()}`,
      guestName: 'Aditya Birla Group',
      guestPhone: '9822299900',
      guestEmail: 'aditya@birla.com',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 24 * 3600 * 1000),
      roomTypeId: roomType._id,
      allocatedRoomId: room._id,
      totalTariff: 15000,
      taxAmount: 1800,
      grandTotal: 16800,
      advancePaymentAmount: 16800,
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    stay = await Stay.create({
      hotelId: tenant._id,
      bookingId: booking._id,
      roomId: room._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 24 * 3600 * 1000),
      stayStatus: StayStatus.ACTIVE,
    });

    folio = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: stay._id,
      bookingId: booking._id,
      roomId: room._id,
      folioNumber: `FOLIO-501-ULTRA`,
      totalRoomTariff: 15000,
      advancePaid: 16800,
      netAmountPayable: 16800,
      paidAmount: 16800,
      dueAmount: 0,
      folioStatus: 'OPEN',
    });

    stay.masterFolioId = folio._id;
    await stay.save();

    room.currentStayId = stay._id;
    await room.save();

    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'Grill Station',
      screenToken: `drill_token_${Date.now()}`,
      isOnline: true,
    });

    const category = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Steaks & Grills',
      slug: `steaks-grills-${Date.now()}`,
      isActive: true,
    });

    menuItem = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Paneer Tikka Platter',
      basePrice: 600,
      isAvailable: true,
      foodType: FoodType.VEG,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: tenantId });
    await User.deleteMany({ hotelId: tenantId });
    await RoomType.deleteMany({ hotelId: tenantId });
    await Room.deleteMany({ hotelId: tenantId });
    await Booking.deleteMany({ hotelId: tenantId });
    await Stay.deleteMany({ hotelId: tenantId });
    await MasterFolio.deleteMany({ hotelId: tenantId });
    await FolioLineItem.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await MenuCategory.deleteMany({ hotelId: tenantId });
    await KitchenStation.deleteMany({ hotelId: tenantId });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
  });

  // DRILL 1: Concurrent Folio Lock Storm (10 parallel lock requests)
  test('DRILL 1: 10 parallel lock requests achieve atomic CAS state without corrupting folio status', async () => {
    const lockPromises = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v1/pms/folios/lock')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          folioId: folio._id.toString(),
          reason: `Concurrent Lock Attempt #${i + 1}`,
        })
    );

    const results = await Promise.all(lockPromises);
    const statuses = results.map((r) => r.status);

    // All 10 requests must return 200 (either the winner or idempotent confirmations)
    expect(statuses.every((s) => s === 200)).toBe(true);

    const dbFolio = await MasterFolio.findById(folio._id);
    expect(dbFolio?.folioStatus).toBe('LOCKED');
    expect(dbFolio?.lockedAt).toBeDefined();
  });

  // DRILL 2: 10 Concurrent Room Service Orders against Locked Folio
  test('DRILL 2: 10 concurrent room service orders during active Folio Lock are 100% REJECTED (Zero Charge Slippage)', async () => {
    const orderPromises = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v1/guest-portal/orders/place')
        .set('x-idempotency-key', `storm_order_${Date.now()}_${i}`)
        .send({
          hotelId: tenantId,
          stayId: stay._id.toString(),
          roomId: room._id.toString(),
          items: [{ menuItemId: menuItem._id.toString(), quantity: 1 }],
          chargeToRoom: true,
        })
    );

    const results = await Promise.all(orderPromises);
    const errorCodes = results.map((r) => r.body.errorCode);

    // 100% must be rejected with FOLIO_LOCKED_CHECKOUT_IN_PROGRESS
    expect(errorCodes.every((c) => c === 'FOLIO_LOCKED_CHECKOUT_IN_PROGRESS')).toBe(true);

    // Verify MasterFolio due balance remains 0
    const dbFolio = await MasterFolio.findById(folio._id);
    expect(dbFolio?.dueAmount).toBe(0);
    expect(dbFolio?.totalFoodAndBeverage).toBe(0);
  });

  // DRILL 3: 10 Concurrent Charge Sweep Requests against 1 unbilled order
  test('DRILL 3: 10 simultaneous sweep requests sweep the order exactly ONCE without duplicate line items or charges', async () => {
    // Create single unbilled order (₹600 + 5% = ₹630)
    const testOrder = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantId),
      orderNumber: `ORD-CONCUR-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      roomId: room._id,
      stayId: stay._id,
      folioId: folio._id,
      items: [
        {
          menuItemId: menuItem._id,
          kitchenStationId: menuItem.kitchenStationId,
          name: menuItem.name,
          unitPrice: 600,
          quantity: 1,
          subtotal: 600,
          itemStatus: 'SERVED',
        },
      ],
      orderStatus: OverallOrderStatus.SERVED,
      isBilled: false,
      isSweptToFolio: false,
      idempotencyKey: `drill_unbilled_${Date.now()}`,
    });

    const sweepPromises = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/v1/pms/folios/sweep-charges')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          stayId: stay._id.toString(),
        })
    );

    const sweepResults = await Promise.all(sweepPromises);
    expect(sweepResults.every((r) => r.status === 200)).toBe(true);

    // Verify FolioLineItem created only once
    const lineItems = await FolioLineItem.find({
      folioId: folio._id,
      referenceId: testOrder._id,
    });
    expect(lineItems.length).toBe(1);

    // Verify dueAmount increased by exactly 630 once (not 10 times)
    const dbFolio = await MasterFolio.findById(folio._id);
    expect(dbFolio?.totalFoodAndBeverage).toBe(600);
    expect(dbFolio?.dueAmount).toBe(630);
  });

  // DRILL 4: Settled Folio Immutability Guard
  test('DRILL 4: Settled folio cannot be locked, unlocked, or swept (409 Conflict)', async () => {
    // Settle folio
    folio.folioStatus = 'SETTLED';
    folio.dueAmount = 0;
    folio.settledAt = new Date();
    await folio.save();

    const lockRes = await request(app)
      .post('/api/v1/pms/folios/lock')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-tenant-id', tenantId)
      .send({ folioId: folio._id.toString() });

    expect(lockRes.status).toBe(409);
    expect(lockRes.body.errorCode).toBe('FOLIO_ALREADY_SETTLED');

    const unlockRes = await request(app)
      .post('/api/v1/pms/folios/unlock')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-tenant-id', tenantId)
      .send({ folioId: folio._id.toString() });

    expect(unlockRes.status).toBe(409);
    expect(unlockRes.body.errorCode).toBe('FOLIO_ALREADY_SETTLED');

    const sweepRes = await request(app)
      .post('/api/v1/pms/folios/sweep-charges')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-tenant-id', tenantId)
      .send({ folioId: folio._id.toString() });

    expect(sweepRes.status).toBe(409);
    expect(sweepRes.body.errorCode).toBe('FOLIO_ALREADY_SETTLED');
  });
});
