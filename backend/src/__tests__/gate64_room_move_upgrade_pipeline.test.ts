import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { Tenant } from '../models/Tenant';
import { Room, RoomStatus } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { HousekeepingTask, HousekeepingTaskStatus, HousekeepingTaskType } from '../models/HousekeepingTask';
import { User } from '../models/User';
import { UserRole } from '../types';

describe('Gate #64: Guest Mid-Stay Room Move, Upgrade Tariff & Key Re-Issuance Pipeline', () => {
  let hotelIdA: Types.ObjectId;
  let hotelIdB: Types.ObjectId;
  let tokenA: string = '';
  let tokenB: string = '';
  let standardTypeA: any;
  let suiteTypeA: any;
  let room101: any;
  let room201: any;
  let room301: any;
  let activeStayA: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // 1. Create Tenant A (SpiceHub Heritage Grand)
    const tenantA = await Tenant.create({
      name: 'SpiceHub Heritage Grand Palace',
      slug: `heritage-grand-a-${Date.now()}`,
      contactEmail: `hotel_move_a_${Date.now()}@spicehub.in`,
      contactPhone: '9811199340',
      status: 'ACTIVE',
    });
    hotelIdA = tenantA._id as Types.ObjectId;

    // 2. Create Tenant B (Isolated Rival)
    const tenantB = await Tenant.create({
      name: 'Rival Imperial Inn',
      slug: `rival-move-b-${Date.now()}`,
      contactEmail: `rival_move_b_${Date.now()}@spicehub.in`,
      contactPhone: '9811199341',
      status: 'ACTIVE',
    });
    hotelIdB = tenantB._id as Types.ObjectId;

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

    // 3. Create Room Types for Tenant A
    standardTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Deluxe Heritage Room',
      code: 'DHR-64',
      slug: `dhr-64-${Date.now()}`,
      basePriceOvernight: 3500,
      maxOccupancyAdults: 2,
    });

    suiteTypeA = await RoomType.create({
      hotelId: hotelIdA,
      name: 'Presidential Royal Suite',
      code: 'PRS-64',
      slug: `prs-64-${Date.now()}`,
      basePriceOvernight: 6000,
      maxOccupancyAdults: 4,
    });

    // 4. Create Physical Rooms for Tenant A
    room101 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '101',
      floorNumber: 1,
      wing: 'East Wing',
      roomTypeId: standardTypeA._id,
      permanentQrCodeHash: `room-101-hash-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });

    room201 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '201',
      floorNumber: 2,
      wing: 'Royal Wing',
      roomTypeId: suiteTypeA._id,
      permanentQrCodeHash: `room-201-hash-${Date.now()}`,
      status: RoomStatus.AVAILABLE,
    });

    room301 = await Room.create({
      hotelId: hotelIdA,
      roomNumber: '301',
      floorNumber: 3,
      wing: 'Penthouse Wing',
      roomTypeId: suiteTypeA._id,
      permanentQrCodeHash: `room-301-hash-${Date.now()}`,
      status: RoomStatus.OCCUPIED, // Already occupied for collision testing
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ _id: { $in: [hotelIdA, hotelIdB] } });
    await RoomType.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Room.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await Stay.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await MasterFolio.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await FolioLineItem.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
    await HousekeepingTask.deleteMany({ hotelId: { $in: [hotelIdA, hotelIdB] } });
  });

  it('1. Check-In Guest into Room 101 with initial stay and master folio', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/quick-checkin')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        roomId: room101._id.toString(),
        guestName: 'Vikramaditya Rathore',
        guestPhone: '9822334455',
        email: 'vikram@rathore-dynasty.com',
        vipTier: 'VIP_PLATINUM',
        isCouple: true,
        verificationMode: 'AADHAAR',
        idNumberMasked: 'XXXX-XXXX-9922',
        initialDeposit: 2000,
        roomTariff: 3500,
        nights: 2,
        receptionistNotes: 'Platinum guest VIP arrival at East Wing.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.room.roomNumber).toBe('101');
    expect(res.body.data.stay._id).toBeDefined();

    // Verify room is OCCUPIED
    const roomCheck = await Room.findById(room101._id);
    expect(roomCheck?.status).toBe(RoomStatus.OCCUPIED);

    activeStayA = await Stay.findById(res.body.data.stay._id);
    expect(activeStayA).toBeDefined();
    expect(activeStayA.stayStatus).toBe(StayStatus.ACTIVE);
  });

  it('2. Fetch Available Upgrade Rooms for Room 101 - Excludes current room and occupied rooms', async () => {
    const res = await request(app)
      .get('/api/v1/pms/frontdesk/available-upgrade-rooms?currentRoomNumber=101')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Room 201 is available
    const room201Item = res.body.data.find((r: any) => r.roomNumber === '201');
    expect(room201Item).toBeDefined();
    expect(room201Item.roomType).toBe('Presidential Royal Suite');
    expect(room201Item.suggestedUpgradeFee).toBe(2500); // 6000 - 3500 = 2500

    // Room 101 itself should NOT be in available rooms list
    const room101Item = res.body.data.find((r: any) => r.roomNumber === '101');
    expect(room101Item).toBeUndefined();

    // Room 301 is OCCUPIED so should NOT be in available rooms list
    const room301Item = res.body.data.find((r: any) => r.roomNumber === '301');
    expect(room301Item).toBeUndefined();
  });

  it('3. Execute Room Move from Room 101 to Room 201 with Upgrade Fee and Reason', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/room-move')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentRoomNumber: '101',
        targetRoomNumber: '201',
        reason: 'UPGRADE',
        upgradeFee: 2500,
        notes: 'Guest requested upgrade to Presidential Royal Suite for royal terrace view.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fromRoom.roomNumber).toBe('101');
    expect(res.body.data.fromRoom.status).toBe(RoomStatus.DIRTY);
    expect(res.body.data.toRoom.roomNumber).toBe('201');
    expect(res.body.data.toRoom.status).toBe(RoomStatus.OCCUPIED);
    expect(res.body.data.upgradeFee).toBe(2500);
    expect(res.body.data.taxAmount).toBe(300); // 12% of 2500 = 300
    expect(res.body.data.totalCharge).toBe(2800); // 2500 + 300 = 2800
    expect(res.body.data.newKeyCard).toMatch(/^KEY-RM201-/);
    expect(res.body.data.turnaroundTaskId).toBeDefined();

    // Verify Old Room 101 status is DIRTY in database
    const oldRoom = await Room.findById(room101._id);
    expect(oldRoom?.status).toBe(RoomStatus.DIRTY);

    // Verify New Room 201 status is OCCUPIED in database
    const newRoom = await Room.findById(room201._id);
    expect(newRoom?.status).toBe(RoomStatus.OCCUPIED);
  });

  it('4. Verify Stay and Master Folio reflect new Room 201, Move History & Upgrade Surcharge', async () => {
    const updatedStay = await Stay.findById(activeStayA._id);
    expect(updatedStay?.roomId.toString()).toBe(room201._id.toString());
    expect(updatedStay?.keyCardIssued).toMatch(/^KEY-RM201-/);
    expect(updatedStay?.roomMoveHistory).toHaveLength(1);
    expect(updatedStay?.roomMoveHistory?.[0].fromRoomNumber).toBe('101');
    expect(updatedStay?.roomMoveHistory?.[0].toRoomNumber).toBe('201');
    expect(updatedStay?.roomMoveHistory?.[0].reason).toBe('UPGRADE');
    expect(updatedStay?.roomMoveHistory?.[0].upgradeFee).toBe(2500);
    expect(updatedStay?.roomMoveHistory?.[0].totalCharge).toBe(2800);

    // Verify Master Folio
    const folio = await MasterFolio.findById(updatedStay?.masterFolioId);
    expect(folio?.roomId.toString()).toBe(room201._id.toString());
    expect(folio?.totalRoomTariff).toBeGreaterThanOrEqual(2500);

    // Verify FolioLineItem
    const lineItem = await FolioLineItem.findOne({
      folioId: folio?._id,
      description: { $regex: /Room Move Upgrade Tariff/i },
    });
    expect(lineItem).toBeDefined();
    expect(lineItem?.department).toBe(DepartmentType.ROOM_RENT);
    expect(lineItem?.rate).toBe(2500);
    expect(lineItem?.taxAmount).toBe(300);
    expect(lineItem?.netAmount).toBe(2800);
  });

  it('5. Verify Auto-Dispatched Housekeeping Turnaround Task for vacated Room 101', async () => {
    const hkTask = await HousekeepingTask.findOne({
      hotelId: hotelIdA,
      roomId: room101._id,
      status: HousekeepingTaskStatus.PENDING,
    });

    expect(hkTask).toBeDefined();
    expect(hkTask?.priority).toBe('HIGH');
    expect(hkTask?.taskType).toBe(HousekeepingTaskType.CHECKOUT_CLEAN);
    expect(hkTask?.inspectionNotes).toContain('Room move turnaround: Room 101 vacated');
    expect(hkTask?.checklist).toHaveLength(6);
  });

  it('6. Negative: Reject Room Move to an already OCCUPIED room (409 Conflict)', async () => {
    // Try to move to Room 301 which is already OCCUPIED
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/room-move')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentRoomNumber: '201',
        targetRoomNumber: '301',
        reason: 'GUEST_REQUEST',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ROOM_NOT_AVAILABLE');
    expect(res.body.message).toContain('Must be AVAILABLE');
  });

  it('7. Negative: Reject Room Move to the same room (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/room-move')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentRoomNumber: '201',
        targetRoomNumber: '201',
        reason: 'GUEST_REQUEST',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('SAME_ROOM_ERROR');
  });

  it('8. Strict Multi-Tenant Isolation: Tenant B cannot execute room move for Tenant A rooms', async () => {
    const res = await request(app)
      .post('/api/v1/pms/frontdesk/room-move')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        currentRoomNumber: '201',
        targetRoomNumber: '101',
        reason: 'GUEST_REQUEST',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
