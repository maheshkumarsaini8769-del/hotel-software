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
import { TenantRequest } from '../types';
import { io } from '../index';
import { escapeRegex } from '../utils/security';

// Helper: Formats receipt line with fixed column width
function padLine(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
}

function centerLine(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

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

    // Determine sequential Token Number for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrdersCount = await RestaurantOrder.countDocuments({
      hotelId,
      orderType: OrderType.TAKEAWAY,
      placedAt: { $gte: startOfDay },
    });

    const tokenNumber = todayOrdersCount + 1;
    const orderNumber = `TKW-${Date.now().toString().slice(-5)}`;

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

    // Create Takeaway Order
    const order = new RestaurantOrder({
      hotelId,
      orderNumber,
      orderType: OrderType.TAKEAWAY,
      tokenNumber,
      customerName: customerName || `Customer #${tokenNumber}`,
      customerPhone: customerPhone || '',
      items: resolvedItems,
      cookingInstructions,
      orderStatus: OverallOrderStatus.PLACED,
      idempotencyKey,
      placedAt: new Date(),
    });
    await order.save();

    // Create Instant Bill
    const billNumber = `BL-TKW-${tokenNumber}-${Date.now().toString().slice(-4)}`;
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
