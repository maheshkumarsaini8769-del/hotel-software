import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import {
  StoreRequisition,
  RequisitionDepartment,
  RequisitionUrgency,
  RequisitionStatus,
} from '../models/StoreRequisition';
import { StockTransfer, TransferStatus } from '../models/StockTransfer';
import { StockBatch, BatchFreshnessStatus } from '../models/StockBatch';
import { UserRole } from '../types';

describe('--- SHIFT 26 / GATE 26: DEPARTMENTAL STORE REQUISITIONS, TRANSFERS & FEFO EXPIRY ENGINE ---', () => {
  let tenantAId: string;
  let tenantBId: string;
  let chefToken: string;
  let storekeeperToken: string;
  let rivalToken: string;
  let requisitionAId: string;
  let transferAId: string;

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
      name: 'Grand ITC Royal & Central Kitchens',
      slug: `itc-kitchens-${Date.now()}`,
      contactEmail: `itc_kitchen_${Date.now()}@spicehub.com`,
      contactPhone: '9855500001',
      status: 'ACTIVE',
    });
    tenantAId = tenantA._id.toString();

    // 2. Setup Tenant B
    const tenantB = await Tenant.create({
      name: 'Rival Express Bistro',
      slug: `rival-bistro-${Date.now()}`,
      contactEmail: `rival_bistro_${Date.now()}@spicehub.com`,
      contactPhone: '9855500002',
      status: 'ACTIVE',
    });
    tenantBId = tenantB._id.toString();

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';

    // 3. Create Head Chef User for Tenant A
    const chef = await User.create({
      hotelId: tenantA._id,
      name: 'Head Chef Kunal Kapur',
      email: `chef_${Date.now()}@itc.com`,
      phone: '9855500003',
      passwordHash: 'dummy_hash',
      role: UserRole.CHEF,
      isActive: true,
    });

    chefToken = jwt.sign(
      {
        userId: chef._id.toString(),
        hotelId: tenantAId,
        role: UserRole.CHEF,
        email: chef.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 4. Create Storekeeper User for Tenant A
    const storekeeper = await User.create({
      hotelId: tenantA._id,
      name: 'Store Manager Ramesh Verma',
      email: `store_${Date.now()}@itc.com`,
      phone: '9855500004',
      passwordHash: 'dummy_hash',
      role: UserRole.MANAGER,
      isActive: true,
    });

    storekeeperToken = jwt.sign(
      {
        userId: storekeeper._id.toString(),
        hotelId: tenantAId,
        role: UserRole.MANAGER,
        email: storekeeper.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );

    // 5. Create Rival User for Tenant B
    const rivalChef = await User.create({
      hotelId: tenantB._id,
      name: 'Rival Head Chef',
      email: `rival_${Date.now()}@bistro.com`,
      phone: '9855500005',
      passwordHash: 'dummy_hash',
      role: UserRole.CHEF,
      isActive: true,
    });

    rivalToken = jwt.sign(
      {
        userId: rivalChef._id.toString(),
        hotelId: tenantBId,
        role: UserRole.CHEF,
        email: rivalChef.email,
      },
      jwtSecret,
      { expiresIn: '12h' }
    );
  });

  afterAll(async () => {
    await StoreRequisition.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await StockTransfer.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await StockBatch.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await User.deleteMany({ hotelId: { $in: [tenantAId, tenantBId] } });
    await Tenant.deleteMany({ _id: { $in: [tenantAId, tenantBId] } });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // TEST 1
  it('1. Chef Submits Store Requisition (Indent) for Main Kitchen with High Urgency', async () => {
    const res = await request(app)
      .post('/api/v1/store-requisitions/requisitions')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        requestingDepartment: RequisitionDepartment.MAIN_KITCHEN,
        urgency: RequisitionUrgency.HIGH,
        items: [
          { itemName: 'Aged Basmati Rice', requestedQuantity: 20, unit: 'kg', unitCost: 80 },
          { itemName: 'Amul Taaza Full Cream Milk', requestedQuantity: 10, unit: 'l', unitCost: 65 },
        ],
        notes: 'Required for banquet lunch service',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requisition.requisitionNumber).toMatch(/^REQ-/);
    expect(res.body.requisition.requestingDepartment).toBe(RequisitionDepartment.MAIN_KITCHEN);
    expect(res.body.requisition.urgency).toBe(RequisitionUrgency.HIGH);
    expect(res.body.requisition.status).toBe(RequisitionStatus.PENDING);
    expect(res.body.requisition.items.length).toBe(2);

    requisitionAId = res.body.requisition._id;
  });

  // TEST 2
  it('2. Storekeeper Views Pending Requisitions Pipeline', async () => {
    const res = await request(app)
      .get('/api/v1/store-requisitions/requisitions?status=PENDING')
      .set('Authorization', `Bearer ${storekeeperToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requisitions.length).toBe(1);
    expect(res.body.metrics.totalPendingCount).toBe(1);
  });

  // TEST 3
  it('3. Storekeeper Issues Stock (Partial fulfillment due to milk stock shortage)', async () => {
    // Rice: 20kg requested -> 20kg issued (100%)
    // Milk: 10L requested -> 6L issued (4L short)
    // Result: APPROVED_PARTIALLY
    const res = await request(app)
      .patch(`/api/v1/store-requisitions/requisitions/${requisitionAId}/issue`)
      .set('Authorization', `Bearer ${storekeeperToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        issuedItems: [
          { itemName: 'Aged Basmati Rice', issuedQuantity: 20, status: 'ISSUED' },
          { itemName: 'Amul Taaza Full Cream Milk', issuedQuantity: 6, status: 'OUT_OF_STOCK' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requisition.status).toBe(RequisitionStatus.APPROVED_PARTIALLY);
    expect(res.body.requisition.items[0].issuedQuantity).toBe(20);
    expect(res.body.requisition.items[1].issuedQuantity).toBe(6);
    expect(res.body.requisition.items[1].status).toBe('OUT_OF_STOCK');
    expect(res.body.requisition.issuedAt).toBeDefined();
  });

  // TEST 4
  it('4. Dispatch Inter-Kitchen Stock Transfer (Sauce moved to Banquet Kitchen)', async () => {
    const res = await request(app)
      .post('/api/v1/store-requisitions/transfers')
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        sourceLocation: 'Main Kitchen Walk-in Chiller',
        destinationLocation: 'Banquet Production Kitchen',
        items: [{ itemName: 'Pre-cooked Dal Makhani Gravy', quantity: 15, unit: 'l', unitCost: 110 }],
        notes: 'Emergency shortage at banquet stall',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.transferNumber).toMatch(/^TRF-/);
    expect(res.body.transfer.status).toBe(TransferStatus.DISPATCHED);

    transferAId = res.body.transfer._id;
  });

  // TEST 5
  it('5. Destination Chef Receives Stock Transfer', async () => {
    const res = await request(app)
      .patch(`/api/v1/store-requisitions/transfers/${transferAId}/receive`)
      .set('Authorization', `Bearer ${chefToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.status).toBe(TransferStatus.RECEIVED);
    expect(res.body.transfer.receivedAt).toBeDefined();
  });

  // TEST 6
  it('6. Seed Stock Batches with Expiry Dates for FEFO Control', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fifteenDays = new Date();
    fifteenDays.setDate(fifteenDays.getDate() + 15);

    // Batch 1: Milk expiring tomorrow (EXPIRING_SOON)
    const b1 = await request(app)
      .post('/api/v1/store-requisitions/batches')
      .set('Authorization', `Bearer ${storekeeperToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        itemName: 'Fresh Full Cream Milk',
        category: 'Dairy',
        currentQuantity: 40,
        unit: 'l',
        unitCost: 65,
        location: 'Cold Room Chiller #1',
        mfgDate: new Date(),
        expiryDate: tomorrow,
      });

    expect(b1.status).toBe(201);
    expect(b1.body.batch.batchNumber).toMatch(/^BAT-/);

    // Batch 2: Fresh Paneer expiring in 15 days (FRESH)
    const b2 = await request(app)
      .post('/api/v1/store-requisitions/batches')
      .set('Authorization', `Bearer ${storekeeperToken}`)
      .set('x-hotel-id', tenantAId)
      .send({
        itemName: 'Malai Paneer Blocks',
        category: 'Dairy',
        currentQuantity: 25,
        unit: 'kg',
        unitCost: 320,
        location: 'Cold Room Chiller #2',
        mfgDate: new Date(),
        expiryDate: fifteenDays,
      });

    expect(b2.status).toBe(201);
  });

  // TEST 7
  it('7. Get Stock Batches: Verifies FEFO Sorting (earliest expiry first) and At-Risk Valuation', async () => {
    const res = await request(app)
      .get('/api/v1/store-requisitions/batches')
      .set('Authorization', `Bearer ${storekeeperToken}`)
      .set('x-hotel-id', tenantAId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batches.length).toBe(2);

    // First batch should be the one expiring tomorrow (FEFO priority)
    expect(res.body.batches[0].itemName).toBe('Fresh Full Cream Milk');
    expect(res.body.batches[0].status).toBe(BatchFreshnessStatus.EXPIRING_SOON);
    expect(res.body.batches[0].daysUntilExpiry).toBeLessThanOrEqual(2);

    // Verify FEFO metrics
    expect(res.body.fefoMetrics.expiringSoonCount).toBe(1);
    expect(res.body.fefoMetrics.totalAtRiskValue).toBe(40 * 65); // 2600
  });

  // TEST 8
  it('8. Strict Multi-Tenant Isolation: Competitor cannot view indents or inventory batches', async () => {
    // Rival tries to view Tenant A's indents
    const reqRes = await request(app)
      .get('/api/v1/store-requisitions/requisitions')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.requisitions.length).toBe(0);

    // Rival tries to issue Tenant A's requisition
    const issueRes = await request(app)
      .patch(`/api/v1/store-requisitions/requisitions/${requisitionAId}/issue`)
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId)
      .send({ issuedItems: [] });

    expect(issueRes.status).toBe(404);
    expect(issueRes.body.success).toBe(false);
    expect(issueRes.body.errorCode).toBe('REQ_NOT_FOUND');

    // Rival tries to view Tenant A's stock batches
    const batchRes = await request(app)
      .get('/api/v1/store-requisitions/batches')
      .set('Authorization', `Bearer ${rivalToken}`)
      .set('x-hotel-id', tenantBId);

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.batches.length).toBe(0);
  });
});
