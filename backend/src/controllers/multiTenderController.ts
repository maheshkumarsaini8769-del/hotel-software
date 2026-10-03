import { Request, Response } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { MultiTenderSettlement, TenderMethod, SettlementStatus, ITenderLine } from '../models/MultiTenderSettlement';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { MasterFolio } from '../models/MasterFolio';
import { io } from '../index';

export class MultiTenderController {
  /**
   * 1. Open Cashier Shift Float
   * POST /api/v1/multi-tender/shift/open
   */
  static async openShift(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string || req.body.hotelId;
      const { cashierId, cashierName, openingFloat, terminalId } = req.body;

      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }
      if (!cashierId || !Types.ObjectId.isValid(cashierId) || !cashierName) {
        res.status(400).json({ success: false, message: 'cashierId and cashierName are required' });
        return;
      }

      // Check if an open shift already exists
      const existingShift = await CashierShiftFloat.findOne({
        hotelId: new Types.ObjectId(hotelId),
        cashierId: new Types.ObjectId(cashierId),
        status: CashierShiftStatus.OPEN,
      });

      if (existingShift) {
        res.status(200).json({
          success: true,
          message: 'Existing open cashier shift retrieved',
          shift: existingShift,
        });
        return;
      }

      const floatAmount = Number(openingFloat) || 0;
      const shiftCount = await CashierShiftFloat.countDocuments({ hotelId: new Types.ObjectId(hotelId) });
      const shiftNumber = `SFT-${Date.now().toString().slice(-6)}-${shiftCount + 1}`;

      const newShift = await CashierShiftFloat.create({
        hotelId: new Types.ObjectId(hotelId),
        shiftNumber,
        cashierId: new Types.ObjectId(cashierId),
        cashierName,
        terminalId: terminalId || 'COUNTER_01',
        status: CashierShiftStatus.OPEN,
        openingFloat: floatAmount,
        expectedCashInDrawer: floatAmount,
        openedAt: new Date(),
      });

