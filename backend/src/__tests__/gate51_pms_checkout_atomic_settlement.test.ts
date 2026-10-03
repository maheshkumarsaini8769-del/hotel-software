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
  KeycardVoidReason,
} from '@spicehub/shared-types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus, BookingSource } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { KeycardVoidAudit } from '../models/KeycardVoidAudit';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

describe('--- SHIFT 51 GATE: PMS EXPRESS CHECK-OUT, ATOMIC FOLIO SETTLEMENT & KEYCARD VOID ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let testServerUrl: string;
  let clientA: SpiceHubClient;
  let clientB: SpiceHubClient;

  let receptionistAUser: any;
  let receptionistAToken: string;
  let receptionistBToken: string;

  let roomTypeA: any;
  let room101: any;
  let room102: any;
  let room103: any;

  let socketClient: ClientSocketType;
  const receivedEvents: Array<{ event: string; data: any }> = [];

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
      name: 'SpiceHub Grand Palace Resort & Spa',
      slug: `grand-palace-checkout-${Date.now()}`,
      contactEmail: `admin.checkout.${Date.now()}@spicehub.com`,
      contactPhone: '9811122233',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Create Tenant B (Attacker / Isolated Tenant)
    const tenantB = await Tenant.create({
      name: 'SpiceHub Express City Hotel B',
      slug: `express-city-checkout-${Date.now()}`,
      contactEmail: `admin.express.${Date.now()}@spicehub.com`,
      contactPhone: '9811122244',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Receptionist A
    receptionistAUser = await User.create({
      hotelId: tenantA._id,
      name: 'Ananya Receptionist',
      email: `ananya.${Date.now()}@spicehub.com`,
      phone: '9877700001',
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
      name: 'Karan Desk City',
      email: `karan.${Date.now()}@spicehub.com`,
      phone: '9877700002',
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

    // 6. Setup Room Types & Rooms for Tenant A
    roomTypeA = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Deluxe Heritage Suite',
      code: 'DHS',
      basePriceOvernight: 5000,
      totalRoomsCount: 3,
      isActive: true,
    });

    room101 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '101',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'North Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `ROOM_101_QR_${Date.now()}`,
    });

    room102 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '102',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'North Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `ROOM_102_QR_${Date.now()}`,
    });

    room103 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '103',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'North Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `ROOM_103_QR_${Date.now()}`,
    });

    // 7. Setup Socket.IO Listener
    socketClient = ClientSocket(testServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => {
      socketClient.on('connect', () => {
        // Join tenant channels
        socketClient.emit('join_tenant_room', { hotelId: tenantAId, station: 'admin' });
        socketClient.emit('join_tenant_room', { hotelId: tenantAId, station: 'pms' });
        socketClient.emit('join_tenant_room', { hotelId: tenantAId, station: 'housekeeping' });
        socketClient.emit('join_tenant_room', { hotelId: tenantAId, station: 'hardware' });
        setTimeout(resolve, 100);
      });
    });

    socketClient.on('room:status_changed', (data) => receivedEvents.push({ event: 'room:status_changed', data }));
    socketClient.on('pms:room_checked_out', (data) => receivedEvents.push({ event: 'pms:room_checked_out', data }));
    socketClient.on('housekeeping:task_created', (data) => receivedEvents.push({ event: 'housekeeping:task_created', data }));
    socketClient.on('keycard:voided', (data) => receivedEvents.push({ event: 'keycard:voided', data }));
  });

  afterAll(async () => {
    if (socketClient && socketClient.connected) {
      socketClient.disconnect();
      await new Promise((r) => setTimeout(r, 100));
    }
  });

  // TEST 1: Check-in Room 101 with Keycard & Inspect Checkout Preview
  let stay101Id: string;
  let folio101Id: string;

  it('1. should check in a guest with keycard, post charges, and provide accurate checkout preview', async () => {
    // 1a. Create Booking
    const booking = await Booking.create({
      hotelId: tenantAId,
      bookingNumber: `BK-${Date.now()}-101`,
      guestName: 'Rohit Sharma',
      guestPhone: '9822233344',
      guestEmail: 'rohit@cricket.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomTypeA._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 5000,
      taxAmount: 600, // 12% GST
      grandTotal: 5600,
      advancePaymentAmount: 1000, // Partial advance
    });

    // 1b. Check in guest into Room 101 with physical keycard
    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        bookingId: booking._id.toString(),
        roomId: room101._id.toString(),
        idProofType: 'AADHAAR',
        idProofNumber: '9988-7766-5544',
        keyCardNumber: 'RFID-KEY-101-ALPHA',
      });

    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.success).toBe(true);
    stay101Id = checkInRes.body.stay._id;
    folio101Id = checkInRes.body.folio._id;

    // Verify Room & Stay state
    const roomDoc = await Room.findById(room101._id);
    expect(roomDoc?.status).toBe(RoomStatus.OCCUPIED);
    expect(roomDoc?.keyCardNumber).toBe('RFID-KEY-101-ALPHA');

    // 1c. Post Folio Line Items: Room Service (F&B) & Minibar
    await FolioLineItem.create({
      hotelId: tenantAId,
      folioId: folio101Id,
      department: DepartmentType.ROOM_SERVICE,
      description: 'Gourmet In-Room Dining Dinner',
      rate: 1500,
      quantity: 1,
      taxRate: 5,
      taxAmount: 75,
      netAmount: 1575,
    });

    await FolioLineItem.create({
      hotelId: tenantAId,
      folioId: folio101Id,
      department: DepartmentType.MINIBAR,
      description: 'Perrier Sparkling Water & Nuts',
      rate: 400,
      quantity: 1,
      taxRate: 18,
      taxAmount: 72,
      netAmount: 472,
    });

    // Update Folio with charges
    await MasterFolio.findByIdAndUpdate(folio101Id, {
      $inc: {
        totalFoodAndBeverage: 1500,
        totalPaidServices: 400,
        totalTaxes: 147,
        netAmountPayable: 2047,
        dueAmount: 2047,
      },
    });

    // 1d. Call GET /reception/checkout-preview/:stayId
    const previewRes = await request(app)
      .get(`/api/v1/pms/reception/checkout-preview/${stay101Id}`)
      .set('Authorization', `Bearer ${receptionistAToken}`);

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);
    const pData = previewRes.body.data;
    expect(pData.stayId).toBe(stay101Id);
    expect(pData.guest.name).toBe('Rohit Sharma');
    expect(pData.room.roomNumber).toBe('101');
    expect(pData.room.keyCardNumber).toBe('RFID-KEY-101-ALPHA');
    expect(pData.folio.totalRoomTariff).toBe(5000);
    expect(pData.folio.totalFoodAndBeverage).toBe(1500);
    expect(pData.folio.advancePaid).toBe(1000);
    expect(pData.folio.dueAmount).toBeGreaterThan(0);
    expect(pData.folio.isZeroBalance).toBe(false);
    expect(pData.folio.lineItems.length).toBe(2);
  });

  // TEST 2: Reject Check-Out when Balance is Due without Sufficient Payment
  it('2. should reject checkout attempt when folio has outstanding balance and no/insufficient settlement', async () => {
    // Attempt checkout without payment
    const failRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        stayId: stay101Id,
        payments: [],
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.errorCode).toBe('OUTSTANDING_BALANCE_DUE');
    expect(failRes.body.dueAmount).toBeGreaterThan(0);

    // Verify room is still OCCUPIED
    const roomDoc = await Room.findById(room101._id);
    expect(roomDoc?.status).toBe(RoomStatus.OCCUPIED);
  });

  // TEST 3: Multi-Tender Folio Settlement & Full Express Check-Out
  it('3. should atomically settle folio via multi-tender (Cash + UPI), void keycard, transition room to DIRTY, and dispatch housekeeping', async () => {
    // Fetch exact due amount from preview
    const previewRes = await request(app)
      .get(`/api/v1/pms/reception/checkout-preview/${stay101Id}`)
      .set('Authorization', `Bearer ${receptionistAToken}`);

    const exactDue = previewRes.body.data.folio.dueAmount;
    expect(exactDue).toBeGreaterThan(0);

    const halfDue = Math.floor(exactDue / 2);
    const remainingHalf = exactDue - halfDue;

    receivedEvents.length = 0; // Clear socket events

    const checkoutRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        stayId: stay101Id,
        payments: [
          {
            paymentMode: 'CASH',
            amount: halfDue,
            cashReceived: halfDue + 200,
            cashChangeReturned: 200,
            notes: 'Counter Cash Tender',
          },
          {
            paymentMode: 'UPI',
            amount: remainingHalf,
            transactionRef: 'UPI-UTR-883920199',
            notes: 'PhonePe QR Payment',
          },
        ],
        targetRoomStatus: RoomStatus.DIRTY,
        keyCardVoided: true,
        housekeepingPriority: 'HIGH',
        notes: 'Guest checked out smoothly, early departure',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.roomStatus).toBe(RoomStatus.DIRTY);
    expect(checkoutRes.body.data.folioStatus).toBe('SETTLED');
    expect(checkoutRes.body.data.dueAmount).toBe(0);
    expect(checkoutRes.body.data.keycardVoided).toBe('RFID-KEY-101-ALPHA');

    // Verify Database Entities:
    // 1. Physical Room is now DIRTY, currentStayId cleared, keyCardNumber cleared
    const updatedRoom = await Room.findById(room101._id);
    expect(updatedRoom?.status).toBe(RoomStatus.DIRTY);
    expect(updatedRoom?.currentStayId).toBeNull();
    expect(updatedRoom?.keyCardNumber).toBeNull();

    // 2. Stay is CHECKED_OUT with actual timestamp
    const updatedStay = await Stay.findById(stay101Id);
    expect(updatedStay?.stayStatus).toBe(StayStatus.CHECKED_OUT);
    expect(updatedStay?.actualCheckOutTimestamp).toBeDefined();
    expect(updatedStay?.checkedOutByUserId?.toString()).toBe(receptionistAUser._id.toString());

    // 3. Folio is SETTLED with zero due
    const updatedFolio = await MasterFolio.findById(folio101Id);
    expect(updatedFolio?.folioStatus).toBe('SETTLED');
    expect(updatedFolio?.dueAmount).toBe(0);
    expect(updatedFolio?.settledAt).toBeDefined();

    // 4. Two Payment records created
    const payments = await Payment.find({ folioId: folio101Id });
    expect(payments.length).toBe(2);
    expect(payments.some((p) => p.paymentMode === PaymentMode.CASH)).toBe(true);
    expect(payments.some((p) => p.paymentMode === PaymentMode.UPI)).toBe(true);

    // 5. Housekeeping Turnaround Task created with turnaround checklist
    const hkTask = await HousekeepingTask.findOne({ roomId: room101._id, taskType: HousekeepingTaskType.CHECKOUT_CLEAN });
    expect(hkTask).toBeDefined();
    expect(hkTask?.status).toBe(HousekeepingTaskStatus.PENDING);
    expect(hkTask?.checklist.length).toBeGreaterThanOrEqual(5);

    // 6. Keycard Void Audit record created
    const voidAudit = await KeycardVoidAudit.findOne({ roomId: room101._id, keyCardNumber: 'RFID-KEY-101-ALPHA' });
    expect(voidAudit).toBeDefined();
    expect(voidAudit?.voidReason).toBe(KeycardVoidReason.CHECKOUT);
    expect(voidAudit?.hardwareRevoked).toBe(true);

    // Wait slightly for socket events to flush
    await new Promise((r) => setTimeout(r, 200));

    // 7. Verify Real-time Broadcast Events
    expect(receivedEvents.some((e) => e.event === 'room:status_changed')).toBe(true);
    expect(receivedEvents.some((e) => e.event === 'pms:room_checked_out')).toBe(true);
    expect(receivedEvents.some((e) => e.event === 'housekeeping:task_created')).toBe(true);
    expect(receivedEvents.some((e) => e.event === 'keycard:voided')).toBe(true);
  });

  // TEST 4: Zero-Balance Prepaid Express Check-Out (Room 102)
  it('4. should process zero-balance check-out with zero payment for prepaid guest stay', async () => {
    // 4a. Create Fully Prepaid Booking
    const prepaidBooking = await Booking.create({
      hotelId: tenantAId,
      bookingNumber: `BK-${Date.now()}-102`,
      guestName: 'Smriti Mandhana',
      guestPhone: '9844455566',
      guestEmail: 'smriti@cricket.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomTypeA._id,
      bookingSource: BookingSource.DIRECT_PUBLIC_WEB,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 5000,
      taxAmount: 600,
      grandTotal: 5600,
      advancePaymentAmount: 5600, // 100% Prepaid!
    });

    // 4b. Check in Room 102
    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        bookingId: prepaidBooking._id.toString(),
        roomId: room102._id.toString(),
        keyCardNumber: 'KEY-102-PREPAID',
      });

    expect(checkInRes.status).toBe(200);
    const stay102Id = checkInRes.body.stay._id;
    const folio102Id = checkInRes.body.folio._id;

    // Verify Folio is zero balance
    const folioDoc = await MasterFolio.findById(folio102Id);
    expect(folioDoc?.dueAmount).toBe(0);

    // 4c. Express Check-Out without payment
    const checkoutRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        stayId: stay102Id,
        payments: [],
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.roomStatus).toBe(RoomStatus.DIRTY);
    expect(checkoutRes.body.data.folioStatus).toBe('SETTLED');

    const updatedRoom102 = await Room.findById(room102._id);
    expect(updatedRoom102?.status).toBe(RoomStatus.DIRTY);
  });

  // TEST 5: Corporate City Ledger Settlement (Room 103)
  it('5. should settle folio to Corporate City Ledger credit account and check out guest', async () => {
    // 5a. Create Booking with 0 advance
    const corpBooking = await Booking.create({
      hotelId: tenantAId,
      bookingNumber: `BK-${Date.now()}-103`,
      guestName: 'Sundar Pichai (Google Exec)',
      guestPhone: '9855566677',
      guestEmail: 'sundar@google.com',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomTypeA._id,
      bookingSource: BookingSource.CORPORATE,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 5000,
      taxAmount: 600,
      grandTotal: 5600,
      advancePaymentAmount: 0,
    });

    // 5b. Check in Room 103
    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        bookingId: corpBooking._id.toString(),
        roomId: room103._id.toString(),
        keyCardNumber: 'KEY-103-CORP',
      });

    expect(checkInRes.status).toBe(200);
    const stay103Id = checkInRes.body.stay._id;
    const folio103Id = checkInRes.body.folio._id;

    // 5c. Settle to Corporate City Ledger
    const checkoutRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        stayId: stay103Id,
        paymentMode: 'CITY_LEDGER',
        amount: 5600,
        notes: 'Corporate direct billing to Alphabet Inc. AR Account #CORP-GOOG-88',
      });

    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.folioStatus).toBe('SETTLED');

    // Verify Payment record was stored with CITY_LEDGER
    const paymentDoc = await Payment.findOne({ folioId: folio103Id });
    expect(paymentDoc?.paymentMode).toBe(PaymentMode.CITY_LEDGER);
    expect(paymentDoc?.amount).toBe(5600);
    expect(paymentDoc?.status).toBe(PaymentStatus.SUCCESS);
  });

  // TEST 6: Standalone Keycard Revocation & Audit Trail
  it('6. should allow manual revocation of a lost keycard with audit logging and hardware broadcast', async () => {
    const cardNum = `LOST-CARD-${Date.now()}`;
    const voidRes = await request(app)
      .post('/api/v1/pms/keycards/void')
      .set('Authorization', `Bearer ${receptionistAToken}`)
      .send({
        roomId: room101._id.toString(),
        roomNumber: '101',
        keyCardNumber: cardNum,
        voidReason: KeycardVoidReason.LOST,
        notes: 'Guest dropped keycard in pool, emergency re-issue',
      });

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.success).toBe(true);
    expect(voidRes.body.data.keyCardNumber).toBe(cardNum);
    expect(voidRes.body.data.voidReason).toBe(KeycardVoidReason.LOST);

    // Retrieve audits
    const auditRes = await request(app)
      .get(`/api/v1/pms/keycards/void-audit?roomId=${room101._id.toString()}`)
      .set('Authorization', `Bearer ${receptionistAToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data.some((a: any) => a.keyCardNumber === cardNum)).toBe(true);
  });

  // TEST 7: Strict Multi-Tenant Isolation Protection
  it('7. should block Receptionist B from previewing or checking out Tenant A stay', async () => {
    // Tenant B receptionist tries to preview Tenant A stay
    const blockedPreviewRes = await request(app)
      .get(`/api/v1/pms/reception/checkout-preview/${stay101Id}`)
      .set('Authorization', `Bearer ${receptionistBToken}`);

    expect(blockedPreviewRes.status).toBe(404);
    expect(blockedPreviewRes.body.errorCode).toBe('STAY_NOT_FOUND');

    // Tenant B receptionist tries to check out Tenant A stay
    const blockedCheckoutRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistBToken}`)
      .send({
        stayId: stay101Id,
        paymentMode: 'CASH',
        amount: 100,
      });

    expect(blockedCheckoutRes.status).toBe(404);
  });

  // TEST 8: Frontend UI Store & Helper Unit Validation
  it('8. should validate PmsCheckoutStore and PmsCheckoutHelper state machine behavior', () => {
    const store = PmsCheckoutStore.getInstance();
    store.reset();

    // Check initial state
    expect(store.getCurrentPreview()).toBeNull();
    expect(store.getSelectedPayments().length).toBe(0);

    // Add payment tenders
    store.addPayment({ paymentMode: 'CASH', amount: 1500 });
    store.addPayment({ paymentMode: 'UPI', amount: 1000 });
    expect(store.getSelectedPayments().length).toBe(2);

    // Helper math checks
    const totalTendered = PmsCheckoutHelper.calculateTotalTendered(store.getSelectedPayments());
    expect(totalTendered).toBe(2500);

    const remainingDue = PmsCheckoutHelper.calculateRemainingDue(3000, store.getSelectedPayments());
    expect(remainingDue).toBe(500);

    expect(PmsCheckoutHelper.isFullySettled(2500, store.getSelectedPayments())).toBe(true);
    expect(PmsCheckoutHelper.isFullySettled(3000, store.getSelectedPayments())).toBe(false);

    // Badges formatting
    const cashBadge = PmsCheckoutHelper.formatPaymentModeBadge('CASH');
    expect(cashBadge.label).toBe('Cash Tender');

    const voidBadge = PmsCheckoutHelper.getVoidReasonBadge(KeycardVoidReason.LOST);
    expect(voidBadge.label).toBe('Lost Card');

    store.removePayment(0);
    expect(store.getSelectedPayments().length).toBe(1);
    store.clearPayments();
    expect(store.getSelectedPayments().length).toBe(0);
  });

  // TEST 9: Client SDK Integration Verification
  it('9. should verify SpiceHubClient SDK methods for PMS express checkout', async () => {
    // Test SDK method getKeycardVoidAudits
    const auditsRes = await clientA.pms.getKeycardVoidAudits({ roomId: room101._id.toString() });
    expect(auditsRes.success).toBe(true);
    expect(auditsRes.data.length).toBeGreaterThan(0);

    // Test SDK method voidKeycard
    const voidSdkRes = await clientA.pms.voidKeycard({
      roomId: room102._id.toString(),
      keyCardNumber: 'CARD-LOST-VIA-SDK',
      voidReason: KeycardVoidReason.DAMAGED,
    });
    expect(voidSdkRes.success).toBe(true);
    expect(voidSdkRes.data.keyCardNumber).toBe('CARD-LOST-VIA-SDK');
  });
});
