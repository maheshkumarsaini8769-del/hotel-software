import { Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { SalaryTransaction, SalaryTransactionType } from '../models/SalaryTransaction';
import { StaffAttendanceLog, AttendanceStatus, ClockMethod } from '../models/StaffAttendanceLog';
import { UserRole, TenantRequest, ShiftStatus } from '../types';
import {
  dateKeyToUtcMidnight,
  evaluateAutoAbsentForDate,
  getDepartmentForRole,
  getIstDateKey,
  getRolePortalKey,
  normalizePayrollPolicy,
  PortalRuleKey,
  resolveStaffDeductionPolicy,
  syncAttendanceDeductionForDate,
} from '../utils/attendanceAutomation';

/**
 * Mapping of Staff Roles to required tenant portals.
 * If a portal is disabled on the hotel, staff with that role are excluded from operational lists.
 */
const ROLE_REQUIRED_PORTAL: Partial<Record<UserRole, string>> = {
  [UserRole.CHEF]: 'kds',
  [UserRole.CASHIER]: 'cashier',
  [UserRole.WAITER]: 'waiter',
  [UserRole.RECEPTIONIST]: 'reception',
  [UserRole.HOUSEKEEPING]: 'reception',
  [UserRole.MAINTENANCE]: 'reception',
  [UserRole.HOTEL_ADMIN]: 'admin',
  [UserRole.MANAGER]: 'admin',
};

const PRESENT_STATUSES = new Set<string>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.ON_TIME,
  AttendanceStatus.LATE,
  AttendanceStatus.EARLY_EXIT,
  AttendanceStatus.OVERTIME,
]);

function resolveHotelId(req: TenantRequest): Types.ObjectId | null {
  const raw =
    (req.query.hotelId as string) ||
    (req.headers['x-hotel-id'] as string) ||
    (req.body && req.body.hotelId) ||
    req.hotelId ||
    req.user?.hotelId;

  if (!raw) return null;
  const str = String(raw).trim();
  if (!Types.ObjectId.isValid(str)) return null;
  return new Types.ObjectId(str);
}

function getLogDateKey(log: any): string {
  if (log.dateKey) return String(log.dateKey);
  return getIstDateKey(log.attendanceDate || log.clockInTime || log.createdAt);
}

function normalizeUiAttendanceStatus(status?: string): 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PAID_LEAVE' | 'UNMARKED' {
  if (!status) return 'UNMARKED';
  if (PRESENT_STATUSES.has(status)) return 'PRESENT';
  if (status === AttendanceStatus.ABSENT) return 'ABSENT';
  if (status === AttendanceStatus.HALF_DAY) return 'HALF_DAY';
  if (status === AttendanceStatus.PAID_LEAVE) return 'PAID_LEAVE';
  return 'UNMARKED';
}

/**
 * 1. GET /api/v1/payroll/staff-list?hotelId=X
 * Returns staff with salary profiles, attendance status, deduction rules, total paid, advances, deductions, and pending balance.
 * Filters out staff whose required portal is disabled on the hotel.
 */
