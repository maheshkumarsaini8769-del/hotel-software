import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { TableSession } from '../models/TableSession';
import { SeatSubFolio, SubFolioStatus } from '../models/SeatSubFolio';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';

describe('--- SHIFT 35 / GATE 35: INDEPENDENT SEAT-LEVEL BILLING & SUB-FOLIO SETTLEMENT ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tableId: string;
  let subFolioAId: string;
  let subFolioBId: string;
  let subFolioMergeTargetId: string;
  let subFolioMergeSourceId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    const port = 5115;
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Food Hall',
      slug: `food-hall-${Date.now()}`,
      contactEmail: `foodhall_${Date.now()}@spicehub.in`,
      contactPhone: '9866600001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Bistro',
      slug: `rival-bistro-${Date.now()}`,
      contactEmail: `rivalbistro_${Date.now()}@spicehub.in`,
      contactPhone: '9866600002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Community Table COMM-01 with 4 seats
    const table = await DiningTable.create({
      hotelId: tenantA._id,
      tableNumber: 'COMM-01',
      section: 'COMMUNITY_ZONE',
      capacity: 4,
      currentStatus: TableStatus.PARTIALLY_OCCUPIED,
      isCommunityTable: true,
      allowCoDining: true,
      availableSeatsCount: 1,
      occupiedSeatsCount: 3,
      seats: [
        { seatNumber: 1, seatLabel: 'Seat 1', status: SeatStatus.OCCUPIED, guestName: 'Rohan & Neha' },
        { seatNumber: 2, seatLabel: 'Seat 2', status: SeatStatus.OCCUPIED, guestName: 'Rohan & Neha' },
        { seatNumber: 3, seatLabel: 'Seat 3', status: SeatStatus.OCCUPIED, guestName: 'Amit Verma' },
        { seatNumber: 4, seatLabel: 'Seat 4', status: SeatStatus.AVAILABLE },
      ],
    });
    tableId = table._id.toString();
  });

  afterAll(async () => {
    await server.close();
    await mongoose.connection.close();
  });

  it('1. POST /api/v1/seat-billing/sub-folio creates SubFolio A for Seats 1 & 2 (Rohan & Neha)', async () => {
    const res = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId,
        seatNumbers: [1, 2],
        customerName: 'Rohan & Neha',
        customerPhone: '9811122233',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.customerName).toBe('Rohan & Neha');
    expect(res.body.subFolio.seatNumbers).toEqual([1, 2]);
    expect(res.body.subFolio.status).toBe(SubFolioStatus.OPEN);

    subFolioAId = res.body.subFolio._id;
  });

  it('2. POST /api/v1/seat-billing/sub-folio creates SubFolio B for Seat 3 (Amit Verma)', async () => {
    const res = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId,
        seatNumbers: [3],
        customerName: 'Amit Verma',
        customerPhone: '9844455566',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.customerName).toBe('Amit Verma');
    expect(res.body.subFolio.seatNumbers).toEqual([3]);
    expect(res.body.subFolio.status).toBe(SubFolioStatus.OPEN);

    subFolioBId = res.body.subFolio._id;
  });

  it('3. POST /api/v1/seat-billing/sub-folio/:subFolioId/items adds items to SubFolio A with 5% GST', async () => {
    const res = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioAId}/items`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [
          {
            menuItemId: new Types.ObjectId(),
            name: 'Butter Chicken',
            quantity: 1,
            unitPrice: 450,
            seatNumber: 1,
          },
          {
            menuItemId: new Types.ObjectId(),
            name: 'Garlic Naan',
            quantity: 2,
            unitPrice: 70, // 140
            seatNumber: 2,
          },
        ],
      });

    // Subtotal = 450 + 140 = 590
    // CGST (2.5%) = 15, SGST (2.5%) = 15, totalTax = 30
    // Grand Total = 620
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.subTotal).toBe(590);
    expect(res.body.subFolio.cgstAmount).toBe(15);
    expect(res.body.subFolio.sgstAmount).toBe(15);
    expect(res.body.subFolio.totalTax).toBe(30);
    expect(res.body.subFolio.grandTotal).toBe(620);
    expect(res.body.subFolio.dueAmount).toBe(620);
  });

  it('4. POST /api/v1/seat-billing/sub-folio/:subFolioId/items adds items to SubFolio B with 5% GST', async () => {
    const res = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioBId}/items`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [
          {
            menuItemId: new Types.ObjectId(),
            name: 'Paneer Tikka',
            quantity: 1,
            unitPrice: 320,
            seatNumber: 3,
          },
          {
            menuItemId: new Types.ObjectId(),
            name: 'Fresh Lime Soda',
            quantity: 1,
            unitPrice: 80,
            seatNumber: 3,
          },
        ],
      });

    // Subtotal = 320 + 80 = 400
    // CGST (2.5%) = 10, SGST (2.5%) = 10, totalTax = 20
    // Grand Total = 420
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.subTotal).toBe(400);
    expect(res.body.subFolio.totalTax).toBe(20);
    expect(res.body.subFolio.grandTotal).toBe(420);
    expect(res.body.subFolio.dueAmount).toBe(420);
  });

  it('5. GET /api/v1/seat-billing/table/:tableId retrieves all open sub-folios side-by-side', async () => {
    const res = await request(app)
      .get(`/api/v1/seat-billing/table/${tableId}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    // Total table outstanding = 620 + 420 = 1040
    expect(res.body.totalTableOutstanding).toBe(1040);
  });

  it('6. POST /api/v1/seat-billing/sub-folio/:subFolioId/settle settles SubFolio B via UPI independently', async () => {
    const res = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioBId}/settle`)
      .set('x-hotel-id', tenantAId)
      .send({
        paymentMethod: 'UPI',
        transactionRef: 'UPI-UTR-9988776655',
        paidAmount: 420,
        settledByStaffName: 'Vikram Cashier',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.status).toBe(SubFolioStatus.SETTLED);
    expect(res.body.subFolio.paymentMethod).toBe('UPI');
    expect(res.body.subFolio.dueAmount).toBe(0);

    // Official bill generated
    expect(res.body.officialBill).toBeDefined();
    expect(res.body.officialBill.billStatus).toBe(BillStatus.PAID);
    expect(res.body.officialBill.grandTotal).toBe(420);
  });

  it('7. Verify autonomous seat release: Seat 3 is AVAILABLE while Seats 1 & 2 stay OCCUPIED', async () => {
    const updatedTable = await DiningTable.findById(tableId);
    expect(updatedTable).not.toBeNull();

    const seat3 = updatedTable!.seats.find((s) => s.seatNumber === 3);
    expect(seat3!.status).toBe(SeatStatus.AVAILABLE);

    const seat1 = updatedTable!.seats.find((s) => s.seatNumber === 1);
    expect(seat1!.status).toBe(SeatStatus.OCCUPIED);

    // 2 seats occupied (Seats 1, 2), 2 seats available (Seats 3, 4)
    expect(updatedTable!.occupiedSeatsCount).toBe(2);
    expect(updatedTable!.availableSeatsCount).toBe(2);
    expect(updatedTable!.currentStatus).toBe(TableStatus.PARTIALLY_OCCUPIED);
  });

  it('8. POST /api/v1/seat-billing/sub-folio/:subFolioId/items allows open SubFolio A to add more rounds', async () => {
    const res = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioAId}/items`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [
          {
            menuItemId: new Types.ObjectId(),
            name: 'Gulab Jamun (2 pcs)',
            quantity: 1,
            unitPrice: 100,
            seatNumber: 1,
          },
        ],
      });

    // Previous subtotal = 590 + 100 = 690
    // CGST = 17, SGST = 17, totalTax = 34
    // Grand Total = 724
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.subTotal).toBe(690);
    expect(res.body.subFolio.grandTotal).toBe(724);
  });

  it('9. POST /api/v1/seat-billing/sub-folio/:subFolioId/settle settles SubFolio A via Cash -> Table becomes AVAILABLE', async () => {
    const res = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioAId}/settle`)
      .set('x-hotel-id', tenantAId)
      .send({
        paymentMethod: 'CASH',
        paidAmount: 724,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subFolio.status).toBe(SubFolioStatus.SETTLED);
    expect(res.body.tableCurrentStatus).toBe(TableStatus.AVAILABLE);
    expect(res.body.availableSeatsNow).toBe(4);
  });

  it('10. POST /api/v1/seat-billing/merge combines multiple sub-folios into one unified bill', async () => {
    // Create 2 test sub-folios
    const targetRes = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId,
        seatNumbers: [1],
        customerName: 'Guest 1',
      });
    subFolioMergeTargetId = targetRes.body.subFolio._id;

    const sourceRes = await request(app)
      .post('/api/v1/seat-billing/sub-folio')
      .set('x-hotel-id', tenantAId)
      .send({
        tableId,
        seatNumbers: [2],
        customerName: 'Guest 2',
      });
    subFolioMergeSourceId = sourceRes.body.subFolio._id;

    // Add item to source
    await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioMergeSourceId}/items`)
      .set('x-hotel-id', tenantAId)
      .send({
        items: [{ menuItemId: new Types.ObjectId(), name: 'Cold Coffee', quantity: 1, unitPrice: 150 }],
      });

    // Merge source into target
    const mergeRes = await request(app)
      .post('/api/v1/seat-billing/merge')
      .set('x-hotel-id', tenantAId)
      .send({
        targetSubFolioId: subFolioMergeTargetId,
        sourceSubFolioIds: [subFolioMergeSourceId],
      });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);
    expect(mergeRes.body.targetSubFolio.seatNumbers).toEqual([1, 2]);
    expect(mergeRes.body.targetSubFolio.lineItems.length).toBe(1);

    // Verify source is MERGED
    const sourceFolio = await SeatSubFolio.findById(subFolioMergeSourceId);
    expect(sourceFolio!.status).toBe(SubFolioStatus.MERGED);
  });

  it('11. GET /api/v1/seat-billing/sub-folio/:subFolioId/receipt generates thermal receipt DTO', async () => {
    const res = await request(app)
      .get(`/api/v1/seat-billing/sub-folio/${subFolioAId}/receipt`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt.subFolioNumber).toBeDefined();
    expect(res.body.receipt.taxes.cgstRate).toBe('2.5%');
    expect(res.body.receipt.taxes.sgstRate).toBe('2.5%');
    expect(res.body.receipt.grandTotal).toBe(724);
  });

  it('12. Strict Multi-Tenant Isolation: Tenant B cannot query or settle Tenant A sub-folios', async () => {
    const res = await request(app)
      .get(`/api/v1/seat-billing/table/${tableId}`)
      .set('x-hotel-id', tenantBId);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0); // Tenant B sees zero sub-folios for this table

    const settleRes = await request(app)
      .post(`/api/v1/seat-billing/sub-folio/${subFolioAId}/settle`)
      .set('x-hotel-id', tenantBId)
      .send({ paymentMethod: 'CASH' });

    expect(settleRes.status).toBe(404);
  });
});
