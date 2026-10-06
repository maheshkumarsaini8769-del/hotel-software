import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { SafeDepositBox, SDBStatus, SDBSize } from '../models/SafeDepositBox';
import { UserRole } from '../types';

describe('Gate #69: Front Desk Safe Deposit Box (SDB) Locker Management, Key Duo Allotment & High-Value Guest Asset Custody', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let receptionistAId: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  const jwtSecret = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A
    const tenantA = await Tenant.create({
      name: 'SpiceHub Grand Palace Vault',
      slug: `grand-palace-69a-${Date.now()}`,
      contactEmail: `hotel_69a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199390',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Suites Vault',
      slug: `rival-69b-${Date.now()}`,
      contactEmail: `rival_69b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199391',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    receptionistAId = new Types.ObjectId();

    tokenA = jwt.sign(
      {
        userId: receptionistAId.toString(),
        hotelId: hotelIdA.toString(),
        role: UserRole.HOTEL_ADMIN,
        name: 'Duty Custodian Vikram',
        email: 'vikram@spicehubgrand.com',
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    tokenB = jwt.sign(
      {
        userId: new Types.ObjectId().toString(),
        hotelId: hotelIdB.toString(),
        role: UserRole.HOTEL_ADMIN,
        name: 'Rival Custodian Amit',
        email: 'amit@rivalsuites.com',
      },
      jwtSecret,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    await SafeDepositBox.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
  });

  // TEST 1: Get boxes & auto-seed default lockers
  it('1. GET /api/v1/pms/sdb/boxes - Auto-seeds default standard set of 12 boxes and returns vault metrics', async () => {
    const res = await request(app)
      .get('/api/v1/pms/sdb/boxes')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.boxes.length).toBe(12);
    expect(res.body.data.metrics.totalBoxes).toBe(12);
    expect(res.body.data.metrics.availableCount).toBe(12);
    expect(res.body.data.metrics.occupiedCount).toBe(0);
    expect(res.body.data.boxes[0].boxNumber).toBe('SDB-101');
    expect(res.body.data.boxes[0].status).toBe(SDBStatus.AVAILABLE);
  });

  // TEST 2: Allot Safe Deposit Box to Guest with Duo-Key & Tamper Seal
  it('2. POST /api/v1/pms/sdb/allot - Allots SDB-101 to guest with duo-key serial, seal number, and refundable deposit', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/allot')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        guestName: 'Princess Gayatri Devi',
        guestPhone: '9844005511',
        roomNumber: '102',
        tamperSealNumber: 'SEAL-2026-9901',
        guestKeySerial: 'GK-101-ROYAL',
        keyDepositAmount: 2000,
        keyDepositStatus: 'PAID',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.boxNumber).toBe('SDB-101');
    expect(res.body.data.status).toBe(SDBStatus.OCCUPIED);
    expect(res.body.data.currentGuestName).toBe('Princess Gayatri Devi');
    expect(res.body.data.currentRoomNumber).toBe('102');
    expect(res.body.data.guestKeySerial).toBe('GK-101-ROYAL');
    expect(res.body.data.tamperSealNumber).toBe('SEAL-2026-9901');
    expect(res.body.data.keyDepositAmount).toBe(2000);
    expect(res.body.data.accessVisits.length).toBe(1);
    expect(res.body.data.accessVisits[0].purpose).toBe('DEPOSIT');
  });

  // TEST 3: Prevent duplicate allotment of occupied box
  it('3. POST /api/v1/pms/sdb/allot - Rejects allotment of an already occupied box with 400', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/allot')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        guestName: 'Another Guest',
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('BOX_NOT_AVAILABLE');
    expect(res.body.message).toContain('is currently OCCUPIED');
  });

  // TEST 4: Reject missing guest name
  it('4. POST /api/v1/pms/sdb/allot - Rejects with 400 when guestName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/allot')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-102',
        guestName: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('MISSING_GUEST_NAME');
  });

  // TEST 5: Reject access visit without valid security PIN
  it('5. POST /api/v1/pms/sdb/access - Rejects vault access without valid security PIN with 403', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/access')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        purpose: 'INSPECTION',
        staffSecurityPin: '0000', // Invalid PIN
      });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('INVALID_VAULT_PIN');
  });

  // TEST 6: Authorize vault access with PIN 9921 & log visit
  it('6. POST /api/v1/pms/sdb/access - Successfully logs duo-key vault access visit with valid PIN 9921', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/access')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        purpose: 'INSPECTION',
        witnessStaffName: 'Duty Custodian Vikram',
        staffSecurityPin: '9921',
        remarks: 'Guest inspected diamond necklace before gala dinner.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latestVisit).toBeDefined();
    expect(res.body.data.latestVisit.purpose).toBe('INSPECTION');
    expect(res.body.data.latestVisit.witnessStaffName).toBe('Duty Custodian Vikram');
    expect(res.body.data.latestVisit.duoKeyTurnConfirmed).toBe(true);
    expect(res.body.data.box.accessVisits.length).toBe(2);
  });

  // TEST 7: Reject surrender if empty box not verified
  it('7. POST /api/v1/pms/sdb/surrender - Rejects box surrender when empty box is not verified', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/surrender')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        emptyBoxVerified: false,
        staffSecurityPin: '9921',
      });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('EMPTY_VERIFICATION_REQUIRED');
  });

  // TEST 8: Successful surrender with key returned (deposit refunded)
  it('8. POST /api/v1/pms/sdb/surrender - Surrenders box when key is returned: refunds deposit and resets box to AVAILABLE', async () => {
    const res = await request(app)
      .post('/api/v1/pms/sdb/surrender')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-101',
        keyReturned: true,
        emptyBoxVerified: true,
        staffSecurityPin: '9921',
        remarks: 'All valuables retrieved by guest. Key returned in pristine condition.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.keyReturned).toBe(true);
    expect(res.body.data.keyDepositStatus).toBe('REFUNDED');
    expect(res.body.data.lostKeyPenaltyAmount).toBe(0);

    // Verify box in DB is now AVAILABLE
    const box = await SafeDepositBox.findOne({ hotelId: hotelIdA, boxNumber: 'SDB-101' });
    expect(box!.status).toBe(SDBStatus.AVAILABLE);
    expect(box!.currentGuestName).toBeUndefined();
    expect(box!.emptyBoxVerifiedByStaff).toBe(true);
    expect(box!.keyReturnedByGuest).toBe(true);
  });

  // TEST 9: Lost Key scenario with penalty fee
  it('9. POST /api/v1/pms/sdb/surrender - Handles lost key: forfeits deposit, assesses ₹3,500 replacement penalty, and restores box', async () => {
    // First allot SDB-102
    await request(app)
      .post('/api/v1/pms/sdb/allot')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-102',
        guestName: 'Mr. Arvind Khanna',
        guestKeySerial: 'GK-102-KHANNA',
        keyDepositAmount: 2000,
        keyDepositStatus: 'PAID',
      });

    // Surrender SDB-102 with keyReturned: false
    const res = await request(app)
      .post('/api/v1/pms/sdb/surrender')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        boxNumber: 'SDB-102',
        keyReturned: false,
        emptyBoxVerified: true,
        lostKeyPenaltyAmount: 3500,
        staffSecurityPin: '9921',
        remarks: 'Guest mislaid key during sightseeing. Lock cylinder drill & replacement fee charged.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.keyReturned).toBe(false);
    expect(res.body.data.keyDepositStatus).toBe('FORFEITED_LOST_KEY');
    expect(res.body.data.lostKeyPenaltyAmount).toBe(3500);

    const box102 = await SafeDepositBox.findOne({ hotelId: hotelIdA, boxNumber: 'SDB-102' });
    expect(box102!.status).toBe(SDBStatus.AVAILABLE);
    expect(box102!.keyReturnedByGuest).toBe(false);
  });

  // TEST 10: Multi-tenant isolation for vault audit logs
  it('10. GET /api/v1/pms/sdb/audit-log/:boxNumber - Enforces strict tenant isolation (Tenant B cannot access Tenant A vault logs)', async () => {
    // Tenant A queries SDB-101 audit log
    const resA = await request(app)
      .get('/api/v1/pms/sdb/audit-log/SDB-101')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data.boxNumber).toBe('SDB-101');
    expect(resA.body.data.accessVisits.length).toBeGreaterThanOrEqual(2);

    // Tenant B (Rival) tries to access Tenant A's SDB-101
    const resB = await request(app)
      .get('/api/v1/pms/sdb/audit-log/SDB-101')
      .set('Authorization', `Bearer ${tokenB}`);

    // Since Tenant B has no SDB-101 yet or isolated, should return 404
    expect(resB.status).toBe(404);
    expect(resB.body.errorCode).toBe('BOX_NOT_FOUND');
  });
});
