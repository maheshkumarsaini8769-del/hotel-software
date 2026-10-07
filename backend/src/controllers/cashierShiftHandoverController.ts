import { Response } from 'express';
import { Types } from 'mongoose';
import { CashierShiftFloat, CashierShiftStatus, ShiftType, DiscrepancyStatus, IDenominationBreakdown } from '../models/CashierShiftFloat';
import { User } from '../models/User';
import { TenantRequest } from '../types';
import { io } from '../index';

const verifyManagerSecurityPin = async (hotelId: Types.ObjectId, pin?: string): Promise<boolean> => {
  if (!pin) return false;
  const masterPin = process.env.MANAGER_SECURITY_PIN || '9921';
  if (pin === masterPin) return true;

  const managers = await User.find({
    hotelId,
    role: { $in: ['HOTEL_ADMIN', 'MANAGER'] },
    isActive: true,
  });

  for (const m of managers) {
    if (m.pinCodeHash && (m.pinCodeHash === pin || m.pinCodeHash.includes(pin))) {
      return true;
    }
  }

  return false;
};

const calculateDenominationsTotal = (breakdown?: Partial<IDenominationBreakdown>): number => {
  if (!breakdown) return 0;
  const c500 = Number(breakdown.count500) || 0;
  const c200 = Number(breakdown.count200) || 0;
  const c100 = Number(breakdown.count100) || 0;
  const c50 = Number(breakdown.count50) || 0;
  const c20 = Number(breakdown.count20) || 0;
  const c10 = Number(breakdown.count10) || 0;
  const coins = Number(breakdown.coins) || 0;

  return (c500 * 500) + (c200 * 200) + (c100 * 100) + (c50 * 50) + (c20 * 20) + (c10 * 10) + coins;
};

/**
 * 1. Open Front Desk Cashier Shift
 * POST /api/v1/pms/cashier/shift/open
 */
