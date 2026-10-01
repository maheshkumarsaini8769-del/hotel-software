import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { DiningTable, TableStatus, SeatStatus, ISeatAllocation } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';

export class CoDiningController {
  /**
   * 1. Get All Tables with Community / Co-Dining Seat Status
   * GET /api/v1/co-dining/tables
   */
  static async getCommunityTables(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.query.hotelId as string;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid Hotel/Tenant ID is required' });
        return;
      }

      const { section, communityOnly } = req.query;
      const query: any = { hotelId: new Types.ObjectId(hotelId) };

      if (section) {
        query.section = String(section).trim();
      }
      if (communityOnly === 'true') {
        query.isCommunityTable = true;
      }

      const tables = await DiningTable.find(query).sort({ tableNumber: 1 });

      const formattedTables = tables.map((t) => {
        const capacity = t.capacity || 4;
        const seats = t.seats && t.seats.length > 0
          ? t.seats
          : Array.from({ length: capacity }, (_, i) => ({
              seatNumber: i + 1,
              seatLabel: `Seat ${i + 1}`,
              status: t.currentStatus === TableStatus.OCCUPIED ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE,
            }));

        const occupiedCount = seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
        const availableCount = capacity - occupiedCount;

        return {
          tableId: t._id,
          tableNumber: t.tableNumber,
          section: t.section,
          capacity,
          currentStatus: t.currentStatus,
          isCommunityTable: t.isCommunityTable || false,
          allowCoDining: t.allowCoDining || false,
          occupiedSeatsCount: occupiedCount,
          availableSeatsCount: availableCount,
          hasOpenSeats: availableCount > 0,
          seats,
        };
      });

