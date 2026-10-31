import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { Room } from '../models/Room';
import { DiningTable } from '../models/DiningTable';
import { UserRole, ShiftStatus } from '../types';

describe('--- GATE 78: SUPERADMIN STRICT ROOM & DINING TABLE CAPACITY ENFORCEMENT ---', () => {
  let tenantId: string;
  let superAdminToken: string;
  let hotelAdminToken: string;
  const jwtSecret = process.env.JWT_SECRET || 'spicehub-enterprise-jwt-super-secret-token-key-2026';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create a tenant with strict initial limits: maxTables: 2, maxRooms: 2
    const tenant = await Tenant.create({
      name: 'SpiceHub Heritage Quota Resort',
      slug: `heritage-quota-${Date.now()}`,
      contactEmail: `quota_${Date.now()}@spicehub.com`,
      contactPhone: '9888877777',
      status: 'ACTIVE',
      maxRooms: 2,
      maxTables: 2,
    });
    tenantId = tenant._id.toString();

    // 2. SuperAdmin User & Token
    const superAdminUser = await User.create({
      name: 'Global Platform Director',
      email: `super_${Date.now()}@spicehub.com`,
      phone: '9999900000',
      passwordHash: 'dummy_hash',
      role: UserRole.SUPERADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    superAdminToken = jwt.sign(
      {
        userId: superAdminUser._id.toString(),
        role: UserRole.SUPERADMIN,
        email: superAdminUser.email,
      },
      jwtSecret,
      { expiresIn: '2h' }
    );

    // 3. Hotel Admin User & Token
    const hotelAdminUser = await User.create({
      hotelId: tenant._id,
      name: 'Rajesh Hotel Admin',
      email: `rajesh_${Date.now()}@spicehub.com`,
      phone: '9888811111',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });
    hotelAdminToken = jwt.sign(
      {
        userId: hotelAdminUser._id.toString(),
        hotelId: tenantId,
        role: UserRole.HOTEL_ADMIN,
        email: hotelAdminUser.email,
      },
      jwtSecret,
      { expiresIn: '2h' }
    );
  });

  afterAll(async () => {
    if (tenantId) {
      await DiningTable.deleteMany({ hotelId: tenantId });
      await Room.deleteMany({ hotelId: tenantId });
      await RoomType.deleteMany({ hotelId: tenantId });
      await User.deleteMany({ hotelId: tenantId });
      await Tenant.deleteOne({ _id: tenantId });
    }
  });

  it('1. SuperAdmin can inspect and update tenant capacity limits via PUT /api/v1/superadmin/tenants/:id/capacity', async () => {
    const res = await request(app)
      .put(`/api/v1/superadmin/tenants/${tenantId}/capacity`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ maxRooms: 2, maxTables: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.capacity.maxRooms).toBe(2);
    expect(res.body.capacity.maxTables).toBe(2);
  });

  it('2. Hotel Admin creates tables up to allocated maxTables: 2 successfully', async () => {
    // Table 1
    const res1 = await request(app)
      .post('/api/v1/table-management/tables')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        tableNumber: 'T-QUOTA-01',
        floorNumber: 1,
        floorLevel: '1st Floor',
        section: 'Main Hall',
        capacity: 4,
      });
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    // Table 2
    const res2 = await request(app)
      .post('/api/v1/table-management/tables')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        tableNumber: 'T-QUOTA-02',
        floorNumber: 1,
        floorLevel: '1st Floor',
        section: 'Main Hall',
        capacity: 4,
      });
    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
  });

  it('3. Hotel Admin cannot create more tables than SuperAdmin ceiling — returns HTTP 403 TABLE_LIMIT_EXCEEDED', async () => {
    const res = await request(app)
      .post('/api/v1/table-management/tables')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        tableNumber: 'T-QUOTA-03',
        floorNumber: 1,
        floorLevel: '1st Floor',
        section: 'Main Hall',
        capacity: 4,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('TABLE_LIMIT_EXCEEDED');
    expect(res.body.maxAllowed).toBe(2);
    expect(res.body.message).toContain('SuperAdmin has allocated a maximum of 2 tables');
  });

  it('4. SuperAdmin upgrades table capacity to 4, unlocking table creation', async () => {
    const upgradeRes = await request(app)
      .put(`/api/v1/superadmin/tenants/${tenantId}/capacity`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ maxTables: 4 });

    expect(upgradeRes.status).toBe(200);
    expect(upgradeRes.body.capacity.maxTables).toBe(4);

    // Now creating Table 3 succeeds
    const res3 = await request(app)
      .post('/api/v1/table-management/tables')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        tableNumber: 'T-QUOTA-03',
        floorNumber: 1,
        floorLevel: '1st Floor',
        section: 'Main Hall',
        capacity: 4,
      });
    expect(res3.status).toBe(201);
    expect(res3.body.success).toBe(true);
  });

  it('5. Hotel Admin creates physical rooms up to allocated maxRooms: 2', async () => {
    // Room 1
    const res1 = await request(app)
      .post('/api/v1/pms/rooms')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        roomNumber: '101',
        floorNumber: 1,
      });
    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    // Room 2
    const res2 = await request(app)
      .post('/api/v1/pms/rooms')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        roomNumber: '102',
        floorNumber: 1,
      });
    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
  });

  it('6. Hotel Admin cannot create more rooms than SuperAdmin ceiling — returns HTTP 403 ROOM_LIMIT_EXCEEDED', async () => {
    const res = await request(app)
      .post('/api/v1/pms/rooms')
      .set('Authorization', `Bearer ${hotelAdminToken}`)
      .send({
        roomNumber: '103',
        floorNumber: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ROOM_LIMIT_EXCEEDED');
    expect(res.body.maxAllowed).toBe(2);
    expect(res.body.message).toContain('SuperAdmin has allocated a maximum of 2 rooms');
  });

  it('7. Table overview returns maxTables in summary for Hotel Admin studio banner', async () => {
    const res = await request(app)
      .get('/api/v1/table-management/overview')
      .set('Authorization', `Bearer ${hotelAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.maxTables).toBe(4);
  });
});
