import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { MultiTenderSettlement, TenderMethod, SettlementStatus } from '../models/MultiTenderSettlement';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';

describe('--- SHIFT 41 / GATE 41 TIER 2: ULTRA-DEEP CONCURRENCY & MULTI-TENDER DRILL ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let cashierId: string;
  let shiftId: string;
  let bills: any[] = [];

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Megaplex Cashiering',
      slug: `megaplex-cash-${Date.now()}`,
      contactEmail: `megaplex_cash_${Date.now()}@spicehub.in`,
      contactPhone: '9877700001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Cash Counter',
      slug: `rival-cash-${Date.now()}`,
      contactEmail: `rival_cash_${Date.now()}@spicehub.in`,
      contactPhone: '9877700002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    cashierId = new Types.ObjectId().toString();

    // Open shift float with ₹5,000 opening cash
    const shift = await CashierShiftFloat.create({
      hotelId: tenantA._id,
      shiftNumber: `SFT-STRESS-${Date.now()}`,
      cashierId: new Types.ObjectId(cashierId),
      cashierName: 'Super Cashier',
      openingFloat: 5000,
      expectedCashInDrawer: 5000,
      status: CashierShiftStatus.OPEN,
      openedAt: new Date(),
    });
    shiftId = shift._id.toString();

    // Seed 10 tables and 10 unpaid bills (₹1,000 each)
    for (let i = 1; i <= 10; i++) {
      const table = await DiningTable.create({
        hotelId: tenantA._id,
        tableNumber: `T-TENDER-${i}`,
        capacity: 4,
        currentStatus: TableStatus.BILLING,
      });

      const bill = await RestaurantBill.create({
        hotelId: tenantA._id,
        billNumber: `BILL-STRESS-${100 + i}`,
        tableId: table._id,
        subTotal: 952.38,
        totalTax: 47.62,
        grandTotal: 1000,
        paidAmount: 0,
        dueAmount: 1000,
        billStatus: BillStatus.UNPAID,
      });

      bills.push(bill);
    }
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MultiTenderSettlement.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  it('1. Concurrency Storm: 10 Cashier Terminals simultaneously settle 10 different bills with split tenders', async () => {
    const promises = bills.map((bill, idx) =>
      request(app)
        .post('/api/v1/multi-tender/settle')
        .set('x-hotel-id', tenantAId)
        .send({
          billId: bill._id.toString(),
          idempotencyKey: `IDEMP-PARALLEL-${idx}-${Date.now()}`,
          cashierId,
          cashierName: 'Super Cashier',
          tenders: [
            { method: TenderMethod.CASH, amount: 600, cashReceived: 1000 }, // Change: ₹400
            { method: TenderMethod.UPI, amount: 400, referenceNumber: `UPI-REF-${idx}` },
          ],
        })
    );

    const responses = await Promise.all(promises);
    responses.forEach((res) => {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.settlement.totalSettledAmount).toBe(1000);
      expect(res.body.totalChangeReturned).toBe(400);
    });

    // Verify all 10 bills are now PAID
    const paidCount = await RestaurantBill.countDocuments({
      hotelId: new Types.ObjectId(tenantAId),
      billStatus: BillStatus.PAID,
    });
    expect(paidCount).toBe(10);
  });

  it('2. Race Condition Prevention: Multiple concurrent settlement attempts with same idempotency key return exact single settlement', async () => {
    const targetBill = bills[0];
    const sharedIdempotencyKey = `DOUBLE-SPEND-LOCK-${Date.now()}`;

    // Fire 5 identical requests at the same time
    const concurrentCalls = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/v1/multi-tender/settle')
        .set('x-hotel-id', tenantAId)
        .send({
          billId: targetBill._id.toString(),
          idempotencyKey: sharedIdempotencyKey,
          cashierId,
          cashierName: 'Super Cashier',
          tenders: [{ method: TenderMethod.CASH, amount: 1000 }],
        })
    );

    const results = await Promise.all(concurrentCalls);
    // Since bill[0] was already paid in drill 1, either 200 (idempotent replay) or 400 (already paid)
    // There must be exactly 0 duplicate MultiTenderSettlement records created with this key
    const settlementsCount = await MultiTenderSettlement.countDocuments({
      hotelId: new Types.ObjectId(tenantAId),
      idempotencyKey: sharedIdempotencyKey,
    });
    expect(settlementsCount).toBeLessThanOrEqual(1);
  });

  it('3. Mathematical Drawer Accuracy: Cashier drawer recomputes exact collections after mass split settlements', async () => {
    const updatedShift = await CashierShiftFloat.findById(shiftId);
    expect(updatedShift).toBeDefined();

    // 10 bills settled:
    // Cash per bill = ₹600 -> Total Cash = ₹6,000
    // Change returned per bill = ₹400 -> Total Change = ₹4,000
    // UPI per bill = ₹400 -> Total UPI = ₹4,000
    // Expected in drawer = Opening Float (5000) + Cash (6000) - Change (4000) = ₹7,000
    expect(updatedShift!.totalCashCollected).toBe(6000);
    expect(updatedShift!.totalChangeReturned).toBe(4000);
    expect(updatedShift!.totalUpiCollected).toBe(4000);
    expect(updatedShift!.expectedCashInDrawer).toBe(7000);
    expect(updatedShift!.settlementCount).toBe(10);
  });

  it('4. Multi-Tenant Sabotage Defense Drill: Tenant B cannot inspect Tenant A reconciliation summary', async () => {
    const res = await request(app)
      .get('/api/v1/multi-tender/reconciliation/summary')
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.summary.settlementCount).toBe(0);
    expect(res.body.summary.grandTotalRevenue).toBe(0);
    expect(res.body.summary.totalCash).toBe(0);
  });
});
