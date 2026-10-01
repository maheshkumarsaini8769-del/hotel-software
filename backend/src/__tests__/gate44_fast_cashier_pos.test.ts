import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { UserRole, ShiftStatus } from '../types';
import { MenuItem, FoodType } from '../models/MenuItem';
import { KitchenStation } from '../models/KitchenStation';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { TaxRule, TaxType, TaxApplicability } from '../models/TaxRule';

describe('--- SHIFT 44 / GATE 44: FAST CASHIER COUNTER POS WITH THERMAL PRINT & DRAWER KICK ---', () => {
  let server: http.Server;
  const port = 5133; // Dedicated Port 5133 for Gate 44 Tier 1

  let tenantAId: string;
  let tenantBId: string;
  let cashierAToken: string;
  let cashierBToken: string;
  let menuItem1Id: string;
  let menuItem2Id: string;
  let testBillId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Express Counter A',
      slug: `express-a-${Date.now()}`,
      contactEmail: `cashier-a-${Date.now()}@spicehub.com`,
      contactPhone: '+91 99999 11111',
      currency: 'INR',
      status: 'ACTIVE',
      gstin: '29ABCDE1234F1Z5',
      fssai: '10019011000123',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Express Counter B',
      slug: `express-b-${Date.now()}`,
      contactEmail: `cashier-b-${Date.now()}@spicehub.com`,
      contactPhone: '+91 99999 22222',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Cashier Users
    const cashierA = await User.create({
      hotelId: tenantA._id,
      name: 'Priya Verma (Cashier A)',
      email: `priya-${Date.now()}@express.com`,
      phone: '+91 98765 11111',
      passwordHash: 'hashed_pw',
      role: UserRole.CASHIER,
      permissions: ['BILLING', 'FAST_POS'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    cashierAToken = jwt.sign(
      { userId: cashierA._id.toString(), role: UserRole.CASHIER, hotelId: tenantAId },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const cashierB = await User.create({
      hotelId: tenantB._id,
      name: 'Rohan (Cashier B)',
      email: `rohan-${Date.now()}@express.com`,
      phone: '+91 98765 22222',
      passwordHash: 'hashed_pw',
      role: UserRole.CASHIER,
      permissions: ['BILLING', 'FAST_POS'],
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    cashierBToken = jwt.sign(
      { userId: cashierB._id.toString(), role: UserRole.CASHIER, hotelId: tenantBId },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Create Kitchen Station & Menu Items
    const station = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'FAST_FOOD_COUNTER',
      screenToken: `kds_fast_${Date.now()}`,
      isOnline: true,
    });

    const mItem1 = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: new Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Paneer Kathi Roll',
      foodType: FoodType.VEG,
      basePrice: 150,
      hasVariants: false,
      itemCode: '101',
      barcode: '8901234567890',
      isAvailable: true,
      prepTimeMinutes: 5,
    });
    menuItem1Id = mItem1._id.toString();

    const mItem2 = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: new Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Chicken Shawarma Wrap',
      foodType: FoodType.NON_VEG,
      basePrice: 200,
      hasVariants: false,
      itemCode: '102',
      isAvailable: true,
      prepTimeMinutes: 7,
    });
    menuItem2Id = mItem2._id.toString();

    // 4. Create Active Cashier Shift Float
    await CashierShiftFloat.create({
      hotelId: tenantA._id,
      shiftNumber: `SHIFT-${Date.now()}`,
      cashierId: cashierA._id,
      cashierName: cashierA.name,
      terminalId: 'COUNTER_01',
      status: CashierShiftStatus.OPEN,
      openingFloat: 2000,
      totalCashCollected: 0,
      totalUpiCollected: 0,
      totalCardCollected: 0,
      totalChangeReturned: 0,
      expectedCashInDrawer: 2000,
      settlementCount: 0,
    });

    // 5. Create Tax Rule for Takeaway (5% GST)
    await TaxRule.create({
      hotelId: tenantA._id,
      taxName: 'GST 5% (Takeaway Counter)',
      taxType: TaxType.GST,
      applicableTo: TaxApplicability.TAKEAWAY,
      cgstRate: 2.5,
      sgstRate: 2.5,
      totalEffectiveRate: 5.0,
      isDefault: true,
      isActive: true,
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MenuItem.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await TaxRule.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. GET /api/v1/fast-cashier/lookup - Finds item by 10-key numeric shortcut "101"', async () => {
    const res = await request(server)
      .get('/api/v1/fast-cashier/lookup?code=101')
      .set('Authorization', `Bearer ${cashierAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.name).toBe('Paneer Kathi Roll');
    expect(res.body.item.basePrice).toBe(150);
  });

  it('2. GET /api/v1/fast-cashier/lookup - Finds item by barcode SKU "8901234567890"', async () => {
    const res = await request(server)
      .get('/api/v1/fast-cashier/lookup?code=8901234567890')
      .set('Authorization', `Bearer ${cashierAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.name).toBe('Paneer Kathi Roll');
  });

  it('3. POST /api/v1/fast-cashier/order - Creates fast takeaway order with sequential token number', async () => {
    const res = await request(server)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        items: [
          { menuItemId: menuItem1Id, quantity: 2 }, // 2 x 150 = 300
        ],
        customerName: 'Kunal Singhal',
        customerPhone: '+91 98765 43210',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tokenNumber).toBeGreaterThanOrEqual(1);
    expect(res.body.financials.subtotal).toBe(300);
    expect(res.body.financials.taxAmount).toBe(15); // 5% GST on 300 = 15
    expect(res.body.financials.grandTotal).toBe(315);
    expect(res.body.bill.billStatus).toBe('UNPAID');

    testBillId = res.body.bill._id;
  });

  it('4. POST /api/v1/fast-cashier/order - Cash order with tender automatically credits active CashierShiftFloat', async () => {
    const res = await request(server)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        items: [
          { menuItemId: menuItem2Id, quantity: 1 }, // 1 x 200 = 200
        ],
        paymentMethod: 'CASH',
        tenderAmount: 500, // 500 tendered, Grand total: 200 + 10 = 210, Change: 290
        customerName: 'Aarav Patel',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.financials.grandTotal).toBe(210);
    expect(res.body.financials.changeAmount).toBe(290);
    expect(res.body.bill.billStatus).toBe('PAID');

    // Verify active CashierShiftFloat updated
    const shift = await CashierShiftFloat.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      status: CashierShiftStatus.OPEN,
    });
    expect(shift).toBeTruthy();
    expect(shift!.totalCashCollected).toBe(500);
    expect(shift!.totalChangeReturned).toBe(290);
    expect(shift!.expectedCashInDrawer).toBe(2210); // 2000 opening + 210 net
    expect(shift!.settlementCount).toBe(1);
  });

  it('5. GET /api/v1/fast-cashier/queue - Returns live takeaway calling board queues', async () => {
    const res = await request(server)
      .get('/api/v1/fast-cashier/queue')
      .set('Authorization', `Bearer ${cashierAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalActiveTakeaways).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.preparingQueue)).toBe(true);
  });

  it('6. POST /api/v1/fast-cashier/thermal-receipt/:billId - Generates 80mm ESC/POS formatted receipt with GST breakdown', async () => {
    const res = await request(server)
      .post(`/api/v1/fast-cashier/thermal-receipt/${testBillId}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        width: '80mm',
        cutPaper: true,
        kickDrawer: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.width).toBe('80mm');
    expect(res.body.receiptText).toContain('SPICEHUB EXPRESS COUNTER A');
    expect(res.body.receiptText).toContain('GRAND TOTAL');
    expect(res.body.escposHex).toContain('1b40'); // Init command
    expect(res.body.escposHex).toContain('1d564103'); // Cut paper command
  });

  it('7. POST /api/v1/fast-cashier/thermal-receipt/:billId - Generates 58mm compact receipt with drawer kick command', async () => {
    const res = await request(server)
      .post(`/api/v1/fast-cashier/thermal-receipt/${testBillId}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        width: '58mm',
        kickDrawer: true,
        cutPaper: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.width).toBe('58mm');
    expect(res.body.drawerKicked).toBe(true);
    expect(res.body.escposHex).toContain('1b700019fa'); // Cash drawer kick pulse hex
  });

  it('8. POST /api/v1/fast-cashier/drawer-kick - Emits manual drawer kick pulse', async () => {
    const res = await request(server)
      .post('/api/v1/fast-cashier/drawer-kick')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        terminalId: 'COUNTER_01',
        reason: 'CHANGE_EXCHANGE',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.commandHex).toBe('1b700019fa');
    expect(res.body.drawerStatus).toBe('KICKED_OPEN');
  });

  it('9. POST /api/v1/fast-cashier/settle-split - Settles counter split tender (Cash + UPI) and triggers drawer kick', async () => {
    // Due amount is 315 on testBillId
    const res = await request(server)
      .post('/api/v1/fast-cashier/settle-split')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        billId: testBillId,
        payments: [
          { mode: 'CASH', amount: 115 },
          { mode: 'UPI', amount: 200, reference: 'UPI-REF-9988' },
        ],
        tenderAmount: 200, // 200 cash tendered for 115 cash portion -> 85 change
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bill.billStatus).toBe('PAID');
    expect(res.body.financials.cashPortion).toBe(115);
    expect(res.body.financials.upiPortion).toBe(200);
    expect(res.body.financials.changeGiven).toBe(85);
    expect(res.body.drawerKicked).toBe(true);
    expect(res.body.drawerKickCommand).toBe('1b700019fa');

    // Re-attempt settling already paid bill should reject
    const duplicateRes = await request(server)
      .post('/api/v1/fast-cashier/settle-split')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        billId: testBillId,
        payments: [{ mode: 'CASH', amount: 315 }],
      });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.errorCode).toBe('ALREADY_PAID');
  });

  it('10. Strict Multi-Tenant Isolation: Tenant B cannot generate receipt or settle Tenant A bill', async () => {
    const res = await request(server)
      .post(`/api/v1/fast-cashier/thermal-receipt/${testBillId}`)
      .set('Authorization', `Bearer ${cashierBToken}`)
      .send({ width: '80mm' });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('BILL_NOT_FOUND');
  });
});
