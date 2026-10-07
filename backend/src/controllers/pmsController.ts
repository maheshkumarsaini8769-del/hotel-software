import { Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus, BookingMode, BookingSource } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
import { HousekeepingTask, HousekeepingTaskType, HousekeepingTaskStatus } from '../models/HousekeepingTask';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { FolioLineItem, DepartmentType } from '../models/FolioLineItem';
import { KeycardVoidAudit, KeycardVoidReason } from '../models/KeycardVoidAudit';
import { RestaurantOrder, OverallOrderStatus, OrderType } from '../models/RestaurantOrder';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Search Room Availability & Calculate Authoritative Tariff
export const searchAvailableRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, checkInDate, checkOutDate, adults = 2 } = req.query;

    if (!hotelId || !checkInDate || !checkOutDate) {
      res.status(400).json({ success: false, errorCode: 'INVALID_QUERY', message: 'Missing required search dates' });
      return;
    }

    const checkIn = new Date(checkInDate as string);
    const checkOut = new Date(checkOutDate as string);

    if (checkOut <= checkIn) {
      res.status(400).json({ success: false, errorCode: 'INVALID_DATES', message: 'Check-out date must be after check-in' });
      return;
    }

    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

    // Fetch active room types for this hotel
    const roomTypes = await RoomType.find({
      hotelId: new Types.ObjectId(hotelId as string),
      isActive: true,
      maxCapacity: { $gte: Number(adults) },
    });

    const availabilityResults = [];

    for (const type of roomTypes) {
      // Count total physical rooms of this type
      const totalRooms = await Room.countDocuments({
        hotelId: new Types.ObjectId(hotelId as string),
        roomTypeId: type._id,
        status: { $ne: RoomStatus.OUT_OF_SERVICE },
      });

      // Count active overlapping bookings
      const bookedCount = await Booking.countDocuments({
        hotelId: new Types.ObjectId(hotelId as string),
        roomTypeId: type._id,
        bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      });

      const availableCount = Math.max(0, totalRooms - bookedCount);

      // Authoritative GST calculation (12% if tariff <= 7500, 18% if > 7500)
      const baseTariff = type.basePriceOvernight * nights;
      const gstRate = type.basePriceOvernight > 7500 ? 18 : 12;
      const taxAmount = Math.round((baseTariff * (gstRate / 100)) * 100) / 100;
      const grandTotal = baseTariff + taxAmount;

      availabilityResults.push({
        roomTypeId: type._id,
        name: type.name,
        code: type.code,
        nights,
        basePricePerNight: type.basePriceOvernight,
        baseTariff,
        gstRate,
        taxAmount,
        grandTotal,
        availableRooms: availableCount,
        isSoldOut: availableCount === 0,
        amenities: type.amenities,
        images: type.images,
      });
    }

    res.status(200).json({ success: true, data: availabilityResults });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Direct Public Room Booking (Atomic Overbooking Protection)
