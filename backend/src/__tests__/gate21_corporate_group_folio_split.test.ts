import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { GroupBooking, GroupBookingStatus, SplitBillingPolicy } from '../models/GroupBooking';
import { UserRole } from '../types';

describe('--- SHIFT 21 / GATE 21: GROUP BOOKINGS & CORPORATE MASTER FOLIO SPLIT ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let managerToken: string;
  let rivalToken: string;
  let roomTypeExecutiveId: string;
  let roomTypeDeluxeId: string;
  let physicalRoom1: any;
  let physicalRoom2: any;
  let physicalRoom3: any;
  let groupBookingAId: string;
  let groupBookingBId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }

    // 1. Create Tenant A (Grand Oberoi Resort)
    const tenantA = await Tenant.create({
      name: 'Grand Oberoi Resort & Conventions',
      slug: `oberoi-${Date.now()}`,
      contactEmail: `oberoi_${Date.now()}@spicehub.com`,
      contactPhone: '9877700001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Create Tenant B (Competitor)
    const tenantB = await Tenant.create({
      name: 'Skyline Luxury Retreat',
      slug: `skyline-${Date.now()}`,
      contactEmail: `skyline_${Date.now()}@spicehub.com`,
      contactPhone: '9877700002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Manager User for Tenant A
    const manager = await User.create({
      hotelId: tenantA._id,
      name: 'Director Vikramaditya Singhania',
      email: `vikram_${Date.now()}@oberoi.com`,
      phone: '9877700003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    // 4. Create User for Tenant B
    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Manager',
      email: `rival_${Date.now()}@skyline.com`,
      phone: '9877700004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_key_12345';
    managerToken = jwt.sign(
      { id: manager._id.toString(), email: manager.email, role: manager.role, hotelId: tenantAId },
      jwtSecret,
      { expiresIn: '24h' }
    );

    rivalToken = jwt.sign(
      { id: rivalUser._id.toString(), email: rivalUser.email, role: rivalUser.role, hotelId: tenantBId },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // 5. Seed Room Types for Tenant A
    const rtExecutive = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Executive Business Suite',
      code: 'EXEC-STE',
      basePriceOvernight: 6000,
      baseCapacityAdults: 2,
      maxCapacity: 3,
    });
    roomTypeExecutiveId = rtExecutive._id.toString();

    const rtDeluxe = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Grand Deluxe King',
      code: 'DLX-KNG',
      basePriceOvernight: 4000,
      baseCapacityAdults: 2,
      maxCapacity: 2,
    });
    roomTypeDeluxeId = rtDeluxe._id.toString();

    // 6. Seed Physical Rooms for Tenant A
    physicalRoom1 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '401',
      floorNumber: 4,
      roomTypeId: rtExecutive._id,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_room_401',
    });

    physicalRoom2 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '402',
      floorNumber: 4,
      roomTypeId: rtExecutive._id,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_room_402',
    });

    physicalRoom3 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '403',
      floorNumber: 4,
      roomTypeId: rtDeluxe._id,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_room_403',
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RoomType.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Room.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Stay.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await GroupBooking.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Authoritative Corporate Group Booking Creation with GST & Master Folio', async () => {
    const checkIn = new Date('2026-11-10T14:00:00.000Z');
    const checkOut = new Date('2026-11-12T11:00:00.000Z'); // exactly 2 nights

    const res = await request(app)
      .post('/api/v1/group-bookings')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        groupName: 'Tata Consultancy Leadership Summit',
        organizerName: 'Priya Iyer',
        organizerPhone: '9820011223',
        organizerEmail: 'priya.iyer@tcs.example.com',
        companyName: 'Tata Consultancy Services Ltd',
        companyGst: '27AAACT2727Q1ZW',
        checkInDate: checkIn.toISOString(),
        checkOutDate: checkOut.toISOString(),
        splitBillingPolicy: SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY,
        advanceDepositPaid: 10000,
        rooms: [
          { roomTypeId: roomTypeExecutiveId, primaryGuestName: 'VP Rajesh Mehta', primaryGuestPhone: '9820011224' },
          { roomTypeId: roomTypeExecutiveId, primaryGuestName: 'VP Sunita Rao', primaryGuestPhone: '9820011225' },
          { roomTypeId: roomTypeDeluxeId, primaryGuestName: 'Director Amit Deshmukh', primaryGuestPhone: '9820011226' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    groupBookingAId = res.body.groupBooking._id;

    expect(res.body.groupBooking).toBeDefined();
    expect(res.body.groupBooking.groupBookingCode).toMatch(/^GRP-\d+/);
    expect(res.body.groupBooking.rooms).toHaveLength(3);
    expect(res.body.groupBooking.status).toBe(GroupBookingStatus.CONFIRMED);

    // 2 nights * (6000 + 6000 + 4000) = 32,000 total room tariff
    // avgTariff = 32000 / (3 * 2) = 5333.33 <= 7500 -> 12% GST = 3,840
    // Grand Total = 35,840. Due after 10,000 advance = 25,840
    expect(res.body.masterFolio).toBeDefined();
    expect(res.body.masterFolio.totalRoomTariff).toBe(32000);
    expect(res.body.masterFolio.totalTaxes).toBe(3840);
    expect(res.body.masterFolio.netAmountPayable).toBe(35840);
    expect(res.body.masterFolio.advancePaid).toBe(10000);
    expect(res.body.masterFolio.dueAmount).toBe(25840);
  });

  // TEST 2
  it('2. Query Group Bookings Register & Calculate Accurate Aggregate KPIs', async () => {
    const res = await request(app)
      .get('/api/v1/group-bookings')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.groupBookings).toHaveLength(1);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalGroups).toBe(1);
    expect(res.body.summary.totalRoomsBlocked).toBe(3);
    expect(res.body.summary.totalRoomsCheckedIn).toBe(0);
    expect(res.body.summary.totalCorporateDue).toBe(25840);
  });

  // TEST 3
  it('3. 1-Click Bulk Physical Room Allocation & Instant Group Check-In', async () => {
    const group = await GroupBooking.findById(groupBookingAId);
    expect(group).toBeDefined();

    const allocations = [
      { roomEntryId: group!.rooms[0]._id!.toString(), physicalRoomId: physicalRoom1._id.toString() },
      { roomEntryId: group!.rooms[1]._id!.toString(), physicalRoomId: physicalRoom2._id.toString() },
      { roomEntryId: group!.rooms[2]._id!.toString(), physicalRoomId: physicalRoom3._id.toString() },
    ];

    const res = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingAId}/bulk-check-in`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({ allocations });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.groupStatus).toBe(GroupBookingStatus.FULLY_CHECKED_IN);
    expect(res.body.checkedInRoomsCount).toBe(3);

    // Verify all physical rooms transitioned to OCCUPIED
    const updatedRoom1 = await Room.findById(physicalRoom1._id);
    const updatedRoom2 = await Room.findById(physicalRoom2._id);
    const updatedRoom3 = await Room.findById(physicalRoom3._id);

    expect(updatedRoom1?.status).toBe(RoomStatus.OCCUPIED);
    expect(updatedRoom2?.status).toBe(RoomStatus.OCCUPIED);
    expect(updatedRoom3?.status).toBe(RoomStatus.OCCUPIED);

    // Verify individual guest folios were initialized
    const updatedGroup = await GroupBooking.findById(groupBookingAId);
    expect(updatedGroup?.rooms[0].folioId).toBeDefined();
    expect(updatedGroup?.rooms[1].folioId).toBeDefined();
    expect(updatedGroup?.rooms[2].folioId).toBeDefined();
  });

  // TEST 4
  it('4. Split Policy Enforcement: MASTER_PAYS_ROOM_ONLY Routes Incidentals to Guest Folio', async () => {
    // Post in-room dining charge to Room 401
    const res = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingAId}/incidental`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        roomNumber: '401',
        department: DepartmentType.ROOM_SERVICE,
        description: 'Dal Makhani & Butter Naan Room Service',
        rate: 800,
        quantity: 1,
        taxRate: 0.05,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.chargedTo).toBe('INDIVIDUAL_GUEST'); // Correctly routed to guest!
    expect(res.body.lineItem).toBeDefined();
    expect(res.body.lineItem.netAmount).toBe(840); // 800 + 5% GST

    // Verify Corporate Master Folio was NOT burdened with this personal food bill
    const masterFolio = await MasterFolio.findOne({ folioNumber: `MF-CORP-${(await GroupBooking.findById(groupBookingAId))!.groupBookingCode}` });
    expect(masterFolio?.dueAmount).toBe(25840); // Unchanged!
  });

  // TEST 5
  it('5. Split Policy Enforcement: MASTER_PAYS_ALL Routes Incidentals to Corporate Master Folio', async () => {
    // Create second corporate contract with MASTER_PAYS_ALL (Full Sponsorship)
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 2);

    const groupBRes = await request(app)
      .post('/api/v1/group-bookings')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        groupName: 'Google Cloud VIP Founders Dinner',
        organizerName: 'Ananya Sen',
        organizerPhone: '9833344556',
        organizerEmail: 'ananya@google.example.com',
        companyName: 'Google India Pvt Ltd',
        companyGst: '29AABCG1234F1Z5',
        checkInDate: checkIn.toISOString(),
        checkOutDate: checkOut.toISOString(),
        splitBillingPolicy: SplitBillingPolicy.MASTER_PAYS_ALL,
        advanceDepositPaid: 0,
        rooms: [
          { roomTypeId: roomTypeExecutiveId, primaryGuestName: 'Sundar P', primaryGuestPhone: '9833344557' },
        ],
      });

    expect(groupBRes.status).toBe(201);
    groupBookingBId = groupBRes.body.groupBooking._id;

    // Create temporary dedicated room 404 for Group B
    const room404 = await Room.create({
      hotelId: tenantAId,
      roomNumber: '404',
      floorNumber: 4,
      roomTypeId: roomTypeExecutiveId,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_room_404',
    });

    // Check in Room 404
    await request(app)
      .post(`/api/v1/group-bookings/${groupBookingBId}/bulk-check-in`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        allocations: [{ roomEntryId: groupBRes.body.groupBooking.rooms[0]._id, physicalRoomId: room404._id.toString() }],
      });

    // Post banquet champagne charge to Room 404
    const incidentalRes = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingBId}/incidental`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        roomNumber: '404',
        department: DepartmentType.PAID_AMENITY,
        description: 'Moët & Chandon Vintage Champagne',
        rate: 10000,
        quantity: 1,
        taxRate: 0.18,
      });

    expect(incidentalRes.status).toBe(201);
    expect(incidentalRes.body.success).toBe(true);
    expect(incidentalRes.body.chargedTo).toBe('CORPORATE_MASTER'); // Charged to company!
    expect(incidentalRes.body.lineItem.netAmount).toBe(11800); // 10000 + 18% GST

    // Clean up room 404
    await Room.deleteOne({ _id: room404._id });
  });

  // TEST 6
  it('6. Compile Split Invoices: Corporate B2B Tax Invoice vs Individual Guest Folios', async () => {
    const res = await request(app)
      .get(`/api/v1/group-bookings/${groupBookingAId}/invoices`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Corporate B2B Tax Invoice checks
    expect(res.body.corporateInvoice).toBeDefined();
    expect(res.body.corporateInvoice.companyName).toBe('Tata Consultancy Services Ltd');
    expect(res.body.corporateInvoice.companyGst).toBe('27AAACT2727Q1ZW');
    expect(res.body.corporateInvoice.totalTariff).toBe(32000);
    expect(res.body.corporateInvoice.taxes).toBe(3840);
    expect(res.body.corporateInvoice.advancePaid).toBe(10000);
    expect(res.body.corporateInvoice.dueAmount).toBe(25840);

    // Individual Invoices checks
    expect(res.body.individualInvoices).toHaveLength(3);
    const room401Invoice = res.body.individualInvoices.find((i: any) => i.roomNumber === '401');
    expect(room401Invoice).toBeDefined();
    expect(room401Invoice.guestName).toBe('VP Rajesh Mehta');
    expect(room401Invoice.dueAmount).toBe(840); // Personal meal due!
    expect(room401Invoice.lineItems).toHaveLength(1);
  });

  // TEST 7
  it('7. Financial Settlement: Settle Corporate Master Account and Guest Personal Folio', async () => {
    // 7A: Settle Corporate Master Folio Balance
    const corpSettleRes = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingAId}/settle-master`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        amount: 25840,
        paymentMethod: 'BANK_TRANSFER',
      });

    expect(corpSettleRes.status).toBe(200);
    expect(corpSettleRes.body.success).toBe(true);
    expect(corpSettleRes.body.remainingDue).toBe(0);
    expect(corpSettleRes.body.folioStatus).toBe('SETTLED');

    // 7B: Settle Guest Room 401 Individual Folio
    const updatedGroup = await GroupBooking.findById(groupBookingAId);
    const room401FolioId = updatedGroup!.rooms[0].folioId!.toString();

    const guestSettleRes = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingAId}/settle-individual`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        folioId: room401FolioId,
        amount: 840,
        paymentMethod: 'UPI',
      });

    expect(guestSettleRes.status).toBe(200);
    expect(guestSettleRes.body.success).toBe(true);
    expect(guestSettleRes.body.remainingDue).toBe(0);
    expect(guestSettleRes.body.folioStatus).toBe('SETTLED');
  });

  // TEST 8
  it('8. Bulk Group Checkout Releases Rooms to DIRTY for Housekeeping & Marks Group COMPLETED', async () => {
    const res = await request(app)
      .post(`/api/v1/group-bookings/${groupBookingAId}/bulk-checkout`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.checkedOutCount).toBe(3);
    expect(res.body.groupStatus).toBe(GroupBookingStatus.COMPLETED);

    // Verify all physical rooms are now DIRTY and unassigned
    const r1 = await Room.findById(physicalRoom1._id);
    const r2 = await Room.findById(physicalRoom2._id);
    const r3 = await Room.findById(physicalRoom3._id);

    expect(r1?.status).toBe(RoomStatus.DIRTY);
    expect(r2?.status).toBe(RoomStatus.DIRTY);
    expect(r3?.status).toBe(RoomStatus.DIRTY);
    expect(r1?.currentStayId).toBeUndefined();
  });

  // TEST 9
  it('9. Strict Multi-Tenant Boundary: Reject Cross-Tenant Access & Settlement', async () => {
    // Rival tenant attempts to access Group A
    const res = await request(app)
      .get(`/api/v1/group-bookings/${groupBookingAId}`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('GROUP_BOOKING_NOT_FOUND');
  });
});
