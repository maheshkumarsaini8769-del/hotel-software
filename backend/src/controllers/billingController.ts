import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TableSession, SessionStatus } from '../models/TableSession';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus, DiscountType } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { TaxRule, TaxApplicability } from '../models/TaxRule';
import { TenantRequest } from '../types';
import { io } from '../index';

// 1. Authoritative Bill Generation & Snapshot Locking
export const generateTableBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, tableSessionId, discountType, discountValue, discountReason } = req.body;

    if (!hotelId || !tableSessionId || !Types.ObjectId.isValid(tableSessionId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Missing or invalid parameters' });
      return;
    }

    const session = await TableSession.findById(tableSessionId);
    if (!session || session.status === SessionStatus.CLOSED) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Session is closed or not found' });
      return;
    }

    // Check if a bill is already generated for this session
    let bill = await RestaurantBill.findOne({
      hotelId: new Types.ObjectId(hotelId),
      tableSessionId: session._id,
      billStatus: { $ne: BillStatus.VOID },
    });

    if (bill && bill.isSnapshotLocked) {
      res.status(200).json({
        success: true,
        message: 'Bill already generated (snapshot locked)',
        data: bill,
      });
      return;
    }

    // Fetch all active orders for this table session
    const orders = await RestaurantOrder.find({
      hotelId: new Types.ObjectId(hotelId),
      tableSessionId: session._id,
      orderStatus: { $ne: OverallOrderStatus.CANCELLED },
    });

    if (orders.length === 0) {
      res.status(400).json({ success: false, errorCode: 'NO_ORDERS', message: 'Cannot generate bill with zero active orders' });
      return;
    }

    // Authoritative subtotal calculation
    let subTotal = 0;
    const orderIds: Types.ObjectId[] = [];

    for (const order of orders) {
      orderIds.push(order._id as Types.ObjectId);
      for (const item of order.items) {
        if (item.itemStatus !== 'CANCELLED') {
          subTotal += item.subtotal;
        }
      }
    }

    // Discount Calculation
    let discountAmount = 0;
    if (discountType === DiscountType.PERCENTAGE && discountValue) {
      discountAmount = Math.round((subTotal * Math.min(discountValue, 100)) / 100);
    } else if (discountType === DiscountType.FLAT && discountValue) {
      discountAmount = Math.min(discountValue, subTotal);
    }

    const taxableAmount = Math.max(0, subTotal - discountAmount);

    // Dynamic Tax Rule Resolution from database or fallback to standard 5% GST
    const activeTaxRule = await TaxRule.findOne({
      hotelId: new Types.ObjectId(hotelId),
      applicableTo: { $in: [TaxApplicability.RESTAURANT_DINE_IN, TaxApplicability.ALL] },
      isActive: true,
    }).sort({ isDefault: -1 });

    const cgstRate = activeTaxRule ? activeTaxRule.cgstRate : 2.5;
    const sgstRate = activeTaxRule ? activeTaxRule.sgstRate : 2.5;
    const serviceChargeRate = activeTaxRule ? activeTaxRule.serviceChargeRate : 0;

    const cgstAmount = Math.round((taxableAmount * (cgstRate / 100)) * 100) / 100;
    const sgstAmount = Math.round((taxableAmount * (sgstRate / 100)) * 100) / 100;
    const serviceChargeAmount = Math.round((taxableAmount * (serviceChargeRate / 100)) * 100) / 100;
    const totalTax = cgstAmount + sgstAmount + serviceChargeAmount;

    const rawGrandTotal = taxableAmount + totalTax;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    const billNumber = `BILL-${Date.now().toString().slice(-6)}`;

    const taxBreakup: Array<{ taxName: string; rate: number; amount: number }> = [
      { taxName: 'CGST', rate: cgstRate, amount: cgstAmount },
      { taxName: 'SGST', rate: sgstRate, amount: sgstAmount },
    ];
    if (serviceChargeRate > 0) {
      taxBreakup.push({ taxName: 'Service Charge', rate: serviceChargeRate, amount: serviceChargeAmount });
    }

    bill = await RestaurantBill.create({
      hotelId: new Types.ObjectId(hotelId),
      billNumber,
      tableSessionId: session._id,
      tableId: session.tableId,
      orderIds,
      subTotal,
      discountType,
      discountValue: discountValue || 0,
      discountAmount,
      discountReason,
      taxBreakup,
      totalTax,
      grandTotal,
      roundOff,
      paidAmount: 0,
      dueAmount: grandTotal,
      billStatus: BillStatus.UNPAID,
      isSnapshotLocked: true,
    });

    // Update Session and Table Status to BILLING
    session.status = SessionStatus.BILLING;
    session.totalAmount = subTotal;
    session.discountAmount = discountAmount;
    session.taxAmount = totalTax;
    session.finalAmount = grandTotal;
    await session.save();

    await DiningTable.findByIdAndUpdate(session.tableId, { currentStatus: TableStatus.BILLING });

    res.status(201).json({
      success: true,
      message: 'Table bill snapshot locked successfully',
      data: bill,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Split Bill Calculator (Equal / Custom / Item-Wise Preview)
export const calculateSplitBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { billId, splitType, splitCount } = req.body;

    const bill = await RestaurantBill.findById(billId);
    if (!bill) {
      res.status(404).json({ success: false, errorCode: 'BILL_NOT_FOUND' });
      return;
    }

    if (splitType === 'EQUAL') {
      const count = Math.max(1, splitCount || 2);
      const perPerson = Math.floor(bill.grandTotal / count);
      const remainder = bill.grandTotal - (perPerson * count);

      const splits = Array.from({ length: count }).map((_, i) => ({
        personNumber: i + 1,
        amount: i === 0 ? perPerson + remainder : perPerson,
      }));

      res.status(200).json({
        success: true,
        splitType: 'EQUAL',
        totalAmount: bill.grandTotal,
        splits,
      });
      return;
    }

    if (splitType === 'CUSTOM') {
      const { customSplits } = req.body;
      if (!Array.isArray(customSplits) || customSplits.length === 0) {
        res.status(400).json({ success: false, errorCode: 'INVALID_CUSTOM_SPLIT', message: 'customSplits array is required' });
        return;
      }

      const totalSplit = customSplits.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
      if (Math.round(totalSplit) !== Math.round(bill.grandTotal)) {
        res.status(400).json({
          success: false,
          errorCode: 'SPLIT_MISMATCH',
          message: `Sum of split amounts (${totalSplit}) does not match bill grand total (${bill.grandTotal})`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        splitType: 'CUSTOM',
        totalAmount: bill.grandTotal,
        splits: customSplits,
      });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid split type requested' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Process Payment & Settle Bill (Cash tender with change calculation & UPI)
export const processBillPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      hotelId,
      billId,
      paymentMode,
      amount,
      cashReceived,
      utrNumber,
      gatewayTransactionId,
    } = req.body;

    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) {
      res.status(400).json({ success: false, errorCode: 'IDEMPOTENCY_KEY_REQUIRED' });
      return;
    }

    // Check duplicate payment submission
    const existingPayment = await Payment.findOne({
      hotelId: new Types.ObjectId(hotelId),
      idempotencyKey,
    });

    if (existingPayment) {
      res.status(200).json({
        success: true,
        message: 'Payment already processed (idempotent)',
        data: existingPayment,
      });
      return;
    }

    const bill = await RestaurantBill.findById(billId);
    if (!bill || bill.billStatus === BillStatus.PAID) {
      res.status(400).json({ success: false, errorCode: 'INVALID_BILL', message: 'Bill is already paid or not found' });
      return;
    }

    let changeReturned = 0;
    if (paymentMode === PaymentMode.CASH) {
      if (!cashReceived || cashReceived < amount) {
        res.status(400).json({ success: false, errorCode: 'INSUFFICIENT_CASH', message: 'Cash received is less than payment amount' });
        return;
      }
      changeReturned = cashReceived - amount;
    }

    // Create Payment Record
    const payment = await Payment.create({
      hotelId: new Types.ObjectId(hotelId),
      billId: bill._id,
      paymentMode,
      amount,
      status: PaymentStatus.SUCCESS,
      cashReceived: paymentMode === PaymentMode.CASH ? cashReceived : undefined,
      cashChangeReturned: changeReturned,
      utrNumber,
      gatewayTransactionId,
      idempotencyKey,
    });

    // Update Bill
    bill.paidAmount += amount;
    bill.dueAmount = Math.max(0, bill.grandTotal - bill.paidAmount);
    if (bill.dueAmount === 0) {
      bill.billStatus = BillStatus.PAID;
      bill.settledAt = new Date();
    } else {
      bill.billStatus = BillStatus.PARTIALLY_PAID;
    }
    await bill.save();

    // CRITICAL BLUEPRINT RULE: Payment success does NOT close the dining table!
    // Table moves to PAYMENT_SETTLED, awaiting physical waiter inspection & cleaning.
    if (bill.billStatus === BillStatus.PAID) {
      await DiningTable.findByIdAndUpdate(bill.tableId, { currentStatus: TableStatus.PAYMENT_SETTLED });
      await TableSession.findByIdAndUpdate(bill.tableSessionId, { status: SessionStatus.SETTLED });
    }

    // Broadcast Real-time event
    io.to(`${hotelId}_admin`).emit('payment:verified', {
      billId: bill._id,
      amount,
      paymentMode,
      billStatus: bill.billStatus,
      changeReturned,
    });

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment,
        billStatus: bill.billStatus,
        changeReturned,
      },
    });
  } catch (error: any) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await Payment.findOne({
        hotelId: new Types.ObjectId(req.body.hotelId),
        idempotencyKey: req.headers['x-idempotency-key'] as string,
      });
      if (existing) {
        res.status(200).json({ success: true, message: 'Payment already processed (idempotent)', data: existing });
        return;
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Blind Cash Drawer Shift Settlement
export const executeBlindShiftClose = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { openingFloatCash, noteCounts, notes } = req.body;
    const cashierId = req.user?.userId;
    const hotelId = req.hotelId;

    if (!cashierId || !hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED' });
      return;
    }

    // Compute actual physical counted cash from notes breakdown
    let actualCountedCash = 0;
    const cashBreakdown = [];

    if (noteCounts && Array.isArray(noteCounts)) {
      for (const item of noteCounts) {
        const lineTotal = item.denomination * item.count;
        actualCountedCash += lineTotal;
        cashBreakdown.push({
          denomination: item.denomination,
          count: item.count,
          total: lineTotal,
        });
      }
    }

    // Calculate system expected cash bounded strictly to this shift window (prevents lifetime unbounded memory spikes)
    const shiftStartTime = req.body.shiftStartTime
      ? new Date(req.body.shiftStartTime)
      : new Date(Date.now() - 24 * 3600000); // Defaults to current 24h operational window

    const cashPayments = await Payment.find({
      hotelId,
      paymentMode: PaymentMode.CASH,
      status: PaymentStatus.SUCCESS,
      createdAt: { $gte: shiftStartTime },
    });

    const totalCashSales = cashPayments.reduce((acc, p) => acc + p.amount, 0);
    const systemExpectedCash = (openingFloatCash || 0) + totalCashSales;

    // Variance: Negative = Shortage, Positive = Excess
    const varianceAmount = actualCountedCash - systemExpectedCash;

    const certNum = `CERT-SHIFT-${Date.now().toString().slice(-6)}`;

    const shiftReport = await ShiftReconciliation.create({
      hotelId,
      cashierUserId: new Types.ObjectId(cashierId),
      shiftStartTime: new Date(Date.now() - 8 * 3600000), // 8 hours ago
      shiftEndTime: new Date(),
      openingFloatCash: openingFloatCash || 0,
      systemExpectedCash,
      actualCountedCash,
      varianceAmount,
      cashBreakdown,
      isBlindCloseCompleted: true,
      reconciliationCertificateNumber: certNum,
      notes,
    });

    // Shift 54: Emit real-time shift closure event to global hotel and waiters
    if (io) {
      const shiftClosedPayload = {
        hotelId: hotelId.toString(),
        certificateNumber: certNum,
        cashierUserId: cashierId.toString(),
        systemExpectedCash,
        actualCountedCash,
        varianceAmount,
        status: varianceAmount === 0 ? 'BALANCED' : varianceAmount < 0 ? 'SHORTAGE' : 'EXCESS',
        timestamp: new Date().toISOString(),
      };
      io.to(`${hotelId}_global`).emit('cashier:shift_closed', shiftClosedPayload);
      io.to(`${hotelId}_waiters`).emit('cashier:shift_closed', shiftClosedPayload);
    }

    res.status(201).json({
      success: true,
      message: 'Blind shift reconciliation completed',
      data: {
        certificateNumber: certNum,
        systemExpectedCash,
        actualCountedCash,
        varianceAmount,
        status: varianceAmount === 0 ? 'BALANCED' : varianceAmount < 0 ? 'SHORTAGE' : 'EXCESS',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
