import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { KitchenStation } from '../models/KitchenStation';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem, FoodType } from '../models/MenuItem';
import { RestaurantOrder, OverallOrderStatus, ItemProductionStatus } from '../models/RestaurantOrder';
import { ServiceRequest, ServiceRequestType, ServiceRequestStatus } from '../models/ServiceRequest';

describe('--- GATE 85: CUSTOMER ORDER CANCELLATION, SERVICE ISSUES & TABLE DEPARTURE ---', () => {
  let tenantId: string;
  let tableId: string;
  let stationId: string;
  let menuItemId: string;
  let outOfStockItemId: string;
  let tableSessionId: string;
  let ephemeralToken: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant
    const tenant = await Tenant.create({
      name: 'SpiceHub Luxury Suites & Dine',
      slug: 'spicehub-luxury-dine',
      contactEmail: 'luxury@spicehub.com',
      contactPhone: '9876543299',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    // 2. Setup Kitchen Station
    const station = await KitchenStation.create({
      hotelId: tenant._id,
      stationName: 'MAIN_KITCHEN',
      screenToken: 'station_main_token_85',
    });
    stationId = station._id.toString();

    // 3. Setup Category & Dishes
    const category = await MenuCategory.create({
      hotelId: tenant._id,
      name: 'Main Course',
      slug: 'main-course-85',
      kitchenStationId: station._id,
    });

    const activeDish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Dal Makhani Royal',
      foodType: FoodType.VEG,
      basePrice: 320,
      isAvailable: true,
    });
    menuItemId = activeDish._id.toString();

    const soldOutDish = await MenuItem.create({
      hotelId: tenant._id,
      categoryId: category._id,
      kitchenStationId: station._id,
      name: 'Seasonal Truffle Curry',
      foodType: FoodType.VEG,
      basePrice: 650,
      isAvailable: false, // 86 Out of Stock
    });
    outOfStockItemId = soldOutDish._id.toString();

    // 4. Setup Dining Table & Table Session
    const table = await DiningTable.create({
      hotelId: tenant._id,
      tableNumber: 'T-85',
      capacity: 4,
      currentStatus: TableStatus.AVAILABLE,
    });
    tableId = table._id.toString();

    // Start Session & get ephemeral token via QR entry
    const startRes = await request(app)
      .get(`/api/v1/pos/table/qr-entry?hotelId=${tenantId}&tableId=${tableId}`)
      .send();

    expect(startRes.status).toBe(200);
    expect(startRes.body.success).toBe(true);
    tableSessionId = startRes.body.data.sessionId;
    ephemeralToken = startRes.body.data.sessionToken;
  });

  afterAll(async () => {
    // Cleanup created test records
    await Tenant.deleteMany({ _id: tenantId });
    await DiningTable.deleteMany({ hotelId: tenantId });
    await TableSession.deleteMany({ hotelId: tenantId });
    await KitchenStation.deleteMany({ hotelId: tenantId });
    await MenuCategory.deleteMany({ hotelId: tenantId });
    await MenuItem.deleteMany({ hotelId: tenantId });
    await RestaurantOrder.deleteMany({ hotelId: tenantId });
    await ServiceRequest.deleteMany({ hotelId: tenantId });
    await mongoose.connection.close();
  });

  it('1. Should block ordering of Out-of-Stock (86) item by customer', async () => {
    const res = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-idempotency-key', `ORD_86_TEST_${Date.now()}`)
      .send({
        hotelId: tenantId,
        tableSessionId,
        items: [
          {
            menuItemId: outOfStockItemId,
            quantity: 1,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ITEM_UNAVAILABLE');
    expect(res.body.message).toContain('out of stock');
  });

  it('2. Should place a valid food order and allow customer to cancel within 120s grace period', async () => {
    // A. Place valid order
    const orderRes = await request(app)
      .post('/api/v1/pos/orders/place')
      .set('x-idempotency-key', `ORD_CANCEL_TEST_${Date.now()}`)
      .send({
        hotelId: tenantId,
        tableSessionId,
        items: [
          {
            menuItemId,
            quantity: 2,
          },
        ],
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data._id;
    expect(orderRes.body.data.orderStatus).toBe(OverallOrderStatus.PLACED);

    // B. Customer cancels order within 120s window
    const cancelRes = await request(app)
      .post(`/api/v1/pos/orders/${orderId}/cancel-customer`)
      .set('x-hotel-id', tenantId)
      .send({ reason: 'Ordered by mistake / Change of mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.orderStatus).toBe(OverallOrderStatus.CANCELLED);
    expect(cancelRes.body.data.items[0].itemStatus).toBe(ItemProductionStatus.CANCELLED);

    // Verify DB record
    const updatedDbOrder = await RestaurantOrder.findById(orderId);
    expect(updatedDbOrder?.orderStatus).toBe(OverallOrderStatus.CANCELLED);
  });

  it('3. Should REJECT cancellation if order status has moved to PREPARING', async () => {
    // Create an order directly in PREPARING status
    const preparingOrder = await RestaurantOrder.create({
      hotelId: tenantId,
      tableSessionId,
      tableId,
      orderNumber: `ORD-PREP-${Date.now()}`,
      idempotencyKey: `IDEM-PREP-${Date.now()}`,
      orderType: 'DINE_IN',
      orderStatus: OverallOrderStatus.PREPARING,
      placedAt: new Date(),
      items: [
        {
          menuItemId,
          kitchenStationId: stationId,
          name: 'Dal Makhani Royal',
          quantity: 1,
          unitPrice: 320,
          subtotal: 320,
          itemStatus: ItemProductionStatus.PREPARING,
        },
      ],
    });

    const cancelRes = await request(app)
      .post(`/api/v1/pos/orders/${preparingOrder._id}/cancel-customer`)
      .set('x-hotel-id', tenantId)
      .send({ reason: 'Too late' });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.errorCode).toBe('FOOD_ALREADY_IN_PRODUCTION');
    expect(cancelRes.body.message).toContain('Food preparation has already started in the kitchen');
  });

  it('4. Should create Service Request when customer calls waiter for WATER or BILL', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.WATER,
        notes: 'Cold water please',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestType).toBe(ServiceRequestType.WATER);
    expect([ServiceRequestStatus.CREATED, 'ESCALATED_FALLBACK']).toContain(res.body.data.status);
  });

  it('5. Should create Service Request with URGENT priority when customer reports FOOD_ISSUE', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.FOOD_ISSUE,
        priority: 'URGENT',
        notes: '[FOOD PROBLEM] Food is cold / Thanda hai - Please reheat or check',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestType).toBe(ServiceRequestType.FOOD_ISSUE);
    expect(res.body.data.priority).toBe('URGENT');
  });

  it('6. Should handle TABLE_VACATED request and automatically transition Table to CLEANING status', async () => {
    // Ensure table is currently OCCUPIED
    await DiningTable.findByIdAndUpdate(tableId, { currentStatus: TableStatus.OCCUPIED });

    const res = await request(app)
      .post('/api/v1/requests')
      .send({
        hotelId: tenantId,
        tableId,
        tableSessionId,
        requestType: ServiceRequestType.TABLE_VACATED,
        notes: 'Guest has vacated the table. Ready for sanitization.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestType).toBe(ServiceRequestType.TABLE_VACATED);

    // Verify DiningTable status in DB has changed to CLEANING
    const tableInDb = await DiningTable.findById(tableId);
    expect(tableInDb?.currentStatus).toBe(TableStatus.CLEANING);
  });
});
