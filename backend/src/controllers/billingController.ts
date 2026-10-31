import { Request, Response } from 'express';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { TableSession, SessionStatus } from '../models/TableSession';
import { DiningTable, TableStatus } from '../models/DiningTable';
import { RestaurantOrder, OverallOrderStatus } from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus, DiscountType } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { TaxRule, TaxApplicability } from '../models/TaxRule';
import { TenantRequest } from '../types';
import { io } from '../index';
import { isDevAuthBypassEnabled } from '../config/security';
import { AuditService } from '../services/auditService';
import { sendWhatsApp } from '../services/notificationService';

// 1. Authoritative Bill Generation & Snapshot Locking
export const generateTableBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hotelId, tableSessionId, discountType, discountValue, discountReason } = req.body;

    const authHotelId = (req as TenantRequest).hotelId
      ? String((req as TenantRequest).hotelId)
      : '';

    if (
      !hotelId ||
      !Types.ObjectId.isValid(hotelId) ||
      !tableSessionId ||
      !Types.ObjectId.isValid(tableSessionId)
    ) {
      res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Missing or invalid parameters' });
      return;
    }
    if (authHotelId && authHotelId !== String(hotelId)) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_MISMATCH',
        message: 'Requested hotel does not match the authenticated tenant',
      });
      return;
    }

    const scopedHotelId = new Types.ObjectId(authHotelId || hotelId);
    const session = await TableSession.findOne({
      _id: new Types.ObjectId(tableSessionId),
      hotelId: scopedHotelId,
    });
    if (!session || session.status === SessionStatus.CLOSED) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SESSION', message: 'Session is closed or not found' });
      return;
    }

    // Check if a bill is already generated for this session
    let bill = await RestaurantBill.findOne({
      hotelId: scopedHotelId,
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
      hotelId: scopedHotelId,
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
      hotelId: scopedHotelId,
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
      hotelId: scopedHotelId,
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
    if (!session.sessionTokenHash) {
      session.sessionTokenHash = crypto.createHash('sha256').update(String(session._id)).digest('hex');
    }
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
    const hotelId = (req as TenantRequest).hotelId;
    if (!hotelId || !billId || !Types.ObjectId.isValid(billId)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        message: 'A valid billId and hotel context are required',
      });
      return;
    }

    const bill = await RestaurantBill.findOne({
      _id: new Types.ObjectId(billId),
      hotelId: new Types.ObjectId(String(hotelId)),
    });
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
      tableSessionId,
      paymentMode = PaymentMode.UPI,
      amount,
      cashReceived,
      utrNumber,
      gatewayTransactionId,
    } = req.body;

    const providedIdempotencyKey =
      (req.headers['x-idempotency-key'] as string) ||
      req.body?.idempotencyKey;

    if (!providedIdempotencyKey) {
      if (!isDevAuthBypassEnabled() && process.env.NODE_ENV !== 'test') {
        res.status(400).json({
          success: false,
          errorCode: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'x-idempotency-key header is required for payment processing',
        });
        return;
      }
      console.warn('[Billing] Missing idempotency key accepted for local development/test only');
    }

    const idempotencyKey =
      providedIdempotencyKey ||
      `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const authHotelId = (req as TenantRequest).hotelId
      ? String((req as TenantRequest).hotelId)
      : '';
    const requestedHotelId = hotelId ? String(hotelId) : authHotelId;

    if (!requestedHotelId || !Types.ObjectId.isValid(requestedHotelId)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_HOTEL',
        message: 'A valid hotelId is required',
      });
      return;
    }
    if (authHotelId && String(requestedHotelId) !== authHotelId) {
      res.status(403).json({
        success: false,
        errorCode: 'TENANT_MISMATCH',
        message: 'Requested hotel does not match the authenticated tenant',
      });
      return;
    }

    const scopedHotelId = new Types.ObjectId(authHotelId || requestedHotelId);

    // Check duplicate payment submission
    const existingPayment = await Payment.findOne({
      hotelId: scopedHotelId,
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

    let bill =
      billId && Types.ObjectId.isValid(billId)
        ? await RestaurantBill.findOne({ _id: new Types.ObjectId(billId), hotelId: scopedHotelId })
        : null;
    if (!bill && tableSessionId && Types.ObjectId.isValid(tableSessionId)) {
      bill = await RestaurantBill.findOne({
        hotelId: scopedHotelId,
        tableSessionId: new Types.ObjectId(tableSessionId),
        billStatus: { $ne: BillStatus.PAID },
      }).sort({ createdAt: -1 });
    }

    // Auto-generate bill snapshot if not yet created for session
    if (!bill && tableSessionId && Types.ObjectId.isValid(tableSessionId)) {
      const session = await TableSession.findOne({
        _id: new Types.ObjectId(tableSessionId),
        hotelId: scopedHotelId,
      });
      if (session) {
        const orders = await RestaurantOrder.find({
          hotelId: scopedHotelId,
          tableSessionId: session._id,
          orderStatus: { $ne: OverallOrderStatus.CANCELLED },
        });
        let subTotal = 0;
        orders.forEach((o) => {
          o.items.forEach((it) => {
            if (it.itemStatus !== 'CANCELLED') subTotal += it.subtotal;
          });
        });
        const grandTotal = Math.round(subTotal * 1.05);
        const totalTax = grandTotal - subTotal;
        bill = await RestaurantBill.create({
          hotelId: session.hotelId,
          billNumber: `BILL-${Date.now().toString().slice(-6)}`,
          tableSessionId: session._id,
          tableId: session.tableId,
          orderIds: orders.map((o) => o._id),
          subTotal,
          totalTax,
          grandTotal,
          roundOff: 0,
          paidAmount: 0,
          dueAmount: grandTotal,
          billStatus: BillStatus.UNPAID,
          isSnapshotLocked: true,
        });
      }
    }

    if (!bill) {
      res.status(404).json({ success: false, errorCode: 'BILL_NOT_FOUND', message: 'Bill not found' });
      return;
    }

    if (bill.billStatus === BillStatus.PAID) {
      res.status(400).json({ success: false, errorCode: 'ALREADY_PAID', message: 'Bill is already paid' });
      return;
    }

    // Overpayment clamp: payAmount never exceeds outstanding dueAmount
    let payAmount = amount !== undefined ? Number(amount) : bill.dueAmount;
    let effectiveCashReceived = cashReceived !== undefined ? Number(cashReceived) : undefined;
    if (paymentMode === PaymentMode.CASH && payAmount > bill.dueAmount) {
      // If cashier entered cash received in the amount field or cashReceived is greater
      if (!effectiveCashReceived) effectiveCashReceived = payAmount;
      payAmount = bill.dueAmount;
    }

    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Payment amount must be greater than zero' });
      return;
    }

    if (payAmount > bill.dueAmount + 0.01) {
      res.status(400).json({
        success: false,
        errorCode: 'PAYMENT_EXCEEDS_DUE',
        message: `Payment amount ₹${payAmount} exceeds outstanding due ₹${bill.dueAmount}`,
      });
      return;
    }

    let changeReturned = 0;
    if (paymentMode === PaymentMode.CASH) {
      const effectiveCash = Number(effectiveCashReceived || payAmount);
      if (effectiveCash < payAmount) {
        res.status(400).json({ success: false, errorCode: 'INSUFFICIENT_CASH', message: 'Cash received is less than payment amount' });
        return;
      }
      changeReturned = Math.max(0, effectiveCash - payAmount);
    }

    // Create Payment Record
    const payment = await Payment.create({
      hotelId: bill.hotelId,
      billId: bill._id,
      paymentMode,
      amount: payAmount,
      status: PaymentStatus.SUCCESS,
      cashReceived: paymentMode === PaymentMode.CASH ? cashReceived : undefined,
      cashChangeReturned: changeReturned,
      utrNumber: utrNumber || (paymentMode === PaymentMode.UPI ? `UPI${Date.now()}` : undefined),
      gatewayTransactionId,
      idempotencyKey,
    });

    // Update Bill
    bill.paidAmount += payAmount;
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

      // Trigger WhatsApp Bill Receipt Notification (Mock Service)
      const recipientPhone = req.body.customerPhone || (bill as any).customerPhone || (bill as any).phone;
      if (recipientPhone) {
        sendWhatsApp(recipientPhone, 'bill_receipt', {
          billNumber: bill.billNumber,
          amount: payAmount,
          paymentMode,
          settledAt: bill.settledAt || new Date(),
        }).catch((err) => console.error('[Billing] WhatsApp receipt notification failed:', err.message));
      }
    }

    // Automatically synchronize payment with the active CashierShiftFloat drawer
    if (paymentMode === PaymentMode.CASH) {
      await CashierShiftFloat.findOneAndUpdate(
        { hotelId: bill.hotelId, status: CashierShiftStatus.OPEN },
        {
          $inc: {
            totalCashCollected: Number(effectiveCashReceived || payAmount),
            totalChangeReturned: changeReturned,
            expectedCashInDrawer: payAmount,
            settlementCount: 1,
          },
        }
      );
    } else if (paymentMode === PaymentMode.UPI) {
      await CashierShiftFloat.findOneAndUpdate(
        { hotelId: bill.hotelId, status: CashierShiftStatus.OPEN },
        {
          $inc: {
            totalUpiCollected: payAmount,
            settlementCount: 1,
          },
        }
      );
    } else if (paymentMode === PaymentMode.CARD) {
      await CashierShiftFloat.findOneAndUpdate(
        { hotelId: bill.hotelId, status: CashierShiftStatus.OPEN },
        {
          $inc: {
            totalCardCollected: payAmount,
            settlementCount: 1,
          },
        }
      );
    }

    // Audit Log recording
    await AuditService.log({
      hotelId: bill.hotelId,
      userId: (req as any).user?._id || (req as any).user?.id,
      userEmail: (req as any).user?.email || 'cashier@pos',
      userName: (req as any).user?.name || 'Cashier Terminal',
      action: 'PAYMENT_SETTLED',
      entity: 'RestaurantBill',
      entityId: String(bill._id),
      newValue: {
        paidAmount: payAmount,
        paymentMode,
        changeReturned,
        billNumber: bill.billNumber,
      },
      details: `Settled payment of ₹${payAmount} via ${paymentMode}. Change returned: ₹${changeReturned}`,
      ipAddress: req.ip,
    });

    // Broadcast Real-time event
    const activeHotelId = bill.hotelId.toString();
    io.to(`${activeHotelId}_admin`).to(`${activeHotelId}_cashier`).emit('payment:verified', {
      billId: bill._id,
      amount: payAmount,
      paymentMode,
      billStatus: bill.billStatus,
      changeReturned,
    });

    io.to(`${activeHotelId}_waiters`).to(`${activeHotelId}_cashier`).to(`${activeHotelId}_global`).emit('table:status_changed', {
      tableId: bill.tableId?.toString(),
      currentStatus: TableStatus.PAYMENT_SETTLED,
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
