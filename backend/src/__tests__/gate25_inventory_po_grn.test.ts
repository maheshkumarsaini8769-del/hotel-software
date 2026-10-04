import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Vendor, VendorCategory, PaymentTerms } from '../models/Vendor';
import { PurchaseOrder, PurchaseOrderStatus } from '../models/PurchaseOrder';
import { GoodsReceivedNote, GrnInspectionStatus } from '../models/GoodsReceivedNote';
import { UserRole } from '../types';

describe('--- SHIFT 25 / GATE 25: CENTRAL STORE PURCHASE ORDERS, VENDOR MANAGEMENT & GRN ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let managerToken: string;
  let rivalToken: string;
  let vendorAId: string;
  let poAId: string;

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

    // 1. Setup Tenant A
    const tenantA = await Tenant.create({
      name: 'The Imperial Palace & Central Stores',
      slug: `imperial-procure-${Date.now()}`,
      contactEmail: `procure_${Date.now()}@imperial.com`,
      contactPhone: '9844400001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Hospitality Supplies',
      slug: `rival-store-${Date.now()}`,
      contactEmail: `rival_store_${Date.now()}@rival.com`,
      contactPhone: '9844400002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    // 3. Create Procurement Manager for Tenant A
    const manager = await User.create({
      hotelId: tenantA._id,
      name: 'Procurement Head Vikram Rathore',
      email: `vikram_${Date.now()}@imperial.com`,
      phone: '9844400003',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    managerToken = jwt.sign(
      {
        userId: manager._id.toString(),
        hotelId: tenantAId,
        role: UserRole.MANAGER,
        email: manager.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Create Rival User for Tenant B
    const rivalUser = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Storekeeper',
      email: `rival_store_${Date.now()}@rival.com`,
      phone: '9844400004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    rivalToken = jwt.sign(
      {
        userId: rivalUser._id.toString(),
        hotelId: tenantBId,
        role: UserRole.MANAGER,
        email: rivalUser.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await GoodsReceivedNote.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await PurchaseOrder.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Vendor.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Register Supplier/Vendor Profile with GSTIN and Payment Terms', async () => {
    const res = await request(app)
      .post('/api/v1/inventory-po/vendors')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        name: 'Metro Cash & Carry Wholesale APMC',
        contactPerson: 'Suresh Singhania',
        phone: '9811122334',
        email: 'orders@metro-apmc.com',
        gstin: '07AAAAA1234A1Z5',
        category: VendorCategory.FOOD_BEVERAGE,
        paymentTerms: PaymentTerms.NET_30,
        address: 'APMC Market Yard Shed 4, Delhi',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.vendor.name).toBe('Metro Cash & Carry Wholesale APMC');
    expect(res.body.vendor.vendorCode).toMatch(/^VND-/);
    expect(res.body.vendor.paymentTerms).toBe(PaymentTerms.NET_30);

    vendorAId = res.body.vendor._id;
  });

  // TEST 2
  it('2. List Active Vendors and Filter by Category', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory-po/vendors?category=${VendorCategory.FOOD_BEVERAGE}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.vendors.length).toBe(1);
    expect(res.body.vendors[0].name).toBe('Metro Cash & Carry Wholesale APMC');
  });

  // TEST 3
  it('3. Raise Purchase Order (PO): Auto-calculate Subtotal, Tax Breakdown, and Committed Grand Total', async () => {
    // 100 kg Rice @ 80/kg = 8000 subtotal, 5% tax = 400 => line total = 8400
    // 50 kg Chicken @ 200/kg = 10000 subtotal, 5% tax = 500 => line total = 10500
    // Subtotal = 18,000, Tax = 900, Grand Total = 18,900
    const res = await request(app)
      .post('/api/v1/inventory-po/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        vendorId: vendorAId,
        items: [
          { itemName: 'Aged Basmati Rice 25kg Bag', orderQuantity: 100, unit: 'kg', unitPrice: 80, taxRate: 5 },
          { itemName: 'Fresh Chicken Breast', orderQuantity: 50, unit: 'kg', unitPrice: 200, taxRate: 5 },
        ],
        deliveryLocation: 'Central Kitchen Receiving Dock #2',
        notes: 'Cold van temperature must be maintained under 4C for meat',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrder.poNumber).toMatch(/^PO-/);
    expect(res.body.purchaseOrder.status).toBe(PurchaseOrderStatus.PENDING_APPROVAL);
    expect(res.body.purchaseOrder.subtotal).toBe(18000);
    expect(res.body.purchaseOrder.taxAmount).toBe(900);
    expect(res.body.purchaseOrder.grandTotal).toBe(18900);

    poAId = res.body.purchaseOrder._id;
  });

  // TEST 4
  it('4. Get Purchase Orders: Verify KPIs reflect 1 open order awaiting approval', async () => {
    const res = await request(app)
      .get('/api/v1/inventory-po/orders')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders.length).toBe(1);
    expect(res.body.metrics.totalPoCount).toBe(1);
    expect(res.body.metrics.pendingApprovalCount).toBe(1);
  });

  // TEST 5
  it('5. Manager Approves PO: Status transitions to APPROVED for receiving dock', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory-po/orders/${poAId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrder.status).toBe(PurchaseOrderStatus.APPROVED);
    expect(res.body.purchaseOrder.approvedAt).toBeDefined();
  });

  // TEST 6
  it('6. Dock Receiving (GRN #1): Partial delivery & 10kg rejection flags discrepancy', async () => {
    // Rice: 100 ordered -> 100 received -> 90 accepted, 10 rejected (torn bag)
    // Chicken: 50 ordered -> 50 received -> 50 accepted
    // Total Accepted Amount: (90*80 = 7200) + (50*200 = 10000) = 17200 + 5% tax (860) = 18060
    const res = await request(app)
      .post('/api/v1/inventory-po/grn')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        poId: poAId,
        invoiceNumber: 'INV-METRO-99881',
        invoiceDate: new Date(),
        receivedItems: [
          {
            itemName: 'Aged Basmati Rice 25kg Bag',
            orderedQty: 100,
            receivedQty: 100,
            acceptedQty: 90,
            rejectionReason: 'Torn bag with moisture exposure',
            unit: 'kg',
            unitPrice: 80,
            taxRate: 5,
          },
          {
            itemName: 'Fresh Chicken Breast',
            orderedQty: 50,
            receivedQty: 50,
            acceptedQty: 50,
            unit: 'kg',
            unitPrice: 200,
            taxRate: 5,
          },
        ],
        dockNotes: '10kg Rice bag rejected on spot, returned to truck',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.grn.grnNumber).toMatch(/^GRN-/);
    expect(res.body.grn.status).toBe(GrnInspectionStatus.FLAGGED_DISCREPANCY);
    expect(res.body.grn.finalInvoiceAmount).toBe(18060);
    expect(res.body.purchaseOrderStatus).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);

    // Verify PO item state
    const po = await PurchaseOrder.findById(poAId);
    expect(po?.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
    expect(po?.items[0].receivedQuantity).toBe(90);
    expect(po?.items[1].receivedQuantity).toBe(50);
  });

  // TEST 7
  it('7. Dock Receiving (GRN #2): Second shipment fulfills remaining 10kg Rice to COMPLETE PO', async () => {
    // Vendor replacement truck arrives with remaining 10kg rice
    const res = await request(app)
      .post('/api/v1/inventory-po/grn')
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        poId: poAId,
        invoiceNumber: 'INV-METRO-99905',
        invoiceDate: new Date(),
        receivedItems: [
          {
            itemName: 'Aged Basmati Rice 25kg Bag',
            orderedQty: 100,
            receivedQty: 10,
            acceptedQty: 10,
            unit: 'kg',
            unitPrice: 80,
            taxRate: 5,
          },
        ],
        dockNotes: 'Replacement 10kg fresh bag accepted in pristine condition',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.purchaseOrderStatus).toBe(PurchaseOrderStatus.COMPLETED);

    // Verify PO is now fully completed
    const po = await PurchaseOrder.findById(poAId);
    expect(po?.status).toBe(PurchaseOrderStatus.COMPLETED);
    expect(po?.items[0].receivedQuantity).toBe(100);
  });

  // TEST 8
  it('8. Get GRN History: Verifies dock receiving audit records', async () => {
    const res = await request(app)
      .get(`/api/v1/inventory-po/grn?poId=${poAId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.grns[0].invoiceNumber).toBe('INV-METRO-99905');
    expect(res.body.grns[1].invoiceNumber).toBe('INV-METRO-99881');
  });

  // TEST 9
  it('9. Strict Multi-Tenant Isolation: Competitor cannot view POs, Vendors, or GRNs', async () => {
    // Rival tries to view Tenant A's PO
    const poRes = await request(app)
      .get('/api/v1/inventory-po/orders')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(poRes.status).toBe(200);
    expect(poRes.body.orders.length).toBe(0);

    // Rival tries to approve Tenant A's PO
    const approveRes = await request(app)
      .patch(`/api/v1/inventory-po/orders/${poAId}/approve`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(approveRes.status).toBe(404);
    expect(approveRes.body.success).toBe(false);
    expect(approveRes.body.errorCode).toBe('PO_NOT_FOUND');

    // Rival tries to view Tenant A's GRN history
    const grnRes = await request(app)
      .get('/api/v1/inventory-po/grn')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(grnRes.status).toBe(200);
    expect(grnRes.body.count).toBe(0);
  });
});
