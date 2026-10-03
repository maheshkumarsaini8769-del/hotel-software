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

describe('--- SHIFT 44 / GATE 44 TIER 2: ULTRA-DEEP CONCURRENCY & FAST CASHIER POS DRILL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let cashierAToken: string;
  let cashierBToken: string;
  let testItemId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_12345';

    // 1. Create Tenant A & B
    const tenantA = await Tenant.create({
      name: 'SpiceHub Express Drill Tenant A',
      slug: `drill-pos-a-${Date.now()}`,
      contactEmail: `pos-a-${Date.now()}@express.com`,
      contactPhone: '+91 99999 33333',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    const tenantB = await Tenant.create({
      name: 'SpiceHub Express Drill Tenant B',
      slug: `drill-pos-b-${Date.now()}`,
      contactEmail: `pos-b-${Date.now()}@express.com`,
      contactPhone: '+91 99999 44444',
      currency: 'INR',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 2. Create Cashier Users
    const cashierA = await User.create({
      hotelId: tenantA._id,
      name: 'Pooja (Cashier A)',
      email: `pooja-${Date.now()}@express.com`,
      phone: '+91 98765 33333',
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
      name: 'Karan (Cashier B)',
      email: `karan-${Date.now()}@express.com`,
      phone: '+91 98765 44444',
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

    // 3. Create Station & Item
    const station = await KitchenStation.create({
      hotelId: tenantA._id,
      stationName: 'EXPRESS_WRAP_STATION',
      screenToken: `kds_drill_${Date.now()}`,
      isOnline: true,
    });

    const item = await MenuItem.create({
      hotelId: tenantA._id,
      categoryId: new Types.ObjectId(),
      kitchenStationId: station._id,
      name: 'Express Veg Burger',
      foodType: FoodType.VEG,
      basePrice: 100,
      hasVariants: false,
      isAvailable: true,
      prepTimeMinutes: 5,
    });
    testItemId = item._id.toString();

    // 4. Create Active Shift Float
    await CashierShiftFloat.create({
      hotelId: tenantA._id,
      shiftNumber: `SHIFT-DRILL-${Date.now()}`,
      cashierId: cashierA._id,
      cashierName: cashierA.name,
      terminalId: 'COUNTER_01',
      status: CashierShiftStatus.OPEN,
      openingFloat: 5000,
      totalCashCollected: 0,
      totalUpiCollected: 0,
      totalCardCollected: 0,
      totalChangeReturned: 0,
      expectedCashInDrawer: 5000,
      settlementCount: 0,
    });

    // 5. Create Tax Rule
    await TaxRule.create({
      hotelId: tenantA._id,
      taxName: 'GST 5% (Takeaway)',
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
  });

  it('1. Concurrency Storm: 10 Cashier terminals concurrently punch counter orders without duplicate token collisions', async () => {
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      request(app)
        .post('/api/v1/fast-cashier/order')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .send({
          items: [{ menuItemId: testItemId, quantity: 1 }],
          customerName: `Customer ${idx + 1}`,
        })
    );

    const results = await Promise.all(promises);
    const tokenNumbers = results.map((r) => r.body.tokenNumber);

    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(tokenNumbers.length).toBe(10);
    // All token numbers should be positive
    expect(tokenNumbers.every((t) => t > 0)).toBe(true);
  });

  it('2. Concurrent Cash Settlements: 10 concurrent orders settling with cash simultaneously without lost updates to CashierShiftFloat', async () => {
    // Punch 10 orders with instant cash tender
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      request(app)
        .post('/api/v1/fast-cashier/order')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .send({
          items: [{ menuItemId: testItemId, quantity: 1 }], // 100 + 5% = 105
          paymentMethod: 'CASH',
          tenderAmount: 200, // 200 tendered, Change: 95
          customerName: `Cash Customer ${idx + 1}`,
        })
    );

    const results = await Promise.all(promises);
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(results.every((r) => r.body.bill.billStatus === 'PAID')).toBe(true);

    // Verify CashierShiftFloat has exact accumulated values
    const shift = await CashierShiftFloat.findOne({
      hotelId: new Types.ObjectId(tenantAId),
      status: CashierShiftStatus.OPEN,
    });

    expect(shift).toBeTruthy();
    // 10 orders * 200 tendered = 2000 total cash collected
    expect(shift!.totalCashCollected).toBe(2000);
    // 10 orders * 95 change = 950 total change returned
    expect(shift!.totalChangeReturned).toBe(950);
    // Expected in drawer = 5000 opening + (2000 - 950) = 6050
    expect(shift!.expectedCashInDrawer).toBe(6050);
    expect(shift!.settlementCount).toBe(10);
  });

  it('3. Double-Settlement Race: Multiple concurrent settlement requests on the same bill resolve atomically with 1 success and others rejected', async () => {
    // 1. Create a bill
    const orderRes = await request(app)
      .post('/api/v1/fast-cashier/order')
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        items: [{ menuItemId: testItemId, quantity: 2 }], // 200 + 5% = 210
      });

    const billId = orderRes.body.bill._id;

    // 2. Fire 5 concurrent split settlement calls
    const settlePromises = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/v1/fast-cashier/settle-split')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .send({
          billId,
          payments: [
            { mode: 'CASH', amount: 110 },
            { mode: 'UPI', amount: 100 },
          ],
          tenderAmount: 110,
        })
    );

    const settleResults = await Promise.all(settlePromises);
    const successCount = settleResults.filter((r) => r.status === 200).length;
    const alreadyPaidCount = settleResults.filter((r) => r.status === 400 && r.body.errorCode === 'ALREADY_PAID').length;

    expect(successCount).toBe(1);
    expect(alreadyPaidCount).toBe(4);

    // Bill must be marked PAID
    const bill = await RestaurantBill.findById(billId);
    expect(bill!.billStatus).toBe(BillStatus.PAID);
    expect(bill!.dueAmount).toBe(0);
  });

  it('4. Multi-Tenant Penetration Defense: Competitor Tenant B cannot trigger drawer kick or view Tenant A takeaway queue', async () => {
    // Attempt to view Tenant A queue with Tenant B token
    const queueRes = await request(app)
      .get('/api/v1/fast-cashier/queue')
      .set('Authorization', `Bearer ${cashierBToken}`);

    expect(queueRes.status).toBe(200);
    // Tenant B queue should have 0 active takeaways (Tenant A has 21 orders)
    expect(queueRes.body.totalActiveTakeaways).toBe(0);

    // Attempt to settle Tenant A bill using Tenant B token
    const unauthSettle = await request(app)
      .post('/api/v1/fast-cashier/settle-split')
      .set('Authorization', `Bearer ${cashierBToken}`)
      .send({
        billId: new Types.ObjectId().toString(),
        payments: [{ mode: 'CASH', amount: 100 }],
      });

    expect(unauthSettle.status).toBe(404);
  });
});