export const getPayrollStaffList = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({
        success: false,
        errorCode: 'HOTEL_ID_REQUIRED',
        message: 'A valid hotelId parameter or header is required for payroll directory.',
      });
      return;
    }

    const tenant = await Tenant.findById(hotelId).lean();
    if (!tenant) {
      res.status(404).json({
        success: false,
        errorCode: 'HOTEL_NOT_FOUND',
        message: 'Hotel property tenant was not found.',
      });
      return;
    }

    const enabledPortals =
      Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
        ? tenant.enabledPortals
        : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];

    const payrollPolicy = normalizePayrollPolicy(tenant.payrollPolicy);

    // Fetch all active non-guest/non-superadmin staff for this hotel
    const allStaff = await User.find({
      hotelId,
      role: { $nin: [UserRole.SUPERADMIN, UserRole.GUEST] },
      isActive: true,
    })
      .select('name email phone role shift shiftStatus avatar baseSalary salaryCycle payrollDeductionOverride createdAt')
      .sort({ name: 1 })
      .lean();

    // Portal Filter: Only include staff whose required portal is enabled on this hotel
    const eligibleStaff = allStaff.filter((staff) => {
      const requiredPortal = ROLE_REQUIRED_PORTAL[staff.role as UserRole];
      if (!requiredPortal) return true;
      return enabledPortals.includes(requiredPortal);
    });

    const todayKey = getIstDateKey();

    // Run automatic attendance evaluation for today (if past cutoff and autoMarkAbsentAfterCutoff is enabled)
    await evaluateAutoAbsentForDate({
      hotelId,
      tenant,
      eligibleStaff,
      dateKey: todayKey,
      recordedBy: req.user?.userId,
    });

    const staffIds = eligibleStaff.map((s) => s._id);

    // Calculate current calendar month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthPrefix = todayKey.slice(0, 7); // 'YYYY-MM'

    const [transactions, monthLogs] = await Promise.all([
      SalaryTransaction.find({
        hotelId,
        staffId: { $in: staffIds },
      })
        .sort({ date: -1 })
        .lean(),
      StaffAttendanceLog.find({
        hotelId,
        userId: { $in: staffIds },
        $or: [
          { dateKey: { $regex: `^${monthPrefix}` } },
          { attendanceDate: { $gte: startOfMonth, $lte: endOfMonth } },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    let totalMonthlyPayroll = 0;
    let paidThisMonth = 0;
    let totalPendingAmount = 0;
    let totalMonthDeductions = 0;
    let presentTodayCount = 0;
    let absentTodayCount = 0;

    const staffSummaryList = eligibleStaff.map((staff) => {
      const baseSalary = Number(staff.baseSalary || 0);
      const salaryCycle = staff.salaryCycle || 'MONTHLY';
      totalMonthlyPayroll += baseSalary;

      const resolvedDeduction = resolveStaffDeductionPolicy(staff, payrollPolicy);
      const staffTxns = transactions.filter((t) => String(t.staffId) === String(staff._id));

      let totalSalaryPaid = 0;
      let advancesTaken = 0;
      let totalBonus = 0;
      let totalDeductions = 0;
      let autoAbsenceDeductions = 0;
      let currentMonthPaid = 0;
      let lastPaymentDate: string | null = null;

      for (const t of staffTxns) {
        if (t.status === 'PAID') {
          const amt = Number(t.amount || 0);
          const tDate = new Date(t.date || t.createdAt);

          if (!lastPaymentDate) {
            lastPaymentDate = tDate.toISOString();
          }

          if (t.type === 'SALARY') {
            totalSalaryPaid += amt;
            if (tDate >= startOfMonth && tDate <= endOfMonth) {
              currentMonthPaid += amt;
            }
          } else if (t.type === 'ADVANCE') {
            advancesTaken += amt;
            if (tDate >= startOfMonth && tDate <= endOfMonth) {
              currentMonthPaid += amt;
            }
          } else if (t.type === 'BONUS') {
            totalBonus += amt;
          } else if (t.type === 'DEDUCTION') {
            totalDeductions += amt;
            if (t.source === 'AUTO_ATTENDANCE') {
              autoAbsenceDeductions += amt;
            }
          }
        }
      }

      // Attendance summarization by unique dateKey in month
      const staffLogs = monthLogs.filter((l) => String(l.userId) === String(staff._id));
      const logsByDate = new Map<string, any>();
      for (const l of staffLogs) {
        const dk = getLogDateKey(l);
        if (!logsByDate.has(dk)) {
          logsByDate.set(dk, l);
        }
      }

      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;

      for (const l of logsByDate.values()) {
        const norm = normalizeUiAttendanceStatus(l.status);
        if (norm === 'PRESENT') presentDays++;
        else if (norm === 'ABSENT') absentDays++;
        else if (norm === 'HALF_DAY') halfDays++;
        else if (norm === 'PAID_LEAVE') leaveDays++;
      }

      const todayLog = logsByDate.get(todayKey);
      let todayAttendanceStatus = todayLog
        ? normalizeUiAttendanceStatus(todayLog.status)
        : staff.shiftStatus === ShiftStatus.ON_DUTY
          ? 'PRESENT'
          : 'UNMARKED';
      const todayAttendanceSource = todayLog
        ? todayLog.attendanceSource || 'PIN_CLOCK'
        : staff.shiftStatus === ShiftStatus.ON_DUTY
          ? 'AUTO_LOGIN'
          : null;

      if (todayAttendanceStatus === 'PRESENT') presentTodayCount++;
      if (todayAttendanceStatus === 'ABSENT') absentTodayCount++;

      const totalPaid = totalSalaryPaid + advancesTaken;
      paidThisMonth += currentMonthPaid;
      totalMonthDeductions += totalDeductions;

      const pendingBalance = Math.max(0, baseSalary + totalBonus - totalPaid - totalDeductions);
      totalPendingAmount += pendingBalance;

      return {
        id: String(staff._id),
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        portalKey: getRolePortalKey(staff.role),
        shift: staff.shift || 'General',
        shiftStatus: staff.shiftStatus,
        avatar: staff.avatar || '',
        baseSalary,
        salaryCycle,
        totalPaid,
        totalSalaryPaid,
        advancesTaken,
        totalBonus,
        totalDeductions,
        autoAbsenceDeductions,
        pendingBalance,
        currentMonthPaid,
        lastPaymentDate,
        transactionCount: staffTxns.length,
        todayAttendanceStatus,
        todayAttendanceSource,
        todayClockInTime: todayLog?.clockInTime || null,
        attendanceStats: {
          presentDays,
          absentDays,
          halfDays,
          leaveDays,
        },
        payrollDeductionOverride: staff.payrollDeductionOverride || {
          mode: 'INHERIT_PORTAL',
          perDayDeductionAmount: 0,
          halfDayPercent: 50,
        },
        resolvedDeductionPolicy: resolvedDeduction,
      };
    });

    res.status(200).json({
      success: true,
      todayDateKey: todayKey,
      payrollPolicy,
      summary: {
        totalMonthlyPayroll,
        paidThisMonth,
        totalPendingAmount,
        totalMonthDeductions,
        totalStaffCount: eligibleStaff.length,
        presentTodayCount,
        absentTodayCount,
        portalFilterSummary: {
          enabledPortals,
          totalEligibleStaff: eligibleStaff.length,
        },
      },
      enabledPortals,
      staff: staffSummaryList,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'PAYROLL_FETCH_ERROR',
      message: error.message || 'Failed to fetch staff payroll list.',
    });
  }
};

/**
 * 2. POST /api/v1/payroll/transaction
 * Record a new salary disbursement, cash advance, bonus, or deduction.
 */
export const recordSalaryTransaction = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    const {
      staffId,
      amount,
      type,
      date,
      status = 'PAID',
      paymentMethod = 'BANK_TRANSFER',
      notes = '',
    } = req.body;

    if (!hotelId) {
      res.status(400).json({
        success: false,
        errorCode: 'HOTEL_ID_REQUIRED',
        message: 'Hotel ID is required for recording a payroll transaction.',
      });
      return;
    }

    if (!staffId || !Types.ObjectId.isValid(String(staffId))) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_ID',
        message: 'A valid staffId is required.',
      });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_AMOUNT',
        message: 'Transaction amount must be a positive number greater than 0.',
      });
      return;
    }

    const validTypes: SalaryTransactionType[] = ['SALARY', 'ADVANCE', 'BONUS', 'DEDUCTION'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_TYPE',
        message: `Transaction type must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const staff = await User.findOne({ _id: staffId, hotelId }).select('name role baseSalary').lean();
    if (!staff) {
      res.status(404).json({
        success: false,
        errorCode: 'STAFF_NOT_FOUND',
        message: 'Staff member does not exist in this hotel.',
      });
      return;
    }

    const transaction = await SalaryTransaction.create({
      hotelId,
      staffId: new Types.ObjectId(String(staffId)),
      amount: numAmount,
      type,
      date: date ? new Date(date) : new Date(),
      status: status === 'PENDING' ? 'PENDING' : 'PAID',
      paymentMethod: String(paymentMethod || 'BANK_TRANSFER').toUpperCase(),
      notes: String(notes || '').trim(),
      source: 'MANUAL',
      recordedBy: req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined,
    });

    res.status(201).json({
      success: true,
      message: `Successfully recorded ${type} of ₹${numAmount.toLocaleString('en-IN')} for ${staff.name}.`,
      transaction: {
        id: String(transaction._id),
        staffId: String(transaction.staffId),
        staffName: staff.name,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        source: transaction.source,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'TRANSACTION_RECORD_ERROR',
      message: error.message || 'Failed to record payroll transaction.',
    });
  }
};

/**
 * 3. GET /api/v1/payroll/ledger/:staffId
 * Returns the full transaction history, attendance summary, and deduction policy for a single staff member.
 */
export const getStaffLedger = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const staffId = String(req.params.staffId || '').trim();
    if (!staffId || !Types.ObjectId.isValid(staffId)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_ID',
        message: 'A valid staffId path parameter is required.',
      });
      return;
    }

    const staff = await User.findById(staffId)
      .select('name email phone role avatar baseSalary salaryCycle payrollDeductionOverride shift shiftStatus hotelId createdAt')
      .lean();

    if (!staff) {
      res.status(404).json({
        success: false,
        errorCode: 'STAFF_NOT_FOUND',
        message: 'Staff member not found.',
      });
      return;
    }

    const hotelId = staff.hotelId;
    const tenant = hotelId ? await Tenant.findById(hotelId).lean() : null;
    const payrollPolicy = normalizePayrollPolicy(tenant?.payrollPolicy);
    const resolvedDeduction = resolveStaffDeductionPolicy(staff, payrollPolicy);

    const monthPrefix = getIstDateKey().slice(0, 7);
    const [transactions, recentLogs] = await Promise.all([
      SalaryTransaction.find({ staffId, ...(hotelId ? { hotelId } : {}) })
        .sort({ date: -1, createdAt: -1 })
        .populate('recordedBy', 'name email')
        .lean(),
      StaffAttendanceLog.find({
        userId: staff._id,
        ...(hotelId ? { hotelId } : {}),
        dateKey: { $regex: `^${monthPrefix}` },
      })
        .sort({ attendanceDate: -1 })
        .limit(31)
        .lean(),
    ]);

    const baseSalary = Number(staff.baseSalary || 0);

    let totalSalaryPaid = 0;
    let advancesTaken = 0;
    let totalBonus = 0;
    let totalDeductions = 0;

    for (const t of transactions) {
      if (t.status === 'PAID') {
        const amt = Number(t.amount || 0);
        if (t.type === 'SALARY') totalSalaryPaid += amt;
        else if (t.type === 'ADVANCE') advancesTaken += amt;
        else if (t.type === 'BONUS') totalBonus += amt;
        else if (t.type === 'DEDUCTION') totalDeductions += amt;
      }
    }

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    for (const l of recentLogs) {
      const s = normalizeUiAttendanceStatus(l.status);
      if (s === 'PRESENT') presentDays++;
      else if (s === 'ABSENT') absentDays++;
      else if (s === 'HALF_DAY') halfDays++;
      else if (s === 'PAID_LEAVE') leaveDays++;
    }

    const totalPaid = totalSalaryPaid + advancesTaken;
    const netPayable = Math.max(0, baseSalary + totalBonus - totalPaid - totalDeductions);

    res.status(200).json({
      success: true,
      staff: {
        id: String(staff._id),
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        portalKey: getRolePortalKey(staff.role),
        shift: staff.shift || 'General',
        shiftStatus: staff.shiftStatus,
        avatar: staff.avatar || '',
        baseSalary,
        salaryCycle: staff.salaryCycle || 'MONTHLY',
        hotelId: staff.hotelId ? String(staff.hotelId) : undefined,
        payrollDeductionOverride: staff.payrollDeductionOverride || {
          mode: 'INHERIT_PORTAL',
          perDayDeductionAmount: 0,
          halfDayPercent: 50,
        },
        resolvedDeductionPolicy: resolvedDeduction,
      },
      summary: {
        baseSalary,
        totalPaid,
        totalSalaryPaid,
        advancesTaken,
        totalBonus,
        totalDeductions,
        netPayable,
        transactionCount: transactions.length,
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
      },
      attendanceHistory: recentLogs.map((l) => ({
        id: String(l._id),
        dateKey: getLogDateKey(l),
        status: normalizeUiAttendanceStatus(l.status),
        rawStatus: l.status,
        attendanceSource: l.attendanceSource || 'PIN_CLOCK',
        clockInTime: l.clockInTime,
        clockOutTime: l.clockOutTime,
        notes: l.notes || '',
      })),
      transactions: transactions.map((t) => ({
        id: String(t._id),
        amount: Number(t.amount || 0),
        type: t.type,
        date: t.date,
        status: t.status,
        paymentMethod: t.paymentMethod,
        notes: t.notes || '',
        source: t.source || 'MANUAL',
        attendanceDateKey: t.attendanceDateKey,
        recordedBy: t.recordedBy ? (t.recordedBy as any).name || (t.recordedBy as any).email : 'System Admin',
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'LEDGER_FETCH_ERROR',
      message: error.message || 'Failed to fetch staff salary ledger.',
    });
  }
};

/**
 * 4. PUT /api/v1/payroll/staff/:staffId/salary
 * Updates a staff member's base salary and salary cycle.
 */
export const updateStaffSalary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const staffId = String(req.params.staffId || '').trim();
    const { baseSalary, salaryCycle } = req.body;

    if (!staffId || !Types.ObjectId.isValid(staffId)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STAFF_ID',
        message: 'A valid staffId is required.',
      });
      return;
    }

    const numSalary = Number(baseSalary);
    if (isNaN(numSalary) || numSalary < 0) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_SALARY',
        message: 'Base salary must be a non-negative number.',
      });
      return;
    }

    const validCycles = ['MONTHLY', 'WEEKLY', 'DAILY'];
    const resolvedCycle = validCycles.includes(String(salaryCycle).toUpperCase())
      ? String(salaryCycle).toUpperCase()
      : 'MONTHLY';

    const staff = await User.findByIdAndUpdate(
      staffId,
      {
        baseSalary: numSalary,
        salaryCycle: resolvedCycle,
      },
      { new: true }
    )
      .select('name email role baseSalary salaryCycle')
      .lean();

    if (!staff) {
      res.status(404).json({
        success: false,
        errorCode: 'STAFF_NOT_FOUND',
        message: 'Staff member not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Updated base salary for ${staff.name} to ₹${numSalary.toLocaleString('en-IN')} (${resolvedCycle}).`,
      staff: {
        id: String(staff._id),
        name: staff.name,
        role: staff.role,
        baseSalary: staff.baseSalary,
        salaryCycle: staff.salaryCycle,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'SALARY_UPDATE_ERROR',
      message: error.message || 'Failed to update staff salary profile.',
    });
  }
};

