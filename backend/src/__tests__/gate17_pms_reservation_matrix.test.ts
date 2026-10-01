import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus } from '../models/Booking';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  MatrixHelper,
  MatrixStore,
  MatrixCalendarData,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 17 / GATE 17: HOTEL PMS ROOM RESERVATION MATRIX & LIVE CALENDAR GRID ---', () => {
  let tenantId: string;
  let otherTenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let managerUser: any;
  let managerToken: string;
  let roomTypeDeluxe: any;
  let roomTypeSuite: any;
  let room101: any;
  let room102: any;
  let room201: any;
  let pmsSocket: ClientSocketType;
  const userPassword = 'TestPassword123!';
  const managerEmail = `pms_manager_${Date.now()}@spicehub.com`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5097;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Grand Heritage Palace',
      slug: `heritage-palace-${Date.now()}`,
      contactEmail: `heritage_${Date.now()}@spicehub.com`,
      contactPhone: '9888899911',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // Isolated Other Tenant
    const otherTenant = await Tenant.create({
      name: 'Foreign Resort & Spa',
      slug: `foreign-resort-${Date.now()}`,
      contactEmail: `foreign_${Date.now()}@spicehub.com`,
      contactPhone: '9888899922',
      status: 'ACTIVE',
    });
    otherTenantId = otherTenant._id.toString();

    // 2. Setup Manager User
    const argon2 = require('argon2');
    const hash = await argon2.hash(userPassword);
    managerUser = await User.create({
      hotelId: tenant._id,
      name: 'Priya Sharma (Front Office Manager)',
      email: managerEmail,
      phone: '9888899912',
      passwordHash: hash,
      role: UserRole.HOTEL_ADMIN,
      isActive: true,
    });

    // 3. Setup Room Types (Categories)
    roomTypeDeluxe = await RoomType.create({
      hotelId: tenant._id,
      name: 'Deluxe Heritage Room',
      code: 'DHR',
      baseCapacityAdults: 2,
      maxCapacity: 3,
      basePriceOvernight: 4500, // 12% GST
      totalRoomsCount: 2,
      isActive: true,
    });

    roomTypeSuite = await RoomType.create({
      hotelId: tenant._id,
      name: 'Royal Maharaja Suite',
      code: 'RMS',
      baseCapacityAdults: 2,
      maxCapacity: 4,
      basePriceOvernight: 9500, // 18% GST (>7500)
      totalRoomsCount: 1,
      isActive: true,
    });

    // Foreign room type
    const foreignType = await RoomType.create({
      hotelId: otherTenant._id,
      name: 'Foreign Deluxe',
      code: 'FDLX',
      basePriceOvernight: 3000,
      totalRoomsCount: 5,
      isActive: true,
    });

    // 4. Setup Physical Rooms
    room101 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '101',
      roomTypeId: roomTypeDeluxe._id,
      floorNumber: 1,
      wing: 'HERITAGE_EAST',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_101',
    });

    room102 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '102',
      roomTypeId: roomTypeDeluxe._id,
      floorNumber: 1,
      wing: 'HERITAGE_EAST',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_102',
    });

    room201 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '201',
      roomTypeId: roomTypeSuite._id,
      floorNumber: 2,
      wing: 'ROYAL_WING',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_201',
    });

    // Foreign physical room
    await Room.create({
      hotelId: otherTenant._id,
      roomNumber: '999',
      roomTypeId: foreignType._id,
      floorNumber: 9,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_foreign_999',
    });

    // 5. Login Manager
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    const loginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: managerEmail, password: userPassword }),
    });
    const loginJson = (await loginRes.json()) as any;
    managerToken = loginJson.data.token;
    client.setAuthToken(managerToken);
    client.setHotelId(tenantId);

    // 6. Connect Real PMS Socket
    pmsSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => {
      pmsSocket.on('connect', () => {
        pmsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'pms' });
        setTimeout(resolve, 100);
      });
    });
  });

  afterAll(async () => {
    if (pmsSocket && pmsSocket.connected) pmsSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // TEST 1: Matrix Calendar Query & Multi-Tenant Isolation
  test('1. GET /api/v1/pms/matrix/calendar returns 14-day date grid, categories, physical rooms and isolates other tenants', async () => {
    const res = await client.pms.getCalendarMatrix({
      startDate: '2026-10-15',
      days: 14,
    });

    expect(res.success).toBe(true);
    expect(res.data.window.totalDays).toBe(14);
    expect(res.data.dates.length).toBe(14);
    expect(res.data.dates[0].date).toBe('2026-10-15');
    expect(res.data.dates[13].date).toBe('2026-10-28');

    // Verify room categories returned
    expect(res.data.roomTypes.length).toBe(2);
    const catNames = res.data.roomTypes.map((rt: any) => rt.name);
    expect(catNames).toContain('Deluxe Heritage Room');
    expect(catNames).toContain('Royal Maharaja Suite');
    expect(catNames).not.toContain('Foreign Deluxe');

    // Verify physical rooms in categories
    const deluxeCat = res.data.roomTypes.find((rt: any) => rt.name === 'Deluxe Heritage Room');
    expect(deluxeCat.rooms.length).toBe(2);
    const roomNumbers = deluxeCat.rooms.map((r: any) => r.roomNumber);
    expect(roomNumbers).toContain('101');
    expect(roomNumbers).toContain('102');
    expect(roomNumbers).not.toContain('999');

    // Verify KPIs
    expect(res.data.kpis.totalRooms).toBe(3);
    expect(res.data.kpis.occupancyRate).toBe(0);
  });

  // TEST 2: Quick Reservation Creation with 12% GST & Socket Notification
  let createdBookingId: string;
  let createdBookingNumber: string;

  test('2. POST /api/v1/pms/matrix/quick-reserve creates booking, calculates 12% GST, and dispatches real-time socket event', async () => {
    const socketPromise = new Promise<any>((resolve) => {
      pmsSocket.once('reservation:created', (data) => resolve(data));
    });

    // 2 nights Deluxe (4500 * 2 = 9000). 12% GST on 9000 = 1080. Grand total = 10,080.
    const res = await client.pms.quickReserve({
      roomTypeId: roomTypeDeluxe._id.toString(),
      roomId: room101._id.toString(),
      checkInDate: '2026-10-16',
      checkOutDate: '2026-10-18',
      guestName: 'Ananya Birla',
      guestPhone: '9822334455',
      guestEmail: 'ananya@birla.com',
      adults: 2,
      advancePaymentAmount: 5000,
    });

    expect(res.success).toBe(true);
    expect(res.data.bookingNumber).toContain('BK-');
    expect(res.data.guestName).toBe('Ananya Birla');
    expect(res.data.allocatedRoomId).toBe(room101._id.toString());
    expect(res.data.totalTariff).toBe(9000);
    expect(res.data.taxAmount).toBe(1080);
    expect(res.data.grandTotal).toBe(10080);
    expect(res.data.advancePaymentAmount).toBe(5000);
    expect(res.data.paymentStatus).toBe('PARTIAL');
    expect(res.data.bookingStatus).toBe(BookingStatus.CONFIRMED);

    createdBookingId = res.data._id;
    createdBookingNumber = res.data.bookingNumber;

    // Verify socket notification
    const socketEvent = await socketPromise;
    expect(socketEvent.bookingId).toBe(createdBookingId);
    expect(socketEvent.bookingNumber).toBe(createdBookingNumber);
    expect(socketEvent.guestName).toBe('Ananya Birla');
  });

  // TEST 3: Atomic Double-Booking Conflict Protection
  test('3. Conflicting reservation on same physical room for overlapping dates is rejected (409 ROOM_CONFLICT)', async () => {
    try {
      // Overlapping with 2026-10-16 to 2026-10-18
      await client.pms.quickReserve({
        roomTypeId: roomTypeDeluxe._id.toString(),
        roomId: room101._id.toString(),
        checkInDate: '2026-10-17',
        checkOutDate: '2026-10-19',
        guestName: 'Rahul Bajaj',
        guestPhone: '9811002233',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.errorCode).toBe('ROOM_CONFLICT');
    }
  });

  // TEST 4: Category Inventory Sold-Out Protection
  test('4. Booking entire category inventory rejects further bookings with 409 CATEGORY_SOLD_OUT', async () => {
    // Room 101 is booked (16-18 Oct). Let's book Room 102 for 16-18 Oct as well.
    const res102 = await client.pms.quickReserve({
      roomTypeId: roomTypeDeluxe._id.toString(),
      roomId: room102._id.toString(),
      checkInDate: '2026-10-16',
      checkOutDate: '2026-10-18',
      guestName: 'Kunal Shah',
      guestPhone: '9811445566',
    });
    expect(res102.success).toBe(true);

    // Now all 2 Deluxe rooms are booked for 16-18 Oct!
    // Third attempt without specifying room should be rejected as category is sold out
    try {
      await client.pms.quickReserve({
        roomTypeId: roomTypeDeluxe._id.toString(),
        checkInDate: '2026-10-16',
        checkOutDate: '2026-10-18',
        guestName: 'Vijay Sharma',
        guestPhone: '9811778899',
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.errorCode).toBe('CATEGORY_SOLD_OUT');
    }
  });

  // TEST 5: Room Re-assignment & Cancellation Workflow
  test('5. Re-assign physical room & Cancel reservation releases room allocation with socket broadcast', async () => {
    const reassignPromise = new Promise<any>((resolve) => {
      pmsSocket.once('reservation:room_assigned', (data) => resolve(data));
    });

    const statusPromise = new Promise<any>((resolve) => {
      pmsSocket.once('booking:status_changed', (data) => resolve(data));
    });

    // 5.1 Re-assign Room: Maharaja Suite Room 201 is free for 16-18 Oct
    const moveRes = await client.pms.assignRoom(createdBookingId, room201._id.toString());
    expect(moveRes.success).toBe(true);
    expect(moveRes.data.allocatedRoomId).toBe(room201._id.toString());

    const reassignEvent = await reassignPromise;
    expect(reassignEvent.bookingId).toBe(createdBookingId);
    expect(reassignEvent.allocatedRoomId).toBe(room201._id.toString());

    // 5.2 Cancel Booking
    const cancelRes = await client.pms.updateBookingStatus(createdBookingId, 'CANCELLED');
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.data.bookingStatus).toBe('CANCELLED');
    expect(cancelRes.data.allocatedRoomId).toBeUndefined();

    const statusEvent = await statusPromise;
    expect(statusEvent.bookingId).toBe(createdBookingId);
    expect(statusEvent.status).toBe('CANCELLED');
  });

  // TEST 6: MatrixHelper Date Math, Column Layout & Luxury Theme Tokens
  test('6. MatrixHelper computes exact block span, continuation flags and luxury styling', () => {
    const mockDates = [
      { date: '2026-10-15', dayOfWeek: 4, dayName: 'Thu', dayNumber: 15, monthName: 'Oct', isWeekend: false },
      { date: '2026-10-16', dayOfWeek: 5, dayName: 'Fri', dayNumber: 16, monthName: 'Oct', isWeekend: false },
      { date: '2026-10-17', dayOfWeek: 6, dayName: 'Sat', dayNumber: 17, monthName: 'Oct', isWeekend: true },
      { date: '2026-10-18', dayOfWeek: 0, dayName: 'Sun', dayNumber: 18, monthName: 'Oct', isWeekend: true },
      { date: '2026-10-19', dayOfWeek: 1, dayName: 'Mon', dayNumber: 19, monthName: 'Oct', isWeekend: false },
    ];

    // Case A: 16 to 18 Oct -> Starts at col 1, spans 2 nights
    const layoutA = MatrixHelper.calculateBlockLayout('2026-10-16', '2026-10-18', mockDates);
    expect(layoutA.isVisible).toBe(true);
    expect(layoutA.startColIndex).toBe(1);
    expect(layoutA.spanCols).toBe(2);
    expect(layoutA.isContinuationLeft).toBe(false);
    expect(layoutA.isContinuationRight).toBe(false);

    // Case B: Started before window (12 to 17 Oct) -> isContinuationLeft = true, startColIndex = 0
    const layoutB = MatrixHelper.calculateBlockLayout('2026-10-12', '2026-10-17', mockDates);
    expect(layoutB.isVisible).toBe(true);
    expect(layoutB.startColIndex).toBe(0);
    expect(layoutB.spanCols).toBe(2); // 15, 16 (out on 17)
    expect(layoutB.isContinuationLeft).toBe(true);

    // Case C: Outside window -> isVisible = false
    const layoutC = MatrixHelper.calculateBlockLayout('2026-10-25', '2026-10-28', mockDates);
    expect(layoutC.isVisible).toBe(false);

    // Case D: Tariff calculator with 18% GST (rate > 7500)
    const tariffCalc = MatrixHelper.calculateEstimatedTariff(10000, '2026-10-15', '2026-10-18');
    expect(tariffCalc.nights).toBe(3);
    expect(tariffCalc.baseTariff).toBe(30000);
    expect(tariffCalc.gstRate).toBe(18);
    expect(tariffCalc.taxAmount).toBe(5400);
    expect(tariffCalc.grandTotal).toBe(35400);

    // Case E: Luxury Styles
    const styleInHouse = MatrixHelper.getReservationStatusStyle('CHECKED_IN');
    expect(styleInHouse.border).toContain('amber');
    const styleConfirmed = MatrixHelper.getReservationStatusStyle('CONFIRMED');
    expect(styleConfirmed.border).toContain('emerald');
  });

  // TEST 7: MatrixStore Reactive State & Real-Time Handlers
  test('7. MatrixStore navigates dates, filters categories, and synchronizes real-time socket events', () => {
    const store = new MatrixStore(null, 14);
    expect(store.getDays()).toBe(14);

    // Date Navigation
    const originalStart = store.getStartDate();
    store.navigateDays(7);
    expect(store.getStartDate()).not.toBe(originalStart);
    store.jumpToToday();
    expect(store.getStartDate()).toBe(new Date().toISOString().slice(0, 10));

    // Category Filtering
    store.selectCategory('cat_suite');
    expect(store.getSelectedRoomTypeId()).toBe('cat_suite');
    store.selectCategory('ALL');
    expect(store.getSelectedRoomTypeId()).toBe('ALL');

    // Quick Reserve Target Drawer
    store.openQuickReserve({
      roomTypeId: 'cat_deluxe',
      roomId: 'room_101',
      roomNumber: '101',
      checkInDate: '2026-10-20',
      checkOutDate: '2026-10-22',
    });
    expect(store.getQuickReserveTarget()?.roomNumber).toBe('101');
    store.closeQuickReserve();
    expect(store.getQuickReserveTarget()).toBeNull();

    // Mock Calendar Data & Real-time Booking sync
    const mockData: MatrixCalendarData = {
      window: { startDate: '2026-10-15', endDate: '2026-10-28', totalDays: 14 },
      dates: [
        { date: '2026-10-15', dayOfWeek: 4, dayName: 'Thu', dayNumber: 15, monthName: 'Oct', isWeekend: false },
        { date: '2026-10-16', dayOfWeek: 5, dayName: 'Fri', dayNumber: 16, monthName: 'Oct', isWeekend: false },
      ],
      kpis: { totalRooms: 3, arrivalsToday: 0, departuresToday: 0, occupancyRate: 0, activeBookingsCount: 0 },
      roomTypes: [
        {
          id: 'cat_deluxe',
          name: 'Deluxe Heritage',
          code: 'DHR',
          basePrice: 4500,
          rooms: [{ id: 'room_101', roomNumber: '101', floorNumber: 1, status: 'AVAILABLE' }],
        },
      ],
      bookings: [],
    };
    store.setData(mockData);

    // Socket Event: Reservation Created
    store.handleReservationCreated({
      bookingId: 'bk_live_01',
      bookingNumber: 'BK-LIVE01',
      guestName: 'Karan Adani',
      guestPhone: '9888112233',
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-17',
      bookingStatus: 'CONFIRMED',
      allocatedRoomId: 'room_101',
      roomTypeId: 'cat_deluxe',
      grandTotal: 10080,
    });

    expect(store.getBookingsForRoom('room_101').length).toBe(1);
    expect(store.getBookingsForRoom('room_101')[0].guestName).toBe('Karan Adani');

    // Socket Event: Room Assigned
    store.handleRoomAssigned({
      bookingId: 'bk_live_01',
      allocatedRoomId: 'room_102',
    });
    expect(store.getBookingsForRoom('room_101').length).toBe(0);
    expect(store.getBookingsForRoom('room_102').length).toBe(1);

    // Socket Event: Status Changed to CANCELLED
    store.handleStatusChanged({
      bookingId: 'bk_live_01',
      status: 'CANCELLED',
    });
    expect(store.getBookingsForRoom('room_102').length).toBe(0);
  });
});
