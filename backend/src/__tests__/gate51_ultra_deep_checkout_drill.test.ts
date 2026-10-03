import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, server } from '../index';
import {
  UserRole,
  ShiftStatus,
  RoomStatus,
} from '@spicehub/shared-types';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking, BookingStatus, BookingSource } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { Payment } from '../models/Payment';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'spicehub_super_secret_jwt_key_2026_production_ready_9921';

describe('--- SHIFT 51 ULTRA: DEEP CONCURRENCY & FAILURE STRESS DRILL ---', () => {
  let tenantId: string;
  let receptionistToken: string;
  let supervisorToken: string;
  let roomType: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(0, () => resolve());
      });
    }

    const tenant = await Tenant.create({
      name: 'SpiceHub Ultra Concurrency Drill Hotel',
      slug: `drill-pms-checkout-${Date.now()}`,
      contactEmail: `drill.${Date.now()}@spicehub.com`,
      contactPhone: '9899988877',
      status: 'ACTIVE',
    });
    tenantId = tenant._id.toString();

    const receptionist = await User.create({
      hotelId: tenant._id,
      name: 'Drill Receptionist',
      email: `receptionist.drill.${Date.now()}@spicehub.com`,
      phone: '9811199988',
      passwordHash: 'dummy_hash',
      role: UserRole.HOTEL_ADMIN,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    receptionistToken = jwt.sign(
      {
        userId: receptionist._id.toString(),
        hotelId: tenantId,
        role: receptionist.role,
        permissions: ['PMS_FRONT_DESK'],
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const supervisor = await User.create({
      hotelId: tenant._id,
      name: 'Drill HK Supervisor',
      email: `hk.drill.${Date.now()}@spicehub.com`,
      phone: '9811199989',
      passwordHash: 'dummy_hash',
      role: UserRole.HOUSEKEEPING,
      shiftStatus: ShiftStatus.ON_DUTY,
      isActive: true,
    });

    supervisorToken = jwt.sign(
      {
        userId: supervisor._id.toString(),
        hotelId: tenantId,
        role: supervisor.role,
        permissions: ['HOUSEKEEPING'],
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    roomType = await RoomType.create({
      hotelId: tenant._id,
      name: 'Executive Concurrency Suite',
      code: 'ECS',
      basePriceOvernight: 6000,
      totalRoomsCount: 5,
      isActive: true,
    });
  });

  // DRILL 1: Parallel Check-Out Storm (10 Concurrent Requests on Same Stay)
  it('DRILL 1: should enforce atomic CAS compare-and-swap so exactly 1 out of 10 concurrent checkout requests succeeds', async () => {
    // 1a. Create Room & Active Stay
    const room = await Room.create({
      hotelId: tenantId,
      roomNumber: `STORM-201`,
      roomTypeId: roomType._id,
      floorNumber: 2,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `STORM_201_QR_${Date.now()}`,
    });

    const booking = await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-STORM-${Date.now()}`,
      guestName: 'Concurrent Guest Alpha',
      guestPhone: '9877766655',
      guestEmail: 'concurrent@guest.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomType._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 6000,
      taxAmount: 720,
      grandTotal: 6720,
      advancePaymentAmount: 6720, // Zero balance
    });

    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: booking._id.toString(),
        roomId: room._id.toString(),
        keyCardNumber: 'CARD-STORM-201',
      });

    expect(checkInRes.status).toBe(200);
    const stayId = checkInRes.body.stay._id;
    const folioId = checkInRes.body.folio._id;

    // 1b. Launch 10 simultaneous parallel check-out requests
    const CONCURRENCY_STORM = 10;
    const promises = Array.from({ length: CONCURRENCY_STORM }).map((_, i) =>
      request(app)
        .post('/api/v1/pms/reception/settle-and-checkout')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          stayId,
          payments: [],
          notes: `Storm request #${i + 1}`,
        })
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.status === 200).length;
    const conflictCount = results.filter((r) => r.status === 409).length;

    // Authoritative CAS invariant:
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(CONCURRENCY_STORM - 1);

    // Verify room is DIRTY and keycard cleared
    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.status).toBe(RoomStatus.DIRTY);
    expect(updatedRoom?.keyCardNumber).toBeNull();
    expect(updatedRoom?.currentStayId).toBeNull();

    // Verify exactly ONE housekeeping task was created
    const hkTasks = await HousekeepingTask.find({ roomId: room._id, taskType: HousekeepingTaskType.CHECKOUT_CLEAN });
    expect(hkTasks.length).toBe(1);

    // Verify folio settled
    const updatedFolio = await MasterFolio.findById(folioId);
    expect(updatedFolio?.folioStatus).toBe('SETTLED');
  });

  // DRILL 2: Double Check-Out Protection on Stale / Dirty Room
  it('DRILL 2: should immediately reject repeated checkout attempts once room is DIRTY', async () => {
    const room = await Room.create({
      hotelId: tenantId,
      roomNumber: `REPEAT-202`,
      roomTypeId: roomType._id,
      floorNumber: 2,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `REPEAT_202_QR_${Date.now()}`,
    });

    const booking = await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-REPEAT-${Date.now()}`,
      guestName: 'Double Check Guest',
      guestPhone: '9877766656',
      guestEmail: 'repeat@guest.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomType._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 6000,
      taxAmount: 720,
      grandTotal: 6720,
      advancePaymentAmount: 6720,
    });

    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: booking._id.toString(),
        roomId: room._id.toString(),
      });

    const stayId = checkInRes.body.stay._id;

    // First checkout -> Success (200)
    const firstCheckout = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ stayId });

    expect(firstCheckout.status).toBe(200);

    // Second checkout -> Conflict (409)
    const secondCheckout = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ stayId });

    expect(secondCheckout.status).toBe(409);
    expect(secondCheckout.body.errorCode).toBe('STAY_ALREADY_CHECKED_OUT');
  });

  // DRILL 3: Underpayment Race Protection
  it('DRILL 3: should reject all underpayment attempts without compromising room or stay state', async () => {
    const room = await Room.create({
      hotelId: tenantId,
      roomNumber: `UNDERPAY-203`,
      roomTypeId: roomType._id,
      floorNumber: 2,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `UNDERPAY_203_QR_${Date.now()}`,
    });

    const booking = await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-UNDER-${Date.now()}`,
      guestName: 'Underpaying Guest',
      guestPhone: '9877766657',
      guestEmail: 'underpay@guest.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomType._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 6000,
      taxAmount: 720,
      grandTotal: 6720,
      advancePaymentAmount: 1000, // 5720 due
    });

    const checkInRes = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: booking._id.toString(),
        roomId: room._id.toString(),
      });

    const stayId = checkInRes.body.stay._id;

    // Attempt to settle with only 2000 (when 5720 is due)
    const underpayRes = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        stayId,
        paymentMode: 'CASH',
        amount: 2000,
      });

    expect(underpayRes.status).toBe(400);
    expect(underpayRes.body.errorCode).toBe('OUTSTANDING_BALANCE_DUE');
    expect(underpayRes.body.remainingDue).toBe(3720);

    // Ensure Room is still OCCUPIED and Stay still ACTIVE
    const intactRoom = await Room.findById(room._id);
    expect(intactRoom?.status).toBe(RoomStatus.OCCUPIED);

    const intactStay = await Stay.findById(stayId);
    expect(intactStay?.stayStatus).toBe(StayStatus.ACTIVE);

    // Zero payments recorded
    const payments = await Payment.find({ folioId: checkInRes.body.folio._id });
    expect(payments.length).toBe(0);
  });

  // DRILL 4: Rapid Sequential Turnaround (Check-out -> Clean -> Re-check-in)
  it('DRILL 4: should support full housekeeping lifecycle post check-out and re-open room for next guest', async () => {
    const room = await Room.create({
      hotelId: tenantId,
      roomNumber: `TURN-204`,
      roomTypeId: roomType._id,
      floorNumber: 2,
      status: RoomStatus.AVAILABLE,
      permanentQrCodeHash: `TURN_204_QR_${Date.now()}`,
    });

    // Guest 1 Check-in & Check-out
    const booking1 = await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-TURN1-${Date.now()}`,
      guestName: 'Guest Departing',
      guestPhone: '9877766658',
      guestEmail: 'turn1@guest.in',
      checkInDate: new Date(),
      checkOutDate: new Date(),
      roomTypeId: roomType._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 6000,
      taxAmount: 720,
      grandTotal: 6720,
      advancePaymentAmount: 6720,
    });

    const checkIn1 = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: booking1._id.toString(),
        roomId: room._id.toString(),
        keyCardNumber: 'CARD-GUEST-1',
      });

    // Check-out Guest 1
    const checkout1 = await request(app)
      .post('/api/v1/pms/reception/settle-and-checkout')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ stayId: checkIn1.body.stay._id });

    expect(checkout1.status).toBe(200);

    let roomDoc = await Room.findById(room._id);
    expect(roomDoc?.status).toBe(RoomStatus.DIRTY);

    // Housekeeping Cleans the Room & Releases to AVAILABLE
    const task = await HousekeepingTask.findOne({ roomId: room._id, status: HousekeepingTaskStatus.PENDING });
    expect(task).toBeDefined();

    task!.status = HousekeepingTaskStatus.INSPECTED_PASSED;
    await task!.save();

    roomDoc!.status = RoomStatus.AVAILABLE;
    await roomDoc!.save();

    // Guest 2 Checks in to Cleaned Room 204
    const booking2 = await Booking.create({
      hotelId: tenantId,
      bookingNumber: `BK-TURN2-${Date.now()}`,
      guestName: 'Guest Arriving Next',
      guestPhone: '9877766659',
      guestEmail: 'turn2@guest.in',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      roomTypeId: roomType._id,
      bookingSource: BookingSource.WALK_IN,
      bookingStatus: BookingStatus.CONFIRMED,
      totalTariff: 6000,
      taxAmount: 720,
      grandTotal: 6720,
      advancePaymentAmount: 6720,
    });

    const checkIn2 = await request(app)
      .post('/api/v1/pms/reception/check-in')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        bookingId: booking2._id.toString(),
        roomId: room._id.toString(),
        keyCardNumber: 'CARD-GUEST-2',
      });

    expect(checkIn2.status).toBe(200);
    const refreshedRoom = await Room.findById(room._id);
    expect(refreshedRoom?.status).toBe(RoomStatus.OCCUPIED);
    expect(refreshedRoom?.keyCardNumber).toBe('CARD-GUEST-2');
  });
});