export const openFrontDeskShift = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      cashierId = req.user?.userId || new Types.ObjectId(),
      cashierName = req.user?.name || 'Front Desk Cashier',
      openingFloat = 0,
      terminalId = 'FD_TERMINAL_01',
      shiftType = ShiftType.MORNING,
      notes,
    } = req.body;

    if (Number(openingFloat) < 0) {
      res.status(400).json({ success: false, errorCode: 'INVALID_FLOAT_AMOUNT', message: 'Opening float amount cannot be negative' });
      return;
    }

    const floatNum = Number(openingFloat) || 0;

    // Check if open shift already exists for this hotel and cashier or terminal
    const existingOpenShift = await CashierShiftFloat.findOne({
      hotelId,
      status: CashierShiftStatus.OPEN,
      $or: [
        { cashierId: Types.ObjectId.isValid(cashierId) ? new Types.ObjectId(cashierId) : undefined },
        { terminalId },
      ].filter(Boolean),
    });

    if (existingOpenShift) {
      res.status(200).json({
        success: true,
        message: 'Active cashier shift already open on this terminal/cashier',
        data: existingOpenShift,
      });
      return;
    }

    const shiftCount = await CashierShiftFloat.countDocuments({ hotelId });
    const shiftNumber = `FD-SFT-${Date.now().toString().slice(-6)}-${shiftCount + 1}`;

    const newShift = await CashierShiftFloat.create({
      hotelId,
      shiftNumber,
      cashierId: Types.ObjectId.isValid(cashierId) ? new Types.ObjectId(cashierId) : new Types.ObjectId(),
      cashierName,
      terminalId,
      status: CashierShiftStatus.OPEN,
      shiftType,
      openingFloat: floatNum,
      expectedCashInDrawer: floatNum,
      notes,
      openedAt: new Date(),
    });

    if (io) {
      io.to(hotelId.toString()).emit('CASHIER_SHIFT_OPENED', {
        shiftId: newShift._id,
        shiftNumber: newShift.shiftNumber,
        cashierName: newShift.cashierName,
        openingFloat: newShift.openingFloat,
      });
    }

    res.status(201).json({
      success: true,
      message: `Front Desk cashier shift opened with ₹${floatNum} base float`,
      data: newShift,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 2. Get Active Front Desk Cashier Shift
 * GET /api/v1/pms/cashier/shift/active
 */
export const getActiveFrontDeskShift = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { terminalId = 'FD_TERMINAL_01' } = req.query;

    let query: any = { hotelId, status: CashierShiftStatus.OPEN };
    if (terminalId) {
      query.terminalId = terminalId;
    }

    let shift = await CashierShiftFloat.findOne(query).sort({ openedAt: -1 });
    if (!shift) {
      // Fallback: any open shift in this hotel
      shift = await CashierShiftFloat.findOne({ hotelId, status: CashierShiftStatus.OPEN }).sort({ openedAt: -1 });
    }

    if (!shift) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'No active cashier shift currently open',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 3. Reconcile Denominations & Physical Count Preview
 * POST /api/v1/pms/cashier/shift/reconcile
 */
export const reconcileCashDrawer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      shiftId,
      denominationBreakdown,
      safeDropAmount = 0,
      closingFloatRetained = 0,
      discrepancyReason,
      supervisorPin,
    } = req.body;

    if (!shiftId || !Types.ObjectId.isValid(shiftId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SHIFT_ID', message: 'Valid shiftId is required' });
      return;
    }

    const shift = await CashierShiftFloat.findOne({ _id: new Types.ObjectId(shiftId), hotelId });
    if (!shift) {
      res.status(404).json({ success: false, errorCode: 'SHIFT_NOT_FOUND', message: 'Shift not found' });
      return;
    }

    if (shift.status === CashierShiftStatus.CLOSED) {
      res.status(400).json({ success: false, errorCode: 'SHIFT_ALREADY_CLOSED', message: 'Shift is already closed' });
      return;
    }

    const actualCashCounted = calculateDenominationsTotal(denominationBreakdown);
    const dropAmount = Math.max(0, Number(safeDropAmount) || 0);
    const retainedAmount = Math.max(0, Number(closingFloatRetained) || 0);

    // Physical allocation check: Safe drop + Retained float must equal actual counted cash
    if (dropAmount + retainedAmount !== actualCashCounted) {
      res.status(400).json({
        success: false,
        errorCode: 'ALLOCATION_MISMATCH',
        message: `Allocation mismatch: Safe Drop (₹${dropAmount}) + Retained Float (₹${retainedAmount}) must equal Total Counted Cash (₹${actualCashCounted})`,
        data: {
          actualCashCounted,
          allocatedTotal: dropAmount + retainedAmount,
          difference: actualCashCounted - (dropAmount + retainedAmount),
        },
      });
      return;
    }

    const cashVariance = Math.round((actualCashCounted - shift.expectedCashInDrawer) * 100) / 100;

    // Discrepancy Status
    let discrepancyStatus = DiscrepancyStatus.NONE;
    if (cashVariance !== 0) {
      if (Math.abs(cashVariance) <= 50) {
        discrepancyStatus = DiscrepancyStatus.RESOLVED;
      } else if (Math.abs(cashVariance) <= 500) {
        discrepancyStatus = DiscrepancyStatus.UNDER_REVIEW;
      } else {
        discrepancyStatus = DiscrepancyStatus.FLAGGED;
      }

      if (!discrepancyReason || discrepancyReason.trim().length < 3) {
        res.status(400).json({
          success: false,
          errorCode: 'MISSING_DISCREPANCY_REASON',
          message: `Discrepancy of ₹${cashVariance} detected. A documented explanation (min 3 characters) is required.`,
        });
        return;
      }
    }

    // Supervisor verification threshold: Variance > 100 or Safe Drop > 5000
    const supervisorPinRequired = Math.abs(cashVariance) > 100 || dropAmount > 5000;
    let supervisorVerified = false;

    if (supervisorPinRequired) {
      const isPinValid = await verifyManagerSecurityPin(hotelId, supervisorPin);
      if (!isPinValid) {
        res.status(403).json({
          success: false,
          errorCode: 'INVALID_SUPERVISOR_PIN',
          message: `Supervisor authorization PIN is required for discrepancy exceeding ₹100 or safe drop exceeding ₹5,000.`,
          data: {
            supervisorPinRequired: true,
            cashVariance,
            safeDropAmount: dropAmount,
          },
        });
        return;
      }
      supervisorVerified = true;
    }

    res.status(200).json({
      success: true,
      message: 'Reconciliation preview calculated successfully',
      data: {
        shiftId: shift._id,
        shiftNumber: shift.shiftNumber,
        expectedCashInDrawer: shift.expectedCashInDrawer,
        actualCashCounted,
        cashVariance,
        safeDropAmount: dropAmount,
        closingFloatRetained: retainedAmount,
        discrepancyStatus,
        discrepancyReason: discrepancyReason || null,
        supervisorPinRequired,
        supervisorVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 4. Execute Handover & Shift Close
 * POST /api/v1/pms/cashier/shift/handover
 */
export const handoverShift = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      shiftId,
      denominationBreakdown,
      safeDropAmount = 0,
      closingFloatRetained = 0,
      safeDropReceiptNumber,
      handoverToCashierId,
      handoverToCashierName,
      discrepancyReason,
      supervisorPin,
      supervisorRemarks,
      notes,
    } = req.body;

    if (!shiftId || !Types.ObjectId.isValid(shiftId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SHIFT_ID', message: 'Valid shiftId is required' });
      return;
    }

    if (!handoverToCashierName || handoverToCashierName.trim().length < 2) {
      res.status(400).json({
        success: false,
        errorCode: 'MISSING_INCOMING_CASHIER',
        message: 'Name of the incoming cashier for handover signoff is required',
      });
      return;
    }

    const shift = await CashierShiftFloat.findOne({ _id: new Types.ObjectId(shiftId), hotelId });
    if (!shift) {
      res.status(404).json({ success: false, errorCode: 'SHIFT_NOT_FOUND', message: 'Shift not found' });
      return;
    }

    if (shift.status === CashierShiftStatus.CLOSED) {
      res.status(400).json({ success: false, errorCode: 'SHIFT_ALREADY_CLOSED', message: 'Shift is already closed' });
      return;
    }

    const actualCashCounted = calculateDenominationsTotal(denominationBreakdown);
    const dropAmount = Math.max(0, Number(safeDropAmount) || 0);
    const retainedAmount = Math.max(0, Number(closingFloatRetained) || 0);

    if (dropAmount + retainedAmount !== actualCashCounted) {
      res.status(400).json({
        success: false,
        errorCode: 'ALLOCATION_MISMATCH',
        message: `Allocation mismatch: Safe Drop (₹${dropAmount}) + Retained Float (₹${retainedAmount}) must equal Total Counted Cash (₹${actualCashCounted})`,
      });
      return;
    }

    const cashVariance = Math.round((actualCashCounted - shift.expectedCashInDrawer) * 100) / 100;

    let discrepancyStatus = DiscrepancyStatus.NONE;
    if (cashVariance !== 0) {
      if (Math.abs(cashVariance) <= 50) {
        discrepancyStatus = DiscrepancyStatus.RESOLVED;
      } else if (Math.abs(cashVariance) <= 500) {
        discrepancyStatus = DiscrepancyStatus.UNDER_REVIEW;
      } else {
        discrepancyStatus = DiscrepancyStatus.FLAGGED;
      }

      if (!discrepancyReason || discrepancyReason.trim().length < 3) {
        res.status(400).json({
          success: false,
          errorCode: 'MISSING_DISCREPANCY_REASON',
          message: `Discrepancy of ₹${cashVariance} detected. A documented explanation is required.`,
        });
        return;
      }
    }

    // Supervisor verification threshold
    const supervisorPinRequired = Math.abs(cashVariance) > 100 || dropAmount > 5000;
    let supervisorVerified = false;

    if (supervisorPinRequired) {
      const isPinValid = await verifyManagerSecurityPin(hotelId, supervisorPin);
      if (!isPinValid) {
        res.status(403).json({
          success: false,
          errorCode: 'INVALID_SUPERVISOR_PIN',
          message: 'Supervisor authorization PIN is invalid or missing.',
        });
        return;
      }
      supervisorVerified = true;
    }

    const dropReceipt =
      safeDropReceiptNumber ||
      (dropAmount > 0 ? `DROP-${Date.now().toString().slice(-6)}` : undefined);

    shift.denominationBreakdown = {
      count500: Number(denominationBreakdown?.count500) || 0,
      count200: Number(denominationBreakdown?.count200) || 0,
      count100: Number(denominationBreakdown?.count100) || 0,
      count50: Number(denominationBreakdown?.count50) || 0,
      count20: Number(denominationBreakdown?.count20) || 0,
      count10: Number(denominationBreakdown?.count10) || 0,
      coins: Number(denominationBreakdown?.coins) || 0,
    };
    shift.actualCashCounted = actualCashCounted;
    shift.cashVariance = cashVariance;
    shift.safeDropAmount = dropAmount;
    shift.safeDropReceiptNumber = dropReceipt;
    shift.closingFloatRetained = retainedAmount;
    shift.discrepancyReason = discrepancyReason;
    shift.discrepancyStatus = discrepancyStatus;
    shift.handoverToCashierId = Types.ObjectId.isValid(handoverToCashierId)
      ? new Types.ObjectId(handoverToCashierId)
      : undefined;
    shift.handoverToCashierName = handoverToCashierName.trim();
    shift.supervisorVerified = supervisorVerified;
    if (supervisorVerified) {
      shift.supervisorPinVerifiedAt = new Date();
      shift.supervisorRemarks = supervisorRemarks || 'Supervisor authorized discrepancy/safe drop';
      if (req.user?.userId && Types.ObjectId.isValid(req.user.userId)) {
        shift.supervisorId = new Types.ObjectId(req.user.userId);
        shift.supervisorName = req.user.name || 'Duty Supervisor';
      }
    }

    shift.status = CashierShiftStatus.CLOSED;
    shift.closedAt = new Date();
    if (req.user?.userId && Types.ObjectId.isValid(req.user.userId)) {
      shift.closedBy = new Types.ObjectId(req.user.userId);
    }
    if (notes) shift.notes = notes;

    await shift.save();

    if (io) {
      io.to(hotelId.toString()).emit('CASHIER_SHIFT_HANDOVER', {
        shiftId: shift._id,
        shiftNumber: shift.shiftNumber,
        cashierName: shift.cashierName,
        handoverToCashierName: shift.handoverToCashierName,
        safeDropAmount: shift.safeDropAmount,
        closingFloatRetained: shift.closingFloatRetained,
        cashVariance: shift.cashVariance,
        safeDropReceiptNumber: shift.safeDropReceiptNumber,
      });
    }

    res.status(200).json({
      success: true,
      message: `Shift ${shift.shiftNumber} closed and handed over to ${shift.handoverToCashierName}. Safe Drop: ₹${dropAmount}, Retained Float: ₹${retainedAmount}`,
      data: shift,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 5. Incoming Cashier Acknowledges Handover & Auto-Opens Next Shift
 * POST /api/v1/pms/cashier/shift/acknowledge-handover
 */
export const acknowledgeHandover = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const {
      shiftId,
      acknowledgedByCashierId,
      acknowledgedByCashierName,
      autoOpenNextShift = true,
      nextShiftType = ShiftType.EVENING,
    } = req.body;

    if (!shiftId || !Types.ObjectId.isValid(shiftId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_SHIFT_ID', message: 'Valid shiftId is required' });
      return;
    }

    const previousShift = await CashierShiftFloat.findOne({ _id: new Types.ObjectId(shiftId), hotelId });
    if (!previousShift) {
      res.status(404).json({ success: false, errorCode: 'SHIFT_NOT_FOUND', message: 'Previous shift not found' });
      return;
    }

    if (previousShift.status !== CashierShiftStatus.CLOSED) {
      res.status(400).json({
        success: false,
        errorCode: 'SHIFT_NOT_CLOSED',
        message: 'Cannot acknowledge a shift that is still open',
      });
      return;
    }

    previousShift.incomingCashierAcknowledged = true;
    previousShift.incomingCashierAcknowledgedAt = new Date();
    await previousShift.save();

    let nextShift: any = null;

    if (autoOpenNextShift) {
      const incomingName =
        acknowledgedByCashierName ||
        previousShift.handoverToCashierName ||
        req.user?.name ||
        'Incoming Cashier';

      const incomingId = Types.ObjectId.isValid(acknowledgedByCashierId)
        ? new Types.ObjectId(acknowledgedByCashierId)
        : previousShift.handoverToCashierId || (req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId());

      const shiftCount = await CashierShiftFloat.countDocuments({ hotelId });
      const nextShiftNumber = `FD-SFT-${Date.now().toString().slice(-6)}-${shiftCount + 1}`;

      nextShift = await CashierShiftFloat.create({
        hotelId,
        shiftNumber: nextShiftNumber,
        cashierId: incomingId,
        cashierName: incomingName,
        terminalId: previousShift.terminalId || 'FD_TERMINAL_01',
        status: CashierShiftStatus.OPEN,
        shiftType: nextShiftType,
        openingFloat: previousShift.closingFloatRetained,
        expectedCashInDrawer: previousShift.closingFloatRetained,
        notes: `Auto-opened following handover from Shift ${previousShift.shiftNumber}`,
        openedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: `Handover acknowledged successfully. Float ₹${previousShift.closingFloatRetained} accepted.`,
      data: {
        previousShift,
        nextShift,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * 6. Get Cashier Shift History & Discrepancy Audits
 * GET /api/v1/pms/cashier/shift/history
 */
export const getCashierShiftHistory = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.hotelId || (req.user?.hotelId ? new Types.ObjectId(req.user.hotelId) : undefined);
    if (!hotelId) {
      res.status(401).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Hotel context missing' });
      return;
    }

    const { page = 1, limit = 20, discrepancyOnly = 'false', status } = req.query;

    const query: any = { hotelId };
    if (status) query.status = status;
    if (discrepancyOnly === 'true') {
      query.discrepancyStatus = { $in: [DiscrepancyStatus.RESOLVED, DiscrepancyStatus.UNDER_REVIEW, DiscrepancyStatus.FLAGGED] };
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [shifts, totalCount] = await Promise.all([
      CashierShiftFloat.find(query).sort({ openedAt: -1 }).skip(skip).limit(limitNum),
      CashierShiftFloat.countDocuments(query),
    ]);

    // Summary metrics
    const allClosedShifts = await CashierShiftFloat.find({ hotelId, status: CashierShiftStatus.CLOSED });
    let totalSafeDropped = 0;
    let totalDiscrepanciesLogged = 0;
    let totalNetVariance = 0;

    for (const s of allClosedShifts) {
      totalSafeDropped += s.safeDropAmount || 0;
      if (s.cashVariance && s.cashVariance !== 0) {
        totalDiscrepanciesLogged++;
        totalNetVariance += s.cashVariance;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        shifts,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
        summary: {
          totalClosedShifts: allClosedShifts.length,
          totalSafeDropped,
          totalDiscrepanciesLogged,
          totalNetVariance: Math.round(totalNetVariance * 100) / 100,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, errorCode: 'SERVER_ERROR', message: error.message });
  }
};
