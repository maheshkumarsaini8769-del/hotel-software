import { Response } from 'express';
import { Types } from 'mongoose';
import { MenuItem } from '../models/MenuItem';
import {
  RestaurantOrder,
  OrderType,
  OverallOrderStatus,
  ItemProductionStatus,
} from '../models/RestaurantOrder';
import { RestaurantBill, BillStatus } from '../models/RestaurantBill';
import { Payment, PaymentMode, PaymentStatus } from '../models/Payment';
import { Tenant } from '../models/Tenant';
import { TaxRule, TaxApplicability } from '../models/TaxRule';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { PettyCashVoucher, PettyCashCategory } from '../models/PettyCashVoucher';
import { TenantRequest } from '../types';
import { io } from '../index';
import { escapeRegex } from '../utils/security';
import { generateReferenceNumber, isDuplicateKeyError } from '../utils/referenceNumber';

// Helper: Formats receipt line with fixed column width
function padLine(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
}

function centerLine(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

// 0. Live cashier workspace snapshot: open bills, recent payments and drawer.
export const getCashierSnapshot = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [bills, openShift, recentPaymentRows, todayPayments, pettyCashToday] = await Promise.all([
      RestaurantBill.find({
        hotelId,
        billStatus: { $in: [BillStatus.UNPAID, BillStatus.PARTIALLY_PAID] },
      })
        .sort({ createdAt: 1 })
        .populate('tableId', 'tableNumber')
        .lean(),
      CashierShiftFloat.findOne({ hotelId, status: CashierShiftStatus.OPEN }).sort({
        openedAt: -1,
      }),
      Payment.find({ hotelId, status: PaymentStatus.SUCCESS })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('billId', 'billNumber')
        .lean(),
      Payment.find({
        hotelId,
        status: PaymentStatus.SUCCESS,
        createdAt: { $gte: startOfToday },
      }).lean(),
      PettyCashVoucher.aggregate([
        { $match: { hotelId, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const orderIds = bills.flatMap((bill: any) => bill.orderIds || []);
    const orders = await RestaurantOrder.find({ _id: { $in: orderIds } })
      .select('orderType roomId items')
      .populate('roomId', 'roomNumber')
      .lean();
    const orderById = new Map(orders.map((order: any) => [String(order._id), order]));

    const openBills = bills.map((bill: any) => {
      const billOrders = (bill.orderIds || [])
        .map((id: any) => orderById.get(String(id)))
        .filter(Boolean);
      const itemCount = billOrders.reduce(
        (sum: number, order: any) => sum + (Array.isArray(order.items) ? order.items.length : 0),
        0
      );
      const primaryOrder: any = billOrders[0];
      const tableNumber = bill.tableId?.tableNumber;
      const roomNumber = primaryOrder?.roomId?.roomNumber;
      const type =
        primaryOrder?.orderType === OrderType.TAKEAWAY
          ? 'takeaway'
          : primaryOrder?.orderType === OrderType.ROOM_SERVICE
            ? 'room'
            : 'dine-in';
      return {
        id: String(bill._id),
        billNo: bill.billNumber,
        table: tableNumber
          ? `Table ${tableNumber}`
          : roomNumber
            ? `Room ${roomNumber}`
            : primaryOrder?.orderType === OrderType.TAKEAWAY
              ? 'Takeaway Counter'
              : 'Unassigned',
        items: `${itemCount} item${itemCount === 1 ? '' : 's'}`,
        itemCount,
        amount: Number(bill.grandTotal || bill.dueAmount || 0),
        dueAmount: Number(bill.dueAmount || 0),
        time: bill.createdAt,
        status: bill.billStatus === BillStatus.PARTIALLY_PAID ? 'Pending' : 'Open',
        type,
      };
    });

    const recentPayments = recentPaymentRows.map((payment: any) => ({
      id: String(payment._id),
      time: payment.createdAt,
      billNo: payment.billId?.billNumber || payment.utrNumber || 'POS settlement',
      type:
        payment.paymentMode === PaymentMode.CASH
          ? 'Cash'
          : payment.paymentMode === PaymentMode.UPI
            ? 'UPI'
            : payment.paymentMode === PaymentMode.CARD
              ? 'Card'
              : String(payment.paymentMode || 'Other').replace(/_/g, ' '),
      amount: Number(payment.amount || 0),
      method: String(payment.paymentMode || '').replace(/_/g, ' '),
      mode: String(payment.paymentMode || 'OTHER'),
      status: 'Paid',
    }));

    const successToday = todayPayments;
    const sumMode = (mode: PaymentMode) =>
      successToday
        .filter((payment: any) => payment.paymentMode === mode)
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const cashSales = openShift?.totalCashCollected || sumMode(PaymentMode.CASH);
    const openingFloat = openShift?.openingFloat || 0;
    const pettyCash = Number(pettyCashToday?.[0]?.total || 0);
    const pettyCashCount = Number(pettyCashToday?.[0]?.count || 0);

    res.status(200).json({
      success: true,
      data: {
        openBills,
        recentPayments,
        shift: {
          id: openShift?._id ? String(openShift._id) : null,
          shiftNumber: openShift?.shiftNumber || null,
          status: openShift?.status || 'CLOSED',
          openingFloat,
          cashSales,
          upiSales: openShift?.totalUpiCollected || sumMode(PaymentMode.UPI),
          cardSales: openShift?.totalCardCollected || sumMode(PaymentMode.CARD),
          totalSales: successToday.reduce(
            (sum: number, payment: any) => sum + Number(payment.amount || 0),
            0
          ),
          refunds: successToday.reduce(
            (sum: number, payment: any) => sum + Number(payment.refundAmount || 0),
            0
          ),
          pettyCash,
          pettyCashCount,
          expectedCash:
            openShift?.expectedCashInDrawer || Math.max(0, openingFloat + cashSales - pettyCash),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SNAPSHOT_ERROR', message: error.message });
  }
};

// 1. Quick Barcode or 10-Key Item Code Lookup
export const lookupItemByShortcut = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, errorCode: 'MISSING_CODE', message: 'Item code or barcode required' });
      return;
    }

    const trimmed = code.trim();

    // Search by exact itemCode, barcode, or case-insensitive partial name
    const item = await MenuItem.findOne({
      hotelId,
      isAvailable: true,
      $or: [
        { itemCode: trimmed },
        { barcode: trimmed },
        { name: { $regex: `^${escapeRegex(trimmed)}`, $options: 'i' } },
      ],
    }).populate('kitchenStationId');

    if (!item) {
      res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: `No active item matches "${code}"` });
      return;
    }

    res.status(200).json({ success: true, item });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 2. Instant Takeaway Counter Order & One-Tap Settlement
export const createFastCounterOrder = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      items, // Array<{ menuItemId: string, quantity: number, variantName?: string, specialInstructions?: string }>
      customerName,
      customerPhone,
      paymentMethod = PaymentMode.CASH,
      tenderAmount,
      cookingInstructions,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, errorCode: 'EMPTY_CART', message: 'At least one item is required' });
      return;
    }

    // Determine sequential Token Number for today. Two safeguards keep this
    // race-free across concurrent cashier terminals:
    //   1. a short random suffix on the order number, and
    //   2. a partial unique index on (hotelId, tokenDayKey, tokenNumber) with a
    //      retry loop when another terminal grabbed the same token first.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const tokenDayKey = `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, '0')}-${String(startOfDay.getDate()).padStart(2, '0')}`;

    // Resolve line items and authoritative pricing
    const resolvedItems: any[] = [];
    let subtotal = 0;

    for (const line of items) {
      const menuItem = await MenuItem.findOne({ _id: new Types.ObjectId(line.menuItemId), hotelId });
      if (!menuItem) {
        res.status(404).json({ success: false, errorCode: 'ITEM_NOT_FOUND', message: `Item ${line.menuItemId} not found` });
        return;
      }

      let price = menuItem.basePrice;
      if (line.variantName && menuItem.hasVariants) {
        const variant = menuItem.variants.find((v) => v.name === line.variantName);
        if (variant) price = variant.price;
      }

      const lineSubtotal = price * Number(line.quantity);
      subtotal += lineSubtotal;

      resolvedItems.push({
        menuItemId: menuItem._id,
        kitchenStationId: menuItem.kitchenStationId,
        name: menuItem.name,
        variantName: line.variantName,
        unitPrice: price,
        quantity: Number(line.quantity),
        subtotal: lineSubtotal,
        specialInstructions: line.specialInstructions,
        itemStatus: ItemProductionStatus.PENDING,
      });
    }

    // Dynamic Tax Rule Resolution from database or fallback to 5% GST
    const activeTaxRule = await TaxRule.findOne({
      hotelId,
      applicableTo: { $in: [TaxApplicability.TAKEAWAY, TaxApplicability.ALL] },
      isActive: true,
    }).sort({ isDefault: -1 });

    const cgstRate = activeTaxRule ? activeTaxRule.cgstRate : 2.5;
    const sgstRate = activeTaxRule ? activeTaxRule.sgstRate : 2.5;
    const cgstAmount = Math.round((subtotal * (cgstRate / 100)) * 100) / 100;
    const sgstAmount = Math.round((subtotal * (sgstRate / 100)) * 100) / 100;
    const totalTax = cgstAmount + sgstAmount;
    const grandTotal = Math.round(subtotal + totalTax);

    // Idempotency key
    const idempotencyKey = `FAST-POS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create Takeaway Order with an atomic token allocation retry
    let order: any = null;
    let tokenNumber = 0;
    const MAX_TOKEN_ATTEMPTS = 12;
    for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
      // Derive the next token from the highest token already issued today.
      // Under concurrency another terminal may win the insert race, in which
      // case the unique (hotelId, tokenDayKey, tokenNumber) index rejects us
      // and we re-read the maximum before retrying.
      const highestOrder = await RestaurantOrder.findOne({
        hotelId,
        orderType: OrderType.TAKEAWAY,
        tokenDayKey,
      })
        .sort({ tokenNumber: -1 })
        .select('tokenNumber')
        .lean();

      tokenNumber = (highestOrder?.tokenNumber ?? 0) + 1;

      const candidate = new RestaurantOrder({
        hotelId,
        orderNumber: generateReferenceNumber('TKW'),
        orderType: OrderType.TAKEAWAY,
        tokenNumber,
        tokenDayKey,
        customerName: customerName || `Customer #${tokenNumber}`,
        customerPhone: customerPhone || '',
        items: resolvedItems,
        cookingInstructions,
        orderStatus: OverallOrderStatus.PLACED,
        idempotencyKey,
        placedAt: new Date(),
      });

      try {
        await candidate.save();
        order = candidate;
        break;
      } catch (err: any) {
        // Another terminal claimed this token between count + insert; retry.
        if (isDuplicateKeyError(err) && attempt < MAX_TOKEN_ATTEMPTS - 1) {
          continue;
        }
        throw err;
      }
    }

    if (!order) {
      res.status(503).json({
        success: false,
        errorCode: 'TOKEN_ALLOCATION_BUSY',
        message: 'Unable to allocate a takeaway token right now. Please retry.',
      });
      return;
    }

    // Create Instant Bill
    const billNumber = `BL-TKW-${tokenNumber}-${order._id.toString().slice(-6).toUpperCase()}`;
    const bill = new RestaurantBill({
      hotelId,
      billNumber,
      orderIds: [order._id],
      subTotal: subtotal,
      taxBreakup: [
        { taxName: 'CGST', rate: cgstRate, amount: cgstAmount },
        { taxName: 'SGST', rate: sgstRate, amount: sgstAmount },
      ],
      totalTax,
      discountAmount: 0,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      billStatus: BillStatus.UNPAID,
    });
    await bill.save();

    // Handle Instant Settlement if tender amount provided
    let changeAmount = 0;
    let paymentRecord: any = null;

    if (tenderAmount !== undefined && tenderAmount !== null) {
      const tender = Number(tenderAmount);
      if (isNaN(tender) || tender < grandTotal) {
        res.status(400).json({
          success: false,
          errorCode: 'INSUFFICIENT_TENDER_AMOUNT',
          message: `Tender amount (₹${tender}) cannot be less than grand total (₹${grandTotal})`,
        });
        return;
      }
      changeAmount = Math.max(0, tender - grandTotal);

      paymentRecord = new Payment({
        hotelId,
        billId: bill._id,
        paymentMode: (paymentMethod as PaymentMode) || PaymentMode.CASH,
        amount: grandTotal,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        cashReceived: paymentMethod === PaymentMode.CASH ? tender : grandTotal,
        cashChangeReturned: paymentMethod === PaymentMode.CASH ? changeAmount : 0,
        idempotencyKey: `PAY-${idempotencyKey}`,
      });
      await paymentRecord.save();

      bill.billStatus = BillStatus.PAID;
      bill.paidAmount = grandTotal;
      bill.dueAmount = 0;
      bill.settledAt = new Date();
      await bill.save();

      // Automatically credit active CashierShiftFloat if cash payment
      if (paymentMethod === PaymentMode.CASH) {
        await CashierShiftFloat.findOneAndUpdate(
          { hotelId, status: CashierShiftStatus.OPEN },
          {
            $inc: {
              totalCashCollected: tender,
              totalChangeReturned: changeAmount,
              expectedCashInDrawer: grandTotal,
              settlementCount: 1,
            },
          }
        );
      }
    }

    // Emit Realtime Socket Alert to Kitchen KDS
    io.to(`${hotelId.toString()}_kds`).emit('new_order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: OrderType.TAKEAWAY,
      tokenNumber,
      items: order.items,
      placedAt: order.placedAt,
      badge: `[TAKEAWAY - TOKEN #${tokenNumber}]`,
    });

    res.status(201).json({
      success: true,
      tokenNumber,
      order,
      bill,
      financials: {
        subtotal,
        taxAmount: totalTax,
        grandTotal,
        tenderAmount: tenderAmount ? Number(tenderAmount) : grandTotal,
        changeAmount,
      },
      payment: paymentRecord,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 3. Get Active Takeaway Calling Queue
export const getTakeawayCallingQueue = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await RestaurantOrder.find({
      hotelId,
      orderType: OrderType.TAKEAWAY,
      placedAt: { $gte: startOfDay },
    }).sort({ tokenNumber: 1 });

    const preparingQueue: any[] = [];
    const readyQueue: any[] = [];
    const completedQueue: any[] = [];

    orders.forEach((ord) => {
      if (ord.orderStatus === OverallOrderStatus.PLACED || ord.orderStatus === OverallOrderStatus.PREPARING) {
        preparingQueue.push(ord);
      } else if (ord.orderStatus === OverallOrderStatus.READY) {
        readyQueue.push(ord);
      } else if (ord.orderStatus === OverallOrderStatus.SERVED) {
        completedQueue.push(ord);
      }
    });

    res.status(200).json({
      success: true,
      totalActiveTakeaways: preparingQueue.length + readyQueue.length,
      preparingQueue,
      readyQueue,
      completedQueue,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 4. Mark Takeaway Order Picked Up
export const markTakeawayPickedUp = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const orderId = String(req.params.orderId);

    const order = await RestaurantOrder.findOne({ _id: new Types.ObjectId(orderId), hotelId });
    if (!order) {
      res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Takeaway order not found' });
      return;
    }

    order.orderStatus = OverallOrderStatus.SERVED;
    order.servedAt = new Date();
    order.items.forEach((item) => {
      item.itemStatus = ItemProductionStatus.SERVED;
    });
    await order.save();

    res.status(200).json({
      success: true,
      message: `Token #${order.tokenNumber} marked as picked up by guest`,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 5. Dedicated ESC/POS Thermal Receipt Generator (58mm and 80mm format)
export const generateThermalReceipt = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const billId = String(req.params.billId);
    const { width = '80mm', kickDrawer = false, cutPaper = true } = req.body;

    const lineWidth = width === '58mm' ? 32 : 48;

    const bill = await RestaurantBill.findOne({ _id: new Types.ObjectId(billId), hotelId });
    if (!bill) {
      res.status(404).json({ success: false, errorCode: 'BILL_NOT_FOUND', message: 'Bill not found' });
      return;
    }

    const tenant = await Tenant.findById(hotelId);
    const hotelName = tenant?.name || 'SpiceHub Hospitality';
    const city = tenant?.address?.city || 'India';
    const gstin = tenant?.gstin || '29AAAAA0000A1Z5';
    const fssai = tenant?.fssai || '10019011000123';
    const phone = tenant?.contactPhone || '+91 98765 00000';

    // Populate order items
    const orders = await RestaurantOrder.find({ _id: { $in: bill.orderIds }, hotelId });

    // Build Receipt Text Lines
    const lines: string[] = [];
    const divider = '-'.repeat(lineWidth);
    const doubleDivider = '='.repeat(lineWidth);

    lines.push(centerLine(hotelName.toUpperCase(), lineWidth));
    lines.push(centerLine(city, lineWidth));
    lines.push(centerLine(`Tel: ${phone}`, lineWidth));
    lines.push(centerLine(`GSTIN: ${gstin}`, lineWidth));
    lines.push(centerLine(`FSSAI Lic: ${fssai}`, lineWidth));
    lines.push(doubleDivider);

    lines.push(padLine(`Invoice: ${bill.billNumber}`, `Date: ${new Date().toLocaleDateString('en-IN')}`, lineWidth));
    lines.push(padLine(`Status: ${bill.billStatus}`, `Time: ${new Date().toLocaleTimeString('en-IN')}`, lineWidth));
    lines.push(divider);

    lines.push(padLine('Item', 'Qty x Price   Amt', lineWidth));
    lines.push(divider);

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const itemLine = `${item.name}${item.variantName ? ' (' + item.variantName + ')' : ''}`;
        const priceInfo = `${item.quantity} x ₹${item.unitPrice} = ₹${item.subtotal}`;
        lines.push(itemLine);
        lines.push(padLine('  ', priceInfo, lineWidth));
      });
    });

    lines.push(divider);
    lines.push(padLine('Sub Total:', `₹${bill.subTotal.toFixed(2)}`, lineWidth));

    if (bill.discountAmount > 0) {
      lines.push(padLine('Discount:', `-₹${bill.discountAmount.toFixed(2)}`, lineWidth));
    }

    if (bill.taxBreakup && bill.taxBreakup.length > 0) {
      bill.taxBreakup.forEach((tb) => {
        lines.push(padLine(`${tb.taxName} (${tb.rate}%):`, `₹${tb.amount.toFixed(2)}`, lineWidth));
      });
    } else {
      lines.push(padLine('Tax (GST):', `₹${bill.totalTax.toFixed(2)}`, lineWidth));
    }

    lines.push(doubleDivider);
    lines.push(padLine('GRAND TOTAL:', `₹${bill.grandTotal.toFixed(2)}`, lineWidth));
    lines.push(doubleDivider);

    lines.push(centerLine('Thank you for dining with us!', lineWidth));
    lines.push(centerLine('Have a Wonderful Day! 🌟', lineWidth));
    lines.push(centerLine('Powered by SpiceHub ERP', lineWidth));

    const receiptText = lines.join('\n');

    // Build standard ESC/POS Hex Pulse
    let escposHex = '1b40'; // ESC @ (initialize)
    if (kickDrawer) {
      escposHex += '1b700019fa'; // ESC p 0 25 250 (cash drawer kick)
    }
    if (cutPaper) {
      escposHex += '1d564103'; // GS V 65 3 (full cut with feed)
    }

    res.status(200).json({
      success: true,
      billId: bill._id,
      billNumber: bill.billNumber,
      width,
      receiptText,
      escposHex,
      escposBase64: Buffer.from(receiptText).toString('base64'),
      drawerKicked: Boolean(kickDrawer),
      paperCut: Boolean(cutPaper),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 6. Manual Cash Drawer Kick Pulse Trigger
export const triggerCashDrawerKick = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { terminalId = 'COUNTER_01', reason = 'MANUAL_CASHIER_OPEN' } = req.body;

    const drawerPulseHex = '1b700019fa'; // ESC p 0 25 250

    // Broadcast drawer kick to local print bridge via Socket.IO
    if (hotelId) {
      io.to(`${hotelId.toString()}_cashier`).emit('hardware:drawer_kick', {
        terminalId,
        reason,
        pulseHex: drawerPulseHex,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cash drawer kick pulse emitted to printer bridge',
      terminalId,
      reason,
      commandHex: drawerPulseHex,
      drawerStatus: 'KICKED_OPEN',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Counter Fast Split-Tender Settlement with Shift Float Integration
export const settleFastSplitPayment = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    const { billId, payments, tenderAmount } = req.body;

    if (!billId || !payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PAYMENTS', message: 'Bill ID and payments array required' });
      return;
    }

    // Check bill existence and unpaid status
    const existingBill = await RestaurantBill.findOne({ _id: new Types.ObjectId(billId), hotelId });
    if (!existingBill) {
      res.status(404).json({ success: false, errorCode: 'BILL_NOT_FOUND', message: 'Bill not found' });
      return;
    }

    if (existingBill.billStatus === BillStatus.PAID) {
      res.status(400).json({ success: false, errorCode: 'ALREADY_PAID', message: 'Bill has already been settled' });
      return;
    }

    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    if (totalPaid < existingBill.dueAmount) {
      res.status(400).json({
        success: false,
        errorCode: 'INSUFFICIENT_PAYMENT',
        message: `Total payment (₹${totalPaid}) is less than due amount (₹${existingBill.dueAmount})`,
      });
      return;
    }

    // Atomic compare-and-swap: only 1 concurrent execution can transition from UNPAID to PAID
    const bill = await RestaurantBill.findOneAndUpdate(
      { _id: new Types.ObjectId(billId), hotelId, billStatus: { $ne: BillStatus.PAID } },
      {
        $set: {
          billStatus: BillStatus.PAID,
          paidAmount: existingBill.grandTotal,
          dueAmount: 0,
          settledAt: new Date(),
        },
      },
      { new: true }
    );

    if (!bill) {
      res.status(400).json({ success: false, errorCode: 'ALREADY_PAID', message: 'Bill has already been settled' });
      return;
    }

    let cashPortion = 0;
    let upiPortion = 0;
    let cardPortion = 0;

    for (const p of payments) {
      const mode = p.mode as PaymentMode;
      const amt = Number(p.amount);
      if (mode === PaymentMode.CASH) cashPortion += amt;
      else if (mode === PaymentMode.UPI) upiPortion += amt;
      else if (mode === PaymentMode.CARD) cardPortion += amt;

      await Payment.create({
        hotelId,
        billId: bill._id,
        paymentMode: mode,
        amount: amt,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        transactionRef: p.reference || `REF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        idempotencyKey: `SPLIT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
    }

    // Calculate change if cash tender exceeded
    let changeGiven = 0;
    if (tenderAmount && Number(tenderAmount) > cashPortion) {
      changeGiven = Number(tenderAmount) - cashPortion;
    }

    // Update active CashierShiftFloat
    let updatedFloat = null;
    if (cashPortion > 0 || upiPortion > 0 || cardPortion > 0) {
      updatedFloat = await CashierShiftFloat.findOneAndUpdate(
        { hotelId, status: CashierShiftStatus.OPEN },
        {
          $inc: {
            totalCashCollected: cashPortion,
            totalUpiCollected: upiPortion,
            totalCardCollected: cardPortion,
            totalChangeReturned: changeGiven,
            expectedCashInDrawer: cashPortion,
            settlementCount: 1,
          },
        },
        { new: true }
      );
    }

    const drawerKicked = cashPortion > 0;

    res.status(200).json({
      success: true,
      message: 'Bill settled successfully via fast counter multi-tender',
      bill,
      financials: {
        totalPaid,
        cashPortion,
        upiPortion,
        cardPortion,
        changeGiven,
      },
      drawerKicked,
      drawerKickCommand: drawerKicked ? '1b700019fa' : null,
      updatedShiftFloat: updatedFloat,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

// 7. Petty cash vouchers paid from the cashier drawer.
export const getPettyCashVouchers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [vouchers, openShift] = await Promise.all([
      PettyCashVoucher.find({ hotelId, createdAt: { $gte: startOfToday } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      CashierShiftFloat.findOne({ hotelId, status: CashierShiftStatus.OPEN }).sort({ openedAt: -1 }),
    ]);

    const totalToday = vouchers.reduce((sum, voucher) => sum + Number(voucher.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: vouchers.map((voucher: any) => ({
        id: String(voucher._id),
        category: voucher.category,
        description: voucher.description,
        amount: Number(voucher.amount || 0),
        paidTo: voucher.paidTo,
        time: voucher.createdAt,
      })),
      totalToday,
      count: vouchers.length,
      shiftId: openShift?._id ? String(openShift._id) : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'PETTY_CASH_ERROR', message: error.message });
  }
};

export const createPettyCashVoucher = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { category, description, amount, paidTo } = req.body;
    const numericAmount = Number(amount);
    if (!description || !String(description).trim()) {
      res.status(400).json({ success: false, errorCode: 'DESCRIPTION_REQUIRED', message: 'Expense description is required' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Expense amount must be greater than zero' });
      return;
    }
    if (!paidTo || !String(paidTo).trim()) {
      res.status(400).json({ success: false, errorCode: 'PAID_TO_REQUIRED', message: 'Paid-to vendor or person is required' });
      return;
    }

    const categoryValue = Object.values(PettyCashCategory).includes(category)
      ? category
      : PettyCashCategory.MISCELLANEOUS;

    const openShift = await CashierShiftFloat.findOne({
      hotelId,
      status: CashierShiftStatus.OPEN,
    }).sort({ openedAt: -1 });

    const voucher = await PettyCashVoucher.create({
      hotelId,
      shiftId: openShift?._id,
      cashierId: req.user?.userId && Types.ObjectId.isValid(req.user.userId)
        ? new Types.ObjectId(req.user.userId)
        : undefined,
      category: categoryValue,
      description: String(description).trim(),
      amount: Math.round(numericAmount * 100) / 100,
      paidTo: String(paidTo).trim(),
    });

    if (openShift) {
      openShift.totalPettyCashDisbursed =
        Number(openShift.totalPettyCashDisbursed || 0) + voucher.amount;
      openShift.expectedCashInDrawer = Math.max(
        0,
        Number(openShift.expectedCashInDrawer || 0) - voucher.amount
      );
      await openShift.save();
    }

    res.status(201).json({
      success: true,
      message: `Petty cash voucher of ₹${voucher.amount} recorded`,
      data: {
        id: String(voucher._id),
        category: voucher.category,
        description: voucher.description,
        amount: voucher.amount,
        paidTo: voucher.paidTo,
        time: voucher.createdAt,
      },
      shiftId: openShift?._id ? String(openShift._id) : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'PETTY_CASH_ERROR', message: error.message });
  }
};

// 8. Record a mid-shift safe drop from the cashier drawer.
export const recordCashDrop = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Cash drop amount must be greater than zero' });
      return;
    }

    const shift = await CashierShiftFloat.findOne({
      hotelId,
      status: CashierShiftStatus.OPEN,
    }).sort({ openedAt: -1 });

    if (!shift) {
      res.status(409).json({ success: false, errorCode: 'NO_OPEN_SHIFT', message: 'Open a cashier shift before recording a cash drop' });
      return;
    }

    if (amount > Number(shift.expectedCashInDrawer || 0)) {
      res.status(400).json({
        success: false,
        errorCode: 'DROP_EXCEEDS_DRAWER',
        message: `Cash drop cannot exceed the expected drawer balance of ₹${Number(shift.expectedCashInDrawer || 0).toFixed(2)}`,
      });
      return;
    }

    shift.safeDropAmount = Number(shift.safeDropAmount || 0) + amount;
    shift.expectedCashInDrawer = Math.max(0, Number(shift.expectedCashInDrawer || 0) - amount);
    shift.safeDropReceiptNumber =
      shift.safeDropReceiptNumber || `DROP-${Date.now().toString().slice(-6)}`;
    await shift.save();

    res.status(200).json({
      success: true,
      message: `Cash drop of ₹${amount} recorded`,
      shift: {
        id: String(shift._id),
        safeDropAmount: shift.safeDropAmount,
        safeDropReceiptNumber: shift.safeDropReceiptNumber,
        expectedCashInDrawer: shift.expectedCashInDrawer,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'CASH_DROP_ERROR', message: error.message });
  }
};

// 9. Settled receipt register for the cashier tax-invoice repository.
export const getCashierReceipts = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const bills = await RestaurantBill.find({
      hotelId,
      billStatus: BillStatus.PAID,
    })
      .sort({ settledAt: -1, updatedAt: -1 })
      .limit(60)
      .populate('tableId', 'tableNumber')
      .lean();

    const billIds = bills.map((bill: any) => bill._id);
    const payments = await Payment.find({
      hotelId,
      billId: { $in: billIds },
      status: PaymentStatus.SUCCESS,
    })
      .sort({ createdAt: -1 })
      .lean();

    const paymentByBill = new Map<string, any>();
    for (const payment of payments) {
      const key = String(payment.billId);
      if (!paymentByBill.has(key)) paymentByBill.set(key, payment);
    }

    const receipts = bills.map((bill: any) => {
      const payment = paymentByBill.get(String(bill._id));
      const taxBreakup = Array.isArray(bill.taxBreakup) ? bill.taxBreakup : [];
      const cgst = taxBreakup
        .filter((tax: any) => String(tax.taxName).toUpperCase().includes('CGST'))
        .reduce((sum: number, tax: any) => sum + Number(tax.amount || 0), 0);
      const sgst = taxBreakup
        .filter((tax: any) => String(tax.taxName).toUpperCase().includes('SGST'))
        .reduce((sum: number, tax: any) => sum + Number(tax.amount || 0), 0);

      return {
        id: String(bill._id),
        number: bill.billNumber,
        table: bill.tableId?.tableNumber ? `Table ${bill.tableId.tableNumber}` : 'POS Counter',
        customer: payment?.utrNumber || 'Walk-in Guest',
        subtotal: Number(bill.subTotal || 0),
        cgst,
        sgst,
        total: Number(bill.grandTotal || 0),
        time: bill.settledAt || bill.updatedAt || bill.createdAt,
        mode: String(payment?.paymentMode || 'CASH').replace(/_/g, ' '),
      };
    });

    res.status(200).json({ success: true, data: receipts, count: receipts.length });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'RECEIPTS_ERROR', message: error.message });
  }
};
