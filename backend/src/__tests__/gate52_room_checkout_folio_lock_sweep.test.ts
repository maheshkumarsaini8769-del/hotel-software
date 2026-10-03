import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { SpiceHubClient } from '@spicehub/api-client';
import {
  PmsCheckoutStore,
  PmsCheckoutHelper,
} from '@spicehub/ui';
import {
  UserRole,
  ShiftStatus,
  RoomStatus,
} from '@spicehub/shared-types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { PaymentMode, PaymentStatus } from '../models/Payment';
import { MenuItem, FoodType } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

describe('--- SHIFT 52 GATE: ROOM CHECK-OUT ATOMIC FOLIO LOCK & RESTAURANT CHARGE SWEEP ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let testServerUrl: string;
  let clientA: SpiceHubClient;
  let clientB: SpiceHubClient;

  let receptionistAUser: any;
  let receptionistAToken: string;
  let receptionistBToken: string;

  let roomTypeA: any;
  let room201: any;
  let room202: any;
  let stay201: any;
  let folio201: any;
  let booking201: any;

  let menuItemPasta: any;
  let menuItemPizza: any;

  let socketClientAdmin: ClientSocketType;
  let socketClientWaiters: ClientSocketType;
  const receivedAdminEvents: Array<{ event: string; data: any }> = [];
  const receivedWaitersEvents: Array<{ event: string; data: any }> = [];

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

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Royal Heritage Palace',
      slug: `royal-heritage-sweep-${Date.now()}`,
      contactEmail: `admin.sweep.${Date.now()}@spicehub.com`,
      contactPhone: '9822233441',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Create Tenant B (Attacker / Isolated Tenant)
    const tenantB = await Tenant.create({
      name: 'SpiceHub City Express B',
      slug: `city-express-sweep-${Date.now()}`,
      contactEmail: `admin.city.${Date.now()}@spicehub.com`,
      contactPhone: '9822233442',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Receptionist A
    receptionistAUser = await User.create({
      hotelId: tenantA._id,
      name: 'Simran Cashier',
      email: `simran.${Date.now()}@spicehub.com`,
      phone: '9811100001',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    receptionistAToken = jwt.sign(
      {
        userId: receptionistAUser._id.toString(),
        hotelId: tenantAId,
        role: receptionistAUser.role,
        email: receptionistAUser.email,
        permissions: ['PMS_FRONT_DESK'],
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 4. Receptionist B
    const receptionistBUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rohan Desk B',
      email: `rohan.${Date.now()}@spicehub.com`,
      phone: '9811100002',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    receptionistBToken = jwt.sign(
      {
        userId: receptionistBUser._id.toString(),
        hotelId: tenantBId,
        role: receptionistBUser.role,
        email: receptionistBUser.email,
        permissions: ['PMS_FRONT_DESK'],
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 5. Initialize SDK Clients
    clientA = new SpiceHubClient({ baseUrl: testServerUrl, authToken: receptionistAToken, hotelId: tenantAId });
    clientB = new SpiceHubClient({ baseUrl: testServerUrl, authToken: receptionistBToken, hotelId: tenantBId });

    // 6. Setup Room Type & Rooms for Tenant A
    roomTypeA = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Grand Royal Suite',
      code: 'GRS',
      basePriceOvernight: 7500,
      maxOccupancy: 3,
      amenities: ['Jacuzzi', 'Balcony', 'MiniBar'],
      isActive: true,
    });

    room201 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '201',
      roomTypeId: roomTypeA._id,
      floorNumber: 2,
      status: RoomStatus.OCCUPIED,
      keyCardNumber: 'RFID-201-9988',
      cleaningStatus: 'INSPECTED',
      permanentQrCodeHash: `hash_qr_201_${Date.now()}`,
    });

    room202 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '202',
      roomTypeId: roomTypeA._id,
      floorNumber: 2,
      status: RoomStatus.OCCUPIED,
      keyCardNumber: 'RFID-202-7766',
      cleaningStatus: 'INSPECTED',
      permanentQrCodeHash: `hash_qr_202_${Date.now()}`,
    });

    // 7. Kitchen Station & Menu Items
    const kitchenStation = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'Hot Kitchen Station',
      screenToken: `kds_token_${Date.now()}`,
      isOnline: true,
    });

    const category = await MenuCategory.create({
      hotelId: tenantA._id,
      name: 'Italian Mains',
      slug: `italian-mains-${Date.now()}`,
      isActive: true,
    });

    menuItemPasta = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: category._id,
      kitchenStationId: kitchenStation._id,
      name: 'Truffle Mushroom Pasta',
      basePrice: 400,
      isAvailable: true,
      foodType: FoodType.VEG,
    });

    menuItemPizza = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: category._id,
      kitchenStationId: kitchenStation._id,
      name: 'Woodfired Margherita Pizza',
      basePrice: 500,
      isAvailable: true,
      foodType: FoodType.VEG,
    });

    // 8. Booking & Stay for Room 201
    booking201 = await Booking.create({
      hotelId: tenantA._id,
      bookingNumber: `BK-SWEEP-201-${Date.now()}`,
      guestName: 'Vikramaditya Singhania',
      guestPhone: '9899988877',
      guestEmail: 'vikram@singhania.com',
      checkInDate: new Date(Date.now() - 24 * 3600 * 1000),
      checkOutDate: new Date(Date.now() + 24 * 3600 * 1000),
      roomTypeId: roomTypeA._id,
      allocatedRoomId: room201._id,
      totalTariff: 7500,
      taxAmount: 900,
      grandTotal: 8400,
      advancePaymentAmount: 8400,
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    stay201 = await Stay.create({
      hotelId: tenantA._id,
      bookingId: booking201._id,
      roomId: room201._id,
      checkInTimestamp: new Date(Date.now() - 24 * 3600 * 1000),
      expectedCheckOutTimestamp: new Date(Date.now() + 24 * 3600 * 1000),
      stayStatus: StayStatus.ACTIVE,
      keyCardIssued: 'RFID-201-9988',
    });

    folio201 = await MasterFolio.create({
      hotelId: tenantA._id,
      stayId: stay201._id,
      bookingId: booking201._id,
      roomId: room201._id,
      folioNumber: `FOLIO-201-${Date.now()}`,
      totalRoomTariff: 7500,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 900,
      advancePaid: 8400,
      netAmountPayable: 8400,
      paidAmount: 8400,
      dueAmount: 0, // Initially zero balance
      folioStatus: 'OPEN',
    });

    stay201.masterFolioId = folio201._id;
    await stay201.save();

    room201.currentStayId = stay201._id;
    await room201.save();

    // 9. Setup Real-time Sockets
    socketClientAdmin = ClientSocket(testServerUrl, { transports: ['websocket'] });
    socketClientWaiters = ClientSocket(testServerUrl, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      let count = 0;
      const done = () => {
        count++;
        if (count === 2) resolve();
      };
      socketClientAdmin.on('connect', () => {
        socketClientAdmin.emit('join_tenant_room', { hotelId: tenantAId, station: 'admin' });
        socketClientAdmin.emit('join_tenant_room', { hotelId: tenantAId, station: 'pms' });
        done();
      });
      socketClientWaiters.on('connect', () => {
        socketClientWaiters.emit('join_tenant_room', { hotelId: tenantAId, station: 'waiters' });
        done();
      });
    });

    socketClientAdmin.on('pms:folio_locked', (data) => {
      receivedAdminEvents.push({ event: 'pms:folio_locked', data });
    });
    socketClientAdmin.on('pms:folio_unlocked', (data) => {
      receivedAdminEvents.push({ event: 'pms:folio_unlocked', data });
    });
    socketClientAdmin.on('pms:charges_swept', (data) => {
      receivedAdminEvents.push({ event: 'pms:charges_swept', data });
    });

    socketClientWaiters.on('pms:folio_locked', (data) => {
      receivedWaitersEvents.push({ event: 'pms:folio_locked', data });
    });
    socketClientWaiters.on('pms:folio_unlocked', (data) => {
      receivedWaitersEvents.push({ event: 'pms:folio_unlocked', data });
    });
  });

  afterAll(async () => {
    if (socketClientAdmin) socketClientAdmin.disconnect();
    if (socketClientWaiters) socketClientWaiters.disconnect();

    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Room.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Booking.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Stay.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MenuItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MenuCategory.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await KitchenStation.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
  });

  // TEST 1: Atomic Folio Lock Acquisition & WebSocket Broadcast
  test('1. POST /api/v1/pms/folios/lock locks open folio and emits real-time events to admin and waiters', async () => {
    receivedAdminEvents.length = 0;
    receivedWaitersEvents.length = 0;

    const res = await request(app)
      .post('/api/v1/pms/folios/lock')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        stayId: stay201._id.toString(),
        reason: 'Guest Vikramaditya requested check-out settlement at front desk',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.folioStatus).toBe('LOCKED');
    expect(res.body.data.lockReason).toContain('Vikramaditya');
    expect(res.body.data.lockedAt).toBeDefined();

    // Verify DB state
    const dbFolio = await MasterFolio.findById(folio201._id);
    expect(dbFolio?.folioStatus).toBe('LOCKED');
    expect(dbFolio?.lockReason).toContain('Vikramaditya');

    // Verify WebSocket deliveries
    await new Promise((r) => setTimeout(r, 80));
    expect(receivedAdminEvents.some((e) => e.event === 'pms:folio_locked')).toBe(true);
    expect(receivedWaitersEvents.some((e) => e.event === 'pms:folio_locked')).toBe(true);
  });

  // TEST 2: Folio Lock Idempotency
  test('2. POST /api/v1/pms/folios/lock is idempotent when already locked', async () => {
    const res = await request(app)
      .post('/api/v1/pms/folios/lock')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        folioId: folio201._id.toString(),
        reason: 'Second lock attempt',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('already locked');
    expect(res.body.data.folioStatus).toBe('LOCKED');
  });

  // TEST 3: Folio Lock Guard - Room Service Order Rejection
  test('3. Room Service order with chargeToRoom is strictly REJECTED with 409 when folio is LOCKED', async () => {
    const res = await request(app)
      .post('/api/v1/guest-portal/orders/place')
      .set('x-idempotency-key', `blocked_rs_${Date.now()}`)
      .send({
        hotelId: tenantAId,
        stayId: stay201._id.toString(),
        roomId: room201._id.toString(),
        items: [{ menuItemId: menuItemPasta._id.toString(), quantity: 1 }],
        chargeToRoom: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('FOLIO_LOCKED_CHECKOUT_IN_PROGRESS');
    expect(res.body.message).toContain('locked');

    // Verify no order created and folio untouched
    const dbFolio = await MasterFolio.findById(folio201._id);
    expect(dbFolio?.totalFoodAndBeverage).toBe(0);
    expect(dbFolio?.dueAmount).toBe(0);
  });

  // TEST 4: Folio Unlock Lifecycle restores charging capability
  test('4. POST /api/v1/pms/folios/unlock restores OPEN state and permits room service ordering', async () => {
    receivedAdminEvents.length = 0;
    receivedWaitersEvents.length = 0;

    const unlockRes = await request(app)
      .post('/api/v1/pms/folios/unlock')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        folioId: folio201._id.toString(),
        reason: 'Guest decided to extend stay and ordered lunch',
      });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.success).toBe(true);
    expect(unlockRes.body.data.folioStatus).toBe('OPEN');

    // Verify DB state
    const dbFolio = await MasterFolio.findById(folio201._id);
    expect(dbFolio?.folioStatus).toBe('OPEN');
    expect(dbFolio?.lockedAt).toBeFalsy();

    // Verify WebSocket deliveries
    await new Promise((r) => setTimeout(r, 80));
    expect(receivedAdminEvents.some((e) => e.event === 'pms:folio_unlocked')).toBe(true);
    expect(receivedWaitersEvents.some((e) => e.event === 'pms:folio_unlocked')).toBe(true);

    // Now Room Service order succeeds
    const orderRes = await request(app)
      .post('/api/v1/guest-portal/orders/place')
      .set('x-idempotency-key', `allowed_rs_${Date.now()}`)
      .send({
        hotelId: tenantAId,
        stayId: stay201._id.toString(),
        roomId: room201._id.toString(),
        items: [{ menuItemId: menuItemPasta._id.toString(), quantity: 1 }],
        chargeToRoom: true,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body.data.grandTotal).toBe(420); // 400 + 5% GST = 420
  });

  // TEST 5: Restaurant Charge Sweep Engine sweeps unposted dining orders into Folio
  test('5. POST /api/v1/pms/folios/sweep-charges sweeps unbilled restaurant & in-room orders atomically', async () => {
    // 1. Re-lock folio
    await request(app)
      .post('/api/v1/pms/folios/lock')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({ folioId: folio201._id.toString() });

    // 2. Create an unbilled Dine-In restaurant order placed by guest in restaurant (e.g. 2 Pizzas = ₹1000)
    const unbilledOrder = await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantAId),
      orderNumber: `ORD-DINE-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.DINE_IN,
      roomId: room201._id,
      stayId: stay201._id,
      folioId: folio201._id,
      items: [
        {
          menuItemId: menuItemPizza._id,
          kitchenStationId: menuItemPizza.kitchenStationId,
          name: menuItemPizza.name,
          unitPrice: 500,
          quantity: 2,
          subtotal: 1000,
          itemStatus: 'SERVED',
        },
      ],
      orderStatus: OverallOrderStatus.SERVED,
      isBilled: false,
      isSweptToFolio: false,
      idempotencyKey: `unbilled_dine_${Date.now()}`,
    });

    receivedAdminEvents.length = 0;

    // 3. Execute Charge Sweep
    const sweepRes = await request(app)
      .post('/api/v1/pms/folios/sweep-charges')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        stayId: stay201._id.toString(),
        finalizeCookingOrders: true,
      });

    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.success).toBe(true);
    expect(sweepRes.body.data.sweptOrdersCount).toBe(1);
    expect(sweepRes.body.data.totalSweptSubtotal).toBe(1000);
    expect(sweepRes.body.data.totalSweptTax).toBe(50); // 5% GST = 50
    expect(sweepRes.body.data.totalSweptAmount).toBe(1050);

    // Verify order marked billed & swept
    const dbOrder = await RestaurantOrder.findById(unbilledOrder._id);
    expect(dbOrder?.isBilled).toBe(true);
    expect(dbOrder?.isSweptToFolio).toBe(true);
    expect(dbOrder?.sweptToFolioId?.toString()).toBe(folio201._id.toString());

    // Verify FolioLineItem created
    const lineItem = await FolioLineItem.findOne({
      folioId: folio201._id,
      referenceId: unbilledOrder._id,
    });
    expect(lineItem).toBeDefined();
    expect(lineItem?.department).toBe(DepartmentType.RESTAURANT_DINE);
    expect(lineItem?.netAmount).toBe(1050);

    // Verify MasterFolio due balance reflects swept 1050 + previous 420 = 1470
    const dbFolio = await MasterFolio.findById(folio201._id);
    expect(dbFolio?.totalFoodAndBeverage).toBe(1400); // 400 + 1000
    expect(dbFolio?.totalTaxes).toBe(970); // 900 room + 20 + 50
    expect(dbFolio?.dueAmount).toBe(1470); // 420 + 1050
  });

  // TEST 6: Charge Sweep Idempotency
  test('6. POST /api/v1/pms/folios/sweep-charges is idempotent when no pending orders exist', async () => {
    const sweepRes = await request(app)
      .post('/api/v1/pms/folios/sweep-charges')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        stayId: stay201._id.toString(),
      });

    expect(sweepRes.status).toBe(200);
    expect(sweepRes.body.success).toBe(true);
    expect(sweepRes.body.data.sweptOrdersCount).toBe(0);
    expect(sweepRes.body.data.totalSweptAmount).toBe(0);
  });

  // TEST 7: Checkout Preview reflects locked status and projected amounts
  test('7. GET /api/v1/pms/reception/checkout-preview reflects folio lock status and line items', async () => {
    const previewRes = await request(app)
      .get(`/api/v1/pms/reception/checkout-preview/${stay201._id}`)
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send();

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    expect(previewRes.body.data.folio.folioStatus).toBe('LOCKED');
    expect(previewRes.body.data.folio.isLocked).toBe(true);
    expect(previewRes.body.data.folio.dueAmount).toBe(1470);
    expect(previewRes.body.data.hasPendingOrders).toBe(false);

    // Test UI Store integration
    const uiStore = PmsCheckoutStore.getInstance();
    uiStore.setPreview(previewRes.body.data);
    expect(uiStore.getIsFolioLocked()).toBe(true);
    expect(uiStore.getCurrentPreview()?.folio.dueAmount).toBe(1470);

    // Test UI Helper badge formatting
    const badge = PmsCheckoutHelper.formatFolioStatusBadge('LOCKED');
    expect(badge.label).toBe('Locked For Check-out');
    expect(badge.text).toBe('text-amber-400');
  });

  // TEST 8: Express Check-Out with Auto-Sweep Integration enforces 100% balance recovery
  test('8. Express Check-out auto-sweeps open charges and rejects underpayment before final CAS settlement', async () => {
    // 1. Create a fresh Room 202 stay with 0 room balance and 1 open unbilled order
    const booking202 = await Booking.create({
      hotelId: new Types.ObjectId(tenantAId),
      bookingNumber: `BK-SWEEP-202-${Date.now()}`,
      guestName: 'Meera Rajput',
      guestPhone: '9811199988',
      guestEmail: 'meera@rajput.com',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 24 * 3600 * 1000),
      roomTypeId: roomTypeA._id,
      allocatedRoomId: room202._id,
      totalTariff: 5000,
      taxAmount: 600,
      grandTotal: 5600,
      advancePaymentAmount: 5600,
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    const stay202 = await Stay.create({
      hotelId: new Types.ObjectId(tenantAId),
      bookingId: booking202._id,
      roomId: room202._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 24 * 3600 * 1000),
      stayStatus: StayStatus.ACTIVE,
    });

    const folio202 = await MasterFolio.create({
      hotelId: new Types.ObjectId(tenantAId),
      stayId: stay202._id,
      bookingId: booking202._id,
      roomId: room202._id,
      folioNumber: `FOLIO-202-${Date.now()}`,
      totalRoomTariff: 5000,
      advancePaid: 5000,
      netAmountPayable: 5000,
      paidAmount: 5000,
      dueAmount: 0, // Zero balance initially
      folioStatus: 'OPEN',
    });

    stay202.masterFolioId = folio202._id;
    await stay202.save();

    room202.currentStayId = stay202._id;
    await room202.save();

    // Create unbilled kitchen order of ₹525 for Room 202
    await RestaurantOrder.create({
      hotelId: new Types.ObjectId(tenantAId),
      orderNumber: `ORD-ROOM-202-${Date.now().toString().slice(-4)}`,
      orderType: OrderType.ROOM_SERVICE,
      roomId: room202._id,
      stayId: stay202._id,
      folioId: folio202._id,
      items: [
        {
          menuItemId: menuItemPasta._id,
          kitchenStationId: menuItemPasta.kitchenStationId,
          name: 'Pasta Carbonara',
          unitPrice: 500,
          quantity: 1,
          subtotal: 500,
          itemStatus: 'SERVED',
        },
      ],
      orderStatus: OverallOrderStatus.SERVED,
      isBilled: false,
      isSweptToFolio: false,
      idempotencyKey: `unbilled_202_${Date.now()}`,
    });

    // 2. Front Desk attempts check-out without paying the ₹525 open food charge
    const underpayRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        stayId: stay202._id.toString(),
        payments: [], // No payment offered
      });

    expect(underpayRes.status).toBe(400);
    expect(underpayRes.body.success).toBe(false);
    expect(underpayRes.body.errorCode).toBe('OUTSTANDING_BALANCE_DUE');
    expect(underpayRes.body.dueAmount).toBe(525); // 500 + 5% GST = 525 swept!

    // 3. Front Desk collects ₹525 via Instant UPI and completes checkout
    const checkoutRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .set('x-tenant-id', tenantAId)
      .send({
        stayId: stay202._id.toString(),
        payments: [
          {
            paymentMode: 'UPI',
            amount: 525,
            transactionRef: 'UPI-SWEEP-PASS-7711',
          },
        ],
        targetRoomStatus: 'DIRTY',
        keyCardVoided: true,
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.folio.folioStatus).toBe('SETTLED');
    expect(checkoutRes.body.data.folio.dueAmount).toBe(0);
    expect(checkoutRes.body.data.room.status).toBe(RoomStatus.DIRTY);
    expect(checkoutRes.body.data.stay.stayStatus).toBe(StayStatus.CHECKED_OUT);
  });

  // TEST 9: Multi-Tenant Isolation Protection
  test('9. Tenant B is strictly prevented from locking, unlocking, or sweeping Tenant A folio', async () => {
    // Tenant B attempts to lock Tenant A folio
    const lockRes = await request(app)
      .post('/api/v1/pms/folios/lock')
      .set('Authorization', `Bearer ${receptionistBToken}`)
      .set('x-tenant-id', tenantBId)
      .send({
        folioId: folio201._id.toString(),
      });

    expect(lockRes.status).toBe(404);
    expect(lockRes.body.errorCode).toBe('FOLIO_NOT_FOUND');

    // Tenant B attempts to sweep Tenant A charges
    const sweepRes = await request(app)
      .post('/api/v1/pms/folios/sweep-charges')
      .set('Authorization', `Bearer ${receptionistBToken}`)
      .set('x-tenant-id', tenantBId)
      .send({
        folioId: folio201._id.toString(),
      });

    expect(sweepRes.status).toBe(404);
    expect(sweepRes.body.errorCode).toBe('FOLIO_NOT_FOUND');
  });
});
