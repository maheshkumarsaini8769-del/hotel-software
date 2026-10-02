import { Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { RoomType } from '../models/RoomType';
import { Room, RoomStatus } from '../models/Room';
import { Booking, BookingStatus, BookingMode, BookingSource } from '../models/Booking';
import { Stay, StayStatus } from '../models/Stay';
import { MasterFolio } from '../models/MasterFolio';
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
    const { bookingId, idProofType, idProofNumber } = req.body;
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
        checkedInByUserId: receptionistId ? new Types.ObjectId(receptionistId) : undefined,
      });

      // 3. Open Master Folio #F-<roomNumber>
      const folioNumber = `FOLIO-${room.roomNumber}-${Date.now().toString().slice(-4)}`;
      const masterFolio = await MasterFolio.create({
        hotelId,
        stayId: stay._id,
        bookingId: booking._id,
        roomId: room._id,
        folioNumber,
        totalRoomTariff: booking.totalTariff,
        totalTaxes: booking.taxAmount,
        advancePaid: booking.advancePaymentAmount,
        netAmountPayable: Math.max(0, booking.grandTotal - booking.advancePaymentAmount),
        folioStatus: 'OPEN',
      });

      // Link Folio to Stay
      stay.masterFolioId = masterFolio._id as Types.ObjectId;
      await stay.save();

      room.currentStayId = stay._id as Types.ObjectId;
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


