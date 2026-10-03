import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { MasterFolio } from '../models/MasterFolio';
import { MultiTenderSettlement, TenderMethod, SettlementStatus } from '../models/MultiTenderSettlement';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';

describe('--- SHIFT 41 / GATE 41: MULTI-TENDER SPLIT PAYMENT & CASHIER SHIFT FLOAT ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let cashierId: string;
  let managerId: string;
  let tableId: string;
  let billAId: string;
  let billBId: string;
  let folioId: string;
  let shiftId: string;
  let settlementAId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }


    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Dining Lounge',
      slug: `grand-tender-${Date.now()}`,
      contactEmail: `tender_${Date.now()}@spicehub.in`,
      contactPhone: '9866600001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Bistro Cashier',
      slug: `bistro-tender-${Date.now()}`,
      contactEmail: `bistro_tender_${Date.now()}@spicehub.in`,
      contactPhone: '9866600002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    cashierId = new Types.ObjectId().toString();
    managerId = new Types.ObjectId().toString();

    // 3. Create Table for Tenant A
    const table = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'T-10',
      floorLevel: 'Ground Floor',
      capacity: 6,
      currentStatus: TableStatus.BILLING,
    });
    tableId = table._id.toString();

    // 4. Create Bill A (Grand Total ₹5,000)
    const billA = await RestaurantBill.create({
      hotelId: tenantA._id,
      billNumber: `BILL-MT-101`,
      tableId: table._id,
      subTotal: 4761.9,
      taxBreakup: [{ taxName: 'GST', rate: 5, amount: 238.1 }],
      totalTax: 238.1,
      grandTotal: 5000,
      paidAmount: 0,
      dueAmount: 5000,
      billStatus: BillStatus.UNPAID,
    });
    billAId = billA._id.toString();

    // 5. Create Bill B (Grand Total ₹1,200)
    const billB = await RestaurantBill.create({
      hotelId: tenantA._id,
      billNumber: `BILL-MT-102`,
      tableId: table._id,
      subTotal: 1142.86,
      taxBreakup: [{ taxName: 'GST', rate: 5, amount: 57.14 }],
      totalTax: 57.14,
      grandTotal: 1200,
      paidAmount: 0,
      dueAmount: 1200,
      billStatus: BillStatus.UNPAID,
    });
    billBId = billB._id.toString();

    // 6. Create MasterFolio for Room 302
    const folio = await MasterFolio.create({
      hotelId: tenantA._id,
      stayId: new Types.ObjectId(),
      bookingId: new Types.ObjectId(),
      roomId: new Types.ObjectId(),
      folioNumber: 'FOLIO-302',
      totalRoomTariff: 4500,
      totalFoodAndBeverage: 0,
      netAmountPayable: 4500,
      paidAmount: 0,
      dueAmount: 4500,
      folioStatus: 'OPEN',
    });
    folioId = folio._id.toString();
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });
    await DiningTable.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await RestaurantBill.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await MultiTenderSettlement.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await CashierShiftFloat.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
  });

  it('1. POST /api/v1/multi-tender/shift/open - Cashier opens shift with ₹2,000 cash float', async () => {
    const res = await request(app)
      .post('/api/v1/multi-tender/shift/open')
      .set('x-hotel-id', tenantAId)
      .send({
        cashierId,
        cashierName: 'Ravi Cashier',
        openingFloat: 2000,
        terminalId: 'POS_MAIN_01',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.shift).toBeDefined();
    expect(res.body.shift.openingFloat).toBe(2000);
    expect(res.body.shift.expectedCashInDrawer).toBe(2000);
    expect(res.body.shift.status).toBe(CashierShiftStatus.OPEN);

    shiftId = res.body.shift._id;
  });

  it('2. POST /api/v1/multi-tender/settle - Rejects settlement when tenders sum does not match bill total', async () => {
    const res = await request(app)
      .post('/api/v1/multi-tender/settle')
      .set('x-hotel-id', tenantAId)
      .send({
        billId: billAId,
        idempotencyKey: `IDEMP-MISMATCH-${Date.now()}`,
        cashierId,
        cashierName: 'Ravi Cashier',
        tenders: [
          { method: TenderMethod.CASH, amount: 2500 },
          { method: TenderMethod.UPI, amount: 1500 }, // Total 4000 vs 5000 required
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not equal bill due amount');
  });

  it('3. POST /api/v1/multi-tender/settle - Settle ₹5,000 bill with 3-Way Split (Cash + UPI + Card) with change returned', async () => {
    const idempotencyKey = `IDEMP-SUCCESS-5K-${Date.now()}`;
    const res = await request(app)
      .post('/api/v1/multi-tender/settle')
      .set('x-hotel-id', tenantAId)
      .send({
        billId: billAId,
        idempotencyKey,
        cashierId,
        cashierName: 'Ravi Cashier',
        tenders: [
          {
            method: TenderMethod.CASH,
            amount: 3000,
            cashReceived: 3500, // Customer handed ₹3,500 cash
          },
          {
            method: TenderMethod.UPI,
            amount: 1500,
            referenceNumber: 'UPI-UTR-99887766',
          },
          {
            method: TenderMethod.CARD,
            amount: 500,
            referenceNumber: 'CARD-4321-AUTH-771',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.settlement).toBeDefined();
    expect(res.body.settlement.totalSettledAmount).toBe(5000);
    expect(res.body.settlement.totalCashChangeReturned).toBe(500); // 3500 - 3000

    settlementAId = res.body.settlement._id;

    // Verify Bill updated to PAID
    const dbBill = await RestaurantBill.findById(billAId);
    expect(dbBill!.billStatus).toBe(BillStatus.PAID);
    expect(dbBill!.dueAmount).toBe(0);
    expect(dbBill!.paidAmount).toBe(5000);

    // Verify Table updated to PAYMENT_SETTLED
    const dbTable = await DiningTable.findById(tableId);
    expect(dbTable!.currentStatus).toBe(TableStatus.PAYMENT_SETTLED);

    // Verify Cashier Shift updated
    const dbShift = await CashierShiftFloat.findById(shiftId);
    expect(dbShift!.totalCashCollected).toBe(3000);
    expect(dbShift!.totalChangeReturned).toBe(500);
    expect(dbShift!.totalUpiCollected).toBe(1500);
    expect(dbShift!.totalCardCollected).toBe(500);
    expect(dbShift!.expectedCashInDrawer).toBe(2000 + 3000 - 500); // 4500
    expect(dbShift!.settlementCount).toBe(1);
  });

  it('4. POST /api/v1/multi-tender/settle - Idempotency Key prevents duplicate payment deduction', async () => {
    // Replay settlement with exact same idempotencyKey
    const existingSettlement = await MultiTenderSettlement.findById(settlementAId);
    const res = await request(app)
      .post('/api/v1/multi-tender/settle')
      .set('x-hotel-id', tenantAId)
      .send({
        billId: billAId,
        idempotencyKey: existingSettlement!.idempotencyKey,
        cashierId,
        cashierName: 'Ravi Cashier',
        tenders: [{ method: TenderMethod.CASH, amount: 5000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('already processed');
    expect(res.body.settlement._id).toBe(settlementAId);
  });

  it('5. POST /api/v1/multi-tender/settle - Settle second bill with ROOM_FOLIO charge posting', async () => {
    const res = await request(app)
      .post('/api/v1/multi-tender/settle')
      .set('x-hotel-id', tenantAId)
      .send({
        billId: billBId,
        idempotencyKey: `IDEMP-ROOM-FOLIO-${Date.now()}`,
        cashierId,
        cashierName: 'Ravi Cashier',
        tenders: [
          {
            method: TenderMethod.ROOM_FOLIO,
            amount: 1200,
            referenceNumber: 'FOLIO-302',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify Room Folio debited
    const dbFolio = await MasterFolio.findById(folioId);
    expect(dbFolio!.totalFoodAndBeverage).toBe(1200);
    expect(dbFolio!.netAmountPayable).toBe(4500 + 1200);
    expect(dbFolio!.dueAmount).toBe(4500 + 1200);
  });

  it('6. GET /api/v1/multi-tender/reconciliation/summary - Comprehensive tender method breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/multi-tender/reconciliation/summary')
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.settlementCount).toBe(2);
    expect(res.body.summary.grandTotalRevenue).toBe(6200); // 5000 + 1200
    expect(res.body.summary.totalCash).toBe(3000);
    expect(res.body.summary.totalUpi).toBe(1500);
    expect(res.body.summary.totalCard).toBe(500);
    expect(res.body.summary.totalRoomFolio).toBe(1200);
    expect(res.body.summary.totalChangeReturned).toBe(500);
    expect(res.body.summary.netCashInDrawer).toBe(2500); // 3000 - 500
  });

  it('7. POST /api/v1/multi-tender/shift/close - Closes cashier shift with physical cash count matching drawer', async () => {
    const res = await request(app)
      .post('/api/v1/multi-tender/shift/close')
      .set('x-hotel-id', tenantAId)
      .send({
        shiftId,
        actualCashCounted: 4500, // Exactly matches 2000 float + 2500 net cash
        notes: 'Evening shift closed clean. All drawer notes reconciled.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.shift.status).toBe(CashierShiftStatus.CLOSED);
    expect(res.body.shift.cashVariance).toBe(0);
  });

  it('8. POST /api/v1/multi-tender/settlement/:id/void - Manager voids settlement and reverts bill to UNPAID', async () => {
    const res = await request(app)
      .post(`/api/v1/multi-tender/settlement/${settlementAId}/void`)
      .set('x-hotel-id', tenantAId)
      .send({
        managerId,
        voidReason: 'Guest disputed split ratio and paid via corporate account',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settlement.status).toBe(SettlementStatus.VOIDED);

    // Verify bill reverted
    const dbBill = await RestaurantBill.findById(billAId);
    expect(dbBill!.billStatus).toBe(BillStatus.UNPAID);
    expect(dbBill!.dueAmount).toBe(5000);
    expect(dbBill!.paidAmount).toBe(0);
  });

  it('9. Strict Multi-Tenant Isolation: Tenant B cannot access or settle Tenant A bills', async () => {
    const res = await request(app)
      .post('/api/v1/multi-tender/settle')
      .set('x-hotel-id', tenantBId) // Tenant B header
      .send({
        billId: billAId,
        idempotencyKey: `IDEMP-CROSS-TENANT-${Date.now()}`,
        cashierId,
        cashierName: 'Rival Cashier',
        tenders: [{ method: TenderMethod.CASH, amount: 5000 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Restaurant bill not found');
  });
});