      res.status(201).json({
        success: true,
        message: `Cashier shift opened with ₹${floatAmount} opening float`,
        shift: newShift,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 2. Close Cashier Shift & Reconcile Variance
   * POST /api/v1/multi-tender/shift/close
   */
  static async closeShift(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const { shiftId, actualCashCounted, notes } = req.body;

      if (!shiftId || !Types.ObjectId.isValid(shiftId)) {
        res.status(400).json({ success: false, message: 'Valid shiftId is required' });
        return;
      }
      if (actualCashCounted === undefined || isNaN(Number(actualCashCounted))) {
        res.status(400).json({ success: false, message: 'actualCashCounted amount is required' });
        return;
      }

      const shift = await CashierShiftFloat.findOne({
        _id: new Types.ObjectId(shiftId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!shift) {
        res.status(404).json({ success: false, message: 'Shift not found' });
        return;
      }

      if (shift.status === CashierShiftStatus.CLOSED) {
        res.status(400).json({ success: false, message: 'Shift is already closed' });
        return;
      }

      const counted = Number(actualCashCounted);
      const variance = Math.round((counted - shift.expectedCashInDrawer) * 100) / 100;

      shift.actualCashCounted = counted;
      shift.cashVariance = variance;
      shift.status = CashierShiftStatus.CLOSED;
      shift.closedAt = new Date();
      if (notes) shift.notes = notes;
      await shift.save();

      res.status(200).json({
        success: true,
        message: `Shift closed. Variance: ₹${variance} (${variance === 0 ? 'Exact Match' : variance > 0 ? 'Surplus' : 'Shortage'})`,
        shift,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 3. Settle Bill with Multi-Tender Split
   * POST /api/v1/multi-tender/settle
   */
  static async settleMultiTender(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const {
        billId,
        tenders,
        cashierId,
        cashierName,
        idempotencyKey,
      } = req.body;

      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }
      if (!billId || !Types.ObjectId.isValid(billId)) {
        res.status(400).json({ success: false, message: 'Valid billId is required' });
        return;
      }
      if (!Array.isArray(tenders) || tenders.length === 0) {
        res.status(400).json({ success: false, message: 'At least one tender method is required' });
        return;
      }
      if (!idempotencyKey) {
        res.status(400).json({ success: false, message: 'idempotencyKey is required' });
        return;
      }

      // Check Idempotency
      const existingSettlement = await MultiTenderSettlement.findOne({
        hotelId: new Types.ObjectId(hotelId),
        idempotencyKey,
      });
      if (existingSettlement) {
        res.status(200).json({
          success: true,
          message: 'Settlement already processed with this idempotency key',
          settlement: existingSettlement,
        });
        return;
      }

      // Fetch Bill
      const bill = await RestaurantBill.findOne({
        _id: new Types.ObjectId(billId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!bill) {
        res.status(404).json({ success: false, message: 'Restaurant bill not found' });
        return;
      }

      if (bill.billStatus === BillStatus.PAID) {
        res.status(400).json({ success: false, message: 'Bill is already settled and marked PAID' });
        return;
      }

      // Validate Sum of Tenders against Bill Grand Total
      let totalSettled = 0;
      let totalChange = 0;
      const processedTenders: ITenderLine[] = [];

      for (const t of tenders) {
        const amt = Number(t.amount);
        if (isNaN(amt) || amt <= 0) {
          res.status(400).json({ success: false, message: `Invalid tender amount for method ${t.method}` });
          return;
        }

        let change = 0;
        let cashRec = t.cashReceived ? Number(t.cashReceived) : undefined;

        if (t.method === TenderMethod.CASH && cashRec !== undefined) {
          if (cashRec < amt) {
            res.status(400).json({
              success: false,
              message: `Cash received (₹${cashRec}) cannot be less than cash tender amount (₹${amt})`,
            });
            return;
          }
          change = Math.round((cashRec - amt) * 100) / 100;
          totalChange += change;
        }

        // Room Folio Validation
        if (t.method === TenderMethod.ROOM_FOLIO) {
          if (!t.referenceNumber) {
            res.status(400).json({
              success: false,
              message: 'Room number / Folio reference is required for ROOM_FOLIO tender',
            });
            return;
          }

          // Optional: Look up active folio and debit room charges
          const folio = await MasterFolio.findOne({
            hotelId: new Types.ObjectId(hotelId),
            folioStatus: 'OPEN',
            ...(Types.ObjectId.isValid(t.referenceNumber)
              ? { _id: new Types.ObjectId(t.referenceNumber) }
              : { folioNumber: t.referenceNumber }),
          });

          if (folio) {
            folio.totalFoodAndBeverage += amt;
            folio.netAmountPayable += amt;
            folio.dueAmount += amt;
            await folio.save();
          }
        }

        totalSettled += amt;
        processedTenders.push({
          method: t.method,
          amount: amt,
          referenceNumber: t.referenceNumber,
          cashReceived: cashRec,
          cashChangeReturned: change,
          notes: t.notes,
        });
      }

      // Validate exact total matching
      const targetAmount = bill.dueAmount > 0 ? bill.dueAmount : bill.grandTotal;
      if (Math.round(totalSettled * 100) !== Math.round(targetAmount * 100)) {
        res.status(400).json({
          success: false,
          message: `Total tenders sum (₹${totalSettled}) does not equal bill due amount (₹${targetAmount})`,
          totalSettled,
          billDueAmount: targetAmount,
        });
        return;
      }

      // Generate Settlement Number
      const count = await MultiTenderSettlement.countDocuments({ hotelId: new Types.ObjectId(hotelId) });
      const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      const settlementNumber = `SETTLE-${Date.now().toString().slice(-6)}-${count + 1}-${randomSuffix}`;

      // Create Multi-Tender Settlement
      const settlement = await MultiTenderSettlement.create({
        hotelId: new Types.ObjectId(hotelId),
        settlementNumber,
        billId: bill._id,
        billNumber: bill.billNumber,
        tableId: bill.tableId,
        cashierId: new Types.ObjectId(cashierId || bill.generatedByUserId || new Types.ObjectId()),
        cashierName: cashierName || 'Cashier Counter',
        billGrandTotal: bill.grandTotal,
        tenders: processedTenders,
        totalSettledAmount: totalSettled,
        totalCashChangeReturned: totalChange,
        status: SettlementStatus.COMPLETED,
        idempotencyKey,
      });

      // Update Bill to PAID
      bill.paidAmount = bill.grandTotal;
      bill.dueAmount = 0;
      bill.billStatus = BillStatus.PAID;
      bill.settledAt = new Date();
      await bill.save();

      // Update Table Status to PAYMENT_SETTLED if linked
      if (bill.tableId) {
        await DiningTable.findByIdAndUpdate(bill.tableId, {
          currentStatus: TableStatus.PAYMENT_SETTLED,
        });
      }

      // Update Cashier Shift Float atomically if an open shift exists
      let cashInc = 0;
      let changeInc = 0;
      let upiInc = 0;
      let cardInc = 0;
      let roomFolioInc = 0;
      let cityLedgerInc = 0;

      for (const line of processedTenders) {
        switch (line.method) {
          case TenderMethod.CASH:
            cashInc += line.amount;
            changeInc += line.cashChangeReturned || 0;
            break;
          case TenderMethod.UPI:
            upiInc += line.amount;
            break;
          case TenderMethod.CARD:
            cardInc += line.amount;
            break;
          case TenderMethod.ROOM_FOLIO:
            roomFolioInc += line.amount;
            break;
          case TenderMethod.CITY_LEDGER:
            cityLedgerInc += line.amount;
            break;
        }
      }

      await CashierShiftFloat.updateOne(
        {
          hotelId: new Types.ObjectId(hotelId),
          cashierId: settlement.cashierId,
          status: CashierShiftStatus.OPEN,
        },
        {
          $inc: {
            totalCashCollected: cashInc,
            totalChangeReturned: changeInc,
            totalUpiCollected: upiInc,
            totalCardCollected: cardInc,
            totalRoomFolioCollected: roomFolioInc,
            totalCityLedgerCollected: cityLedgerInc,
            expectedCashInDrawer: cashInc - changeInc,
            settlementCount: 1,
          },
        }
      );

      // Realtime Notification via Socket.IO
      io.to(`${hotelId}_global`).emit('payment:multi_tender_settled', {
        settlementNumber: settlement.settlementNumber,
        billNumber: bill.billNumber,
        totalAmount: totalSettled,
        tenders: processedTenders,
      });

      res.status(201).json({
        success: true,
        message: `Bill #${bill.billNumber} successfully settled with multi-tender split`,
        settlement,
        totalChangeReturned: totalChange,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 4. Multi-Tender Reconciliation Summary
   * GET /api/v1/multi-tender/reconciliation/summary
   */
  static async getReconciliationSummary(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      if (!hotelId || !Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({ success: false, message: 'Valid hotelId is required' });
        return;
      }

      const settlements = await MultiTenderSettlement.find({
        hotelId: new Types.ObjectId(hotelId),
        status: SettlementStatus.COMPLETED,
      });

      let totalCash = 0;
      let totalUpi = 0;
      let totalCard = 0;
      let totalRoomFolio = 0;
      let totalCityLedger = 0;
      let totalComplimentary = 0;
      let totalChangeReturned = 0;
      let grandTotalRevenue = 0;

      for (const s of settlements) {
        grandTotalRevenue += s.totalSettledAmount;
        totalChangeReturned += s.totalCashChangeReturned || 0;

        for (const t of s.tenders) {
          switch (t.method) {
            case TenderMethod.CASH:
              totalCash += t.amount;
              break;
            case TenderMethod.UPI:
              totalUpi += t.amount;
              break;
            case TenderMethod.CARD:
              totalCard += t.amount;
              break;
            case TenderMethod.ROOM_FOLIO:
              totalRoomFolio += t.amount;
              break;
            case TenderMethod.CITY_LEDGER:
              totalCityLedger += t.amount;
              break;
            case TenderMethod.COMPLIMENTARY:
              totalComplimentary += t.amount;
              break;
          }
        }
      }

      res.status(200).json({
        success: true,
        summary: {
          settlementCount: settlements.length,
          grandTotalRevenue,
          totalCash,
          totalUpi,
          totalCard,
          totalRoomFolio,
          totalCityLedger,
          totalComplimentary,
          totalChangeReturned,
          netCashInDrawer: totalCash - totalChangeReturned,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 5. Void Multi-Tender Settlement (Manager PIN Protected)
   * POST /api/v1/multi-tender/settlement/:settlementId/void
   */
  static async voidSettlement(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = req.headers['x-hotel-id'] as string;
      const settlementId = req.params.settlementId as string;
      const { managerId, voidReason } = req.body;

      if (!settlementId || !Types.ObjectId.isValid(settlementId)) {
        res.status(400).json({ success: false, message: 'Valid settlementId is required' });
        return;
      }
      if (!managerId || !voidReason) {
        res.status(400).json({ success: false, message: 'managerId and voidReason are required' });
        return;
      }

      const settlement = await MultiTenderSettlement.findOne({
        _id: new Types.ObjectId(settlementId),
        hotelId: new Types.ObjectId(hotelId),
      });

      if (!settlement) {
        res.status(404).json({ success: false, message: 'Settlement not found' });
        return;
      }

      if (settlement.status === SettlementStatus.VOIDED) {
        res.status(400).json({ success: false, message: 'Settlement is already voided' });
        return;
      }

      settlement.status = SettlementStatus.VOIDED;
      settlement.voidReason = voidReason;
      settlement.voidedBy = new Types.ObjectId(managerId);
      await settlement.save();

      // Revert Restaurant Bill back to UNPAID
      await RestaurantBill.findByIdAndUpdate(settlement.billId, {
        billStatus: BillStatus.UNPAID,
        paidAmount: 0,
        dueAmount: settlement.billGrandTotal,
        settledAt: undefined,
      });

      res.status(200).json({
        success: true,
        message: `Settlement #${settlement.settlementNumber} voided. Bill #${settlement.billNumber} returned to UNPAID.`,
        settlement,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
