import mongoose from 'mongoose';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus, BookingSource } from '../models/Booking';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableReservation, ReservationStatus, DepositStatus } from '../models/TableReservation';
import { TableSession } from '../models/TableSession';
import { UserRole } from '../../../packages/shared-types/src/index';
import { SpiceHubClient } from '../../../packages/api-client/src/index';
import {
  ReservationHelper,
  ReservationStore,
} from '../../../packages/ui/src/index';

describe('--- SHIFT 20 / GATE 20: TABLE & ROOM RESERVATION LIVE MANAGER ---', () => {
  let tenantId: string;
  let client: SpiceHubClient;
  let testServerUrl: string;
  let tableT1: any;
  let tableT2: any;
  let room501: any;
  let room502: any;
  let roomTypeImperial: any;
  let frontDeskUser: any;
  let pmsSocket: ClientSocketType;
  let globalSocket: ClientSocketType;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5100;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Royal Heritage Grand',
      slug: `royal-heritage-${Date.now()}`,
      contactEmail: `heritage_${Date.now()}@spicehub.com`,
      contactPhone: '9866600033',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Front-Desk / Host User
    const argon2 = require('argon2');
    const userPassword = 'Password123!';
    const hash = await argon2.hash(userPassword);

    const userEmail = `maitred_${Date.now()}@spicehub.com`;
    frontDeskUser = await User.create({
      hotelId: tenant._id,
      name: 'Ananya Hostess',
      email: userEmail,
      passwordHash: hash,
      role: UserRole.HOTEL_ADMIN,
      phone: '9811122255',
    });

    // 3. Setup Dining Tables
    tableT1 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T01',
      capacity: 4,
      section: 'FINE_DINING_AC',
      currentStatus: TableStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_table_t01',
    });

    tableT2 = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T02',
      capacity: 2,
      section: 'OUTDOOR_TERRACE',
      currentStatus: TableStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_table_t02',
    });

    // 4. Setup Room Types & Physical Rooms
    roomTypeImperial = await RoomType.create({
      hotelId: tenant._id,
      name: 'Imperial Heritage Suite',
      code: 'IHS',
      basePriceOvernight: 15000,
      baseCapacityAdults: 2,
      maxCapacity: 4,
    });

    room501 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '501',
      floorNumber: 5,
      roomTypeId: roomTypeImperial._id,
      status: RoomStatus.AVAILABLE,
      currentPrice: 15000,
      permanentQrCodeHash: 'qr_hash_501',
    });

    room502 = await Room.create({
      hotelId: tenant._id,
      roomNumber: '502',
      floorNumber: 5,
      roomTypeId: roomTypeImperial._id,
      status: RoomStatus.DIRTY,
      currentPrice: 15000,
      permanentQrCodeHash: 'qr_hash_502',
    });

    // 5. Setup ApiClient & Authenticate
    client = new SpiceHubClient({ baseUrl: testServerUrl });
    const loginRes = await fetch(`${testServerUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPassword }),
    });
    const loginJson = (await loginRes.json()) as any;
    const token = loginJson.data?.token || loginJson.token;
    client.setAuthToken(token);
    client.setHotelId(tenantId);

    // 6. Connect Real Sockets
    await new Promise<void>((resolve) => {
      pmsSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
      globalSocket = ClientSocket(testServerUrl, { transports: ['websocket'] });
      let connected = 0;
      const onConnect = () => {
        connected++;
        if (connected === 2) {
          pmsSocket.emit('join_tenant_room', { hotelId: tenantId, station: 'pms' });
          globalSocket.emit('join:room', `${tenantId}_global`);
          resolve();
        }
      };
      pmsSocket.on('connect', onConnect);
      globalSocket.on('connect', onConnect);
    });
  }, 35000);

  afterAll(async () => {
    if (pmsSocket) pmsSocket.disconnect();
    if (globalSocket) globalSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
  });

  // TEST 1: Table Reservation Creation & Auto-Capacity Matching
  it('TEST 1: Should create dining reservation with auto-table match and prevent slot conflict', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1a: Create reservation for party of 4 at 19:30
    const createRes = await client.reservations.create({
      customerName: 'Kunal Kapoor',
      customerPhone: '9822211122',
      partySize: 4,
      reservationDate: todayStr,
      timeSlot: '19:30',
      durationMinutes: 90,
      assignedTableIds: [tableT1._id.toString()],
      specialRequests: 'Anniversary celebration, candlelight',
      depositAmount: 500,
    });

    expect(createRes.success).toBe(true);
    expect(createRes.reservation).toBeDefined();
    expect(createRes.reservation.reservationNumber).toMatch(/^RES-/);
    expect(createRes.reservation.depositStatus).toBe('PAID');
    expect(createRes.reservation.status).toBe('CONFIRMED');

    // Verify Table T1 was marked RESERVED
    const t1 = await DiningTable.findById(tableT1._id);
    expect(t1?.currentStatus).toBe(TableStatus.RESERVED);

    // 1b: Attempting to reserve same table T1 at same date & slot should return 409 Conflict
    await expect(
      client.reservations.create({
        customerName: 'Rohit Sharma',
        customerPhone: '9833344455',
        partySize: 4,
        reservationDate: todayStr,
        timeSlot: '19:30',
        assignedTableIds: [tableT1._id.toString()],
      })
    ).rejects.toThrow();
  });

  // TEST 2: Seating Guests & Active Table Session Orchestration
  it('TEST 2: Should seat confirmed guests, create TableSession, and transition table to OCCUPIED', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const listRes = await client.reservations.list({ date: todayStr });
    expect(listRes.success).toBe(true);
    expect(listRes.count).toBeGreaterThanOrEqual(1);

    const reservation = listRes.reservations[0];
    const seatRes = await client.reservations.seat(reservation._id);

    expect(seatRes.success).toBe(true);
    expect(seatRes.reservation.status).toBe('SEATED');
    expect(seatRes.reservation.seatedAt).toBeDefined();

    // Verify Table T1 is now OCCUPIED and has active session
    const updatedTable = await DiningTable.findById(tableT1._id);
    expect(updatedTable?.currentStatus).toBe(TableStatus.OCCUPIED);
    expect(updatedTable?.activeSessionId).toBeDefined();

    // Verify TableSession was created in DB
    const session = await TableSession.findById(updatedTable?.activeSessionId);
    expect(session).toBeDefined();
    expect(session?.customerName).toBe('Kunal Kapoor');
  });

  // TEST 3: Cancellation & No-Show Deposit Forfeiture
  it('TEST 3: Should mark reservation NO_SHOW, forfeit deposit, and release table to AVAILABLE', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Create a 2-cover reservation for Table T2
    const resT2 = await client.reservations.create({
      customerName: 'Sameer Verma',
      customerPhone: '9844455566',
      partySize: 2,
      reservationDate: todayStr,
      timeSlot: '20:30',
      assignedTableIds: [tableT2._id.toString()],
      depositAmount: 1000,
    });
    const resId = resT2.reservation._id;

    // Verify Table T2 marked RESERVED
    let t2 = await DiningTable.findById(tableT2._id);
    expect(t2?.currentStatus).toBe(TableStatus.RESERVED);

    // Mark No-Show
    const cancelRes = await client.reservations.cancel(resId, true, 'Guest did not arrive after 20 minutes');
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.reservation.status).toBe('NO_SHOW');
    expect(cancelRes.reservation.depositStatus).toBe(DepositStatus.FORFEITED);

    // Table T2 must be freed back to AVAILABLE
    t2 = await DiningTable.findById(tableT2._id);
    expect(t2?.currentStatus).toBe(TableStatus.AVAILABLE);
  });

  // TEST 4: Front-Desk Arrivals & Departures Board Engine
  it('TEST 4: Should fetch arrivals board with summary counters and available clean rooms', async () => {
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);

    // Create 1 unassigned booking arriving today
    await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-ARR-${Date.now().toString().slice(-4)}`,
      bookingSource: BookingSource.WALK_IN,
      guestName: 'Devendra Singhania',
      guestPhone: '9855566677',
      guestEmail: 'devendra@example.com',
      checkInDate: today,
      checkOutDate: tomorrow,
      roomTypeId: roomTypeImperial._id,
      guestCountAdults: 2,
      totalTariff: 15000,
      taxAmount: 2700,
      grandTotal: 17700,
      advancePaymentAmount: 5000,
      paymentStatus: 'PARTIAL',
      bookingStatus: BookingStatus.CONFIRMED,
    });

    const boardRes = await client.pms.getArrivalsBoard();
    expect(boardRes.success).toBe(true);
    expect(boardRes.summary).toBeDefined();
    expect(boardRes.summary.totalArrivals).toBeGreaterThanOrEqual(1);
    expect(boardRes.summary.unassignedCount).toBeGreaterThanOrEqual(1);

    // Available clean rooms must include Room 501 (AVAILABLE) and exclude Room 502 (DIRTY)
    expect(boardRes.availableCleanRooms).toBeDefined();
    const clean501 = boardRes.availableCleanRooms.find((r) => r.roomNumber === '501');
    const dirty502 = boardRes.availableCleanRooms.find((r) => r.roomNumber === '502');
    expect(clean501).toBeDefined();
    expect(dirty502).toBeUndefined();
  });

  // TEST 5: Front-Desk Physical Room Allocation & Express Check-In
  it('TEST 5: Should assign physical clean room to booking and complete check-in', async () => {
    // Find unassigned booking
    const boardRes = await client.pms.getArrivalsBoard({ filter: 'UNASSIGNED' });
    const unassignedBooking = boardRes.bookings[0];
    expect(unassignedBooking).toBeDefined();
    expect(unassignedBooking.allocatedRoomId).toBeFalsy();

    // Assign Room 501
    const assignRes = await client.pms.assignRoom(unassignedBooking._id, room501._id.toString());
    expect(assignRes.success).toBe(true);
    expect(assignRes.data.allocatedRoomId).toBe(room501._id.toString());

    // Execute Express Check-In
    const checkInRes = await client.pms.checkIn({
      bookingId: unassignedBooking._id,
      roomId: room501._id.toString(),
      keyCardNumber: 'CARD-501-A',
    });

    expect(checkInRes.success).toBe(true);
    expect(checkInRes.stay).toBeDefined();
    expect(checkInRes.roomNumber).toBe('501');
    expect(checkInRes.folio).toBeDefined();
  });

  // TEST 6: ReservationHelper Formatting & Calculation Tests
  it('TEST 6: Should validate ReservationHelper badges, time slot conversion, and deposit status', () => {
    // Table status badge
    const badgeSeated = ReservationHelper.getTableStatusBadge('SEATED');
    expect(badgeSeated.text).toContain('emerald');
    expect(badgeSeated.label).toContain('Seated');

    // Deposit badge
    const depGuaranteed = ReservationHelper.getDepositBadge('PAID', 1000);
    expect(depGuaranteed.label).toBe('₹1000 Guaranteed');

    // Time slot format (24h to 12h)
    expect(ReservationHelper.formatTimeSlot('19:30')).toBe('7:30 PM');
    expect(ReservationHelper.formatTimeSlot('12:00')).toBe('12:00 PM');
    expect(ReservationHelper.formatTimeSlot('09:15')).toBe('9:15 AM');

    // Room arrival badge
    const mockUnassigned: any = { bookingStatus: 'CONFIRMED', allocatedRoomId: null };
    const badgeUnassigned = ReservationHelper.getRoomArrivalBadge(mockUnassigned);
    expect(badgeUnassigned.label).toContain('Unassigned');
  });

  // TEST 7: ReservationStore Reactive State Simulation
  it('TEST 7: Should manage dual tab switcher, table filters, arrivals search, and modals', () => {
    const store = new ReservationStore();

    let notificationCount = 0;
    const unsub = store.subscribe(() => {
      notificationCount++;
    });

    // Tab switching
    expect(store.getTabMode()).toBe('DINING');
    store.setTabMode('ROOMS');
    expect(store.getTabMode()).toBe('ROOMS');
    store.setTabMode('DINING');

    // Set Table Data
    const mockDining: any[] = [
      {
        _id: 'd1',
        customerName: 'Harish Roy',
        customerPhone: '9811122233',
        reservationNumber: 'RES-001',
        partySize: 4,
        timeSlot: '19:30',
        status: 'CONFIRMED',
        depositStatus: 'NONE',
        depositAmount: 0,
      },
      {
        _id: 'd2',
        customerName: 'Anil Ambani',
        customerPhone: '9822233344',
        reservationNumber: 'RES-002',
        partySize: 2,
        timeSlot: '20:00',
        status: 'SEATED',
        depositStatus: 'PAID',
        depositAmount: 500,
      },
    ];
    store.setTableData(mockDining);

    expect(store.getTableSummary().totalReservations).toBe(2);
    expect(store.getTableSummary().totalCovers).toBe(6);
    expect(store.getTableSummary().confirmed).toBe(1);
    expect(store.getTableSummary().seated).toBe(1);

    // Filter Dining by status
    store.setDiningStatusFilter('CONFIRMED');
    expect(store.getFilteredDiningReservations().length).toBe(1);
    expect(store.getFilteredDiningReservations()[0].customerName).toBe('Harish Roy');
    store.setDiningStatusFilter('ALL');

    // Search
    store.setSearchQuery('Ambani');
    expect(store.getFilteredDiningReservations().length).toBe(1);
    expect(store.getFilteredDiningReservations()[0].customerName).toBe('Anil Ambani');
    store.setSearchQuery('');

    // Modal workflows
    store.openNewDiningModal();
    expect(store.isNewDiningModalActive()).toBe(true);
    store.closeNewDiningModal();
    expect(store.isNewDiningModalActive()).toBe(false);

    expect(notificationCount).toBeGreaterThan(5);
    unsub();
  });
});