/**
 * 5. GET /api/v1/payroll/policy?hotelId=X
 * Fetches the hotel's automatic attendance settings and per-portal deduction rules.
 */
export const getPayrollPolicy = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel ID is required.' });
      return;
    }

    const tenant = await Tenant.findById(hotelId).select('enabledPortals payrollPolicy').lean();
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      enabledPortals: tenant.enabledPortals || ['admin', 'cashier', 'reception', 'kds', 'waiter'],
      policy: normalizePayrollPolicy(tenant.payrollPolicy),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'POLICY_FETCH_ERROR',
      message: error.message || 'Failed to load payroll attendance policy.',
    });
  }
};

/**
 * 6. PUT /api/v1/payroll/policy
 * Updates the hotel's automatic attendance configuration and portal-specific per-day deduction rules.
 */
export const updatePayrollPolicy = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel ID is required.' });
      return;
    }

    const normalized = normalizePayrollPolicy(req.body);
    const updatedTenant = await Tenant.findByIdAndUpdate(
      hotelId,
      {
        $set: {
          payrollPolicy: {
            ...normalized,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!updatedTenant) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }

    // Re-sync today's auto deductions across staff whose today log is ABSENT / HALF_DAY so rules take effect immediately
    const todayKey = getIstDateKey();
    const todayLogs = await StaffAttendanceLog.find({
      hotelId,
      dateKey: todayKey,
      status: { $in: [AttendanceStatus.ABSENT, AttendanceStatus.HALF_DAY] },
    }).lean();

    if (todayLogs.length > 0) {
      const staffDocs = await User.find({
        _id: { $in: todayLogs.map((l) => l.userId) },
        hotelId,
      }).lean();

      const staffMap = new Map(staffDocs.map((s) => [String(s._id), s]));
      for (const l of todayLogs) {
        const staffDoc = staffMap.get(String(l.userId));
        if (staffDoc) {
          await syncAttendanceDeductionForDate({
            hotelId,
            staff: staffDoc,
            status: l.status,
            dateKey: todayKey,
            policy: normalized,
            recordedBy: req.user?.userId,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Attendance & portal deduction rules saved successfully.',
      policy: normalized,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'POLICY_UPDATE_ERROR',
      message: error.message || 'Failed to save payroll deduction policy.',
    });
  }
};

/**
 * 7. PUT /api/v1/payroll/staff/:staffId/deduction-policy
 * Sets or resets a per-staff / per-waiter deduction policy override.
 */
export const updateStaffDeductionPolicy = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const staffId = String(req.params.staffId || '').trim();
    if (!staffId || !Types.ObjectId.isValid(staffId)) {
      res.status(400).json({ success: false, errorCode: 'INVALID_STAFF_ID', message: 'Valid staffId is required.' });
      return;
    }

    const { mode = 'INHERIT_PORTAL', perDayDeductionAmount = 0, halfDayPercent = 50 } = req.body || {};
    const validModes = ['INHERIT_PORTAL', 'NO_DEDUCTION', 'FIXED_AMOUNT', 'PRO_RATA'];
    const safeMode = validModes.includes(String(mode).toUpperCase()) ? String(mode).toUpperCase() : 'INHERIT_PORTAL';
    const safeAmount = Math.max(0, Number(perDayDeductionAmount) || 0);
    const safeHalfPct = Math.min(100, Math.max(0, Number(halfDayPercent ?? 50)));

    const staff = await User.findByIdAndUpdate(
      staffId,
      {
        $set: {
          payrollDeductionOverride: {
            mode: safeMode,
            perDayDeductionAmount: safeAmount,
            halfDayPercent: safeHalfPct,
          },
        },
      },
      { new: true }
    )
      .select('name role hotelId baseSalary salaryCycle payrollDeductionOverride')
      .lean();

    if (!staff) {
      res.status(404).json({ success: false, errorCode: 'STAFF_NOT_FOUND', message: 'Staff member not found.' });
      return;
    }

    if (staff.hotelId) {
      const tenant = await Tenant.findById(staff.hotelId).lean();
      const policy = normalizePayrollPolicy(tenant?.payrollPolicy);
      const todayKey = getIstDateKey();
      const todayLog = await StaffAttendanceLog.findOne({
        hotelId: staff.hotelId,
        userId: staff._id,
        dateKey: todayKey,
      }).lean();

      if (todayLog) {
        await syncAttendanceDeductionForDate({
          hotelId: staff.hotelId,
          staff,
          status: todayLog.status,
          dateKey: todayKey,
          policy,
          recordedBy: req.user?.userId,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated custom deduction rule for ${staff.name}.`,
      payrollDeductionOverride: staff.payrollDeductionOverride,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'STAFF_POLICY_UPDATE_ERROR',
      message: error.message || 'Failed to update staff deduction policy.',
    });
  }
};

/**
 * 8. GET /api/v1/payroll/attendance?hotelId=X&date=YYYY-MM-DD&portal=ALL
 * Returns the daily attendance roster across portals with resolved deductions and auto-detection source.
 */
export const getPayrollAttendanceBoard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel ID is required.' });
      return;
    }

    const tenant = await Tenant.findById(hotelId).lean();
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }

    const dateKey = getIstDateKey((req.query.date as string) || undefined);
    const portalFilter = String(req.query.portal || 'ALL').toLowerCase();

    const enabledPortals =
      Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
        ? tenant.enabledPortals
        : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];
    const payrollPolicy = normalizePayrollPolicy(tenant.payrollPolicy);

    const allStaff = await User.find({
      hotelId,
      role: { $nin: [UserRole.SUPERADMIN, UserRole.GUEST] },
      isActive: true,
    })
      .select('name email phone role shift shiftStatus avatar baseSalary salaryCycle payrollDeductionOverride')
      .sort({ name: 1 })
      .lean();

    const eligibleStaff = allStaff.filter((staff) => {
      const requiredPortal = ROLE_REQUIRED_PORTAL[staff.role as UserRole];
      if (!requiredPortal) return true;
      return enabledPortals.includes(requiredPortal);
    });

    // If querying today, auto-evaluate cutoff absences cleanly
    if (dateKey === getIstDateKey()) {
      await evaluateAutoAbsentForDate({
        hotelId,
        tenant,
        eligibleStaff,
        dateKey,
        recordedBy: req.user?.userId,
      });
    }

    const monthPrefix = dateKey.slice(0, 7);
    const staffIds = eligibleStaff.map((s) => s._id);

    const [dayLogs, monthLogs, autoDeductions] = await Promise.all([
      StaffAttendanceLog.find({
        hotelId,
        userId: { $in: staffIds },
        $or: [
          { dateKey },
          {
            attendanceDate: {
              $gte: new Date(`${dateKey}T00:00:00.000Z`),
              $lte: new Date(`${dateKey}T23:59:59.999Z`),
            },
          },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
      StaffAttendanceLog.find({
        hotelId,
        userId: { $in: staffIds },
        dateKey: { $regex: `^${monthPrefix}` },
      }).lean(),
      SalaryTransaction.find({
        hotelId,
        staffId: { $in: staffIds },
        attendanceDateKey: dateKey,
        source: 'AUTO_ATTENDANCE',
      }).lean(),
    ]);

    const dayLogMap = new Map<string, any>();
    for (const l of dayLogs) {
      const uid = String(l.userId);
      if (!dayLogMap.has(uid)) dayLogMap.set(uid, l);
    }

    const dayDeductionMap = new Map<string, number>();
    for (const tx of autoDeductions) {
      dayDeductionMap.set(String(tx.staffId), Number(tx.amount || 0));
    }

    const rows = eligibleStaff
      .filter((staff) => portalFilter === 'all' || getRolePortalKey(staff.role) === portalFilter)
      .map((staff) => {
        const uid = String(staff._id);
        const log = dayLogMap.get(uid);
        const resolved = resolveStaffDeductionPolicy(staff, payrollPolicy);
        const isToday = dateKey === getIstDateKey();

        let status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PAID_LEAVE' | 'UNMARKED' = log
          ? normalizeUiAttendanceStatus(log.status)
          : isToday && staff.shiftStatus === ShiftStatus.ON_DUTY
            ? 'PRESENT'
            : 'UNMARKED';

        const source = log
          ? log.attendanceSource || 'PIN_CLOCK'
          : isToday && staff.shiftStatus === ShiftStatus.ON_DUTY
            ? 'AUTO_LOGIN'
            : null;

        // Compute monthly counts
        const staffMonthLogs = monthLogs.filter((m) => String(m.userId) === uid);
        let presentMonth = 0;
        let absentMonth = 0;
        let halfMonth = 0;
        let leaveMonth = 0;
        const seenDates = new Set<string>();
        for (const m of staffMonthLogs) {
          const dk = getLogDateKey(m);
          if (seenDates.has(dk)) continue;
          seenDates.add(dk);
          const norm = normalizeUiAttendanceStatus(m.status);
          if (norm === 'PRESENT') presentMonth++;
          else if (norm === 'ABSENT') absentMonth++;
          else if (norm === 'HALF_DAY') halfMonth++;
          else if (norm === 'PAID_LEAVE') leaveMonth++;
        }

        const expectedDeduction =
          status === 'ABSENT' && resolved.deductOnAbsent
            ? resolved.effectivePerDayAmount
            : status === 'HALF_DAY' && resolved.deductOnAbsent
              ? resolved.halfDayAmount
              : 0;

        return {
          staffId: uid,
          name: staff.name,
          role: staff.role,
          portalKey: resolved.portalKey as PortalRuleKey,
          avatar: staff.avatar || '',
          shift: staff.shift || 'General',
          baseSalary: Number(staff.baseSalary || 0),
          status,
          attendanceSource: source,
          clockInTime: log?.clockInTime || null,
          clockOutTime: log?.clockOutTime || null,
          notes: log?.notes || '',
          recordedDeductionAmount: dayDeductionMap.get(uid) || 0,
          expectedDeductionAmount: expectedDeduction,
          resolvedDeductionPolicy: resolved,
          monthlyStats: {
            presentDays: presentMonth,
            absentDays: absentMonth,
            halfDays: halfMonth,
            leaveDays: leaveMonth,
          },
        };
      });

    res.status(200).json({
      success: true,
      dateKey,
      policy: payrollPolicy,
      summary: {
        total: rows.length,
        present: rows.filter((r) => r.status === 'PRESENT').length,
        absent: rows.filter((r) => r.status === 'ABSENT').length,
        halfDay: rows.filter((r) => r.status === 'HALF_DAY').length,
        paidLeave: rows.filter((r) => r.status === 'PAID_LEAVE').length,
        unmarked: rows.filter((r) => r.status === 'UNMARKED').length,
        totalDayDeductions: rows.reduce((acc, r) => acc + r.recordedDeductionAmount, 0),
      },
      records: rows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'ATTENDANCE_BOARD_ERROR',
      message: error.message || 'Failed to load attendance board.',
    });
  }
};

/**
 * 9. POST /api/v1/payroll/attendance/mark
 * Admin manual override to mark Present / Absent / Half-Day / Paid Leave for a date & sync payroll deduction.
 */
export const markStaffAttendance = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    const { staffId, date, status, notes, applyDeduction } = req.body || {};

    if (!hotelId || !staffId || !Types.ObjectId.isValid(String(staffId))) {
      res.status(400).json({ success: false, errorCode: 'INVALID_PARAMS', message: 'Valid hotelId and staffId are required.' });
      return;
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE'];
    const targetStatus = String(status || '').toUpperCase();
    if (!validStatuses.includes(targetStatus)) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const [tenant, staff] = await Promise.all([
      Tenant.findById(hotelId).lean(),
      User.findOne({ _id: staffId, hotelId }).lean(),
    ]);

    if (!tenant || !staff) {
      res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Hotel or staff member not found.' });
      return;
    }

    const dateKey = getIstDateKey(date);
    const attendanceDate = dateKeyToUtcMidnight(dateKey);
    const policy = normalizePayrollPolicy(tenant.payrollPolicy);
    if (applyDeduction === false) {
      policy.autoApplyAbsenceDeduction = false;
    }

    const dbStatus = targetStatus as AttendanceStatus;

    let log = await StaffAttendanceLog.findOne({
      hotelId,
      userId: staff._id,
      $or: [
        { dateKey },
        {
          attendanceDate: {
            $gte: new Date(`${dateKey}T00:00:00.000Z`),
            $lte: new Date(`${dateKey}T23:59:59.999Z`),
          },
        },
      ],
    });

    if (!log) {
      log = new StaffAttendanceLog({
        hotelId,
        userId: staff._id,
        staffName: staff.name,
        department: getDepartmentForRole(staff.role),
        attendanceDate,
        dateKey,
        clockInTime: targetStatus === 'PRESENT' || targetStatus === 'HALF_DAY' ? new Date() : undefined,
        status: dbStatus,
        clockMethod: ClockMethod.MANUAL_OVERRIDE,
        attendanceSource: 'ADMIN_MANUAL',
        notes: notes ? String(notes).trim() : `Marked ${targetStatus} by Hotel Admin`,
      });
    } else {
      log.status = dbStatus;
      log.dateKey = dateKey;
      log.attendanceSource = 'ADMIN_MANUAL';
      log.clockMethod = ClockMethod.MANUAL_OVERRIDE;
      if ((targetStatus === 'PRESENT' || targetStatus === 'HALF_DAY') && !log.clockInTime) {
        log.clockInTime = new Date();
      }
      if (notes !== undefined) {
        log.notes = String(notes).trim();
      }
    }

    await log.save();

    await syncAttendanceDeductionForDate({
      hotelId,
      staff,
      status: dbStatus,
      dateKey,
      policy,
      recordedBy: req.user?.userId,
    });

    res.status(200).json({
      success: true,
      message: `${staff.name} marked ${targetStatus} for ${dateKey}.`,
      dateKey,
      status: targetStatus,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'ATTENDANCE_MARK_ERROR',
      message: error.message || 'Failed to mark staff attendance.',
    });
  }
};

/**
 * 10. POST /api/v1/payroll/attendance/auto-sync
 * Forces an immediate auto-attendance & absence-deduction sync sweep for a date.
 */
export const triggerAutoAttendanceSync = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const hotelId = resolveHotelId(req);
    if (!hotelId) {
      res.status(400).json({ success: false, errorCode: 'HOTEL_ID_REQUIRED', message: 'Hotel ID is required.' });
      return;
    }

    const tenant = await Tenant.findById(hotelId).lean();
    if (!tenant) {
      res.status(404).json({ success: false, errorCode: 'HOTEL_NOT_FOUND', message: 'Hotel not found.' });
      return;
    }

    const enabledPortals =
      Array.isArray(tenant.enabledPortals) && tenant.enabledPortals.length > 0
        ? tenant.enabledPortals
        : ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'];

    const allStaff = await User.find({
      hotelId,
      role: { $nin: [UserRole.SUPERADMIN, UserRole.GUEST] },
      isActive: true,
    }).lean();

    const eligibleStaff = allStaff.filter((staff) => {
      const requiredPortal = ROLE_REQUIRED_PORTAL[staff.role as UserRole];
      if (!requiredPortal) return true;
      return enabledPortals.includes(requiredPortal);
    });

    const dateKey = getIstDateKey(req.body?.date);
    const updatedCount = await evaluateAutoAbsentForDate({
      hotelId,
      tenant,
      eligibleStaff,
      dateKey,
      forceSync: true,
      recordedBy: req.user?.userId,
    });

    res.status(200).json({
      success: true,
      dateKey,
      syncedCount: updatedCount,
      message: `Auto-attendance synchronized for ${dateKey} (${updatedCount} unmarked staff processed).`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      errorCode: 'AUTO_SYNC_ERROR',
      message: error.message || 'Failed to sync automatic attendance.',
    });
  }
};
