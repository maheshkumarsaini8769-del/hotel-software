import { Response } from 'express';
import { Types } from 'mongoose';
import { TableReservation, ReservationStatus, DepositStatus } from '../models/TableReservation';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Create Table Reservation
export const createTableReservation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      partySize,
      reservationDate,
      timeSlot,
      durationMinutes = 90,
      assignedTableIds,
      specialRequests,
      depositAmount = 0,
    } = req.body;

    if (!customerName || !customerPhone || !partySize || !reservationDate || !timeSlot) {
      res.status(400).json({ success: false, errorCode: 'MISSING_FIELDS', message: 'Name, phone, party size, date and time slot required' });
      return;
    }

    let tableIds: Types.ObjectId[] = [];

    // If specific tables requested
    if (assignedTableIds && Array.isArray(assignedTableIds) && assignedTableIds.length > 0) {
      tableIds = assignedTableIds.map((id: string) => new Types.ObjectId(id));

      // Verify all tables belong to this hotel and are not already in conflict
      const tables = await DiningTable.find({ _id: { $in: tableIds }, hotelId });
      if (tables.length !== tableIds.length) {
        res.status(404).json({ success: false, errorCode: 'TABLES_NOT_FOUND', message: 'One or more tables not found' });
        return;
      }

      // Check for overlapping confirmed reservations for these tables
      const conflicting = await TableReservation.findOne({
        hotelId,
        reservationDate: new Date(reservationDate),
        timeSlot,
        assignedTableIds: { $in: tableIds },
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.SEATED] },
      });

      if (conflicting) {
        res.status(409).json({ success: false, errorCode: 'TABLE_SLOT_CONFLICT', message: `Table is already reserved for ${timeSlot}` });
        return;
      }
    } else {
      // Auto-assign: find best matching available table with capacity >= partySize
      const candidateTable = await DiningTable.findOne({
        hotelId,
        capacity: { $gte: Number(partySize) },
        currentStatus: TableStatus.AVAILABLE,
      }).sort({ capacity: 1 });

      if (candidateTable) {
        tableIds = [candidateTable._id];
      }
    }

    const reservationNumber = `RES-${Date.now().toString().slice(-6)}`;

    const reservation = new TableReservation({
      hotelId,
      reservationNumber,
      customerName,
      customerPhone,
      customerEmail,
      partySize: Number(partySize),
      reservationDate: new Date(reservationDate),
      timeSlot,
      durationMinutes: Number(durationMinutes),
      assignedTableIds: tableIds,
      specialRequests,
      depositAmount: Number(depositAmount),
      depositStatus: Number(depositAmount) > 0 ? DepositStatus.PAID : DepositStatus.NONE,
      status: ReservationStatus.CONFIRMED,
    });

    await reservation.save();

    if (tableIds.length > 0) {
      await DiningTable.updateMany(
        { _id: { $in: tableIds }, currentStatus: TableStatus.AVAILABLE },
        { currentStatus: TableStatus.RESERVED }
      );
    }

    io.to(`${hotelId.toString()}_global`).emit('reservation:created', {
      reservationId: reservation._id,
      reservationNumber,
      customerName,
      timeSlot,
      partySize,
    });

    res.status(201).json({ success: true, reservation });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Seat Reservation (Guests Arrive)
export const seatReservation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reservationId = String(req.params.reservationId);

    const reservation = await TableReservation.findOne({ _id: new Types.ObjectId(reservationId), hotelId });
    if (!reservation) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: `Cannot seat reservation in status: ${reservation.status}` });
      return;
    }

    reservation.status = ReservationStatus.SEATED;
    reservation.seatedAt = new Date();
    await reservation.save();

    // Open active TableSession and set tables to OCCUPIED
    for (const tableId of reservation.assignedTableIds) {
      const session = new TableSession({
        hotelId,
        tableId,
        sessionTokenHash: `session_hash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: SessionStatus.ACTIVE,
        guestCount: reservation.partySize,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
      });
      await session.save();

      await DiningTable.findByIdAndUpdate(tableId, {
        currentStatus: TableStatus.OCCUPIED,
        activeSessionId: session._id,
      });

      io.to(`${hotelId?.toString()}_global`).emit('table:status_changed', {
        tableId,
        status: TableStatus.OCCUPIED,
        sessionId: session._id,
      });
    }

    res.status(200).json({ success: true, reservation, message: 'Guests seated successfully and table sessions opened' });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Cancel / No-Show Reservation
export const cancelReservation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const reservationId = String(req.params.reservationId);
    const { isNoShow = false, reason = 'Guest cancelled' } = req.body;

    const reservation = await TableReservation.findOne({ _id: new Types.ObjectId(reservationId), hotelId });
    if (!reservation) {
      res.status(404).json({ success: false, errorCode: 'RESERVATION_NOT_FOUND', message: 'Reservation not found' });
      return;
    }

    reservation.status = isNoShow ? ReservationStatus.NO_SHOW : ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason;

    if (isNoShow && reservation.depositAmount > 0) {
      reservation.depositStatus = DepositStatus.FORFEITED;
    }

    await reservation.save();

    // Release tables back to AVAILABLE if they were in RESERVED status
    if (reservation.assignedTableIds.length > 0) {
      await DiningTable.updateMany(
        { _id: { $in: reservation.assignedTableIds }, currentStatus: TableStatus.RESERVED },
        { currentStatus: TableStatus.AVAILABLE }
      );
    }

    io.to(`${hotelId?.toString()}_global`).emit('reservation:cancelled', {
      reservationId: reservation._id,
      reservationNumber: reservation.reservationNumber,
      status: reservation.status,
    });

    res.status(200).json({ success: true, reservation });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Get Table Reservations
export const getTableReservations = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { date, status } = req.query;

    const filter: any = { hotelId };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date as string);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      filter.reservationDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const reservations = await TableReservation.find(filter)
      .populate('assignedTableIds', 'tableNumber section capacity')
      .sort({ reservationDate: 1, timeSlot: 1 });

    let totalCovers = 0;
    let confirmedCount = 0;
    let seatedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;

    reservations.forEach((r) => {
      totalCovers += r.partySize || 0;
      if (r.status === ReservationStatus.CONFIRMED) confirmedCount++;
      else if (r.status === ReservationStatus.SEATED) seatedCount++;
      else if (r.status === ReservationStatus.CANCELLED) cancelledCount++;
      else if (r.status === ReservationStatus.NO_SHOW) noShowCount++;
    });

    res.status(200).json({
      success: true,
      count: reservations.length,
      summary: {
        totalReservations: reservations.length,
        totalCovers,
        confirmed: confirmedCount,
        seated: seatedCount,
        cancelled: cancelledCount,
        noShow: noShowCount,
      },
      reservations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
