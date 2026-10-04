import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus, BookingSource, BookingMode } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem } from '../models/FolioLineItem';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { KitchenStation } from '../models/KitchenStation';
import { UserRole } from '../types';

describe('Gate #59: Live In-Room Dining to Kitchen KDS Dispatch & Real-Time Folio Billing Loop', () => {
  let hotelId: Types.ObjectId;
  let receptionistToken: string;
  let room102: any;
  let roomType: any;
  let kitchenStation: any;
  let createdOrderId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'Hotel Taj Gateway & Luxury Dining',
      slug: `taj-gateway-shift59-${Date.now()}`,
      contactEmail: `frontdesk-59-${Date.now()}@tajgateway.com`,
      contactPhone: '9876543210',
      status: 'ACTIVE',
    });
    hotelId = tenant._id as Types.ObjectId;

    // 2. Setup Kitchen Station
    kitchenStation = await KitchenStation.create({
      hotelId,
      stationName: 'Main Culinary Kitchen',
      screenToken: `station-token-${Date.now()}`,
      isOnline: true,
    });

    // 3. Setup Receptionist User & JWT Token
    const receptionist = await User.create({
      hotelId,
      name: 'Aditya Oberoi (Front Office Mgr)',
      email: `aditya-59-${Date.now()}@tajgateway.com`,
      phone: '9899911133',
      role: UserRole.HOTEL_ADMIN,
      passwordHash: 'dummyhash',
      permissions: ['PMS_FRONTDESK', 'ROOM_CHECKIN'],
    });

    const secret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';
    receptionistToken = jwt.sign(
      {
        userId: receptionist._id.toString(),
        hotelId: hotelId.toString(),
        role: receptionist.role,
        email: receptionist.email,
        permissions: receptionist.permissions,
      },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Setup Room Type & Room 102
    roomType = await RoomType.create({
      hotelId,
      name: 'Royal Heritage Deluxe Villa',
      code: 'RHDV',
      slug: `royal-villa-59-${Date.now()}`,
      basePriceOvernight: 3900,
      maxOccupancyAdults: 2,
    });

    room102 = await Room.create({
      hotelId,
      roomNumber: '102',
      floorNumber: 1,
      roomTypeId: roomType._id,
      permanentQrCodeHash: 'room-102-hash-59',
      status: RoomStatus.AVAILABLE,
    });

    // 5. Setup Booking
    const booking = await Booking.create({
      hotelId,
      bookingNumber: `BKG-59-${Date.now().toString().slice(-6)}`,
      bookingSource: BookingSource.DIRECT_PUBLIC_WEB,
      bookingMode: BookingMode.OVERNIGHT,
      roomTypeId: roomType._id,
      guestName: 'Vikramaditya & Ananya Singhania',
      guestPhone: '9821098765',
      guestEmail: 'vikram.singhania@heritage.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000 * 2),
      guestCountAdults: 2,
      totalTariff: 7800,
      taxAmount: 936,
      grandTotal: 8736,
      advancePaymentAmount: 3000,
      paymentStatus: 'PARTIAL',
      bookingStatus: BookingStatus.CONFIRMED,
    });

    // 6. Perform Check-In via PMS Front Desk API
    const checkinRes = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({
        bookingId: booking._id.toString(),
        roomId: room102._id.toString(),
        guestName: 'Vikramaditya & Ananya Singhania',
        guestPhone: '9821098765',
        guestEmail: 'vikram.singhania@heritage.in',
        isCouple: true,
        idType: 'AADHAAR',
        idNumber: '8921',
        verifiedByReceptionist: true,
        receptionistNotes: 'Checked in at front desk terminal',
      });

    expect(checkinRes.status).toBe(201);
  });

  afterAll(async () => {
    if (hotelId) {
      await Promise.all([
        Tenant.deleteMany({ _id: hotelId }),
        User.deleteMany({ hotelId }),
        Room.deleteMany({ hotelId }),
        RoomType.deleteMany({ hotelId }),
        Booking.deleteMany({ hotelId }),
        Stay.deleteMany({ hotelId }),
        MasterFolio.deleteMany({ hotelId }),
        FolioLineItem.deleteMany({ hotelId }),
        RestaurantOrder.deleteMany({ hotelId }),
        KitchenStation.deleteMany({ hotelId }),
      ]);
    }
    await mongoose.disconnect();
  });

  test('1. Guest in Room 102 places in-room dining order and atomically charges to Master Folio', async () => {
    const orderPayload = {
      roomNumber: '102',
      items: [
        {
          name: 'Paneer Tikka Angara',
          quantity: 2,
          price: 280,
          specialInstructions: 'Spicy with extra mint chutney',
        },
        {
          name: 'Butter Garlic Naan',
          quantity: 4,
          price: 70,
          specialInstructions: 'Crispy clay oven baked',
        },
      ],
      cookingInstructions: 'Please deliver hot to Room 102',
    };

    const res = await request(app)
      .post('/api/v1/pms/frontdesk/inroom-order')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const { order, folio } = res.body.data;
    expect(order.orderNumber).toMatch(/^ORD-RM102-/);
    expect(order.orderStatus).toBe(OverallOrderStatus.PLACED);
    expect(order.items).toHaveLength(2);

    // Calculation verification:
    // Paneer Tikka (2 x 280 = 560) + Garlic Naan (4 x 70 = 280) = 840
    // Tax = 5% of 840 = 42
    // Grand Total = 882
    expect(order.grandTotal).toBe(882);
    createdOrderId = order.id;

    // Folio Verification:
    // Initial tariff = 7800, tax = 936, net = 8736, advance = 3000, initial due = 5736
    // New totalFoodAndBeverage = 840
    // New totalTaxes = 936 + 42 = 978
    // New netAmountPayable = 8736 + 882 = 9618
    // New dueAmount = 9618 - 3000 = 6618
    expect(folio.totalFoodAndBeverage).toBe(840);
    expect(folio.totalTaxes).toBe(978);
    expect(folio.netAmountPayable).toBe(9618);
    expect(folio.dueAmount).toBe(6618);

    // Verify DB RestaurantOrder
    const dbOrder = await RestaurantOrder.findById(order.id);
    expect(dbOrder).not.toBeNull();
    expect(dbOrder!.orderType).toBe(OrderType.ROOM_SERVICE);
    expect(dbOrder!.roomId?.toString()).toBe(room102._id.toString());
  });

  test('2. Kitchen KDS retrieves active Room 102 order with In-Room Dining location tag', async () => {
    const res = await request(app)
      .get(`/api/v1/pos/kds/orders?hotelId=${hotelId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const roomOrder = res.body.data.find((o: any) => o._id.toString() === createdOrderId);
    expect(roomOrder).toBeDefined();
    expect(roomOrder.orderType).toBe(OrderType.ROOM_SERVICE);
    expect(roomOrder.roomId.roomNumber).toBe('102');
    expect(roomOrder.orderStatus).toBe(OverallOrderStatus.PLACED);
  });

  test('3. Kitchen KDS advances order status: PLACED -> PREPARING -> READY -> SERVED', async () => {
    // Stage 1: PREPARING
    const prepRes = await request(app)
      .patch(`/api/v1/pms/frontdesk/inroom-order-status/${createdOrderId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({ status: OverallOrderStatus.PREPARING });

    expect(prepRes.status).toBe(200);
    expect(prepRes.body.data.orderStatus).toBe(OverallOrderStatus.PREPARING);
    expect(prepRes.body.data.preparedAt).toBeDefined();

    // Stage 2: READY TO SERVE
    const readyRes = await request(app)
      .patch(`/api/v1/pms/frontdesk/inroom-order-status/${createdOrderId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({ status: OverallOrderStatus.READY });

    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.orderStatus).toBe(OverallOrderStatus.READY);
    expect(readyRes.body.data.readyAt).toBeDefined();

    // Stage 3: SERVED / DELIVERED
    const servedRes = await request(app)
      .patch(`/api/v1/pms/frontdesk/inroom-order-status/${createdOrderId}`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString())
      .send({ status: OverallOrderStatus.SERVED });

    expect(servedRes.status).toBe(200);
    expect(servedRes.body.data.orderStatus).toBe(OverallOrderStatus.SERVED);
    expect(servedRes.body.data.servedAt).toBeDefined();
  });

  test('4. Guest Room Portal queries in-room orders and confirms final SERVED status', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/inroom-orders/102')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const ord = res.body.data[0];
    expect(ord.id).toBe(createdOrderId);
    expect(ord.orderStatus).toBe(OverallOrderStatus.SERVED);
    expect(ord.items).toHaveLength(2);
    expect(ord.cookingInstructions).toBe('Please deliver hot to Room 102');
  });

  test('5. Room 102 Live Stay & Master Folio reflect updated F&B itemized line item and balance', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/room-stay-details/102')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('x-hotel-id', hotelId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.folio).toBeDefined();

    const fol = res.body.data.folio;
    expect(fol.totalFoodAndBeverage).toBe(840);
    expect(fol.netAmountPayable).toBe(9618);
    expect(fol.dueAmount).toBe(6618);

    const diningLineItem = fol.lineItems.find((li: any) => li.department === 'ROOM_SERVICE');
    expect(diningLineItem).toBeDefined();
    expect(diningLineItem.netAmount).toBe(882);
    expect(diningLineItem.description).toContain('Paneer Tikka Angara x2');
  });
});
