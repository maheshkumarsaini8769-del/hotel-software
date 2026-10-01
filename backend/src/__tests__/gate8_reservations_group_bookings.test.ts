import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as Client, Socket } from 'socket.io-client';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession } from '../models/TableSession';
import { TableReservation, ReservationStatus, DepositStatus } from '../models/TableReservation';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Stay } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { GroupBooking, GroupBookingStatus, SplitBillingPolicy } from '../models/GroupBooking';
import { UserRole } from '../types';

describe('--- SHIFT 8 / GATE 8: RESTAURANT RESERVATIONS, GROUP BOOKINGS & SPLIT FOLIO INVOICING ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let managerToken: string;
  let tenantBToken: string;
  let table1Id: string;
  let table2Id: string;
  let roomTypeId: string;
  let room1Id: string;
  let room2Id: string;
  let room3Id: string;
  let createdReservationId: string;
  let createdGroupBookingId: string;
  let globalSocket: Socket;
  let testServerUrl: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5088;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        testServerUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Metropole',
      slug: `metropole-${Date.now()}`,
      contactEmail: `metropole_${Date.now()}@spicehub.com`,
      contactPhone: '9888877781',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Skyline Hotel',
      slug: `skyline-${Date.now()}`,
      contactEmail: `skyline_${Date.now()}@spicehub.com`,
      contactPhone: '9888877782',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Manager User
    const manager = await User.create({
      hotelId: tenantA._id,
      name: 'General Manager Sarah',
      email: `sarah_${Date.now()}@metropole.com`,
      phone: '9888877783',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Manager Lucas',
      email: `lucas_${Date.now()}@skyline.com`,
      phone: '9888877784',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

    managerToken = jwt.sign(
      { userId: manager._id.toString(), hotelId: tenantAId, role: manager.role, email: manager.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    tenantBToken = jwt.sign(
      { userId: rivalUser._id.toString(), hotelId: tenantBId, role: rivalUser.role, email: rivalUser.email, permissions: ['ALL'] },
      secret,
      { expiresIn: '1h' }
    );

    // Setup Dining Tables
    const table1 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-101',
      section: 'FINE_DINING',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    table1Id = table1._id.toString();

    const table2 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-102',
      section: 'TERRACE',
      capacity: 2,
      currentStatus: TableStatus.AVAILABLE,
    });
    table2Id = table2._id.toString();

    // Setup Room Type: Executive Suite ($4,000/night -> 12% GST)
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Executive Suite',
      code: 'EXS',
      basePriceOvernight: 4000,
      totalRoomsCount: 5,
      isActive: true,
    });
    roomTypeId = roomType._id.toString();

    // Setup 3 Physical Rooms for Group Booking
    const r1 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '301',
      roomTypeId: roomType._id,
      floorNumber: 3,
      wing: 'East',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_301_hash',
    });
    room1Id = r1._id.toString();

    const r2 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '302',
      roomTypeId: roomType._id,
      floorNumber: 3,
      wing: 'East',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_302_hash',
    });
    room2Id = r2._id.toString();

    const r3 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '303',
      roomTypeId: roomType._id,
      floorNumber: 3,
      wing: 'East',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_303_hash',
    });
    room3Id = r3._id.toString();

    // Connect socket to hotel channel
    globalSocket = Client(testServerUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => globalSocket.on('connect', () => resolve()));
    globalSocket.emit('join_tenant_room', { hotelId: tenantAId });
  });

  afterAll(async () => {
    if (globalSocket) globalSocket.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: tenantAId });
    await TableReservation.deleteMany({ hotelId: tenantAId });
    await TableSession.deleteMany({ hotelId: tenantAId });
    await RoomType.deleteMany({ hotelId: tenantAId });
    await Room.deleteMany({ hotelId: tenantAId });
    await Stay.deleteMany({ hotelId: tenantAId });
    await MasterFolio.deleteMany({ hotelId: tenantAId });
    await FolioLineItem.deleteMany({ hotelId: tenantAId });
    await GroupBooking.deleteMany({ hotelId: tenantAId });
    await mongoose.connection.close();
  });

  // TEST 1: Table Reservation Life-Cycle & Slot Collision Blocker
  test('1. Create Table Reservation, Table shifts to RESERVED, and prevents Slot Overlapping Collision', async () => {
    const resDate = '2026-11-20';
    const timeSlot = '20:00';

    // 1a. Successful Table Reservation
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerName: 'Robert Vance',
        customerPhone: '+1-555-443-8900',
        customerEmail: 'robert@vance.com',
        partySize: 4,
        reservationDate: resDate,
        timeSlot,
        assignedTableIds: [table1Id],
        depositAmount: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation.status).toBe(ReservationStatus.CONFIRMED);
    expect(res.body.reservation.depositStatus).toBe(DepositStatus.PAID);
    createdReservationId = res.body.reservation._id;

    // Verify Table #T-101 is now RESERVED
    const tableDoc = await DiningTable.findById(table1Id);
    expect(tableDoc?.currentStatus).toBe(TableStatus.RESERVED);

    // 1b. Prevent Overlapping Slot Collision on Same Table
    const conflictRes = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerName: 'Second Guest',
        customerPhone: '+1-555-111-2222',
        partySize: 2,
        reservationDate: resDate,
        timeSlot, // Same date & time slot!
        assignedTableIds: [table1Id],
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.errorCode).toBe('TABLE_SLOT_CONFLICT');
  });

  // TEST 2: Guest Seating Workflow (RESERVED -> OCCUPIED + TableSession created)
  test('2. Seating reserved guest transitions table to OCCUPIED and spawns active TableSession', async () => {
    const seatRes = await request(app)
      .put(`/api/v1/reservations/${createdReservationId}/seat`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(seatRes.status).toBe(200);
    expect(seatRes.body.success).toBe(true);
    expect(seatRes.body.reservation.status).toBe(ReservationStatus.SEATED);

    // Table must now be OCCUPIED with an active session
    const tableDoc = await DiningTable.findById(table1Id);
    expect(tableDoc?.currentStatus).toBe(TableStatus.OCCUPIED);
    expect(tableDoc?.activeSessionId).toBeDefined();

    const sessionDoc = await TableSession.findById(tableDoc?.activeSessionId);
    expect(sessionDoc?.status).toBe('ACTIVE');
  });

  // TEST 3: Reservation Cancellation & No-Show Deposit Forfeiture
  test('3. No-Show reservation forfeits deposit and releases table back to AVAILABLE', async () => {
    // 3a. Reserve Table 2
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerName: 'NoShow Guest',
        customerPhone: '+1-555-999-0000',
        partySize: 2,
        reservationDate: '2026-11-21',
        timeSlot: '19:00',
        assignedTableIds: [table2Id],
        depositAmount: 30,
      });

    expect(res.status).toBe(201);
    const noShowResId = res.body.reservation._id;

    // Table 2 is RESERVED
    let tableDoc = await DiningTable.findById(table2Id);
    expect(tableDoc?.currentStatus).toBe(TableStatus.RESERVED);

    // 3b. Mark as NO-SHOW
    const cancelRes = await request(app)
      .put(`/api/v1/reservations/${noShowResId}/cancel`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ isNoShow: true, reason: 'Guest never showed up past 30 min grace period' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.reservation.status).toBe(ReservationStatus.NO_SHOW);
    expect(cancelRes.body.reservation.depositStatus).toBe(DepositStatus.FORFEITED);

    // Table 2 is released back to AVAILABLE!
    tableDoc = await DiningTable.findById(table2Id);
    expect(tableDoc?.currentStatus).toBe(TableStatus.AVAILABLE);
  });

  // TEST 4: Multi-Room Group Booking Creation with Corporate GST and Master Folio
  test('4. Create Multi-Room Group Booking for 3 rooms x 2 nights with Corporate GST and Master Folio', async () => {
    const checkInDate = '2026-12-10';
    const checkOutDate = '2026-12-12'; // 2 Nights

    const res = await request(app)
      .post('/api/v1/group-bookings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        groupName: 'Apex Global Tech Conference',
        organizerName: 'Priya Sharma',
        organizerPhone: '+91-98888-00001',
        organizerEmail: 'priya@apexcorp.com',
        companyName: 'Apex Technologies Pvt Ltd',
        companyGst: '29AAACT1234F1Z5',
        checkInDate,
        checkOutDate,
        splitBillingPolicy: SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY,
        advanceDepositPaid: 5000,
        rooms: [
          { roomTypeId, primaryGuestName: 'Dr. James Mitchell', primaryGuestPhone: '+91-98888-00002' },
          { roomTypeId, primaryGuestName: 'Ananya Rao', primaryGuestPhone: '+91-98888-00003' },
          { roomTypeId, primaryGuestName: 'Kavita Menon', primaryGuestPhone: '+91-98888-00004' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.groupBooking.rooms.length).toBe(3);
    expect(res.body.groupBooking.status).toBe(GroupBookingStatus.CONFIRMED);
    createdGroupBookingId = res.body.groupBooking._id;

    // Financial calculations:
    // 3 rooms * 2 nights * $4,000 = $24,000 room tariff
    // 12% GST on $24,000 = $2,880
    // Grand Total = $26,880
    // Net Due after $5,000 advance = $21,880
    const masterFolio = res.body.masterFolio;
    expect(masterFolio.totalRoomTariff).toBe(24000);
    expect(masterFolio.totalTaxes).toBe(2880);
    expect(masterFolio.netAmountPayable).toBe(26880);
    expect(masterFolio.advancePaid).toBe(5000);
    expect(masterFolio.dueAmount).toBe(21880);
  });

  // TEST 5: Bulk Check-In & Physical Room Allocation for the Entire Group
  test('5. Bulk Check-In allocates physical rooms #301, #302, #303 in one shot and generates individual folios', async () => {
    const group = await GroupBooking.findById(createdGroupBookingId);
    const roomEntries = group?.rooms || [];

    const allocations = [
      { roomEntryId: roomEntries[0]?._id?.toString() || '', physicalRoomId: room1Id },
      { roomEntryId: roomEntries[1]?._id?.toString() || '', physicalRoomId: room2Id },
      { roomEntryId: roomEntries[2]?._id?.toString() || '', physicalRoomId: room3Id },
    ];

    const bulkRes = await request(app)
      .post(`/api/v1/group-bookings/${createdGroupBookingId}/bulk-check-in`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ allocations });

    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body.groupStatus).toBe(GroupBookingStatus.FULLY_CHECKED_IN);
    expect(bulkRes.body.checkedInRoomsCount).toBe(3);

    // Verify all 3 physical rooms are now OCCUPIED
    const r1 = await Room.findById(room1Id);
    const r2 = await Room.findById(room2Id);
    const r3 = await Room.findById(room3Id);

    expect(r1?.status).toBe(RoomStatus.OCCUPIED);
    expect(r2?.status).toBe(RoomStatus.OCCUPIED);
    expect(r3?.status).toBe(RoomStatus.OCCUPIED);
  });

  // TEST 6: Split Folio Routing (Personal F&B vs Corporate Room Rent)
  test('6. Split Billing Engine routes Room 301 personal room-service order to Individual Folio without polluting Corporate Master Folio', async () => {
    // Guest in Room 301 orders Room Service dinner: $1,200 + 5% GST = $1,260
    const chargeRes = await request(app)
      .post(`/api/v1/group-bookings/${createdGroupBookingId}/incidental`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        roomNumber: '301',
        department: DepartmentType.ROOM_SERVICE,
        description: 'Paneer Butter Masala, Garlic Naan & Fresh Juice',
        rate: 1200,
        quantity: 1,
        taxRate: 0.05,
      });

    expect(chargeRes.status).toBe(201);
    expect(chargeRes.body.success).toBe(true);
    expect(chargeRes.body.chargedTo).toBe('INDIVIDUAL_GUEST');

    // Corporate Master Folio should NOT have changed (Corporate only pays room tariff!)
    const group = await GroupBooking.findById(createdGroupBookingId);
    const corporateFolio = await MasterFolio.findById(group?.masterFolioId);
    expect(corporateFolio?.dueAmount).toBe(21880); // Stays at $21,880!

    // Individual Folio for Room 301 must reflect $1,260 due
    const individualFolio = await MasterFolio.findById(chargeRes.body.targetFolioId);
    expect(individualFolio?.totalFoodAndBeverage).toBe(1200);
    expect(individualFolio?.dueAmount).toBe(1260);
  });

  // TEST 7: Consolidated B2B Invoice & Individual Guest Personal Statements
  test('7. Group Invoice Generator delivers Consolidated Corporate B2B Tax Invoice and itemized Guest Statements', async () => {
    const invRes = await request(app)
      .get(`/api/v1/group-bookings/${createdGroupBookingId}/invoices`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(invRes.status).toBe(200);
    expect(invRes.body.success).toBe(true);

    // Corporate Invoice
    const corpInv = invRes.body.corporateInvoice;
    expect(corpInv.companyName).toBe('Apex Technologies Pvt Ltd');
    expect(corpInv.companyGst).toBe('29AAACT1234F1Z5');
    expect(corpInv.totalTariff).toBe(24000);
    expect(corpInv.taxes).toBe(2880);
    expect(corpInv.advancePaid).toBe(5000);
    expect(corpInv.dueAmount).toBe(21880);

    // Individual Statements
    const indInvoices = invRes.body.individualInvoices;
    expect(indInvoices.length).toBe(3);

    const room301Statement = indInvoices.find((i: any) => i.roomNumber === '301');
    expect(room301Statement).toBeDefined();
    expect(room301Statement.guestName).toBe('Dr. James Mitchell');
    expect(room301Statement.dueAmount).toBe(1260);
    expect(room301Statement.lineItems.length).toBe(1);
    expect(room301Statement.lineItems[0].netAmount).toBe(1260);

    // Room 302 had 0 incidentals -> due 0
    const room302Statement = indInvoices.find((i: any) => i.roomNumber === '302');
    expect(room302Statement.dueAmount).toBe(0);
  });

  // TEST 8: Multi-Tenant Boundary Security
  test('8. Multi-Tenant Isolation: Rival Hotel Manager blocked from accessing Tenant A reservations and group bookings', async () => {
    // Attempt to seat Tenant A's reservation with Tenant B token
    const seatRes = await request(app)
      .put(`/api/v1/reservations/${createdReservationId}/seat`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(seatRes.status).toBe(404);
    expect(seatRes.body.errorCode).toBe('RESERVATION_NOT_FOUND');

    // Attempt to view Tenant A's group invoices with Tenant B token
    const invRes = await request(app)
      .get(`/api/v1/group-bookings/${createdGroupBookingId}/invoices`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(invRes.status).toBe(404);
    expect(invRes.body.errorCode).toBe('GROUP_BOOKING_NOT_FOUND');
  });
});
