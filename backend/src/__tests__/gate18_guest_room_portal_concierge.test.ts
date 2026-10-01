import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem } from '../models/FolioLineItem';
import { MenuItem } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest';
import { FoodType, UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  GuestPortalHelper,
  GuestPortalStore,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 18 / GATE 18: GUEST ROOM PORTAL DIGITAL SUITE & LUXURY CONCIERGE ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let room304: any;
  let stay304: any;
  let booking304: any;
  let folio304: any;
  let sessionToken: string;
  let stationKitchen: any;
  let dishPasta: any;
  let dishWine: any;
  let housekeepingSocket: ClientSocketType;
  let adminSocket: ClientSocketType;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5098;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Luxury Suites',
      slug: `luxury-suites-${Date.now()}`,
      contactEmail: `suites_${Date.now()}@spicehub.com`,
      contactPhone: '9888800011',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Kitchen Station & Menu Items for In-Room Dining
    stationKitchen = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'IN_ROOM_KITCHEN',
      screenToken: 'token_ir_kitchen',
    });

    dishPasta = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationKitchen._id,
      name: 'Truffle Fettuccine Alfredo',
      foodType: FoodType.VEG,
      basePrice: 650,
      isAvailable: true,
    });

    dishWine = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: stationKitchen._id,
      name: 'Cabernet Sauvignon Glass',
      foodType: FoodType.BEVERAGE,
      basePrice: 850,
      isAvailable: true,
    });

    // 3. Setup Physical Room 304
    const roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Executive Presidential Suite',
      code: 'EPS',
      basePriceOvernight: 12000,
      totalRoomsCount: 1,
    });

    room304 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '304',
      roomTypeId: roomType._id,
      floorNumber: 3,
      wing: 'PRESIDENTIAL',
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'qr_perm_room_304',
    });

    // 4. Setup Booking, Stay & Master Folio
    booking304 = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: `BK-${Date.now().toString().slice(-6)}`,
      guestName: 'Aditya Oberoi',
      guestPhone: '9811223300',
      guestEmail: 'aditya.oberoi@oberoi.com',
      checkInDate: new Date('2026-10-15'),
      checkOutDate: new Date('2026-10-17'),
      roomTypeId: roomType._id,
      allocatedRoomId: room304._id,
      totalTariff: 24000,
      taxAmount: 4320, // 18% GST on 12k
      grandTotal: 28320,
      advancePaymentAmount: 28320, // Fully paid room tariff
      paymentStatus: 'PAID',
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    stay304 = await Stay.create({
      hotelId: tenant._id,
      bookingId: booking304._id,
      roomId: room304._id,
      expectedCheckOutTimestamp: booking304.checkOutDate,
      stayStatus: StayStatus.ACTIVE,
    });

    folio304 = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: stay304._id,
      bookingId: booking304._id,
      roomId: room304._id,
      folioNumber: `FOLIO-304-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 24000,
      totalTaxes: 4320,
      advancePaid: 28320,
      paidAmount: 28320,
      netAmountPayable: 28320,
      dueAmount: 0,
      folioStatus: 'OPEN',
    });

    stay304.masterFolioId = folio304._id;
    await stay304.save();

    room304.currentStayId = stay304._id;
    await room304.save();

    // 5. Connect Real Sockets for Housekeeping & Front Desk alerts
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    housekeepingSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    adminSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });

    await new Promise<void>((resolve) => {
      let connected = 0;
      const check = () => {
        connected++;
        if (connected === 2) setTimeout(resolve, 100);
      };
      housekeepingSocket.on('connect', () => {
        housekeepingSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'housekeeping' });
        check();
      });
      adminSocket.on('connect', () => {
        adminSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'admin' });
        check();
      });
    });
  });

  afterAll(async () => {
    if (housekeepingSocket && housekeepingSocket.connected) housekeepingSocket.disconnect();
    if (adminSocket && adminSocket.connected) adminSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // TEST 1: QR Scan & Ephemeral Guest Session Token Generation
  test('1. GET /api/v1/guest-portal/qr/resolve resolves Room 304 and generates active session token', async () => {
    const res = await client.guestPortal.resolveQr(tenantId, room304._id.toString());
    expect(res.success).toBe(true);
    expect(res.data.roomNumber).toBe('304');
    expect(res.data.guestName).toBe('Aditya Oberoi');
    expect(res.data.stayId).toBe(stay304._id.toString());
    expect(res.data.sessionToken).toBeDefined();

    sessionToken = res.data.sessionToken;
  });

  // TEST 2: In-Room Dining Order & Automatic Master Folio Debit
  let placedOrderNumber: string;

  test('2. POST /api/v1/guest-portal/orders/place charges dining order to Master Folio and updates balance', async () => {
    // Order: 1x Truffle Pasta (650) + 1x Wine (850) = 1,500 + 5% GST (75) = 1,575
    const res = await client.guestPortal.placeRoomServiceOrder({
      hotelId: tenantId,
      stayId: stay304._id.toString(),
      roomId: room304._id.toString(),
      items: [
        { menuItemId: dishPasta._id.toString(), name: dishPasta.name, quantity: 1 },
        { menuItemId: dishWine._id.toString(), name: dishWine.name, quantity: 1 },
      ],
      idempotencyKey: `idem-rs-order-${Date.now()}`,
      chargeToRoom: true,
      cookingInstructions: 'Serve with warm sourdough bread',
    });

    expect(res.success).toBe(true);
    expect(res.data.orderNumber).toContain('RS-');
    expect(res.data.roomNumber).toBe('304');
    expect(res.data.grandTotal).toBe(1575);
    expect(res.data.chargedToFolio).toBe(true);

    placedOrderNumber = res.data.orderNumber;

    // Verify Master Folio updated
    const updatedFolio = await MasterFolio.findById(folio304._id);
    expect(updatedFolio?.totalFoodAndBeverage).toBe(1500);
    expect(updatedFolio?.dueAmount).toBe(1575);
  });

  // TEST 3: Live Order Status Tracking
  test('3. GET /api/v1/guest-portal/orders/live retrieves active in-room order and validates tracking progress', async () => {
    const res = await client.guestPortal.getLiveOrders(sessionToken);
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(1);

    const activeOrder = res.data.find((o: any) => o.orderNumber === placedOrderNumber);
    expect(activeOrder).toBeDefined();
    expect(activeOrder.orderStatus).toBe('PLACED');
    expect(activeOrder.items.length).toBe(2);

    // Verify Helper progress calculation
    const progressPlaced = GuestPortalHelper.getOrderStatusProgress('PLACED');
    expect(progressPlaced.step).toBe(1);
    expect(progressPlaced.percentage).toBe(25);

    const progressPreparing = GuestPortalHelper.getOrderStatusProgress('PREPARING');
    expect(progressPreparing.step).toBe(2);
    expect(progressPreparing.percentage).toBe(50);

    const progressReady = GuestPortalHelper.getOrderStatusProgress('READY');
    expect(progressReady.step).toBe(3);
    expect(progressReady.percentage).toBe(75);

    const progressDelivered = GuestPortalHelper.getOrderStatusProgress('SERVED');
    expect(progressDelivered.step).toBe(4);
    expect(progressDelivered.percentage).toBe(100);
  });

  // TEST 4: 1-Tap Luxury Concierge Request & Real-time Socket Broadcast
  test('4. POST /api/v1/guest-portal/requests/concierge dispatches request to Housekeeping and alerts socket in real-time', async () => {
    const socketPromise = new Promise<any>((resolve) => {
      housekeepingSocket.once('request:new', (data) => resolve(data));
    });

    const res = await client.guestPortal.createConciergeRequest(sessionToken, {
      requestType: 'TOWEL_REPLENISH',
      notes: 'Need two extra plush bath sheets please',
      priority: 'HIGH',
    });

    expect(res.success).toBe(true);
    expect(res.data.sourceType).toBe('HOTEL_STAY');
    expect(res.data.requestType).toBe('HOUSEKEEPING');
    expect(res.data.status).toBe(ServiceRequestStatus.CREATED);

    // Verify socket alert
    const socketEvent = await socketPromise;
    expect(socketEvent.roomNumber).toBe('304');
    expect(socketEvent.requestType).toBe('HOUSEKEEPING');
    expect(socketEvent.notes).toContain('bath sheets');
  });

  // TEST 5: Master Folio Review & Line Items Audit
  test('5. GET /api/v1/guest-portal/folio/summary audits live room charges, food debit and balance due', async () => {
    const res = await client.guestPortal.getFolioSummary(sessionToken);
    expect(res.success).toBe(true);
    expect(res.data.folioNumber).toContain('FOLIO-304');
    expect(res.data.totalRoomTariff).toBe(24000);
    expect(res.data.totalFoodAndBeverage).toBe(1500);
    expect(res.data.advancePaid).toBe(28320);
    expect(res.data.dueAmount).toBe(1575); // Outstanding food charge
    expect(Array.isArray(res.data.lineItems)).toBe(true);

    const foodLineItem = res.data.lineItems.find((li: any) => li.department === 'ROOM_SERVICE');
    expect(foodLineItem).toBeDefined();
    expect(foodLineItem.netAmount).toBe(1575);
  });

  // TEST 6: Express Checkout Guard & Settle Workflow
  test('6. POST /api/v1/guest-portal/checkout/express-request rejects when balance is due, and succeeds once settled', async () => {
    // 6.1 Attempt express checkout with ₹1,575 pending balance -> Should fail
    try {
      await client.guestPortal.requestExpressCheckout(sessionToken);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(400);
      expect(err.errorCode).toBe('OUTSTANDING_BALANCE_DUE');
      expect(err.dueAmount).toBe(1575);
    }

    // 6.2 Simulate Guest Settling the ₹1,575 balance via UPI / Front Desk
    await MasterFolio.findByIdAndUpdate(folio304._id, {
      $inc: { paidAmount: 1575 },
      $set: { dueAmount: 0 },
    });

    const checkoutPromise = new Promise<any>((resolve) => {
      adminSocket.once('checkout:requested', (data) => resolve(data));
    });

    // 6.3 Re-attempt express checkout -> Should succeed and dispatch socket event
    const successRes = await client.guestPortal.requestExpressCheckout(
      sessionToken,
      'Luggage packed and waiting in foyer'
    );

    expect(successRes.success).toBe(true);
    expect(successRes.data.status).toBe('EXPRESS_CHECKOUT_SUBMITTED');
    expect(successRes.data.roomNumber).toBe('304');

    const checkoutEvent = await checkoutPromise;
    expect(checkoutEvent.roomNumber).toBe('304');
    expect(checkoutEvent.notes).toContain('Luggage packed');
  });

  // TEST 7: Frontend GuestPortalHelper & Store State Workflows
  test('7. GuestPortalStore manages live order changes, tab navigation, and reactive notifications', () => {
    const store = new GuestPortalStore();
    expect(store.getActiveTab()).toBe('HOME');

    store.setSession({
      sessionToken: 'test_token',
      roomNumber: '304',
      guestName: 'Aditya Oberoi',
      stayId: 'stay_123',
    });
    expect(store.getSession()?.roomNumber).toBe('304');

    // Add Live Order
    store.setLiveOrders([
      {
        id: 'ord_1',
        orderNumber: 'RS-901',
        orderStatus: 'PLACED',
        placedAt: new Date().toISOString(),
        items: [{ menuItemId: 'm1', name: 'Soup', quantity: 1, unitPrice: 200, subtotal: 200 }],
      },
    ]);
    expect(store.getActiveOrdersCount()).toBe(1);

    // Socket Event: Order Preparing
    store.handleOrderStatusUpdated({
      orderId: 'ord_1',
      orderStatus: 'PREPARING',
    });
    expect(store.getLiveOrders()[0].orderStatus).toBe('PREPARING');

    // Socket Event: Order Delivered (Served)
    store.handleOrderStatusUpdated({
      orderId: 'ord_1',
      orderStatus: 'SERVED',
    });
    expect(store.getLiveOrders()[0].orderStatus).toBe('SERVED');
    expect(store.getActiveOrdersCount()).toBe(0);

    // Tab Navigation
    store.setActiveTab('DINING');
    expect(store.getActiveTab()).toBe('DINING');
    store.setActiveTab('FOLIO');
    expect(store.getActiveTab()).toBe('FOLIO');
  });
});
