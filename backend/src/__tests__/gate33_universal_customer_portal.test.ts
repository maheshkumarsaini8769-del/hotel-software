import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { UniversalCustomerSession, CustomerServiceMode } from '../models/UniversalCustomerSession';

describe('--- SHIFT 33 / GATE 33: UNIVERSAL CUSTOMER SELF-SERVICE PORTAL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let room101Id: string;
  let room102Id: string;
  let stay101Id: string;
  let folio101Id: string;
  let tableT1Id: string;
  let kitchenStationId: string;
  let paneerDishId: string;
  let naanDishId: string;
  let activeSessionToken: string;

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

    // 1. Setup Tenant A (Grand Heritage Resort)
    const tenantA = await Tenant.create({
      name: 'Grand Heritage Palace',
      slug: `grand-heritage-${Date.now()}`,
      contactEmail: `heritage_${Date.now()}@spicehub.in`,
      contactPhone: '9844400001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B (Competitor Boutique)
    const tenantB = await Tenant.create({
      name: 'Rival Sea Breeze',
      slug: `rival-sea-${Date.now()}`,
      contactEmail: `rival_${Date.now()}@spicehub.in`,
      contactPhone: '9844400002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Room Type & Rooms for Tenant A
    const roomType = await RoomType.create({
      hotelId: tenantA._id,
      name: 'Royal Heritage Suite',
      code: 'RHS',
      basePriceOvernight: 6500,
      amenities: ['King Bed', 'Balcony', 'Jacuzzi'],
    });

    const room101 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '101',
      roomTypeId: roomType._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.OCCUPIED,
      permanentQrCodeHash: 'QR_ROOM_101_HASH',
    });
    room101Id = room101._id.toString();

    const room102 = await Room.create({
      hotelId: tenantA._id,
      roomNumber: '102',
      roomTypeId: roomType._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'QR_ROOM_102_HASH',
    });
    room102Id = room102._id.toString();

    // 4. Create Active Stay & Master Folio for Room 101
    const dummyBookingId = new Types.ObjectId();
    const stay101 = await Stay.create({
      hotelId: tenantA._id,
      bookingId: dummyBookingId,
      roomId: room101._id,
      checkInTimestamp: new Date(),
      expectedCheckOutTimestamp: new Date(Date.now() + 86400000 * 2),
      stayStatus: StayStatus.ACTIVE,
    });
    stay101Id = stay101._id.toString();

    room101.currentStayId = stay101._id;
    await room101.save();

    const folio101 = await MasterFolio.create({
      hotelId: tenantA._id,
      stayId: stay101._id,
      bookingId: dummyBookingId,
      roomId: room101._id,
      folioNumber: `FOL-101-${Date.now().toString().slice(-4)}`,
      totalRoomTariff: 13000,
      totalFoodAndBeverage: 0,
      totalLaundry: 0,
      totalPaidServices: 0,
      totalDamageCharges: 0,
      totalDiscounts: 0,
      totalTaxes: 1560,
      advancePaid: 5000,
      netAmountPayable: 14560,
      paidAmount: 5000,
      dueAmount: 9560,
      folioStatus: 'OPEN',
    });
    folio101Id = folio101._id.toString();

    // 5. Dining Table for Tenant A
    const tableT1 = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-01',
      section: 'COURTYARD',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableT1Id = tableT1._id.toString();

    // 6. Kitchen Station & Menu Items
    const kitchen = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'CURRY_MAIN',
      screenToken: 'SCREEN_CURRY_01',
      assignedChefIds: [],
    });
    kitchenStationId = kitchen._id.toString();

    const menuCategory = await MenuCategory.create({
      hotelId: tenantA._id,
      name: 'North Indian Specialties',
      slug: 'north-indian-specialties',
      displayOrder: 1,
    });

    const paneerItem = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: menuCategory._id,
      kitchenStationId: kitchen._id,
      name: 'Shahi Paneer Tikka Masala',
      foodType: FoodType.VEG,
      basePrice: 380,
      prepTimeMinutes: 20,
    });
    paneerDishId = paneerItem._id.toString();

    const naanItem = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: menuCategory._id,
      kitchenStationId: kitchen._id,
      name: 'Butter Garlic Naan',
      foodType: FoodType.VEG,
      basePrice: 70,
      prepTimeMinutes: 10,
    });
    naanDishId = naanItem._id.toString();
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/customer-portal/detect-or-init without params returns allowed service modes', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/detect-or-init')
      .set('x-hotel-id', tenantAId)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('SELECT_MODE_REQUIRED');
    expect(Array.isArray(res.body.allowedModes)).toBe(true);
    expect(res.body.allowedModes.length).toBeGreaterThanOrEqual(2);
  });

  it('2. POST /api/v1/customer-portal/detect-or-init with tableNumber detects DINE_IN_RESTAURANT', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/detect-or-init')
      .set('x-hotel-id', tenantAId)
      .send({ tableNumber: 'T-01' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('CONTEXT_DETECTED');
    expect(res.body.detectedMode).toBe('DINE_IN_RESTAURANT');
    expect(res.body.table.tableNumber).toBe('T-01');
    expect(res.body.table.section).toBe('COURTYARD');
  });

  it('3. POST /api/v1/customer-portal/detect-or-init with roomNumber detects IN_ROOM_DINING & occupancy', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/detect-or-init')
      .set('x-hotel-id', tenantAId)
      .send({ roomNumber: '101' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('CONTEXT_DETECTED');
    expect(res.body.detectedMode).toBe('IN_ROOM_DINING');
    expect(res.body.room.roomNumber).toBe('101');
    expect(res.body.room.isOccupied).toBe(true);
  });

  it('4. POST /api/v1/customer-portal/select-mode initializes IN_ROOM_DINING session for occupied room', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/select-mode')
      .set('x-hotel-id', tenantAId)
      .send({
        serviceMode: 'IN_ROOM_DINING',
        roomNumber: '101',
        guestName: 'Rohan Mehra',
        billingPreference: 'POST_TO_ROOM',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionToken).toBeDefined();
    expect(res.body.session.serviceMode).toBe('IN_ROOM_DINING');
    expect(res.body.session.verificationStatus).toBe('VERIFIED');
    expect(res.body.session.inRoomContext.roomNumber).toBe('101');
    expect(res.body.session.inRoomContext.folioId).toBe(folio101Id);

    activeSessionToken = res.body.sessionToken;
  });

  it('5. POST /api/v1/customer-portal/select-mode rejects IN_ROOM_DINING for unoccupied Room 102', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/select-mode')
      .set('x-hotel-id', tenantAId)
      .send({
        serviceMode: 'IN_ROOM_DINING',
        roomNumber: '102',
        guestName: 'Walk-in Guest',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not currently checked-in / occupied');
  });

  it('6. POST /api/v1/customer-portal/select-mode initializes DINE_IN_RESTAURANT session for Table T-01', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/select-mode')
      .set('x-hotel-id', tenantAId)
      .send({
        serviceMode: 'DINE_IN_RESTAURANT',
        tableNumber: 'T-01',
        guestName: 'Sunita Rao',
        paxCount: 3,
        seatingType: 'PRIVATE_TABLE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.session.serviceMode).toBe('DINE_IN_RESTAURANT');
    expect(res.body.session.dineInContext.tableNumber).toBe('T-01');
    expect(res.body.session.dineInContext.tableSessionId).toBeDefined();
  });

  it('7. POST /api/v1/customer-portal/switch-mode allows switching mode while keeping session alive', async () => {
    const res = await request(app)
      .post('/api/v1/customer-portal/switch-mode')
      .set('x-hotel-id', tenantAId)
      .send({
        sessionToken: activeSessionToken,
        newServiceMode: 'DINE_IN_RESTAURANT',
        tableNumber: 'T-01',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.serviceMode).toBe('DINE_IN_RESTAURANT');
    expect(res.body.session.dineInContext.tableNumber).toBe('T-01');

    // Switch back to In-Room Dining for next test
    await request(app)
      .post('/api/v1/customer-portal/switch-mode')
      .set('x-hotel-id', tenantAId)
      .send({
        sessionToken: activeSessionToken,
        newServiceMode: 'IN_ROOM_DINING',
        roomNumber: '101',
      });
  });

  it('8. POST /api/v1/customer-portal/place-order for In-Room dining creates ROOM_SERVICE and posts charges to MasterFolio', async () => {
    const initialFolio = await MasterFolio.findById(folio101Id);
    const initialDue = initialFolio!.dueAmount;

    const res = await request(app)
      .post('/api/v1/customer-portal/place-order')
      .set('x-hotel-id', tenantAId)
      .send({
        sessionToken: activeSessionToken,
        billingPreference: 'POST_TO_ROOM',
        cookingInstructions: 'Please make paneer gravy medium spicy and naan crisp',
        items: [
          {
            menuItemId: paneerDishId,
            kitchenStationId,
            name: 'Shahi Paneer Tikka Masala',
            quantity: 2,
            unitPrice: 380, // subtotal = 760
          },
          {
            menuItemId: naanDishId,
            kitchenStationId,
            name: 'Butter Garlic Naan',
            quantity: 4,
            unitPrice: 70, // subtotal = 280
          },
        ],
      });

    // Subtotal = 760 + 280 = 1040
    // Tax (5%) = 52
    // Grand total = 1092
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.orderType).toBe('ROOM_SERVICE');
    expect(res.body.order.roomId).toBe(room101Id);
    expect(res.body.grandTotal).toBe(1092);

    // Verify MasterFolio updated atomically
    const updatedFolio = await MasterFolio.findById(folio101Id);
    expect(updatedFolio!.totalFoodAndBeverage).toBe(1040);
    expect(updatedFolio!.dueAmount).toBe(initialDue + 1092);

    // Verify FolioLineItem created
    const lineItem = await FolioLineItem.findOne({
      folioId: new Types.ObjectId(folio101Id),
      department: DepartmentType.ROOM_SERVICE,
    });
    expect(lineItem).not.toBeNull();
    expect(lineItem!.netAmount).toBe(1092);
  });

  it('9. POST /api/v1/customer-portal/service-request dispatches and updates service request lifecycle', async () => {
    // A. Dispatch Water Refill
    const reqRes = await request(app)
      .post('/api/v1/customer-portal/service-request')
      .set('x-hotel-id', tenantAId)
      .send({
        sessionToken: activeSessionToken,
        requestType: 'WATER_REFILL',
        notes: '2 bottles of chilled mineral water please',
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.success).toBe(true);
    expect(reqRes.body.request.status).toBe('PENDING');
    const requestId = reqRes.body.request.requestId;

    // B. Staff acknowledges request
    const patchRes = await request(app)
      .patch(`/api/v1/customer-portal/service-request/${requestId}/status`)
      .set('x-hotel-id', tenantAId)
      .send({
        status: 'ACKNOWLEDGED',
        resolvedByStaffName: 'Vikram Singh (Room Attendant)',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.serviceRequest.status).toBe('ACKNOWLEDGED');

    // C. Get live session verifies active orders and updated request
    const getRes = await request(app)
      .get(`/api/v1/customer-portal/session/${activeSessionToken}`)
      .set('x-hotel-id', tenantAId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.session.activeOrders.length).toBeGreaterThan(0);
    expect(getRes.body.session.serviceRequests[0].status).toBe('ACKNOWLEDGED');
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot access Tenant A session or room service', async () => {
    // Attempt to access session with Tenant B header
    const res = await request(app)
      .get(`/api/v1/customer-portal/session/${activeSessionToken}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Attempt to select room from Tenant A using Tenant B
    const roomRes = await request(app)
      .post('/api/v1/customer-portal/select-mode')
      .set('x-hotel-id', tenantBId)
      .send({
        serviceMode: 'IN_ROOM_DINING',
        roomNumber: '101',
      });

    expect(roomRes.status).toBe(404);
  });
});
