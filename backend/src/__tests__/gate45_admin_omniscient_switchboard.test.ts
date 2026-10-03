import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { RestaurantOrder, OrderType, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import {
  NotificationPreference,
  AlertCategory,
  NotificationChannel,
} from '../models/NotificationPreference';
import { AdminAlertEvent, AlertSeverity, AlertEventStatus } from '../models/AdminAlertEvent';

describe('--- SHIFT 45 / GATE 45: HOTEL ADMIN OMNISCIENT CONTROL & CUSTOM NOTIFICATION SWITCHBOARD ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let adminAToken: string;
  let adminBToken: string;
  let adminAUser: any;
  let testAlertId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace A',
      slug: `grand-palace-a-${Date.now()}`,
      contactEmail: `admin-a-${Date.now()}@spicehub.com`,
      contactPhone: '+91 98888 11111',
      currency: 'INR',
      status: 'ACTIVE',
      gstin: '27AABCT1234A1Z5',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Competitor Resort B',
      slug: `competitor-b-${Date.now()}`,
      contactEmail: `admin-b-${Date.now()}@spicehub.com`,
      contactPhone: '+91 98888 22222',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Admin Users
    adminAUser = await User.create({
      hotelId: tenantA._id,
      name: 'Vikramaditya (General Manager A)',
      email: `gm-a-${Date.now()}@spicehub.com`,
      phone: '+91 97777 11111',
      passwordHash: 'hashed_pw',
      role: UserRole.HOTEL_ADMIN,
      permissions: ['ALL'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    adminAToken = jwt.sign(
      { userId: adminAUser._id.toString(), role: UserRole.HOTEL_ADMIN, hotelId: tenantAId, email: adminAUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const adminBUser = await User.create({
      hotelId: tenantB._id,
      name: 'Aditya (Manager B)',
      email: `gm-b-${Date.now()}@spicehub.com`,
      phone: '+91 97777 22222',
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

    // 3. Populate Hotel A Telemetry Mock Context (Tables, Rooms, Orders, Bills, Cashier Float)
    await DiningTable.create([
      {
        hotelId: tenantA._id,
        tableNumber: 'T-01',
        section: 'AC_HALL',
        capacity: 4,
        currentStatus: TableStatus.OCCUPIED,
        isCommunityTable: false,
        allowCoDining: false,
        seats: [],
        availableSeatsCount: 0,
        occupiedSeatsCount: 4,
      },
      {
        hotelId: tenantA._id,
        tableNumber: 'T-02',
        section: 'AC_HALL',
        capacity: 2,
        currentStatus: TableStatus.AVAILABLE,
        isCommunityTable: false,
        allowCoDining: false,
        seats: [],
        availableSeatsCount: 2,
        occupiedSeatsCount: 0,
      },
      {
        hotelId: tenantA._id,
        tableNumber: 'T-03',
        section: 'ROOFTOP',
        capacity: 6,
        currentStatus: TableStatus.DIRTY,
        isCommunityTable: false,
        allowCoDining: false,
        seats: [],
        availableSeatsCount: 0,
        occupiedSeatsCount: 0,
      },
    ]);

    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Deluxe Heritage Suite',
      code: 'DHS',
      basePriceOvernight: 6500,
      maxCapacity: 2,
    });

    await Room.create([
      {
        hotelId: tenantA._id,
        roomNumber: '101',
        roomTypeId: roomType._id,
        floorNumber: 1,
        status: RoomStatus.OCCUPIED,
        permanentQrCodeHash: 'qr_room_101',
      },
      {
        hotelId: tenantA._id,
        roomNumber: '102',
        roomTypeId: roomType._id,
        floorNumber: 1,
        status: RoomStatus.AVAILABLE,
        permanentQrCodeHash: 'qr_room_102',
      },
    ]);

    // Active order with delayed SLA (> 20 mins ago)
    const delayedTime = new Date(Date.now() - 22 * 60 * 1000);
    const mockStationId = new Types.ObjectId();
    await RestaurantOrder.create({
      hotelId: tenantA._id,
      orderNumber: 'ORD-DELAY-01',
      orderType: OrderType.DINE_IN,
      tableNumber: 'T-01',
      items: [
        {
          menuItemId: new Types.ObjectId(),
          name: 'Paneer Tikka',
          quantity: 2,
          unitPrice: 350,
          subtotal: 700,
          kitchenStationId: mockStationId,
          itemStatus: 'PREPARING',
        },
      ],
      orderStatus: OverallOrderStatus.PREPARING,
      placedAt: delayedTime,
      idempotencyKey: `DELAY-ORD-${Date.now()}`,
    });

    // Today's settled bill & payment
    const bill = await RestaurantBill.create({
      hotelId: tenantA._id,
      billNumber: `BL-ADM-${Date.now()}`,
      orderIds: [new Types.ObjectId()],
      subTotal: 3000,
      taxBreakup: [],
      totalTax: 150,
      discountAmount: 0,
      grandTotal: 3150,
      paidAmount: 3150,
      dueAmount: 0,
      billStatus: BillStatus.PAID,
    });

    await Payment.create({
      hotelId: tenantA._id,
      billId: bill._id,
      paymentMode: PaymentMode.UPI,
      amount: 3150,
      currency: 'INR',
      status: PaymentStatus.SUCCESS,
      idempotencyKey: `PAY-ADM-${Date.now()}`,
    });

    // Active Cashier Float
    await CashierShiftFloat.create({
      hotelId: tenantA._id,
      shiftNumber: `SHIFT-ADM-${Date.now()}`,
      cashierId: adminAUser._id,
      cashierName: 'Main Cashier',
      terminalId: 'POS_MAIN',
      status: CashierShiftStatus.OPEN,
      openingFloat: 10000,
      totalCashCollected: 2500,
      totalUpiCollected: 3150,
      totalCardCollected: 0,
      totalChangeReturned: 500,
      expectedCashInDrawer: 12000,
      settlementCount: 3,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Room.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Payment.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await NotificationPreference.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await AdminAlertEvent.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  it('1. GET /api/v1/admin-control/telemetry - Aggregates real-time pulse of dining tables, rooms, KDS orders, and today revenue', async () => {
    const res = await request(app)
      .get('/api/v1/admin-control/telemetry')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dining.totalTables).toBe(3);
    expect(res.body.dining.occupiedTables).toBe(1);
    expect(res.body.dining.availableTables).toBe(1);
    expect(res.body.dining.dirtyTables).toBe(1);
    expect(res.body.rooms.totalRooms).toBe(2);
    expect(res.body.rooms.occupiedRooms).toBe(1);
    expect(res.body.kitchen.activeOrdersCount).toBe(1);
    expect(res.body.kitchen.delayedOrdersCount).toBe(1);
    expect(res.body.financials.todayBillsCount).toBe(1);
    expect(res.body.financials.todayGrossSales).toBe(3150);
    expect(res.body.financials.collectionByMode.upi).toBe(3150);
    expect(res.body.cashier.activeShiftsCount).toBe(1);
    expect(res.body.cashier.totalCashInDrawers).toBe(12000);
  });

  it('2. GET /api/v1/admin-control/notification-preferences - Initializes default subscriptions across all 8 alert categories', async () => {
    const res = await request(app)
      .get('/api/v1/admin-control/notification-preferences')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preferences).toBeTruthy();
    expect(res.body.preferences.subscriptions.length).toBe(8);

    const largeTx = res.body.preferences.subscriptions.find((s: any) => s.category === AlertCategory.LARGE_TRANSACTION);
    expect(largeTx).toBeTruthy();
    expect(largeTx.minThreshold).toBe(5000);
    expect(largeTx.channels).toContain(NotificationChannel.IN_APP);
  });

  it('3. PUT /api/v1/admin-control/notification-preferences - Updates switchboard settings (toggles, thresholds, quiet hours)', async () => {
    const res = await request(app)
      .put('/api/v1/admin-control/notification-preferences')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        subscriptions: [
          {
            category: AlertCategory.LARGE_TRANSACTION,
            enabled: true,
            minThreshold: 5000,
            channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX, NotificationChannel.DESKTOP_POPUP],
            soundChime: true,
            urgentVibration: true,
          },
          {
            category: AlertCategory.KITCHEN_DELAY,
            enabled: true,
            minThreshold: 10,
            channels: [NotificationChannel.IN_APP, NotificationChannel.SOUNDBOX],
            soundChime: true,
            urgentVibration: false,
          },
        ],
        quietHours: {
          enabled: true,
          startTime: '00:00',
          endTime: '04:00',
          allowCriticalOnly: true,
        },
        isActive: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preferences.subscriptions.length).toBe(2);
    expect(res.body.preferences.quietHours.enabled).toBe(true);
  });

  it('4. POST /api/v1/admin-control/dispatch-alert - Suppresses notification when amount is below configured threshold (₹3,000 < ₹5,000)', async () => {
    const res = await request(app)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        category: AlertCategory.LARGE_TRANSACTION,
        severity: AlertSeverity.INFO,
        title: 'Small Payment Received',
        message: 'Payment of ₹3,000 received for Table 4',
        payload: { amount: 3000, tableNumber: 'T-04' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // User threshold is 5000, so notification is suppressed for this user
    expect(res.body.metrics.notifiedUsersCount).toBe(0);
    expect(res.body.metrics.thresholdSuppressedCount).toBe(1);
  });

  it('5. POST /api/v1/admin-control/dispatch-alert - Triggers notification and activates Soundbox when amount meets threshold (₹8,500 >= ₹5,000)', async () => {
    const res = await request(app)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        category: AlertCategory.LARGE_TRANSACTION,
        severity: AlertSeverity.WARNING,
        title: 'VIP Banquet Advance Received',
        message: 'Advance payment of ₹8,500 received via UPI',
        payload: { amount: 8500, mode: 'UPI' },
        triggerSoundbox: true,
        soundboxSpeech: 'High-Value Payment Received: Rupees 8,500 on UPI',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.notifiedUsersCount).toBe(1);
    expect(res.body.metrics.deliveredChannels).toContain(NotificationChannel.SOUNDBOX);
    expect(res.body.alert.soundboxDispatched).toBe(true);
    expect(res.body.alert.soundboxSpeech).toBe('High-Value Payment Received: Rupees 8,500 on UPI');

    testAlertId = res.body.alert._id;
  });

  it('6. POST /api/v1/admin-control/dispatch-alert - Dispatches Critical Kitchen Delay Alert through Soundbox and Admin channel', async () => {
    const res = await request(app)
      .post('/api/v1/admin-control/dispatch-alert')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        category: AlertCategory.KITCHEN_DELAY,
        severity: AlertSeverity.CRITICAL,
        title: 'Severe KDS Bottleneck Alert',
        message: 'Tandoor station tickets exceeding 20 minutes SLA delay',
        payload: { delayMinutes: 20, station: 'Tandoor' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.metrics.notifiedUsersCount).toBe(1);
    expect(res.body.alert.severity).toBe('CRITICAL');
  });

  it('7. GET /api/v1/admin-control/alerts-feed - Retrieves paginated alerts feed filtered by category and status', async () => {
    const res = await request(app)
      .get('/api/v1/admin-control/alerts-feed?category=LARGE_TRANSACTION&status=ACTIVE')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alerts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.alerts.every((a: any) => a.category === 'LARGE_TRANSACTION')).toBe(true);
  });

  it('8. PUT /api/v1/admin-control/alerts/:alertId/acknowledge - Admin atomically acknowledges an active alert', async () => {
    const res = await request(app)
      .put(`/api/v1/admin-control/alerts/${testAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ acknowledgedByName: 'Vikramaditya (GM)' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.alert.status).toBe('ACKNOWLEDGED');
    expect(res.body.alert.acknowledgedByName).toBe('Vikramaditya (GM)');
    expect(res.body.alert.acknowledgedAt).toBeTruthy();
  });

  it('9. PUT /api/v1/admin-control/alerts/:alertId/acknowledge - Gracefully handles already acknowledged alert with 400 ALREADY_ACKNOWLEDGED', async () => {
    const res = await request(app)
      .put(`/api/v1/admin-control/alerts/${testAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ acknowledgedByName: 'Another Admin' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ALREADY_ACKNOWLEDGED');
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B Admin cannot access Tenant A telemetry, preferences, or acknowledge alerts', async () => {
    // Attempt to acknowledge Tenant A alert with Tenant B token
    const unauthAck = await request(app)
      .put(`/api/v1/admin-control/alerts/${testAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(unauthAck.status).toBe(404);

    // Tenant B telemetry must only show Tenant B data (0 tables, 0 revenue)
    const telemetryB = await request(app)
      .get('/api/v1/admin-control/telemetry')
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(telemetryB.status).toBe(200);
    expect(telemetryB.body.dining.totalTables).toBe(0);
    expect(telemetryB.body.financials.todayGrossSales).toBe(0);

    // Tenant B alerts feed must not see Tenant A alerts
    const feedB = await request(app)
      .get('/api/v1/admin-control/alerts-feed')
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(feedB.status).toBe(200);
    expect(feedB.body.alerts.length).toBe(0);
  });
});
