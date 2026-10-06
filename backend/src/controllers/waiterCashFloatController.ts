import { Response } from 'express';
import { Types } from 'mongoose';
import { WaiterCashFloat, WaiterFloatStatus } from '../models/WaiterCashFloat';
import { CashierShiftFloat, CashierShiftStatus } from '../models/CashierShiftFloat';
import { TenantRequest, UserRole } from '../types';

const safeObjectId = (id?: any): Types.ObjectId | undefined => {
  if (id && Types.ObjectId.isValid(String(id))) {
    return new Types.ObjectId(String(id));
  }
  return undefined;
};

/**
 * 1. Open Waiter Daily Cash Float
 * POST /api/v1/waiter-cash-float/open
 */
export const openWaiterFloat = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || safeObjectId(req.user?.hotelId);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const waiterUserId = safeObjectId(req.body.waiterUserId) || safeObjectId(req.user?.userId) || new Types.ObjectId();

    const waiterName = req.body.waiterName || (req.user as any)?.name || 'Floor Waiter';
    const openingFloat = Number(req.body.openingFloat) || 0;

    if (openingFloat < 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_AMOUNT', message: 'Opening float cannot be negative' });
      return;
    }

    // Check if an active open float already exists
    const existingOpen = await WaiterCashFloat.findOne({
      hotelId,
      waiterUserId,
      status: WaiterFloatStatus.OPEN,
    });

    if (existingOpen) {
      res.status(200).json({
        success: true,
        message: 'Active waiter cash float already open',
        float: existingOpen,
        alreadyOpen: true,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newFloat = await WaiterCashFloat.create({
      hotelId,
      waiterUserId,
      waiterName,
      shiftDate: today,
      status: WaiterFloatStatus.OPEN,
      openingFloat,
      totalCashCollected: 0,
      totalChangeGiven: 0,
      expectedCashInHand: openingFloat,
      transactions: [],
    });

    res.status(201).json({
      success: true,
      message: `Waiter cash float opened with ₹${openingFloat}`,
      float: newFloat,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 2. Record Table Cash Collection
 * POST /api/v1/waiter-cash-float/record-cash
 */
export const recordCashCollection = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || safeObjectId(req.user?.hotelId);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const waiterUserId = safeObjectId(req.user?.userId);
    const { billId, tableNumber, billAmount, amountTendered, changeGiven = 0 } = req.body;

    if (!billId || !tableNumber || billAmount === undefined || amountTendered === undefined) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYLOAD',
        message: 'billId, tableNumber, billAmount, and amountTendered are required',
      });
      return;
    }

    const parsedBill = Number(billAmount);
    const parsedTendered = Number(amountTendered);
    const parsedChange = Number(changeGiven);

    if (parsedTendered < parsedBill) {
      res.status(400).json({
        success: false,
        errorCode: 'INSUFFICIENT_TENDER',
        message: `Amount tendered (₹${parsedTendered}) cannot be less than bill amount (₹${parsedBill})`,
      });
      return;
    }

    const netReceived = parsedTendered - parsedChange;

    const transactionItem = {
      billId,
      tableNumber,
      billAmount: parsedBill,
      amountTendered: parsedTendered,
      changeGiven: parsedChange,
      netCashReceived: netReceived,
      recordedAt: new Date(),
    };

    // Atomic update to avoid concurrency loss
    const updatedFloat = await WaiterCashFloat.findOneAndUpdate(
      {
        hotelId,
        waiterUserId,
        status: WaiterFloatStatus.OPEN,
      },
      {
        $inc: {
          totalCashCollected: parsedTendered,
          totalChangeGiven: parsedChange,
          expectedCashInHand: netReceived,
        },
        $push: {
          transactions: transactionItem,
        },
      },
      { new: true }
    );

    if (!updatedFloat) {
      res.status(404).json({
        success: false,
        errorCode: 'NO_OPEN_FLOAT',
        message: 'No active open cash float found for this waiter. Please open shift float first.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Recorded ₹${netReceived} cash collection for Table ${tableNumber}`,
      float: updatedFloat,
      currentCashInHand: updatedFloat.expectedCashInHand,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 3. Get Active Waiter Cash Float
 * GET /api/v1/waiter-cash-float/active
 */
export const getActiveFloat = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || safeObjectId(req.user?.hotelId);
    const waiterUserId = safeObjectId(req.user?.userId);

    const query: any = {
      status: { $in: [WaiterFloatStatus.OPEN, WaiterFloatStatus.DROPPED_PENDING_APPROVAL] },
    };
    if (hotelId) query.hotelId = hotelId;
    if (waiterUserId) query.waiterUserId = waiterUserId;

    const activeFloat = await WaiterCashFloat.findOne(query);

    res.status(200).json({
      success: true,
      activeFloat: activeFloat || null,
      hasActiveFloat: Boolean(activeFloat),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 4. Waiter Requests Shift-End Cash Drop
 * POST /api/v1/waiter-cash-float/request-drop
 */
export const requestCashDrop = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || safeObjectId(req.user?.hotelId);
    const waiterUserId = safeObjectId(req.user?.userId);

    const { actualCashHandedOver, varianceReason } = req.body;

    if (actualCashHandedOver === undefined || actualCashHandedOver === null) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYLOAD',
        message: 'actualCashHandedOver amount is required',
      });
      return;
    }

    const parsedActual = Number(actualCashHandedOver);
    if (parsedActual < 0) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_AMOUNT',
        message: 'Handed over cash cannot be negative',
      });
      return;
    }

    const openFloat = await WaiterCashFloat.findOne({
      hotelId,
      waiterUserId,
      status: WaiterFloatStatus.OPEN,
    });

    if (!openFloat) {
      res.status(404).json({
        success: false,
        errorCode: 'NO_OPEN_FLOAT',
        message: 'No open float available to drop',
      });
      return;
    }

    const variance = parsedActual - openFloat.expectedCashInHand;

    openFloat.actualCashHandedOver = parsedActual;
    openFloat.variance = variance;
    openFloat.varianceReason = varianceReason || (variance === 0 ? 'Exact match' : variance < 0 ? 'Cash shortage' : 'Cash surplus');
    openFloat.status = WaiterFloatStatus.DROPPED_PENDING_APPROVAL;
    openFloat.dropRequestedAt = new Date();

    await openFloat.save();

    res.status(200).json({
      success: true,
      message: `Cash drop requested: ₹${parsedActual} handed over (Variance: ₹${variance})`,
      float: openFloat,
      expected: openFloat.expectedCashInHand,
      actual: parsedActual,
      variance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 5. Cashier / Manager Approves Cash Drop & Credits Main Drawer
 * POST /api/v1/waiter-cash-float/approve-drop/:floatId
 */
export const approveCashDrop = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const floatId = Array.isArray(req.params.floatId) ? req.params.floatId[0] : req.params.floatId;
    if (!floatId || !Types.ObjectId.isValid(floatId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid float ID format' });
      return;
    }

    const cashierUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();
    const cashierName = (req.user as any)?.name || 'Central Cashier';

    const { confirmedCashReceived, notes } = req.body;

    const existingFloat = await WaiterCashFloat.findOne({
      _id: new Types.ObjectId(floatId),
      hotelId,
    });

    if (!existingFloat) {
      res.status(404).json({ success: false, errorCode: 'FLOAT_NOT_FOUND', message: 'Waiter float record not found' });
      return;
    }

    if (existingFloat.status === WaiterFloatStatus.SETTLED) {
      res.status(400).json({
        success: false,
        errorCode: 'ALREADY_SETTLED',
        message: 'This waiter cash float has already been settled and approved',
      });
      return;
    }

    const actualCash = confirmedCashReceived !== undefined ? Number(confirmedCashReceived) : existingFloat.actualCashHandedOver ?? existingFloat.expectedCashInHand;
    const variance = actualCash - existingFloat.expectedCashInHand;
    const receiptNumber = `DROP_REC_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Atomic compare-and-swap update on status
    const updatedFloat = await WaiterCashFloat.findOneAndUpdate(
      {
        _id: new Types.ObjectId(floatId),
        hotelId,
        status: { $in: [WaiterFloatStatus.OPEN, WaiterFloatStatus.DROPPED_PENDING_APPROVAL] },
      },
      {
        $set: {
          status: WaiterFloatStatus.SETTLED,
          actualCashHandedOver: actualCash,
          variance,
          varianceReason: notes || existingFloat.varianceReason || undefined,
          cashierUserId,
          cashierName,
          settledAt: new Date(),
          receiptNumber,
        },
      },
      { new: true }
    );

    if (!updatedFloat) {
      res.status(400).json({
        success: false,
        errorCode: 'ALREADY_SETTLED',
        message: 'This waiter cash float has already been settled and approved',
      });
      return;
    }

    // Cross-module Integration: Automatically credit Cashier Main Shift Float (Shift 41)
    await CashierShiftFloat.updateOne(
      {
        hotelId,
        status: CashierShiftStatus.OPEN,
      },
      {
        $inc: {
          totalCashCollected: actualCash,
          expectedCashInDrawer: actualCash,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `Waiter cash drop approved and reconciled by ${cashierName}`,
      receiptNumber,
      float: updatedFloat,
      handoverReceipt: {
        receiptNumber,
        waiterName: updatedFloat.waiterName,
        cashierName,
        openingFloat: updatedFloat.openingFloat,
        totalCollected: updatedFloat.totalCashCollected,
        totalChangeGiven: updatedFloat.totalChangeGiven,
        expectedBalance: updatedFloat.expectedCashInHand,
        actualCashReceived: actualCash,
        variance,
        timestamp: updatedFloat.settledAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};

/**
 * 6. Get Waiter Float History & Summary
 * GET /api/v1/waiter-cash-float/history
 */
export const getFloatHistory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { waiterUserId, status } = req.query;
    const filter: any = { hotelId };

    if (waiterUserId && typeof waiterUserId === 'string' && Types.ObjectId.isValid(waiterUserId)) {
      filter.waiterUserId = new Types.ObjectId(waiterUserId);
    }
    if (status) {
      filter.status = status;
    }

    const floats = await WaiterCashFloat.find(filter).sort({ createdAt: -1 }).limit(50);

    const totalCashSettled = floats
      .filter((f) => f.status === WaiterFloatStatus.SETTLED)
      .reduce((sum, f) => sum + (f.actualCashHandedOver || 0), 0);

    const totalVariance = floats
      .filter((f) => f.status === WaiterFloatStatus.SETTLED)
      .reduce((sum, f) => sum + (f.variance || 0), 0);

    res.status(200).json({
      success: true,
      floats,
      summary: {
        totalRecords: floats.length,
        totalCashSettled,
        totalVariance,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'INTERNAL_ERROR', message: error.message });
  }
};
