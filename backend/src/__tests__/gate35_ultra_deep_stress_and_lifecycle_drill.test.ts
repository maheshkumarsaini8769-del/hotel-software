import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { SeatSubFolio, SubFolioStatus } from '../models/SeatSubFolio';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { UniversalCustomerSession, CustomerServiceMode } from '../models/UniversalCustomerSession';

describe('=== ULTRA-DEEP ENTERPRISE INTEGRATION, CONCURRENCY & COMPLETE LIFECYCLE DRILL ===', () => {
  let tenantId: string;
  let competitorTenantId: string;
  let roomId: string;
  let stayId: string;
  let folioId: string;
  let tableId: string;
  let curryStationId: string;
  let dalDishId: string;
  let rotiDishId: string;
  let guestCustomerToken: string;
  let subFolioPartyAId: string;
  let subFolioPartyBId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5116;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Seed Real Enterprise Tenant (The Leela Palace Hotel & Convention)
    const tenant = await Tenant.create({
      name: 'The Leela Palace Bengaluru',
      slug: `leela-palace-${Date.now()}`,
      contactEmail: `audit_drill_${Date.now()}@theleela.com`,
      contactPhone: '9877700001',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Competitor Tenant (ITC Gardenia)
    const competitor = await Tenant.create({
      name: 'ITC Gardenia Luxury',
      slug: `itc-gardenia-${Date.now()}`,
      contactEmail: `rival_drill_${Date.now()}@itc.in`,
      contactPhone: '9877700002',
      status: 'ACTIVE',
    });
    competitorTenantId = competitor._id.toString();

    // 3. Room Type & Checked-In Room 201
    const roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Presidential Suite',
      code: 'PRES',
      basePriceOvernight: 18000,
      amenities: ['Private Butler', 'Lounge Access', 'Panoramic View'],
    });

    const room = await Room.create({
      hotelId: tenant._id,
      roomNumber: '201',
      roomTypeId: roomType._id,
      floorNumber: 2,
      wing: 'Royal Wing',
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'QR_ROOM_201_SALT',
    });
    roomId = room._id.toString();

    const bookingId = new Types.ObjectId();
    const stay = await Stay.create({
      hotelId: tenant._id,
      bookingId,
      roomId: room._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 3),
      stayStatus: StayStatus.ACTIVE,
    });
    stayId = stay._id.toString();

    room.currentStayId = stay._id;
    await room.save();

    const folio = await MasterFolio.create({
      hotelId: tenant._id,
      stayId: stay._id,
      bookingId,
      roomId: room._id,
      folioNumber: `FOL-LEELA-201-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 54000,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 6480,
      advancePaid: 20000,
      netAmountPayable: 60480,
      paidAmount: 20000,
      dueAmount: 40480,
      folioStatus: 'OPEN',
    });
    folioId = folio._id.toString();

    // 4. Kitchen Stations & Menu Catalog
    const curryStation = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'HOT_INDIAN_KITCHEN',
      screenToken: 'KDS_LEELA_01',
      assignedChefIds: [],
    });
    curryStationId = curryStation._id.toString();

    const category = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Royal Awadhi Cuisine',
      slug: `royal-awadhi-${Date.now()}`,
      displayOrder: 1,
    });

    const dalItem = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: curryStation._id,
      name: 'Dal Bukhara Overnight Slow-Cooked',
      foodType: FoodType.VEG,
      basePrice: 550,
      prepTimeMinutes: 15,
    });
    dalDishId = dalItem._id.toString();

    const rotiItem = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: curryStation._id,
      name: 'Warqi Paratha with Ghee',
      foodType: FoodType.VEG,
      basePrice: 120,
      prepTimeMinutes: 10,
    });
    rotiDishId = rotiItem._id.toString();

    // 5. Community Dining Table COMM-100 (4-Seater)
    const commTable = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'COMM-100',
      section: 'ROYAL_COURTYARD',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
      isCommunityTable: true,
      allowCoDining: true,
      availableSeatsCount: 4,
      occupiedSeatsCount: 0,
      seats: [
        { seatNumber: 1, seatLabel: 'Seat 1 (Fountain View)', status: SeatStatus.AVAILABLE },
        { seatNumber: 2, seatLabel: 'Seat 2 (Fountain View)', status: SeatStatus.AVAILABLE },
        { seatNumber: 3, seatLabel: 'Seat 3 (Garden View)', status: SeatStatus.AVAILABLE },
        { seatNumber: 4, seatLabel: 'Seat 4 (Garden View)', status: SeatStatus.AVAILABLE },
      ],
    });
    tableId = commTable._id.toString();
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('STAGE 1: In-Room Dining Flow - Room 201 guest places order with MasterFolio debit', async () => {
    // 1. Select In-Room Dining mode
    const initRes = await request(app)
      .post('/api/v1/customer-portal/select-mode')
      .set('x-hotel-id', tenantId)
      .send({
        serviceMode: 'IN_ROOM_DINING',
        roomNumber: '201',
        guestName: 'Maharaja Digvijay Singh',
        billingPreference: 'POST_TO_ROOM',
      });

    expect(initRes.status).toBe(201);
    expect(initRes.body.session.verificationStatus).toBe('VERIFIED');
    guestCustomerToken = initRes.body.sessionToken;

    // 2. Place Order: 2 Dal Bukhara (2 * 550 = 1100) + 4 Warqi Paratha (4 * 120 = 480)
    // Subtotal = 1580, 5% GST = 79, Grand Total = 1659
    const orderRes = await request(app)
      .post('/api/v1/customer-portal/place-order')
      .set('x-hotel-id', tenantId)
      .send({
        sessionToken: guestCustomerToken,
        cookingInstructions: 'Low spice, extra churned butter on side',
        items: [
          { menuItemId: dalDishId, kitchenStationId: curryStationId, name: 'Dal Bukhara', quantity: 2, unitPrice: 550 },
          { menuItemId: rotiDishId, kitchenStationId: curryStationId, name: 'Warqi Paratha', quantity: 4, unitPrice: 120 },
        ],
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.grandTotal).toBe(1659);

    // 3. Verify MasterFolio auto-debited in database
    const liveFolio = await MasterFolio.findById(folioId);
    expect(liveFolio!.totalFoodAndBeverage).toBe(1580);
    expect(liveFolio!.dueAmount).toBe(40480 + 1659); // 42139

    // 4. Verify FolioLineItem audit trail
    const lineItem = await FolioLineItem.findOne({ folioId: new Types.ObjectId(folioId), department: DepartmentType.ROOM_SERVICE });
    expect(lineItem).not.toBeNull();
    expect(lineItem!.netAmount).toBe(1659);
  });

  it('STAGE 2: Co-Dining Seating - Concurrent Double-Booking Prevention Race Condition', async () => {
    // 5 concurrent requests attempting to book Seat 1 at the EXACT same millisecond
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/v1/co-dining/allocate-seat')
        .set('x-hotel-id', tenantId)
        .send({
          tableId,
          seatNumbers: [1],
          guestName: `Concurrent Guest ${i + 1}`,
        })
    );

    const results = await Promise.all(concurrentRequests);

    // Exactly 1 request MUST succeed (201 Created), and the other 4 MUST be rejected (400 Bad Request)
    const successCount = results.filter((r) => r.status === 201).length;
    const rejectedCount = results.filter((r) => r.status === 400).length;

    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(4);

    // Verify Seat 1 in Mongo is OCCUPIED
    const tableInDb = await DiningTable.findById(tableId);
    const seat1 = tableInDb!.seats.find((s) => s.seatNumber === 1);
    expect(seat1!.status).toBe(SeatStatus.OCCUPIED);
  });

  it('STAGE 3: Community Table Seating - Party A (Seat 2) & Party B (Seats 3, 4)', async () => {
    // Seat Party A partner on Seat 2
    const resA = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantId)
      .send({
        tableId,
        seatNumbers: [2],
        guestName: 'Party A Partner',
      });
    expect(resA.status).toBe(201);

    // Seat Party B (2 persons) on Seats 3 & 4
    const resB = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantId)
      .send({
        tableId,
        seatNumbers: [3, 4],
        guestName: 'Dr. Ramesh & Family',
        guestCount: 2,
      });
    expect(resB.status).toBe(201);
    expect(resB.body.tableStatus).toBe(TableStatus.OCCUPIED); // Full table!
    expect(resB.body.availableSeatsRemaining).toBe(0);
  });

  it('STAGE 4: Independent Seat-Level Billing (Bill A vs Bill B on Table COMM-100)', async () => {
    // Create SubFolio A for Seats 1 & 2
    const resA = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantId)
      .send({
        tableId,
        seatNumbers: [1, 2],
        customerName: 'Party A (Seats 1, 2)',
      });
    subFolioPartyAId = resA.body.subFolio._id;

    // Create SubFolio B for Seats 3 & 4
    const resB = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantId)
      .send({
        tableId,
        seatNumbers: [3, 4],
        customerName: 'Dr. Ramesh (Seats 3, 4)',
      });
    subFolioPartyBId = resB.body.subFolio._id;

    // Add items to SubFolio A: 1 Dal Bukhara (₹550) + 2 Rotis (₹240) -> Subtotal: ₹790 + 5% GST ₹40 = ₹830
    await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioPartyAId}/items`)
      .set('x-hotel-id', tenantId)
      .send({
        items: [
          { menuItemId: dalDishId, name: 'Dal Bukhara', quantity: 1, unitPrice: 550, seatNumber: 1 },
          { menuItemId: rotiDishId, name: 'Warqi Paratha', quantity: 2, unitPrice: 120, seatNumber: 2 },
        ],
      });

    // Add items to SubFolio B: 2 Dal Bukhara (₹1100) -> Subtotal: ₹1100 + 5% GST ₹56 = ₹1156
    await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioPartyBId}/items`)
      .set('x-hotel-id', tenantId)
      .send({
        items: [{ menuItemId: dalDishId, name: 'Dal Bukhara', quantity: 2, unitPrice: 550, seatNumber: 3 }],
      });

    // Verify Table Outstanding = 830 + 1156 = 1986
    const tableFoliosRes = await request(app)
      .get(`/api/v1/seat-billing/table/${tableId}`)
      .set('x-hotel-id', tenantId);

    expect(tableFoliosRes.body.count).toBe(2);
    expect(tableFoliosRes.body.totalTableOutstanding).toBe(1986);
  });

  it('STAGE 5: Autonomous Mid-Meal Settlement - Party B departs early via UPI, releases Seats 3 & 4', async () => {
    // Settle SubFolio B via UPI
    const settleB = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioPartyBId}/settle`)
      .set('x-hotel-id', tenantId)
      .send({
        paymentMethod: 'UPI',
        transactionRef: 'LEELA-UPI-77441100',
        paidAmount: 1156,
        settledByStaffName: 'Priya Cashier',
      });

    expect(settleB.status).toBe(200);
    expect(settleB.body.subFolio.status).toBe(SubFolioStatus.SETTLED);

    // Verify Seats 3 & 4 immediately released in MongoDB, Seats 1 & 2 STILL OCCUPIED!
    const tableAfterB = await DiningTable.findById(tableId);
    expect(tableAfterB!.currentStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(tableAfterB!.availableSeatsCount).toBe(2);
    expect(tableAfterB!.occupiedSeatsCount).toBe(2);

    const seat3 = tableAfterB!.seats.find((s) => s.seatNumber === 3);
    const seat4 = tableAfterB!.seats.find((s) => s.seatNumber === 4);
    expect(seat3!.status).toBe(SeatStatus.AVAILABLE);
    expect(seat4!.status).toBe(SeatStatus.AVAILABLE);

    const seat1 = tableAfterB!.seats.find((s) => s.seatNumber === 1);
    expect(seat1!.status).toBe(SeatStatus.OCCUPIED);
  });

  it('STAGE 6: Immediate Turnaround Seating - New Walk-In Solo Diner claims freshly-released Seat 3', async () => {
    const walkInRes = await request(app)
      .post('/api/v1/co-dining/allocate-seat')
      .set('x-hotel-id', tenantId)
      .send({
        tableId,
        seatNumbers: [3],
        guestName: 'Vikram Solar (Solo Diner)',
      });

    expect(walkInRes.status).toBe(201);
    expect(walkInRes.body.tableStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
    expect(walkInRes.body.availableSeatsRemaining).toBe(1); // 1 seat (Seat 4) still open!

    const tableDb = await DiningTable.findById(tableId);
    const seat3 = tableDb!.seats.find((s) => s.seatNumber === 3);
    expect(seat3!.status).toBe(SeatStatus.OCCUPIED);
    expect(seat3!.guestName).toBe('Vikram Solar (Solo Diner)');
  });

  it('STAGE 7: Multi-Tenant Boundary Security Drill - Competitor completely locked out', async () => {
    // Competitor attempts to access sub-folio of Leela Palace
    const breachRes = await request(app)
      .get(`/api/v1/seat-billing/table/${tableId}`)
      .set('x-hotel-id', competitorTenantId);

    expect(breachRes.status).toBe(200);
    expect(breachRes.body.count).toBe(0); // Zero visibility!

    // Competitor attempts to settle Party A bill
    const unauthorizedSettle = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioPartyAId}/settle`)
      .set('x-hotel-id', competitorTenantId)
      .send({ paymentMethod: 'CASH' });

    expect(unauthorizedSettle.status).toBe(404);
  });
});