      res.status(200).json({
        success: true,
        count: formattedTables.length,
        tables: formattedTables,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Enable / Configure Community Co-Dining on a Table
   * POST /api/v1/co-dining/table/:tableId/enable-sharing
   */
  static async enableTableSharing(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const tableId = req.params.tableId as string;
      const { allowCoDining, customSeatLabels } = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found in tenant' });
        return;
      }

      table.isCommunityTable = true;
      table.allowCoDining = allowCoDining !== undefined ? Boolean(allowCoDining) : true;

      // Initialize individual seats if not already created
      if (!table.seats || table.seats.length === 0) {
        const capacity = table.capacity || 4;
        table.seats = Array.from({ length: capacity }, (_, i) => ({
          seatNumber: i + 1,
          seatLabel: customSeatLabels?.[i] || `Seat ${i + 1}`,
          status: SeatStatus.AVAILABLE,
        }));
        table.availableSeatsCount = capacity;
        table.occupiedSeatsCount = 0;
      }

      await table.save();

      res.status(200).json({
        success: true,
        message: `Table ${table.tableNumber} configured for community co-dining`,
        table,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Allocate / Book Specific Seat(s) for a Party (Solo or Group)
   * POST /api/v1/co-dining/allocate-seat
   */
  static async allocateSeats(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { tableId, seatNumbers, guestName, guestPhone, guestCount } = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        res.status(400).json({ success: false, message: 'seatNumbers array must contain at least 1 seat number' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found for tenant' });
        return;
      }

      // If seats not initialized, initialize now based on capacity
      if (!table.seats || table.seats.length === 0) {
        table.seats = Array.from({ length: table.capacity }, (_, i) => ({
          seatNumber: i + 1,
          seatLabel: `Seat ${i + 1}`,
          status: SeatStatus.AVAILABLE,
        }));
      }

      // Check if requested seats exist
      for (const num of seatNumbers) {
        const targetSeat = table.seats.find((s) => s.seatNumber === num);
        if (!targetSeat) {
          res.status(400).json({
            success: false,
            message: `Seat ${num} does not exist on Table ${table.tableNumber} (Capacity: ${table.capacity})`,
          });
          return;
        }
      }

      // ATOMIC SEAT ALLOCATION: Use findOneAndUpdate with condition that all requested seats are AVAILABLE
      const conditions = seatNumbers.map((num) => ({
        seats: { $elemMatch: { seatNumber: num, status: SeatStatus.AVAILABLE } },
      }));

      const updateFields: any = {};
      const arrayFilters: any[] = [];
      const now = new Date();

      seatNumbers.forEach((num, idx) => {
        updateFields[`seats.$[elem${idx}].status`] = SeatStatus.OCCUPIED;
        updateFields[`seats.$[elem${idx}].guestName`] = guestName || 'Community Diner';
        updateFields[`seats.$[elem${idx}].guestPhone`] = guestPhone;
        updateFields[`seats.$[elem${idx}].occupiedAt`] = now;
        arrayFilters.push({ [`elem${idx}.seatNumber`]: num });
      });

      const updatedTable = await DiningTable.findOneAndUpdate(
        {
          _id: table._id,
          hotelId: table.hotelId,
          $and: conditions,
        },
        {
          $set: updateFields,
        },
        {
          arrayFilters,
          new: true,
        }
      );

      if (!updatedTable) {
        res.status(400).json({
          success: false,
          message: `Seat ${seatNumbers.join(', ')} is already OCCUPIED on Table ${table.tableNumber}. Please select an open seat.`,
        });
        return;
      }

      // Create Independent TableSession for this specific seat party
      const sessionTokenHash = crypto.randomBytes(16).toString('hex');
      const tableSession = await TableSession.create({
        hotelId: updatedTable.hotelId,
        tableId: updatedTable._id,
        sessionTokenHash,
        guestCount: guestCount || seatNumbers.length,
        customerName: guestName || 'Community Diner',
        customerPhone: guestPhone,
        seatNumbers,
        isCoDining: true,
        seatLabel: seatNumbers.length === 1 ? `Seat ${seatNumbers[0]}` : `Seats ${seatNumbers.join(', ')}`,
        status: SessionStatus.ACTIVE,
      });

      // Update session ID on seats and recalculate counts
      updatedTable.seats.forEach((seat) => {
        if (seatNumbers.includes(seat.seatNumber)) {
          seat.currentSessionId = tableSession._id;
        }
      });

      const occupiedCount = updatedTable.seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
      const availableCount = updatedTable.capacity - occupiedCount;
      updatedTable.occupiedSeatsCount = occupiedCount;
      updatedTable.availableSeatsCount = availableCount;

      if (availableCount === 0) {
        updatedTable.currentStatus = TableStatus.OCCUPIED;
      } else if (occupiedCount > 0) {
        updatedTable.currentStatus = TableStatus.PARTIALLY_OCCUPIED;
      } else {
        updatedTable.currentStatus = TableStatus.AVAILABLE;
      }

      await updatedTable.save();

      res.status(201).json({
        success: true,
        message: `Allocated ${seatNumbers.length} seat(s) on Table ${updatedTable.tableNumber}`,
        sessionId: tableSession._id,
        seatNumbers,
        allocatedParty: guestName || 'Community Diner',
        tableStatus: updatedTable.currentStatus,
        availableSeatsRemaining: availableCount,
        occupiedSeatsTotal: occupiedCount,
        table: updatedTable,
      });
      return;
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Release Seat(s) when Party Finishes Dining
   * POST /api/v1/co-dining/release-seat
   */
  static async releaseSeats(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { tableId, sessionId, seatNumbers } = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found' });
        return;
      }

      // Close the TableSession if provided
      if (sessionId && Types.ObjectId.isValid(sessionId)) {
        await TableSession.findByIdAndUpdate(sessionId, {
          status: SessionStatus.CLOSED,
          closedAt: new Date(),
        });
      }

      // Release seats
      table.seats.forEach((seat) => {
        const matchesSession = sessionId && seat.currentSessionId?.toString() === sessionId;
        const matchesSeatNum = seatNumbers && Array.isArray(seatNumbers) && seatNumbers.includes(seat.seatNumber);

        if (matchesSession || matchesSeatNum) {
          seat.status = SeatStatus.AVAILABLE;
          seat.currentSessionId = undefined;
          seat.guestName = undefined;
          seat.guestPhone = undefined;
          seat.occupiedAt = undefined;
        }
      });

      // Recalculate counts
      const occupiedCount = table.seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
      const availableCount = table.capacity - occupiedCount;
      table.occupiedSeatsCount = occupiedCount;
      table.availableSeatsCount = availableCount;

      if (occupiedCount === 0) {
        table.currentStatus = TableStatus.AVAILABLE;
      } else if (availableCount === 0) {
        table.currentStatus = TableStatus.OCCUPIED;
      } else {
        table.currentStatus = TableStatus.PARTIALLY_OCCUPIED;
      }

      await table.save();

      res.status(200).json({
        success: true,
        message: 'Seats successfully released back to inventory',
        tableStatus: table.currentStatus,
        availableSeatsRemaining: availableCount,
        occupiedSeatsTotal: occupiedCount,
        table,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Get Real-Time Seat Map for a Specific Table
   * GET /api/v1/co-dining/table/:tableId/seats
   */
  static async getTableSeatMap(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const tableId = req.params.tableId as string;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Table not found' });
        return;
      }

      const capacity = table.capacity || 4;
      const seats = table.seats && table.seats.length > 0
        ? table.seats
        : Array.from({ length: capacity }, (_, i) => ({
            seatNumber: i + 1,
            seatLabel: `Seat ${i + 1}`,
            status: SeatStatus.AVAILABLE,
          }));

      const occupiedCount = seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
      const availableCount = capacity - occupiedCount;

      res.status(200).json({
        success: true,
        tableId: table._id,
        tableNumber: table.tableNumber,
        section: table.section,
        capacity,
        currentStatus: table.currentStatus,
        isCommunityTable: table.isCommunityTable,
        allowCoDining: table.allowCoDining,
        occupiedSeatsCount: occupiedCount,
        availableSeatsCount: availableCount,
        seats,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