export const createRoomBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guestName,
      guestPhone,
      guestEmail,
      guestCountAdults = 2,
      guestCountChildren = 0,
      bookingMode = BookingMode.OVERNIGHT,
    } = req.body;

    if (!hotelId || !roomTypeId || !guestName || !guestPhone || !guestEmail || !checkInDate || !checkOutDate) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'All booking fields are required' });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_DATES',
        message: 'checkOutDate must be strictly after checkInDate',
      });
      return;
    }

    // Atomic Availability Check before creating booking
    const type = await RoomType.findOne({ _id: new Types.ObjectId(roomTypeId), hotelId: new Types.ObjectId(hotelId) });
    if (!type) {
      res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND' });
      return;
    }

    const totalRooms = await Room.countDocuments({
      hotelId: new Types.ObjectId(hotelId),
      roomTypeId: type._id,
      status: { $ne: RoomStatus.OUT_OF_SERVICE },
    });

    const bookedCount = await Booking.countDocuments({
      hotelId: new Types.ObjectId(hotelId),
      roomTypeId: type._id,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (bookedCount >= totalRooms) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_SOLD_OUT',
        message: 'Sorry, this room type is fully booked for selected dates',
      });
      return;
    }

    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
    const totalTariff = type.basePriceOvernight * nights;
    const gstRate = type.basePriceOvernight > 7500 ? 18 : 12;
    const taxAmount = Math.round((totalTariff * (gstRate / 100)) * 100) / 100;
    const grandTotal = totalTariff + taxAmount;

    // Generate unguessable random 8-digit Booking ID
    const randomBookingNumber = `BK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // CRITICAL ARCHITECTURE RULE: allocatedRoomId is strictly null until Check-in!
    const booking = await Booking.create({
      hotelId: new Types.ObjectId(hotelId),
      bookingNumber: randomBookingNumber,
      guestName,
      guestPhone,
      guestEmail,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      bookingMode,
      roomTypeId: type._id,
      allocatedRoomId: null,
      guestCountAdults,
      guestCountChildren,
      totalTariff,
      taxAmount,
      grandTotal,
      advancePaymentAmount: grandTotal, // Paid online
      bookingStatus: BookingStatus.CONFIRMED,
    });

    // Atomic Concurrency Barrier: Guarantee bookedCount never exceeds totalRooms even under millisecond race conditions
    const verifiedTotal = await Booking.countDocuments({
      hotelId: new Types.ObjectId(hotelId),
      roomTypeId: type._id,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (verifiedTotal > totalRooms) {
      // Race condition detected! Another guest booked the last room simultaneously.
      await Booking.findByIdAndDelete(booking._id);
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_SOLD_OUT',
        message: 'Concurrency Lock: Room was booked by another guest. Overbooking prevented.',
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Room booking confirmed successfully',
      data: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        guestName: booking.guestName,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        roomTypeName: type.name,
        allocatedRoomId: null, // Proves room number is allocated at front desk
        grandTotal: booking.grandTotal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Front Desk Reception Check-In (Assigns Physical Room & Opens Folio)
export const receptionCheckIn = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, idProofType, idProofNumber, keyCardNumber } = req.body;
    const physicalRoomId = req.body.physicalRoomId || req.body.roomId;
    const receptionistId = req.user?.userId;
    const hotelId = req.hotelId;

    if (!bookingId || !physicalRoomId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Missing bookingId or physicalRoomId' });
      return;
    }

    const booking = await Booking.findOne({
      _id: new Types.ObjectId(bookingId),
      hotelId: new Types.ObjectId(hotelId),
    });
    if (!booking || booking.bookingStatus !== BookingStatus.CONFIRMED) {
      res.status(400).json({ success: false, errorCode: 'INVALID_BOOKING', message: 'Booking is not confirmed or not found' });
      return;
    }

    const targetRoom = await Room.findOne({
      _id: new Types.ObjectId(physicalRoomId),
      hotelId: new Types.ObjectId(hotelId),
    });
    if (!targetRoom) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Physical room not found' });
      return;
    }

    if (targetRoom.roomTypeId.toString() !== booking.roomTypeId.toString()) {
      res.status(400).json({
        success: false,
        errorCode: 'ROOM_TYPE_MISMATCH',
        message: 'Physical room does not match booking room type',
      });
      return;
    }

    // Atomically lock and acquire physical room (Compare-And-Swap)
    const room = await Room.findOneAndUpdate(
      { _id: targetRoom._id, hotelId: new Types.ObjectId(hotelId), status: RoomStatus.AVAILABLE },
      { $set: { status: RoomStatus.OCCUPIED } },
      { new: true }
    );

    if (!room) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_NOT_AVAILABLE',
        message: 'Physical room is not available or is being checked in concurrently',
      });
      return;
    }

    try {
      // 1. Assign physical room to Booking
      booking.allocatedRoomId = room._id as Types.ObjectId;
      booking.bookingStatus = BookingStatus.CHECKED_IN;
      booking.idProofType = idProofType;
      booking.idProofNumber = idProofNumber;
      await booking.save();

      // 2. Create Active Stay
      const stay = await Stay.create({
        hotelId,
        bookingId: booking._id,
        roomId: room._id,
        expectedCheckOutTimestamp: booking.checkOutDate,
        stayStatus: StayStatus.ACTIVE,
        keyCardIssued: keyCardNumber || undefined,
        checkedInByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
      });

      // 3. Open Master Folio #F-<roomNumber>
      const folioNumber = `FOLIO-${room.roomNumber}-${Date.now().toString().slice(-4)}`;
      const netPayable = Math.max(0, booking.grandTotal - booking.advancePaymentAmount);
      const masterFolio = await MasterFolio.create({
        hotelId,
        stayId: stay._id,
        bookingId: booking._id,
        roomId: room._id,
        folioNumber,
        totalRoomTariff: booking.totalTariff,
        totalTaxes: booking.taxAmount,
        advancePaid: booking.advancePaymentAmount,
        netAmountPayable: netPayable,
        dueAmount: netPayable,
        folioStatus: 'OPEN',
      });

      // Link Folio to Stay
      stay.masterFolioId = masterFolio._id as Types.ObjectId;
      await stay.save();

      room.currentStayId = stay._id as Types.ObjectId;
      if (keyCardNumber) {
        room.keyCardNumber = keyCardNumber;
      }
      await room.save();

    // Broadcast Real-time room status update to Front Desk Tape Chart
    io.to(`${hotelId}_admin`).emit('room:status_changed', {
      roomId: room._id,
      roomNumber: room.roomNumber,
      status: RoomStatus.OCCUPIED,
      stayId: stay._id,
    });

      res.status(200).json({
        success: true,
        message: `Check-in successful! Guest checked into Room ${room.roomNumber}`,
        stay,
        roomNumber: room.roomNumber,
        folio: masterFolio,
        data: {
          stayId: stay._id,
          roomNumber: room.roomNumber,
          folioNumber: masterFolio.folioNumber,
          status: room.status,
        },
      });
    } catch (innerError: any) {
      // Rollback acquired physical room status back to AVAILABLE
      await Room.findByIdAndUpdate(room._id, { $set: { status: RoomStatus.AVAILABLE, currentStayId: null } });
      throw innerError;
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get Interactive PMS Room Reservation Matrix & Live Calendar Grid
export const getCalendarMatrix = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const { startDate, days = 14, roomTypeId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setUTCHours(0, 0, 0, 0);

    const numDays = Math.min(60, Math.max(1, Number(days) || 14));
    const dates = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < numDays; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getUTCDay();
      dates.push({
        date: dateStr,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        dayNumber: d.getUTCDate(),
        monthName: monthNames[d.getUTCMonth()],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    const endDate = new Date(start);
    endDate.setUTCDate(start.getUTCDate() + numDays);

    const rtFilter: any = { hotelId, isActive: true };
    if (roomTypeId && roomTypeId !== 'ALL') {
      rtFilter._id = new Types.ObjectId(roomTypeId as string);
    }
    const roomTypes = await RoomType.find(rtFilter).sort({ basePriceOvernight: 1 });

    const rooms = await Room.find({
      hotelId,
      roomTypeId: { $in: roomTypes.map((rt) => rt._id) },
    }).sort({ roomNumber: 1 });

    const bookings = await Booking.find({
      hotelId,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      checkInDate: { $lt: endDate },
      checkOutDate: { $gt: start },
    }).populate('roomTypeId', 'name code basePriceOvernight');

    // KPI Metrics calculation
    const todayStr = new Date().toISOString().slice(0, 10);
    const arrivalsToday = bookings.filter((b) => b.checkInDate.toISOString().slice(0, 10) === todayStr).length;
    const departuresToday = bookings.filter((b) => b.checkOutDate.toISOString().slice(0, 10) === todayStr).length;
    const totalRoomNightsCapacity = rooms.length * numDays;

    let bookedNights = 0;
    for (const b of bookings) {
      const bStart = Math.max(start.getTime(), b.checkInDate.getTime());
      const bEnd = Math.min(endDate.getTime(), b.checkOutDate.getTime());
      if (bEnd > bStart) {
        bookedNights += Math.ceil((bEnd - bStart) / (1000 * 3600 * 24));
      }
    }
    const occupancyRate =
      totalRoomNightsCapacity > 0
        ? Math.min(100, Math.round((bookedNights / totalRoomNightsCapacity) * 100))
        : 0;

    res.status(200).json({
      success: true,
      data: {
        window: {
          startDate: dates[0].date,
          endDate: dates[dates.length - 1].date,
          totalDays: numDays,
        },
        dates,
        kpis: {
          totalRooms: rooms.length,
          arrivalsToday,
          departuresToday,
          occupancyRate,
          activeBookingsCount: bookings.length,
        },
        roomTypes: roomTypes.map((rt) => ({
          id: rt._id.toString(),
          name: rt.name,
          code: rt.code,
          basePrice: rt.basePriceOvernight,
          rooms: rooms
            .filter((r) => r.roomTypeId.toString() === rt._id.toString())
            .map((r) => ({
              id: r._id.toString(),
              roomNumber: r.roomNumber,
              floorNumber: r.floorNumber,
              wing: r.wing,
              status: r.status,
            })),
        })),
        bookings: bookings.map((b) => ({
          id: b._id.toString(),
          bookingNumber: b.bookingNumber,
          guestName: b.guestName,
          guestPhone: b.guestPhone,
          guestEmail: b.guestEmail,
          checkInDate: b.checkInDate.toISOString().slice(0, 10),
          checkOutDate: b.checkOutDate.toISOString().slice(0, 10),
          bookingStatus: b.bookingStatus,
          allocatedRoomId: b.allocatedRoomId ? b.allocatedRoomId.toString() : null,
          roomTypeId: (b.roomTypeId as any)?._id?.toString() || b.roomTypeId.toString(),
          roomTypeName: (b.roomTypeId as any)?.name || 'Standard',
          grandTotal: b.grandTotal,
          advancePaymentAmount: b.advancePaymentAmount,
          paymentStatus: b.paymentStatus,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 5. Front Desk Quick Reservation from Matrix Cell
export const quickReserve = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'TENANT_REQUIRED', message: 'Tenant ID required' });
      return;
    }

    const {
      roomTypeId,
      roomId,
      checkInDate,
      checkOutDate,
      guestName,
      guestPhone,
      guestEmail,
      adults = 2,
      advancePaymentAmount = 0,
      specialRequests,
    } = req.body;

    if (!roomTypeId || !checkInDate || !checkOutDate || !guestName || !guestPhone) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'Missing required reservation fields (roomTypeId, dates, guest details)',
      });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_DATES',
        message: 'Check-out date must be strictly after check-in date',
      });
      return;
    }

    // Verify room type exists
    const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
    if (!roomType) {
      res.status(404).json({ success: false, errorCode: 'ROOM_TYPE_NOT_FOUND', message: 'Room category not found' });
      return;
    }

    // If specific physical room requested, check direct availability on that room
    if (roomId) {
      const room = await Room.findOne({ _id: roomId, hotelId });
      if (!room) {
        res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Physical room not found' });
        return;
      }

      const conflict = await Booking.findOne({
        hotelId,
        allocatedRoomId: room._id,
        bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      });

      if (conflict) {
        res.status(409).json({
          success: false,
          errorCode: 'ROOM_CONFLICT',
          message: `Room ${room.roomNumber} is already booked for these dates`,
        });
        return;
      }
    } else {
      // Check category capacity
      const totalRooms = await Room.countDocuments({
        hotelId,
        roomTypeId,
        status: { $ne: RoomStatus.OUT_OF_SERVICE },
      });

      const bookedCount = await Booking.countDocuments({
        hotelId,
        roomTypeId,
        bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      });

      if (bookedCount >= totalRooms) {
        res.status(409).json({
          success: false,
          errorCode: 'CATEGORY_SOLD_OUT',
          message: `No available inventory for ${roomType.name} on selected dates`,
        });
        return;
      }
    }

    // Tariff calculation with 12% / 18% GST
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
    const totalTariff = roomType.basePriceOvernight * nights;
    const gstRate = roomType.basePriceOvernight > 7500 ? 18 : 12;
    const taxAmount = Math.round(totalTariff * (gstRate / 100) * 100) / 100;
    const grandTotal = totalTariff + taxAmount;

    const bookingNumber = `BK-${Date.now().toString().slice(-4)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const advancePaid = Math.min(grandTotal, Math.max(0, Number(advancePaymentAmount) || 0));
    const paymentStatus = advancePaid >= grandTotal ? 'PAID' : advancePaid > 0 ? 'PARTIAL' : 'UNPAID';

    const booking = await Booking.create({
      hotelId,
      bookingNumber,
      bookingSource: BookingSource.WALK_IN,
      guestName,
      guestPhone,
      guestEmail: guestEmail || `${guestPhone.replace(/\D/g, '')}@guest.spicehub.com`,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      roomTypeId: roomType._id,
      allocatedRoomId: roomId ? new Types.ObjectId(roomId) : undefined,
      guestCountAdults: Number(adults) || 2,
      totalTariff,
      taxAmount,
      grandTotal,
      advancePaymentAmount: advancePaid,
      paymentStatus,
      bookingStatus: BookingStatus.CONFIRMED,
    });

    // Real-time broadcast to Front Desk PMS channels
    io.to(`${hotelId}_admin`).to(`${hotelId}_pms`).emit('reservation:created', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      roomTypeId: booking.roomTypeId,
      allocatedRoomId: booking.allocatedRoomId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      grandTotal: booking.grandTotal,
    });

    res.status(201).json({
      success: true,
      message: `Reservation ${booking.bookingNumber} created successfully!`,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 6. Assign or Re-assign Physical Room from Matrix
export const assignRoom = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { bookingId } = req.params;
    const { roomId } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      return;
    }

    if (booking.bookingStatus === BookingStatus.CANCELLED || booking.bookingStatus === BookingStatus.CHECKED_OUT) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_BOOKING_STATUS',
        message: 'Cannot assign room to cancelled or checked out booking',
      });
      return;
    }

    if (roomId) {
      const room = await Room.findOne({ _id: roomId, hotelId });
      if (!room) {
        res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Target room not found' });
        return;
      }

      if (room.roomTypeId.toString() !== booking.roomTypeId.toString()) {
        res.status(400).json({
          success: false,
          errorCode: 'ROOM_TYPE_MISMATCH',
          message: 'Selected room does not match booking room type',
        });
        return;
      }

      // Conflict check
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        hotelId,
        allocatedRoomId: room._id,
        bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        checkInDate: { $lt: booking.checkOutDate },
        checkOutDate: { $gt: booking.checkInDate },
      });

      if (conflict) {
        res.status(409).json({
          success: false,
          errorCode: 'ROOM_CONFLICT',
          message: `Room ${room.roomNumber} is already occupied/reserved for overlapping dates`,
        });
        return;
      }

      booking.allocatedRoomId = room._id as Types.ObjectId;
    } else {
      booking.allocatedRoomId = undefined;
    }

    await booking.save();

    io.to(`${hotelId}_admin`).to(`${hotelId}_pms`).emit('reservation:room_assigned', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      allocatedRoomId: booking.allocatedRoomId,
    });

    res.status(200).json({
      success: true,
      message: 'Room assignment updated successfully',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 7. Update Reservation Status (Cancel, No-Show)
export const updateBookingStatus = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, hotelId });
    if (!booking) {
      res.status(404).json({ success: false, errorCode: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
      return;
    }

    if (!Object.values(BookingStatus).includes(status)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: 'Invalid booking status' });
      return;
    }

    if (booking.bookingStatus === BookingStatus.CANCELLED && status !== BookingStatus.CANCELLED) {
      res.status(400).json({ success: false, errorCode: 'INVALID_TRANSITION', message: 'Cancelled booking cannot be reopened' });
      return;
    }

    if (booking.bookingStatus === BookingStatus.CHECKED_IN && (status === BookingStatus.NO_SHOW || status === BookingStatus.CONFIRMED)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_TRANSITION', message: 'Checked-in booking cannot be changed to No-Show or Confirmed' });
      return;
    }

    // If cancelling a booking that held a room, free the room if not currently occupied by another stay
    if ((status === BookingStatus.CANCELLED || status === BookingStatus.NO_SHOW) && booking.allocatedRoomId) {
      const room = await Room.findOne({ _id: booking.allocatedRoomId, hotelId });
      if (room && !room.currentStayId && room.status === RoomStatus.OCCUPIED) {
        room.status = RoomStatus.AVAILABLE;
        await room.save();
      }
      booking.allocatedRoomId = undefined;
    }

    booking.bookingStatus = status;
    await booking.save();

    io.to(`${hotelId}_admin`).to(`${hotelId}_pms`).emit('booking:status_changed', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.bookingStatus,
    });

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 8. Front Desk Arrivals, Departures & Unassigned Room Board
export const getArrivalsBoard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { date, filter } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const allBookings = await Booking.find({
      hotelId,
      bookingStatus: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT] },
    })
      .populate('roomTypeId', 'name code basePriceOvernight')
      .populate('allocatedRoomId', 'roomNumber floorNumber status')
      .sort({ checkInDate: 1 });

    let totalArrivals = 0;
    let pendingArrivals = 0;
    let totalDepartures = 0;
    let inHouseCount = 0;
    let unassignedCount = 0;

    const arrivalsList: any[] = [];
    const departuresList: any[] = [];
    const inHouseList: any[] = [];
    const unassignedList: any[] = [];

    allBookings.forEach((b) => {
      const isArrival = b.checkInDate >= startOfDay && b.checkInDate <= endOfDay;
      const isDeparture = b.checkOutDate >= startOfDay && b.checkOutDate <= endOfDay;
      const isInHouse = b.bookingStatus === BookingStatus.CHECKED_IN;
      const isUnassigned = !b.allocatedRoomId && b.bookingStatus === BookingStatus.CONFIRMED;

      if (isArrival) {
        totalArrivals++;
        if (b.bookingStatus === BookingStatus.CONFIRMED) pendingArrivals++;
        arrivalsList.push(b);
      }
      if (isDeparture) {
        totalDepartures++;
        departuresList.push(b);
      }
      if (isInHouse) {
        inHouseCount++;
        inHouseList.push(b);
      }
      if (isUnassigned) {
        unassignedCount++;
        unassignedList.push(b);
      }
    });

    let filteredBookings = allBookings;
    if (filter === 'ARRIVALS') filteredBookings = arrivalsList;
    else if (filter === 'DEPARTURES') filteredBookings = departuresList;
    else if (filter === 'IN_HOUSE') filteredBookings = inHouseList;
    else if (filter === 'UNASSIGNED') filteredBookings = unassignedList;

    const availableCleanRooms = await Room.find({
      hotelId,
      status: RoomStatus.AVAILABLE,
    })
      .populate('roomTypeId', 'name code')
      .sort({ roomNumber: 1 });

    res.status(200).json({
      success: true,
      summary: {
        totalArrivals,
        pendingArrivals,
        totalDepartures,
        inHouseCount,
        unassignedCount,
      },
      bookings: filteredBookings,
      availableCleanRooms,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// =========================================================================
// SHIFT 51: PMS EXPRESS CHECK-OUT, ATOMIC FOLIO SETTLEMENT & KEYCARD VOID
// =========================================================================

// 9. Front Desk PMS Checkout Preview
export const getCheckoutPreview = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const stayId = req.params.stayId || req.query.stayId;
    const roomId = req.query.roomId;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!stayId && !roomId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'stayId or roomId is required' });
      return;
    }

    if (stayId && !Types.ObjectId.isValid(stayId as string)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid stayId format' });
      return;
    }

    if (roomId && !Types.ObjectId.isValid(roomId as string)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid roomId format' });
      return;
    }

    let stay: any = null;
    if (stayId) {
      stay = await Stay.findOne({
        _id: new Types.ObjectId(stayId as string),
        hotelId: new Types.ObjectId(hotelId),
      }).populate('roomId').populate('bookingId');
    } else if (roomId) {
      stay = await Stay.findOne({
        roomId: new Types.ObjectId(roomId as string),
        hotelId: new Types.ObjectId(hotelId),
        stayStatus: StayStatus.ACTIVE,
      }).populate('roomId').populate('bookingId');
    }

    if (!stay) {
      res.status(404).json({ success: false, errorCode: 'STAY_NOT_FOUND', message: 'Active stay not found' });
      return;
    }

    const room = stay.roomId;
    const booking = stay.bookingId;

    const folio = await MasterFolio.findOne({
      _id: stay.masterFolioId,
      hotelId: new Types.ObjectId(hotelId),
    });

    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    // Fetch all line items
    const lineItems = await FolioLineItem.find({
      folioId: folio._id,
      hotelId: new Types.ObjectId(hotelId),
    }).sort({ createdAt: 1 });

    // Check for unposted open restaurant orders
    const pendingOrders = await RestaurantOrder.find({
      hotelId: new Types.ObjectId(hotelId),
      orderStatus: { $ne: OverallOrderStatus.CANCELLED },
      isBilled: { $ne: true },
      isSweptToFolio: { $ne: true },
      $or: [
        { roomId: room._id },
        { stayId: stay._id },
        { folioId: folio._id },
      ],
    });

    const pendingOrdersDetails = pendingOrders.map((o) => {
      const subtotal = o.items.reduce((s: number, it: any) => s + Number(it.subtotal || (it.unitPrice * it.quantity) || 0), 0);
      const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
      return {
        orderId: o._id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        subtotal,
        taxAmount,
        grandTotal: Math.round((subtotal + taxAmount) * 100) / 100,
        placedAt: o.placedAt,
        status: o.orderStatus,
        itemsCount: o.items.length,
      };
    });

    const pendingOrdersTotal = Math.round(pendingOrdersDetails.reduce((s, it) => s + it.grandTotal, 0) * 100) / 100;

    const effectiveDue = folio.dueAmount !== undefined && folio.dueAmount !== null
      ? folio.dueAmount
      : Math.max(0, folio.netAmountPayable - (folio.paidAmount || 0));

    const projectedDueWithPendingOrders = Math.round((effectiveDue + pendingOrdersTotal) * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        stayId: stay._id,
        stayStatus: stay.stayStatus,
        checkInTimestamp: stay.checkInTimestamp,
        expectedCheckOutTimestamp: stay.expectedCheckOutTimestamp,
        actualCheckOutTimestamp: stay.actualCheckOutTimestamp,
        guest: {
          name: booking?.guestName || 'Guest',
          phone: booking?.guestPhone || '',
          email: booking?.guestEmail || '',
        },
        room: {
          id: room?._id,
          roomNumber: room?.roomNumber,
          floorNumber: room?.floorNumber,
          status: room?.status,
          keyCardNumber: room?.keyCardNumber || stay.keyCardIssued || null,
        },
        folio: {
          id: folio._id,
          folioNumber: folio.folioNumber,
          folioStatus: folio.folioStatus,
          isLocked: folio.folioStatus === 'LOCKED',
          lockedAt: folio.lockedAt,
          lockedByUserId: folio.lockedByUserId,
          lockReason: folio.lockReason,
          totalRoomTariff: folio.totalRoomTariff,
          totalFoodAndBeverage: folio.totalFoodAndBeverage,
          totalLaundry: folio.totalLaundry,
          totalPaidServices: folio.totalPaidServices,
          totalDamageCharges: folio.totalDamageCharges,
          totalDiscounts: folio.totalDiscounts,
          totalTaxes: folio.totalTaxes,
          grossCharges:
            folio.totalRoomTariff +
            folio.totalFoodAndBeverage +
            folio.totalLaundry +
            folio.totalPaidServices +
            folio.totalDamageCharges +
            folio.totalTaxes -
            folio.totalDiscounts,
          advancePaid: folio.advancePaid,
          paidAmount: folio.paidAmount || 0,
          netAmountPayable: folio.netAmountPayable,
          dueAmount: effectiveDue,
          isZeroBalance: effectiveDue <= 0,
          lineItems: lineItems.map((li) => ({
            id: li._id,
            department: li.department,
            description: li.description,
            rate: li.rate,
            quantity: li.quantity,
            taxAmount: li.taxAmount,
            netAmount: li.netAmount,
            postedAt: li.postedAt,
          })),
        },
        pendingOrdersCount: pendingOrders.length,
        hasPendingOrders: pendingOrders.length > 0,
        pendingOrdersTotal,
        projectedDueWithPendingOrders,
        pendingRestaurantOrders: pendingOrdersDetails,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 10. Front Desk PMS Express Check-Out & Atomic Folio Settlement
export const settleAndCheckOut = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const receptionistId = req.user?.userId;
    const {
      stayId,
      roomId,
      payments,
      paymentMode,
      amount,
      transactionRef,
      cashReceived,
      cashChangeReturned,
      targetRoomStatus = RoomStatus.DIRTY,
      keyCardVoided = true,
      housekeepingPriority,
      notes,
      autoSweepPendingOrders = true,
    } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!stayId && !roomId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'stayId or roomId is required' });
      return;
    }

    // 1. Locate active stay
    let stay: any = null;
    if (stayId) {
      stay = await Stay.findOne({
        _id: new Types.ObjectId(stayId),
        hotelId: new Types.ObjectId(hotelId),
      });
    } else if (roomId) {
      stay = await Stay.findOne({
        roomId: new Types.ObjectId(roomId),
        hotelId: new Types.ObjectId(hotelId),
        stayStatus: StayStatus.ACTIVE,
      });
    }

    if (!stay) {
      // Check if stay was already checked out
      const checkedOutStay = stayId
        ? await Stay.findOne({ _id: new Types.ObjectId(stayId), hotelId: new Types.ObjectId(hotelId) })
        : await Stay.findOne({ roomId: new Types.ObjectId(roomId), hotelId: new Types.ObjectId(hotelId) }).sort({ updatedAt: -1 });

      if (checkedOutStay && checkedOutStay.stayStatus === StayStatus.CHECKED_OUT) {
        res.status(409).json({
          success: false,
          errorCode: 'STAY_ALREADY_CHECKED_OUT',
          message: 'This stay has already been checked out',
        });
        return;
      }

      res.status(404).json({ success: false, errorCode: 'STAY_NOT_FOUND', message: 'Active stay not found' });
      return;
    }

    if (stay.stayStatus === StayStatus.CHECKED_OUT) {
      res.status(409).json({
        success: false,
        errorCode: 'STAY_ALREADY_CHECKED_OUT',
        message: 'This stay has already been checked out',
      });
      return;
    }

    // 2. Locate and verify physical room
    const targetRoom = await Room.findOne({
      _id: stay.roomId,
      hotelId: new Types.ObjectId(hotelId),
    });

    if (!targetRoom) {
      res.status(404).json({ success: false, errorCode: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    if (targetRoom.status !== RoomStatus.OCCUPIED) {
      res.status(409).json({
        success: false,
        errorCode: 'ROOM_NOT_OCCUPIED',
        message: `Room ${targetRoom.roomNumber} is currently ${targetRoom.status}, not OCCUPIED`,
      });
      return;
    }

    // 3. Locate Folio & verify balance
    const folio = await MasterFolio.findOne({
      _id: stay.masterFolioId,
      hotelId: new Types.ObjectId(hotelId),
    });

    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    if (folio.folioStatus === 'SETTLED') {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_ALREADY_SETTLED',
        message: 'Folio is already settled',
      });
      return;
    }

    // Shift 52: Auto-sweep unbilled restaurant charges into room folio before final checkout settlement
    if (autoSweepPendingOrders !== false) {
      const pendingOrders = await RestaurantOrder.find({
        hotelId: new Types.ObjectId(hotelId),
        orderStatus: { $ne: OverallOrderStatus.CANCELLED },
        isBilled: { $ne: true },
        isSweptToFolio: { $ne: true },
        $or: [
          { roomId: targetRoom._id },
          { stayId: stay._id },
          { folioId: folio._id },
        ],
      });

      if (pendingOrders.length > 0) {
        let sweptSubtotal = 0;
        let sweptTax = 0;
        let sweptNet = 0;

        for (const order of pendingOrders) {
          const claimedOrder = await RestaurantOrder.findOneAndUpdate(
            {
              _id: order._id,
              hotelId: new Types.ObjectId(hotelId),
              isBilled: { $ne: true },
              isSweptToFolio: { $ne: true },
            },
            {
              $set: {
                isBilled: true,
                isSweptToFolio: true,
                sweptAt: new Date(),
                sweptToFolioId: folio._id,
                ...(order.orderStatus !== OverallOrderStatus.SERVED
                  ? { orderStatus: OverallOrderStatus.SERVED, servedAt: new Date() }
                  : {}),
              },
            },
            { new: true }
          );

          if (!claimedOrder) continue;

          const subtotal = claimedOrder.items.reduce((sum: number, it: any) => sum + Number(it.subtotal || (it.unitPrice * it.quantity) || 0), 0);
          const tax5Percent = Math.round(subtotal * 0.05 * 100) / 100;
          const grandTotal = Math.round((subtotal + tax5Percent) * 100) / 100;

          const dept = claimedOrder.orderType === OrderType.ROOM_SERVICE ? DepartmentType.ROOM_SERVICE : DepartmentType.RESTAURANT_DINE;
          await FolioLineItem.create({
            hotelId: new Types.ObjectId(hotelId),
            folioId: folio._id,
            department: dept,
            description: `${claimedOrder.orderType === OrderType.ROOM_SERVICE ? 'In-Room Dining' : 'Restaurant Dine-In'} #${claimedOrder.orderNumber} (Swept at Check-Out)`,
            referenceId: claimedOrder._id,
            rate: subtotal,
            quantity: 1,
            taxRate: 5,
            taxAmount: tax5Percent,
            netAmount: grandTotal,
            postedAt: new Date(),
            postedByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
          });

          sweptSubtotal += subtotal;
          sweptTax += tax5Percent;
          sweptNet += grandTotal;
        }

        folio.totalFoodAndBeverage = Math.round(((folio.totalFoodAndBeverage || 0) + sweptSubtotal) * 100) / 100;
        folio.totalTaxes = Math.round(((folio.totalTaxes || 0) + sweptTax) * 100) / 100;
        folio.netAmountPayable = Math.round(((folio.netAmountPayable || 0) + sweptNet) * 100) / 100;
        folio.dueAmount = Math.round(((folio.dueAmount !== undefined ? folio.dueAmount : folio.netAmountPayable) + sweptNet) * 100) / 100;
        await folio.save();

        io.to(`${hotelId}_admin`).emit('pms:charges_swept', {
          folioId: folio._id,
          roomId: targetRoom._id,
          sweptOrdersCount: pendingOrders.length,
          totalSweptAmount: Math.round(sweptNet * 100) / 100,
        });
      }
    }

    const effectiveDue = folio.dueAmount !== undefined && folio.dueAmount !== null
      ? folio.dueAmount
      : Math.max(0, folio.netAmountPayable - (folio.paidAmount || 0));

    // Normalize payments array
    let paymentList: Array<{
      paymentMode: PaymentMode;
      amount: number;
      transactionRef?: string;
      cashReceived?: number;
      cashChangeReturned?: number;
      notes?: string;
    }> = [];

    if (Array.isArray(payments) && payments.length > 0) {
      paymentList = payments;
    } else if (paymentMode && amount !== undefined) {
      paymentList = [{
        paymentMode,
        amount: Number(amount),
        transactionRef,
        cashReceived,
        cashChangeReturned,
        notes,
      }];
    }

    const totalSettled = paymentList.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Validate outstanding balance
    if (effectiveDue > 0 && totalSettled < effectiveDue) {
      res.status(400).json({
        success: false,
        errorCode: 'OUTSTANDING_BALANCE_DUE',
        message: `Outstanding balance of ₹${effectiveDue} must be fully settled before checkout. Received: ₹${totalSettled}`,
        dueAmount: effectiveDue,
        totalSettled,
        remainingDue: effectiveDue - totalSettled,
      });
      return;
    }

    // 4. ATOMIC CAS LOCK ON ROOM (Compare-And-Swap)
    const lockedRoom = await Room.findOneAndUpdate(
      {
        _id: targetRoom._id,
        hotelId: new Types.ObjectId(hotelId),
        status: RoomStatus.OCCUPIED,
      },
      {
        $set: {
          status: targetRoomStatus,
          currentStayId: null,
          keyCardNumber: null,
        },
      },
      { new: true }
    );

    if (!lockedRoom) {
      res.status(409).json({
        success: false,
        errorCode: 'CONCURRENT_CHECKOUT_CONFLICT',
        message: 'Room was modified or checked out by another concurrent process',
      });
      return;
    }

    // 5. ATOMIC CAS ON STAY
    const updatedStay = await Stay.findOneAndUpdate(
      {
        _id: stay._id,
        hotelId: new Types.ObjectId(hotelId),
        stayStatus: StayStatus.ACTIVE,
      },
      {
        $set: {
          stayStatus: StayStatus.CHECKED_OUT,
          actualCheckOutTimestamp: new Date(),
          checkedOutByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
        },
      },
      { new: true }
    );

    if (!updatedStay) {
      // Rollback room status
      await Room.findByIdAndUpdate(targetRoom._id, {
        $set: {
          status: RoomStatus.OCCUPIED,
          currentStayId: stay._id,
          keyCardNumber: targetRoom.keyCardNumber,
        },
      });
      res.status(409).json({
        success: false,
        errorCode: 'CONCURRENT_CHECKOUT_CONFLICT',
        message: 'Stay was modified or checked out concurrently',
      });
      return;
    }

    // 6. Update Booking status
    if (stay.bookingId) {
      await Booking.findByIdAndUpdate(stay.bookingId, {
        $set: { bookingStatus: BookingStatus.CHECKED_OUT },
      });
    }

    // 7. Update Folio to SETTLED
    folio.paidAmount = (folio.paidAmount || 0) + totalSettled;
    folio.dueAmount = Math.max(0, effectiveDue - totalSettled);
    folio.folioStatus = 'SETTLED';
    folio.settledAt = new Date();
    folio.settledByUserId = receptionistId ? new Types.ObjectId(receptionistId) : undefined;
    folio.settlementNotes = notes || (paymentList.length > 0 ? `Settled via ${paymentList.map(p => p.paymentMode).join(', ')}` : 'Zero balance express check-out');
    await folio.save();

    // 8. Record Payment entries
    const paymentRecords: any[] = [];
    for (const p of paymentList) {
      if (p.amount > 0) {
        const paymentDoc = await Payment.create({
          hotelId: new Types.ObjectId(hotelId),
          folioId: folio._id,
          paymentMode: p.paymentMode,
          amount: p.amount,
          currency: 'INR',
          gatewayTransactionId: p.transactionRef,
          utrNumber: p.transactionRef,
          status: PaymentStatus.SUCCESS,
          cashReceived: p.cashReceived || p.amount,
          cashChangeReturned: p.cashChangeReturned || 0,
          collectedByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
          idempotencyKey: `FOLIO_PAY_${folio._id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        });
        paymentRecords.push(paymentDoc);
      }
    }

    // 9. Automated Housekeeping Turnaround Task Dispatch
    // Check if next booking is arriving today for priority escalation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const hasImmediateArrival = await Booking.findOne({
      hotelId: new Types.ObjectId(hotelId),
      allocatedRoomId: targetRoom._id,
      bookingStatus: BookingStatus.CONFIRMED,
      checkInDate: { $gte: today, $lt: tomorrow },
    });

    const determinedPriority = housekeepingPriority || (hasImmediateArrival ? 'URGENT' : 'HIGH');

    const housekeepingTask = await HousekeepingTask.create({
      hotelId: new Types.ObjectId(hotelId),
      roomId: targetRoom._id,
      taskType: HousekeepingTaskType.CHECKOUT_CLEAN,
      priority: determinedPriority,
      status: HousekeepingTaskStatus.PENDING,
      checklist: [
        { taskName: 'Strip bed linen & replace with fresh sanitized sheets', isDone: false },
        { taskName: 'Disinfect bathroom, shower glass, replace towels & toiletries', isDone: false },
        { taskName: 'Empty trash bins, sanitize high-touch surfaces & remotes', isDone: false },
        { taskName: 'Restock minibar, coffee sachets & complimentary water bottles', isDone: false },
        { taskName: 'Vacuum carpet / mop hard floors & fresh air ventilation', isDone: false },
        { taskName: 'Final inspection seal & verify smart lock battery', isDone: false },
      ],
    });

    // 10. Keycard Revocation & Audit Engine
    const keyCardNum = targetRoom.keyCardNumber || stay.keyCardIssued || 'N/A';
    let keycardAudit: any = null;
    if (keyCardVoided && keyCardNum !== 'N/A') {
      keycardAudit = await KeycardVoidAudit.create({
        hotelId: new Types.ObjectId(hotelId),
        roomId: targetRoom._id,
        roomNumber: targetRoom.roomNumber,
        stayId: stay._id,
        keyCardNumber: keyCardNum,
        voidReason: KeycardVoidReason.CHECKOUT,
        voidedByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
        voidedAt: new Date(),
        hardwareRevoked: true,
        notes: notes || 'Revoked automatically upon guest check-out',
      });
    }

    // 11. Real-time WebSocket Broadcasts
    io.to(`${hotelId}_admin`).emit('room:status_changed', {
      roomId: targetRoom._id,
      roomNumber: targetRoom.roomNumber,
      status: targetRoomStatus,
      stayId: null,
    });

    io.to(`${hotelId}_admin`).to(`${hotelId}_pms`).emit('pms:room_checked_out', {
      stayId: stay._id,
      roomId: targetRoom._id,
      roomNumber: targetRoom.roomNumber,
      folioId: folio._id,
      bookingId: stay.bookingId,
      checkedOutAt: new Date(),
      settledAmount: totalSettled,
      dueAmount: folio.dueAmount,
    });

    io.to(`${hotelId}_housekeeping`).emit('housekeeping:task_created', {
      taskId: housekeepingTask._id,
      roomNumber: targetRoom.roomNumber,
      taskType: housekeepingTask.taskType,
      priority: housekeepingTask.priority,
      roomId: targetRoom._id,
    });

    if (keyCardNum !== 'N/A') {
      io.to(`${hotelId}_hardware`).to(`${hotelId}_pms`).emit('keycard:voided', {
        keyCardNumber: keyCardNum,
        roomId: targetRoom._id,
        roomNumber: targetRoom.roomNumber,
        stayId: stay._id,
        voidedAt: new Date(),
      });
    }

    io.to(`room_${targetRoom._id}`).emit('guest:session_terminated', {
      reason: 'CHECKED_OUT',
      message: 'Guest has checked out at reception.',
    });

    res.status(200).json({
      success: true,
      message: `Room ${targetRoom.roomNumber} express check-out completed successfully!`,
      data: {
        stayId: stay._id,
        roomId: targetRoom._id,
        roomNumber: targetRoom.roomNumber,
        roomStatus: lockedRoom.status,
        folioNumber: folio.folioNumber,
        folioStatus: folio.folioStatus,
        settledAmount: totalSettled,
        dueAmount: folio.dueAmount,
        payments: paymentRecords,
        housekeepingTaskId: housekeepingTask._id,
        housekeepingPriority: housekeepingTask.priority,
        keycardVoided: keyCardNum,
        keycardAuditId: keycardAudit?._id,
        folio: {
          id: folio._id,
          folioNumber: folio.folioNumber,
          folioStatus: folio.folioStatus,
          dueAmount: folio.dueAmount,
          settledAmount: totalSettled,
        },
        stay: {
          id: stay._id,
          stayStatus: updatedStay.stayStatus,
        },
        room: {
          id: targetRoom._id,
          roomNumber: targetRoom.roomNumber,
          status: lockedRoom.status,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 11. Standalone Keycard Revocation / Void Endpoint
export const voidKeycard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const userId = req.user?.userId;
    const { roomId, roomNumber, keyCardNumber, voidReason = KeycardVoidReason.MANUAL_REVOCATION, notes } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!roomId && !roomNumber && !keyCardNumber) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'Must provide roomId, roomNumber, or keyCardNumber',
      });
      return;
    }

    let room: any = null;
    if (roomId) {
      room = await Room.findOne({ _id: new Types.ObjectId(roomId), hotelId: new Types.ObjectId(hotelId) });
    } else if (roomNumber) {
      room = await Room.findOne({ roomNumber, hotelId: new Types.ObjectId(hotelId) });
    } else if (keyCardNumber) {
      room = await Room.findOne({ keyCardNumber, hotelId: new Types.ObjectId(hotelId) });
    }

    const cardNum = keyCardNumber || room?.keyCardNumber || 'N/A';
    const roomNum = room?.roomNumber || roomNumber || 'N/A';
    const rId = room?._id || new Types.ObjectId();

    if (room && room.keyCardNumber) {
      room.keyCardNumber = null;
      await room.save();
    }

    const audit = await KeycardVoidAudit.create({
      hotelId: new Types.ObjectId(hotelId),
      roomId: rId,
      roomNumber: roomNum,
      stayId: room?.currentStayId,
      keyCardNumber: cardNum,
      voidReason,
      voidedByUserId: userId ? new Types.ObjectId(userId) : undefined,
      voidedAt: new Date(),
      hardwareRevoked: true,
      notes: notes || 'Keycard voided via PMS Keycard Manager',
    });

    io.to(`${hotelId}_hardware`).to(`${hotelId}_pms`).emit('keycard:voided', {
      keyCardNumber: cardNum,
      roomId: rId,
      roomNumber: roomNum,
      stayId: room?.currentStayId,
      voidedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `Keycard ${cardNum} successfully voided`,
      data: audit,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 12. List Keycard Void Audit Logs
export const getKeycardVoidAudits = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const { roomId, limit = 50 } = req.query;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    const filter: any = { hotelId: new Types.ObjectId(hotelId) };
    if (roomId) {
      filter.roomId = new Types.ObjectId(roomId as string);
    }

    const audits = await KeycardVoidAudit.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('voidedByUserId', 'name email role');

    res.status(200).json({
      success: true,
      count: audits.length,
      data: audits,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 13. Shift 52: Room Check-Out Atomic Folio Lock
export const lockFolio = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const staffId = req.user?.userId;
    const { stayId, roomId, folioId, reason } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!stayId && !roomId && !folioId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'stayId, roomId, or folioId is required' });
      return;
    }

    // 1. Locate folio
    let query: any = { hotelId: new Types.ObjectId(hotelId) };
    if (folioId) {
      query._id = new Types.ObjectId(folioId);
    } else if (stayId) {
      query.stayId = new Types.ObjectId(stayId);
    } else if (roomId) {
      query.roomId = new Types.ObjectId(roomId);
      query.folioStatus = { $ne: 'SETTLED' };
    }

    const folio = await MasterFolio.findOne(query);
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    if (folio.folioStatus === 'SETTLED') {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_ALREADY_SETTLED',
        message: 'Cannot lock an already settled folio',
      });
      return;
    }

    if (folio.folioStatus === 'LOCKED') {
      res.status(200).json({
        success: true,
        message: 'Folio is already locked',
        data: {
          folioId: folio._id,
          folioNumber: folio.folioNumber,
          folioStatus: 'LOCKED',
          lockedAt: folio.lockedAt,
          lockedByUserId: folio.lockedByUserId,
          lockReason: folio.lockReason,
        },
      });
      return;
    }

    // 2. Atomic CAS Lock
    const lockedFolio = await MasterFolio.findOneAndUpdate(
      {
        _id: folio._id,
        hotelId: new Types.ObjectId(hotelId),
        folioStatus: 'OPEN',
      },
      {
        $set: {
          folioStatus: 'LOCKED',
          lockedAt: new Date(),
          lockedByUserId: staffId ? new Types.ObjectId(staffId) : undefined,
          lockReason: reason || 'Check-out folio lock',
        },
      },
      { new: true }
    );

    if (!lockedFolio) {
      // Re-check if another concurrent process locked it
      const currentFolio = await MasterFolio.findById(folio._id);
      if (currentFolio && currentFolio.folioStatus === 'LOCKED') {
        res.status(200).json({
          success: true,
          message: 'Folio is already locked',
          data: {
            folioId: currentFolio._id,
            folioNumber: currentFolio.folioNumber,
            folioStatus: 'LOCKED',
            lockedAt: currentFolio.lockedAt,
            lockedByUserId: currentFolio.lockedByUserId,
            lockReason: currentFolio.lockReason,
          },
        });
        return;
      }

      res.status(409).json({
        success: false,
        errorCode: 'CONCURRENT_LOCK_CONFLICT',
        message: 'Folio was modified or locked by another concurrent session',
      });
      return;
    }

    // 3. Real-time broadcasts
    io.to(`${hotelId}_admin`).emit('pms:folio_locked', {
      folioId: lockedFolio._id,
      folioNumber: lockedFolio.folioNumber,
      roomId: lockedFolio.roomId,
      stayId: lockedFolio.stayId,
      lockedAt: lockedFolio.lockedAt,
      lockedByUserId: lockedFolio.lockedByUserId,
      reason: lockedFolio.lockReason,
    });
    io.to(`${hotelId}_pms`).emit('pms:folio_locked', {
      folioId: lockedFolio._id,
      folioNumber: lockedFolio.folioNumber,
      roomId: lockedFolio.roomId,
      stayId: lockedFolio.stayId,
      lockedAt: lockedFolio.lockedAt,
      lockedByUserId: lockedFolio.lockedByUserId,
      reason: lockedFolio.lockReason,
    });
    io.to(`${hotelId}_waiters`).emit('pms:folio_locked', {
      folioId: lockedFolio._id,
      roomId: lockedFolio.roomId,
      message: `Room folio locked for check-out settlement. Do not post new charges.`,
    });

    res.status(200).json({
      success: true,
      message: `Folio ${lockedFolio.folioNumber} locked successfully for check-out settlement`,
      data: {
        folioId: lockedFolio._id,
        folioNumber: lockedFolio.folioNumber,
        folioStatus: 'LOCKED',
        lockedAt: lockedFolio.lockedAt,
        lockedByUserId: lockedFolio.lockedByUserId,
        lockReason: lockedFolio.lockReason,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 14. Shift 52: Room Check-Out Folio Unlock
export const unlockFolio = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const staffId = req.user?.userId;
    const { stayId, roomId, folioId, reason } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!stayId && !roomId && !folioId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'stayId, roomId, or folioId is required' });
      return;
    }

    let query: any = { hotelId: new Types.ObjectId(hotelId) };
    if (folioId) {
      query._id = new Types.ObjectId(folioId);
    } else if (stayId) {
      query.stayId = new Types.ObjectId(stayId);
    } else if (roomId) {
      query.roomId = new Types.ObjectId(roomId);
    }

    const folio = await MasterFolio.findOne(query);
    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    if (folio.folioStatus === 'SETTLED') {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_ALREADY_SETTLED',
        message: 'Cannot unlock an already settled folio',
      });
      return;
    }

    if (folio.folioStatus === 'OPEN') {
      res.status(200).json({
        success: true,
        message: 'Folio is already open',
        data: {
          folioId: folio._id,
          folioNumber: folio.folioNumber,
          folioStatus: 'OPEN',
        },
      });
      return;
    }

    // Atomic CAS Unlock
    const unlockedFolio = await MasterFolio.findOneAndUpdate(
      {
        _id: folio._id,
        hotelId: new Types.ObjectId(hotelId),
        folioStatus: 'LOCKED',
      },
      {
        $set: {
          folioStatus: 'OPEN',
          lockedAt: null,
          lockedByUserId: null,
          lockReason: null,
        },
      },
      { new: true }
    );

    if (!unlockedFolio) {
      res.status(409).json({
        success: false,
        errorCode: 'CONCURRENT_UNLOCK_CONFLICT',
        message: 'Folio was modified by another concurrent session',
      });
      return;
    }

    // Real-time broadcasts
    io.to(`${hotelId}_admin`).emit('pms:folio_unlocked', {
      folioId: unlockedFolio._id,
      folioNumber: unlockedFolio.folioNumber,
      roomId: unlockedFolio.roomId,
      stayId: unlockedFolio.stayId,
      unlockedByUserId: staffId,
      reason: reason || 'Check-out cancelled/aborted',
    });
    io.to(`${hotelId}_pms`).emit('pms:folio_unlocked', {
      folioId: unlockedFolio._id,
      folioNumber: unlockedFolio.folioNumber,
      roomId: unlockedFolio.roomId,
      stayId: unlockedFolio.stayId,
      unlockedByUserId: staffId,
      reason: reason || 'Check-out cancelled/aborted',
    });
    io.to(`${hotelId}_waiters`).emit('pms:folio_unlocked', {
      folioId: unlockedFolio._id,
      roomId: unlockedFolio.roomId,
      message: `Room folio unlocked. Charging resumed.`,
    });

    res.status(200).json({
      success: true,
      message: `Folio ${unlockedFolio.folioNumber} unlocked successfully`,
      data: {
        folioId: unlockedFolio._id,
        folioNumber: unlockedFolio.folioNumber,
        folioStatus: 'OPEN',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// 15. Shift 52: Restaurant Charge Sweep Engine
export const sweepPendingRestaurantCharges = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId;
    const staffId = req.user?.userId;
    const { stayId, roomId, folioId, finalizeCookingOrders = true } = req.body;

    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Tenant required' });
      return;
    }

    if (!stayId && !roomId && !folioId) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'stayId, roomId, or folioId is required' });
      return;
    }

    let folio: any = null;
    let stay: any = null;

    if (folioId) {
      folio = await MasterFolio.findOne({ _id: new Types.ObjectId(folioId), hotelId: new Types.ObjectId(hotelId) });
      if (folio) {
        stay = await Stay.findOne({ _id: folio.stayId, hotelId: new Types.ObjectId(hotelId) });
      }
    } else if (stayId) {
      stay = await Stay.findOne({ _id: new Types.ObjectId(stayId), hotelId: new Types.ObjectId(hotelId) });
      if (stay) {
        folio = await MasterFolio.findOne({ _id: stay.masterFolioId, hotelId: new Types.ObjectId(hotelId) });
      }
    } else if (roomId) {
      stay = await Stay.findOne({ roomId: new Types.ObjectId(roomId), hotelId: new Types.ObjectId(hotelId), stayStatus: StayStatus.ACTIVE });
      if (stay) {
        folio = await MasterFolio.findOne({ _id: stay.masterFolioId, hotelId: new Types.ObjectId(hotelId) });
      }
    }

    if (!folio) {
      res.status(404).json({ success: false, errorCode: 'FOLIO_NOT_FOUND', message: 'Master folio not found' });
      return;
    }

    if (folio.folioStatus === 'SETTLED') {
      res.status(409).json({
        success: false,
        errorCode: 'FOLIO_ALREADY_SETTLED',
        message: 'Cannot sweep charges into an already settled folio',
      });
      return;
    }

    const targetRoomId = folio.roomId || stay?.roomId;
    const orderQuery: any = {
      hotelId: new Types.ObjectId(hotelId),
      orderStatus: { $ne: OverallOrderStatus.CANCELLED },
      isBilled: { $ne: true },
      isSweptToFolio: { $ne: true },
      $or: [
        { folioId: folio._id },
        ...(targetRoomId ? [{ roomId: targetRoomId }] : []),
        ...(stay ? [{ stayId: stay._id }] : []),
      ],
    };

    const pendingOrders = await RestaurantOrder.find(orderQuery);

    if (pendingOrders.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No pending restaurant charges to sweep',
        data: {
          sweptOrdersCount: 0,
          totalSweptSubtotal: 0,
          totalSweptTax: 0,
          totalSweptAmount: 0,
          sweptOrders: [],
          folio: {
            folioId: folio._id,
            folioNumber: folio.folioNumber,
            dueAmount: folio.dueAmount,
            netAmountPayable: folio.netAmountPayable,
            folioStatus: folio.folioStatus,
          },
        },
      });
      return;
    }

    let totalSweptSubtotal = 0;
    let totalSweptTax = 0;
    let totalSweptNet = 0;
    const sweptOrderSummaries: any[] = [];

    for (const order of pendingOrders) {
      // Atomic CAS Claim: Atomically claim order to prevent concurrent double-sweep
      const claimedOrder = await RestaurantOrder.findOneAndUpdate(
        {
          _id: order._id,
          hotelId: new Types.ObjectId(hotelId),
          isBilled: { $ne: true },
          isSweptToFolio: { $ne: true },
        },
        {
          $set: {
            isBilled: true,
            isSweptToFolio: true,
            sweptAt: new Date(),
            sweptToFolioId: folio._id,
            ...(finalizeCookingOrders && order.orderStatus !== OverallOrderStatus.SERVED
              ? { orderStatus: OverallOrderStatus.SERVED, servedAt: new Date() }
              : {}),
          },
        },
        { new: true }
      );

      if (!claimedOrder) continue;

      const orderSubtotal = claimedOrder.items.reduce((sum: number, it: any) => sum + Number(it.subtotal || (it.unitPrice * it.quantity) || 0), 0);
      const tax5Percent = Math.round(orderSubtotal * 0.05 * 100) / 100;
      const orderGrandTotal = Math.round((orderSubtotal + tax5Percent) * 100) / 100;

      const dept = claimedOrder.orderType === OrderType.ROOM_SERVICE ? DepartmentType.ROOM_SERVICE : DepartmentType.RESTAURANT_DINE;
      await FolioLineItem.create({
        hotelId: new Types.ObjectId(hotelId),
        folioId: folio._id,
        department: dept,
        description: `${claimedOrder.orderType === OrderType.ROOM_SERVICE ? 'In-Room Dining' : 'Restaurant Dine-In'} #${claimedOrder.orderNumber} (Swept at Check-Out)`,
        referenceId: claimedOrder._id,
        rate: orderSubtotal,
        quantity: 1,
        taxRate: 5,
        taxAmount: tax5Percent,
        netAmount: orderGrandTotal,
        postedAt: new Date(),
        postedByUserId: staffId ? new Types.ObjectId(staffId) : undefined,
      });

      totalSweptSubtotal += orderSubtotal;
      totalSweptTax += tax5Percent;
      totalSweptNet += orderGrandTotal;

      sweptOrderSummaries.push({
        orderId: claimedOrder._id,
        orderNumber: claimedOrder.orderNumber,
        orderType: claimedOrder.orderType,
        subtotal: orderSubtotal,
        taxAmount: tax5Percent,
        grandTotal: orderGrandTotal,
        itemCount: claimedOrder.items.length,
      });
    }

    if (sweptOrderSummaries.length === 0) {
      const currentFolio = await MasterFolio.findById(folio._id);
      res.status(200).json({
        success: true,
        message: 'No pending restaurant charges to sweep',
        data: {
          sweptOrdersCount: 0,
          totalSweptSubtotal: 0,
          totalSweptTax: 0,
          totalSweptAmount: 0,
          sweptOrders: [],
          folio: {
            folioId: currentFolio?._id,
            folioNumber: currentFolio?.folioNumber,
            dueAmount: currentFolio?.dueAmount,
            netAmountPayable: currentFolio?.netAmountPayable,
            folioStatus: currentFolio?.folioStatus,
          },
        },
      });
      return;
    }

    totalSweptSubtotal = Math.round(totalSweptSubtotal * 100) / 100;
    totalSweptTax = Math.round(totalSweptTax * 100) / 100;
    totalSweptNet = Math.round(totalSweptNet * 100) / 100;

    const updatedFolio = await MasterFolio.findByIdAndUpdate(
      folio._id,
      {
        $inc: {
          totalFoodAndBeverage: totalSweptSubtotal,
          totalTaxes: totalSweptTax,
          netAmountPayable: totalSweptNet,
          dueAmount: totalSweptNet,
        },
      },
      { new: true }
    );

    io.to(`${hotelId}_admin`).emit('pms:charges_swept', {
      folioId: folio._id,
      folioNumber: folio.folioNumber,
      roomId: targetRoomId,
      sweptOrdersCount: pendingOrders.length,
      totalSweptAmount: totalSweptNet,
      sweptOrderSummaries,
    });
    io.to(`${hotelId}_pms`).emit('pms:charges_swept', {
      folioId: folio._id,
      folioNumber: folio.folioNumber,
      roomId: targetRoomId,
      sweptOrdersCount: pendingOrders.length,
      totalSweptAmount: totalSweptNet,
      sweptOrderSummaries,
    });
    io.to(`${hotelId}_kds`).emit('order:swept_to_folio', {
      orderIds: pendingOrders.map((o) => o._id),
      message: 'Pending order charges swept to guest room folio at check-out.',
    });

    res.status(200).json({
      success: true,
      message: `Successfully swept ${pendingOrders.length} pending order(s) (₹${totalSweptNet}) into folio ${folio.folioNumber}`,
      data: {
        sweptOrdersCount: pendingOrders.length,
        totalSweptSubtotal,
        totalSweptTax,
        totalSweptAmount: totalSweptNet,
        sweptOrders: sweptOrderSummaries,
        folio: {
          folioId: updatedFolio?._id,
          folioNumber: updatedFolio?.folioNumber,
          totalRoomTariff: updatedFolio?.totalRoomTariff,
          totalFoodAndBeverage: updatedFolio?.totalFoodAndBeverage,
          totalTaxes: updatedFolio?.totalTaxes,
          netAmountPayable: updatedFolio?.netAmountPayable,
          dueAmount: updatedFolio?.dueAmount,
          folioStatus: updatedFolio?.folioStatus,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};
