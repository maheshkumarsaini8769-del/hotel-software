import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../models/MaintenanceRequest';
import { User } from '../models/User';
import { UserRole } from '../types';

describe('Gate #63: Room Maintenance & Engineering Ticketing, Out-of-Service (OOS/OOO) Inventory Locking & Release Pipeline', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let technicianUser: any;
  let roomTypeA: any;
  let room102: any;
  let room103: any;
  let maintenanceTicketId: string = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A (SpiceHub Luxury Palace)
    const tenantA = await Tenant.create({
      name: 'SpiceHub Luxury Palace & Spa',
      slug: `luxury-maint-a-${Date.now()}`,
      contactEmail: `hotel_maint_a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199330',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Competitor)
    const tenantB = await Tenant.create({
      name: 'Rival Heritage Hotel',
      slug: `rival-maint-b-${Date.now()}`,
      contactEmail: `rival_maint_b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199331',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

    // 3. Create Maintenance Technician Staff for Tenant A
    technicianUser = await User.create({
      hotelId: hotelIdA,
      name: 'Rajesh Sharma (HVAC Specialist)',
      email: `rajesh_hvac_${Date.now()}@spicehub.in`,
      phone: '9876543299',
      role: UserRole.MAINTENANCE,
      passwordHash: 'dummy_hash_for_testing',
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret_jwt_key_spicehub_2026';
    tokenA = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdA.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );
    tokenB = jwt.sign(
      { userId: new Types.ObjectId(), hotelId: hotelIdB.toString(), role: UserRole.HOTEL_ADMIN },
      jwtSecret,
      { expiresIn: '2h' }
    );

    // 4. Create Room Type & Physical Rooms for Tenant A
    roomTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Presidential Royal Suite',
      code: 'PRS',
      slug: `prs-${Date.now()}`,
      basePriceOvernight: 7500,
      maxOccupancyAdults: 4,
      amenities: ['Central Climate Control', 'Jacuzzi', 'Smart TV', 'Balcony'],
    });

    room102 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '102',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_room_102_maint',
    });

    room103 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '103',
      roomTypeId: roomTypeA._id,
      floorNumber: 1,
      wing: 'East Wing',
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: 'qr_hash_room_103_maint',
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
    await RoomType.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MaintenanceRequest.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await User.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
  });

  // TEST 1: Create Maintenance Ticket with blocksRoom: true
  it('1. Report Defect on Room 102 with blocksRoom: true - Creates Ticket & Transitions Room to OUT_OF_SERVICE', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/create-ticket')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        roomId: room102._id.toString(),
        roomNumber: '102',
        title: 'Central AC Compressor Not Cooling (Refrigerant Leak Suspected)',
        description: 'Attendant reported ambient temp stuck at 31°C. High vibration and refrigerant smell near blower unit.',
        category: 'HVAC',
        priority: 'HIGH',
        blocksRoom: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketNumber).toMatch(/^MNT-/);
    expect(res.body.data.blocksRoom).toBe(true);
    expect(res.body.data.priority).toBe('HIGH');
    expect(res.body.data.status).toBe('REPORTED');
    expect(res.body.data.slaHours).toBe(6);

    maintenanceTicketId = res.body.data._id;

    // Verify Room 102 status in database is now OUT_OF_SERVICE
    const updatedRoom102 = await Room.findById(room102._id);
    expect(updatedRoom102?.status).toBe(RoomStatus.OUT_OF_SERVICE);
  });

  // TEST 2: Inventory Locking Verification
  it('2. Inventory Locking Verification - Room 102 is immediately blocked from Available Rooms Inventory', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/available-rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const room102InAvailable = res.body.data.find((r: any) => r.roomNumber === '102');
    const room103InAvailable = res.body.data.find((r: any) => r.roomNumber === '103');

    // Room 102 must be BLOCKED
    expect(room102InAvailable).toBeUndefined();
    // Room 103 must remain available
    expect(room103InAvailable).toBeDefined();
    expect(room103InAvailable.status).toBe('AVAILABLE');
  });

  // TEST 3: Fetch Maintenance Queue & Assign Technician
  it('3. Fetch Maintenance Queue & Assign Technician - Advances Ticket to IN_PROGRESS', async () => {
    // 3a. Hydrate tickets list
    const resList = await request(app)
      .get('/api/v1/pms/frontdesk/maintenance/tickets')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(resList.status).toBe(200);
    expect(resList.body.success).toBe(true);
    expect(resList.body.data.length).toBeGreaterThanOrEqual(1);

    const foundTicket = resList.body.data.find((t: any) => t.ticketId === maintenanceTicketId);
    expect(foundTicket).toBeDefined();
    expect(foundTicket.room?.roomNumber).toBe('102');
    expect(foundTicket.room?.status).toBe('OUT_OF_SERVICE');
    expect(foundTicket.priority).toBe('HIGH');
    expect(foundTicket.slaHours).toBe(6);

    // 3b. Assign technician
    const resAssign = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/assign-technician')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        ticketId: maintenanceTicketId,
        technicianName: 'Rajesh Sharma (HVAC Specialist)',
      });

    expect(resAssign.status).toBe(200);
    expect(resAssign.body.success).toBe(true);
    expect(resAssign.body.data.assignedTechnicianName).toBe('Rajesh Sharma (HVAC Specialist)');
    expect(resAssign.body.data.status).toBe(MaintenanceStatus.IN_PROGRESS);
  });

  // TEST 4: Log Replacement Parts & Maintenance Expenses
  it('4. Log Replacement Parts & Maintenance Expenses - Computes Total Cost Accurately', async () => {
    const parts = [
      { partName: 'R32 Refrigerant Gas 1kg Canister', cost: 1200, quantity: 1 },
      { partName: 'AC Blower Motor Capacitor 45uF', cost: 450, quantity: 1 },
    ];

    const res = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/log-parts')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        ticketId: maintenanceTicketId,
        partsUsed: parts,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.partsUsed.length).toBe(2);
    // 1200 * 1 + 450 * 1 = 1650
    expect(res.body.data.totalCost).toBe(1650);
  });

  // TEST 5: Resolve Maintenance Ticket & Release Room to AVAILABLE
  it('5. Resolve Maintenance Ticket & Release Room - Room 102 Restored to AVAILABLE and Unblocked', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/resolve-and-release')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        ticketId: maintenanceTicketId,
        resolutionNotes: 'Capacitor replaced, refrigerant flushed & recharged. Cooling restored to 18°C. Tested by Engineering Supervisor.',
        targetRoomStatus: RoomStatus.AVAILABLE,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CLOSED');
    expect(res.body.data.totalCost).toBe(1650);
    expect(res.body.data.roomRestoredStatus).toBe('AVAILABLE');

    // Verify Room 102 in database is now AVAILABLE
    const restoredRoom102 = await Room.findById(room102._id);
    expect(restoredRoom102?.status).toBe(RoomStatus.AVAILABLE);

    // Verify Room 102 is immediately visible again in available rooms inventory
    const resAvailable = await request(app)
      .get('/api/v1/pms/frontdesk/available-rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString());

    expect(resAvailable.status).toBe(200);
    const room102InAvailable = resAvailable.body.data.find((r: any) => r.roomNumber === '102');
    expect(room102InAvailable).toBeDefined();
    expect(room102InAvailable.status).toBe('AVAILABLE');
  });

  // TEST 6: Strict Multi-Tenant Isolation
  it('6. Strict Multi-Tenant Isolation - Tenant B cannot view or resolve Tenant A maintenance tickets', async () => {
    // Tenant B attempts to view maintenance tickets
    const resListB = await request(app)
      .get('/api/v1/pms/frontdesk/maintenance/tickets')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString());

    expect(resListB.status).toBe(200);
    const leakedTicket = resListB.body.data.find((t: any) => t.ticketId === maintenanceTicketId);
    expect(leakedTicket).toBeUndefined();

    // Tenant B attempts to resolve Tenant A's ticket
    const resResolveB = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/resolve-and-release')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-hotel-id', hotelIdB.toString())
      .send({
        ticketId: maintenanceTicketId,
        resolutionNotes: 'Malicious unauthorized close attempt',
      });

    expect(resResolveB.status).toBe(404);
  });

  // TEST 7: Idempotency & Double Resolution Protection
  it('7. Idempotency & Double Resolution Protection - Re-resolving already closed ticket returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/maintenance/resolve-and-release')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-hotel-id', hotelIdA.toString())
      .send({
        ticketId: maintenanceTicketId,
        resolutionNotes: 'Duplicate resolve attempt',
      });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('TICKET_NOT_FOUND_OR_ALREADY_RESOLVED');
  });
});
