import request from 'supertest';
import mongoose from 'mongoose';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { GuestSession } from '../models/GuestSession';

describe('--- SHIFT 6 / GATE 6: IN-ROOM GUEST PORTAL & DUAL-LINK ROOM SERVICE TESTS ---', () => {
  let tenantId: string;
  let roomId: string;
  let stayId: string;
  let masterFolioId: string;
  let menuItemId: string;
  let kdsSocket: Socket;
  let testServerUrl: string;
  let guestSessionToken: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const uniqueSlug = `room-service-hotel-${Date.now()}`;
    const tenant = await Tenant.create({
      name: 'SpiceHub In-Room Dining Resort',
      slug: uniqueSlug,
      contactEmail: `roomservice_${Date.now()}@spicehub.com`,
      contactPhone: '9555566666',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'IN_ROOM_CHEF_STATION',
      screenToken: 'station_rs_token_999',
    });

    const dish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: new mongoose.Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Crispy Veg Spring Rolls',
      foodType: FoodType.VEG,
      basePrice: 250,
      isAvailable: true,
    });
    menuItemId = dish._id.toString();

    const roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Executive Suite',
      code: 'EXS',
      basePriceOvernight: 6000,
      isActive: true,
    });

    const room = await Room.create({
      hotelId: tenant._id,
      roomNumber: '304',
      roomTypeId: roomType._id,
      floorNumber: 3,
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'permanent_qr_hash_room_304',
    });
    roomId = room._id.toString();

    const booking = await Booking.create({
      hotelId: tenant._id,
      bookingNumber: 'BK-RS-TEST-01',
      guestName: 'Anil Kapoor',
      guestPhone: '9822211100',
      guestEmail: 'anil@kapoor.com',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 2 * 3600000 * 24),
      roomTypeId: roomType._id,
      allocatedRoomId: room._id,
      totalTariff: 12000,
      taxAmount: 1440,
      grandTotal: 13440,
      advancePaymentAmount: 13440,
      bookingStatus: BookingStatus.CHECKED_IN,
    });

    const stay = await Stay.create({
      hotelId: tenant._id,
      bookingId: booking._id,
      roomId: room._id,
      expectedCheckOutTimestamp: booking.checkOutDate,
      stayStatus: StayStatus.ACTIVE,
    });
    stayId = stay._id.toString();

    const masterFolio = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: stay._id,
      bookingId: booking._id,
      roomId: room._id,
      folioNumber: 'FOLIO-304-TEST',
      totalRoomTariff: 12000,
      advancePaid: 13440,
      folioStatus: 'OPEN',
    });
    masterFolioId = masterFolio._id.toString();

    stay.masterFolioId = masterFolio._id as any;
    await stay.save();

    room.currentStayId = stay._id as any;
    await room.save();

    const port = 5077;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    kdsSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      kdsSocket.on('connect', () => {
        kdsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'kds' });
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (kdsSocket) kdsSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Tenant.deleteMany({ _id: tenantId });
    await Room.deleteMany({ hotelId: tenantId });
    await Stay.deleteMany({ hotelId: tenantId });
    await Booking.deleteMany({ hotelId: tenantId });
    await MasterFolio.deleteMany({ hotelId: tenantId });
    await FolioLineItem.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await GuestSession.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  // TEST 1: Permanent Room QR resolves Active Stay & issues Guest Session Token
  test('1. Permanent Room QR Resolves Active Stay for Room #304 & Issues Session Token', async () => {
    const res = await request(app)
      .get(`/api/v1/guest-portal/qr/resolve?hotelId=${tenantId}&roomId=${roomId}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('304');
    expect(res.body.data.guestName).toBe('Anil Kapoor');
    expect(res.body.data.sessionToken).toBeDefined();

    guestSessionToken = res.body.data.sessionToken;
  });

  // TEST 2: Browser Session Continuity & Last-Page Reopen (Section 4.16)
  test('2. Guest Navigation Persists Last-Page Route and Safely Restores on Resume', async () => {
    // Guest navigates to In-Room Dining Cart
    const res = await request(app).post('/api/v1/guest-portal/session/restore').send({
      token: guestSessionToken,
      updatedRoute: '/room-service/cart',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lastKnownRoute).toBe('/room-service/cart');
    expect(res.body.data.roomNumber).toBe('304');
  });

  // TEST 3: In-Room Dining Food Order routes to Shared KDS & Posts to Master Folio
  test('3. In-Room Dining Order Emits to Shared KDS with ROOM 304 Badge and Debits Master Folio', async () => {
    let receivedKdsEvent: any = null;

    const kdsPromise = new Promise<void>((resolve) => {
      kdsSocket.on('order:created', (payload) => {
        receivedKdsEvent = payload;
        resolve();
      });
    });

    // 2x Crispy Veg Spring Rolls @ ₹250 = ₹500 + 5% GST (₹25) = ₹525
    const res = await request(app)
      .post('/api/v1/guest-portal/orders/place')
      .set('x-idempotency-key', `rs_order_key_${Date.now()}`)
      .send({
        hotelId: tenantId,
        stayId,
        roomId,
        items: [{ menuItemId, quantity: 2 }],
        cookingInstructions: 'Deliver to Room 304 with extra napkins',
        chargeToRoom: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomNumber).toBe('304');
    expect(res.body.data.grandTotal).toBe(525);
    expect(res.body.data.chargedToFolio).toBe(true);

    // Verify Real-time KDS Socket delivery
    await kdsPromise;
    expect(receivedKdsEvent).toBeDefined();
    expect(receivedKdsEvent.badge).toBe('ROOM 304 - IN-ROOM DINING');
    expect(receivedKdsEvent.orderType).toBe('ROOM_SERVICE');

    // Verify Master Folio updated
    const folio = await MasterFolio.findById(masterFolioId);
    expect(folio?.totalFoodAndBeverage).toBe(500);
    expect(folio?.totalTaxes).toBe(25);
    expect(folio?.netAmountPayable).toBe(525);

    // Verify FolioLineItem created
    const lineItem = await FolioLineItem.findOne({
      folioId: masterFolioId,
      department: DepartmentType.ROOM_SERVICE,
    });
    expect(lineItem).toBeDefined();
    expect(lineItem?.netAmount).toBe(525);
  });

  // TEST 4: Terminated Session - Rejects Reopen if Guest Has Already Checked Out
  test('4. Browser Session Auto-Terminates if Guest Has Checked Out During Tab Inactivity', async () => {
    // Guest checks out in PMS
    await Stay.findByIdAndUpdate(stayId, { stayStatus: StayStatus.CHECKED_OUT });

    // Client tab attempts to resume session
    const res = await request(app).post('/api/v1/guest-portal/session/restore').send({
      token: guestSessionToken,
    });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('STAY_CHECKED_OUT');
  });
});
