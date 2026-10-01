import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SeatSubFolio, SubFolioStatus, ISubFolioLineItem } from '../models/SeatSubFolio';
import { DiningTable, TableStatus, SeatStatus } from '../models/DiningTable';
import { TableSession, SessionStatus } from '../models/TableSession';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { RestaurantOrder } from '../models/RestaurantOrder';

export class SeatBillingController {
  /**
   * 1. Generate or Get Active Sub-Folio for Seat(s)
   * POST /api/v1/seat-billing/sub-folio
   */
  static async generateOrGetSubFolio(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid Hotel/Tenant ID is required' });
        return;
      }

      const { tableId, seatNumbers, customerName, customerPhone, tableSessionId } = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        res.status(400).json({ success: false, message: 'seatNumbers array is required' });
        return;
      }

      const table = await DiningTable.findOne({
        _id: new Types.ObjectId(tableId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!table) {
        res.status(404).json({ success: false, message: 'Dining table not found for tenant' });
        return;
      }

      // Check if open sub-folio already exists for these seats
      let subFolio = await SeatSubFolio.findOne({
        hotelId: new Types.ObjectId(hotelId),
        tableId: table._id,
        seatNumbers: { $in: seatNumbers },
        status: { $in: [SubFolioStatus.OPEN, SubFolioStatus.BILL_REQUESTED] },
      });

      if (subFolio) {
        res.status(200).json({
          success: true,
          action: 'EXISTING_SUB_FOLIO',
          subFolio,
        });
        return;
      }

      // Find or link active TableSession
      let sessionId = tableSessionId ? new Types.ObjectId(tableSessionId) : table.activeSessionId;
      if (!sessionId) {
        const foundSession = await TableSession.findOne({
          hotelId: table.hotelId,
          tableId: table._id,
          status: SessionStatus.ACTIVE,
        });
        if (foundSession) {
          sessionId = foundSession._id;
        } else {
          const newSession = await TableSession.create({
            hotelId: table.hotelId,
            tableId: table._id,
            sessionTokenHash: Math.random().toString(36).substring(2),
            guestCount: seatNumbers.length,
            customerName: customerName || 'Seat Guest',
            seatNumbers,
            isCoDining: true,
            status: SessionStatus.ACTIVE,
          });
          sessionId = newSession._id;
        }
      }

      const subFolioNumber = `SF-${table.tableNumber}-S${seatNumbers.join('_')}-${Date.now().toString().slice(-4)}`;

      subFolio = await SeatSubFolio.create({
        hotelId: new Types.ObjectId(hotelId),
        tableId: table._id,
        tableNumber: table.tableNumber,
        tableSessionId: sessionId,
        subFolioNumber,
        seatNumbers,
        customerName: customerName || `Seat ${seatNumbers.join(', ')} Diner`,
        customerPhone,
        orderIds: [],
        lineItems: [],
        subTotal: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalTax: 0,
        discountAmount: 0,
        grandTotal: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: SubFolioStatus.OPEN,
      });

      res.status(201).json({
        success: true,
        action: 'SUB_FOLIO_CREATED',
        subFolio,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Add / Link Order Items to a Specific Seat Sub-Folio
   * POST /api/v1/seat-billing/sub-folio/:subFolioId/items
   */
  static async addItemsToSubFolio(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const subFolioId = req.params.subFolioId as string;
      const { items, orderId } = req.body;

      if (!subFolioId || !Types.ObjectId.isValid(subFolioId)) {
        res.status(400).json({ success: false, message: 'Valid subFolioId is required' });
        return;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'Non-empty items array is required' });
        return;
      }

      const subFolio = await SeatSubFolio.findOne({
        _id: new Types.ObjectId(subFolioId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!subFolio) {
        res.status(404).json({ success: false, message: 'Sub-folio not found' });
        return;
      }

      if (subFolio.status === SubFolioStatus.SETTLED) {
        res.status(400).json({ success: false, message: 'Cannot add items to already SETTLED sub-folio' });
        return;
      }

      // Add items
      items.forEach((it: any) => {
        const lineTotal = Number(it.unitPrice) * Number(it.quantity);
        subFolio.lineItems.push({
          menuItemId: new Types.ObjectId(it.menuItemId),
          orderId: orderId ? new Types.ObjectId(orderId) : undefined,
          name: it.name,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          subtotal: lineTotal,
          seatNumber: it.seatNumber || subFolio.seatNumbers[0],
          specialInstructions: it.specialInstructions,
        });
      });

      if (orderId && Types.ObjectId.isValid(orderId)) {
        if (!subFolio.orderIds.some((id) => id.toString() === orderId)) {
          subFolio.orderIds.push(new Types.ObjectId(orderId));
        }
      }

      // Recalculate Subtotal & 5% GST (2.5% CGST + 2.5% SGST)
      const subTotal = subFolio.lineItems.reduce((acc, it) => acc + it.subtotal, 0);
      const cgstAmount = Math.round(subTotal * 0.025);
      const sgstAmount = Math.round(subTotal * 0.025);
      const totalTax = cgstAmount + sgstAmount;
      const grandTotal = subTotal + totalTax - subFolio.discountAmount;

      subFolio.subTotal = subTotal;
      subFolio.cgstAmount = cgstAmount;
      subFolio.sgstAmount = sgstAmount;
      subFolio.totalTax = totalTax;
      subFolio.grandTotal = grandTotal;
      subFolio.dueAmount = Math.max(0, grandTotal - subFolio.paidAmount);

      await subFolio.save();

      res.status(200).json({
        success: true,
        message: 'Items added to sub-folio',
        subFolio,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Get All Sub-Folios for a Table (e.g. Bill A vs Bill B on Table 1)
   * GET /api/v1/seat-billing/table/:tableId
   */
  static async getTableSubFolios(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const tableId = req.params.tableId as string;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        res.status(400).json({ success: false, message: 'Valid tableId is required' });
        return;
      }

      const subFolios = await SeatSubFolio.find({
        hotelId: new Types.ObjectId(hotelId),
        tableId: new Types.ObjectId(tableId),
      }).sort({ createdAt: 1 });

      const openSubFolios = subFolios.filter((s) => s.status !== SubFolioStatus.MERGED);
      const totalTableOutstanding = openSubFolios
        .filter((s) => s.status !== SubFolioStatus.SETTLED)
        .reduce((acc, s) => acc + s.dueAmount, 0);

      res.status(200).json({
        success: true,
        count: openSubFolios.length,
        totalTableOutstanding,
        subFolios: openSubFolios,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Settle an Individual Seat Sub-Folio (Bill A or Bill B)
   * POST /api/v1/seat-billing/sub-folio/:subFolioId/settle
   */
  static async settleSubFolio(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const subFolioId = req.params.subFolioId as string;
      const { paymentMethod, transactionRef, paidAmount, settledByStaffName } = req.body;

      if (!subFolioId || !Types.ObjectId.isValid(subFolioId)) {
        res.status(400).json({ success: false, message: 'Valid subFolioId is required' });
        return;
      }

      if (!paymentMethod) {
        res.status(400).json({ success: false, message: 'paymentMethod (CASH, UPI, CARD, POST_TO_ROOM) is required' });
        return;
      }

      const subFolio = await SeatSubFolio.findOne({
        _id: new Types.ObjectId(subFolioId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!subFolio) {
        res.status(404).json({ success: false, message: 'Sub-folio not found' });
        return;
      }

      if (subFolio.status === SubFolioStatus.SETTLED) {
        res.status(400).json({ success: false, message: 'Sub-folio is already SETTLED' });
        return;
      }

      const settleAmount = paidAmount !== undefined ? Number(paidAmount) : subFolio.grandTotal;

      subFolio.status = SubFolioStatus.SETTLED;
      subFolio.paymentMethod = paymentMethod;
      subFolio.transactionRef = transactionRef;
      subFolio.paidAmount = settleAmount;
      subFolio.dueAmount = Math.max(0, subFolio.grandTotal - settleAmount);
      subFolio.settledAt = new Date();
      subFolio.settledByStaffName = settledByStaffName || 'Cashier Desk';

      await subFolio.save();

      // Create official RestaurantBill for accounting audit
      const officialBill = await RestaurantBill.create({
        hotelId: subFolio.hotelId,
        billNumber: `BILL-${subFolio.subFolioNumber}`,
        tableSessionId: subFolio.tableSessionId,
        tableId: subFolio.tableId,
        orderIds: subFolio.orderIds,
        subTotal: subFolio.subTotal,
        discountAmount: subFolio.discountAmount,
        taxBreakup: [
          { taxName: 'CGST', rate: 2.5, amount: subFolio.cgstAmount },
          { taxName: 'SGST', rate: 2.5, amount: subFolio.sgstAmount },
        ],
        totalTax: subFolio.totalTax,
        serviceCharge: 0,
        grandTotal: subFolio.grandTotal,
        roundOff: 0,
        paidAmount: settleAmount,
        dueAmount: subFolio.dueAmount,
        billStatus: BillStatus.PAID,
        isSnapshotLocked: true,
        settledAt: new Date(),
      });

      // Release settled seat(s) on the physical DiningTable
      const table = await DiningTable.findById(subFolio.tableId);
      if (table && table.seats) {
        table.seats.forEach((seat) => {
          if (subFolio.seatNumbers.includes(seat.seatNumber)) {
            seat.status = SeatStatus.AVAILABLE;
            seat.currentSessionId = undefined;
            seat.guestName = undefined;
            seat.guestPhone = undefined;
            seat.occupiedAt = undefined;
          }
        });

        const occupiedCount = table.seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
        const availableCount = table.capacity - occupiedCount;
        table.occupiedSeatsCount = occupiedCount;
        table.availableSeatsCount = availableCount;

        if (occupiedCount === 0) {
          table.currentStatus = TableStatus.AVAILABLE;
        } else {
          table.currentStatus = TableStatus.PARTIALLY_OCCUPIED;
        }

        await table.save();
      }

      // Close TableSession if this was the only or last session
      await TableSession.findByIdAndUpdate(subFolio.tableSessionId, {
        status: SessionStatus.SETTLED,
        closedAt: new Date(),
        finalAmount: subFolio.grandTotal,
      });

      res.status(200).json({
        success: true,
        message: `Sub-folio ${subFolio.subFolioNumber} settled successfully via ${paymentMethod}`,
        subFolio,
        officialBill,
        tableCurrentStatus: table?.currentStatus,
        availableSeatsNow: table?.availableSeatsCount,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Merge Multiple Sub-Folios into One Unified Bill
   * POST /api/v1/seat-billing/merge
   */
  static async mergeSubFolios(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { targetSubFolioId, sourceSubFolioIds } = req.body;

      if (!targetSubFolioId || !sourceSubFolioIds || !Array.isArray(sourceSubFolioIds) || sourceSubFolioIds.length === 0) {
        res.status(400).json({ success: false, message: 'targetSubFolioId and non-empty sourceSubFolioIds array are required' });
        return;
      }

      const targetSubFolio = await SeatSubFolio.findOne({
        _id: new Types.ObjectId(targetSubFolioId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!targetSubFolio) {
        res.status(404).json({ success: false, message: 'Target sub-folio not found' });
        return;
      }

      for (const sourceId of sourceSubFolioIds) {
        const source = await SeatSubFolio.findOne({
          _id: new Types.ObjectId(sourceId),
          hotelId: new Types.ObjectId(hotelId),
        });

        if (source && source.status !== SubFolioStatus.SETTLED && source._id.toString() !== targetSubFolio._id.toString()) {
          // Merge line items
          targetSubFolio.lineItems.push(...source.lineItems);

          // Merge seat numbers
          source.seatNumbers.forEach((s) => {
            if (!targetSubFolio.seatNumbers.includes(s)) {
              targetSubFolio.seatNumbers.push(s);
            }
          });

          // Merge order IDs
          source.orderIds.forEach((ord) => {
            if (!targetSubFolio.orderIds.some((id) => id.toString() === ord.toString())) {
              targetSubFolio.orderIds.push(ord);
            }
          });

          // Mark source merged
          source.status = SubFolioStatus.MERGED;
          source.mergedIntoSubFolioId = targetSubFolio._id;
          await source.save();
        }
      }

      // Recalculate target totals
      const subTotal = targetSubFolio.lineItems.reduce((acc, it) => acc + it.subtotal, 0);
      const cgstAmount = Math.round(subTotal * 0.025);
      const sgstAmount = Math.round(subTotal * 0.025);
      const totalTax = cgstAmount + sgstAmount;
      const grandTotal = subTotal + totalTax - targetSubFolio.discountAmount;

      targetSubFolio.subTotal = subTotal;
      targetSubFolio.cgstAmount = cgstAmount;
      targetSubFolio.sgstAmount = sgstAmount;
      targetSubFolio.totalTax = totalTax;
      targetSubFolio.grandTotal = grandTotal;
      targetSubFolio.dueAmount = Math.max(0, grandTotal - targetSubFolio.paidAmount);

      await targetSubFolio.save();

      res.status(200).json({
        success: true,
        message: `Successfully merged into sub-folio ${targetSubFolio.subFolioNumber}`,
        targetSubFolio,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 6. Thermal Print Receipt DTO
   * GET /api/v1/seat-billing/sub-folio/:subFolioId/receipt
   */
  static async getSubFolioReceipt(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const subFolioId = req.params.subFolioId as string;

      if (!subFolioId || !Types.ObjectId.isValid(subFolioId)) {
        res.status(400).json({ success: false, message: 'Valid subFolioId is required' });
        return;
      }

      const subFolio = await SeatSubFolio.findOne({
        _id: new Types.ObjectId(subFolioId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!subFolio) {
        res.status(404).json({ success: false, message: 'Sub-folio not found' });
        return;
      }

      res.status(200).json({
        success: true,
        receipt: {
          subFolioNumber: subFolio.subFolioNumber,
          tableNumber: subFolio.tableNumber,
          seats: subFolio.seatNumbers,
          customerName: subFolio.customerName,
          items: subFolio.lineItems,
          subTotal: subFolio.subTotal,
          taxes: {
            cgstRate: '2.5%',
            cgstAmount: subFolio.cgstAmount,
            sgstRate: '2.5%',
            sgstAmount: subFolio.sgstAmount,
            totalTax: subFolio.totalTax,
          },
          grandTotal: subFolio.grandTotal,
          paidAmount: subFolio.paidAmount,
          paymentMethod: subFolio.paymentMethod,
          status: subFolio.status,
          settledAt: subFolio.settledAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
