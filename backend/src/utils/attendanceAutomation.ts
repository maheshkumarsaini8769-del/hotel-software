import { Types } from 'mongoose';
import { Tenant, ITenant } from '../models/Tenant';
import { User } from '../models/User';
import { StaffAttendanceLog, AttendanceStatus, ClockMethod, AttendanceSource } from '../models/StaffAttendanceLog';
import { StaffDepartment } from '../models/StaffShiftRoster';
import { SalaryTransaction } from '../models/SalaryTransaction';
import { UserRole, ShiftStatus } from '../types';

export type PortalRuleKey = 'waiter' | 'kds' | 'cashier' | 'reception' | 'admin';
export type DeductionMode = 'NO_DEDUCTION' | 'FIXED_AMOUNT' | 'PRO_RATA';
export type StaffOverrideMode = 'INHERIT_PORTAL' | DeductionMode;

export interface PortalDeductionRule {
  deductOnAbsent: boolean;
  mode: DeductionMode;
  perDayAmount: number;
  halfDayPercent: number;
}

export interface NormalizedPayrollPolicy {
  autoAttendanceEnabled: boolean;
  autoMarkAbsentAfterCutoff: boolean;
  autoApplyAbsenceDeduction: boolean;
  absenceCutoffTime: string;
  portalDeductionRules: Record<PortalRuleKey, PortalDeductionRule>;
}

const DEFAULT_RULE: PortalDeductionRule = {
  deductOnAbsent: true,
  mode: 'PRO_RATA',
  perDayAmount: 0,
  halfDayPercent: 50,
};

export function getIstDateKey(dateInput?: Date | string): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = dateInput ? new Date(dateInput) : new Date();
  const istMs = d.getTime() + 330 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

export function getIstCurrentTimeHHMM(): string {
  const istMs = Date.now() + 330 * 60 * 1000;
  return new Date(istMs).toISOString().slice(11, 16);
}

export function dateKeyToUtcMidnight(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function getRolePortalKey(role: string): PortalRuleKey {
  switch (String(role || '').toUpperCase()) {
    case UserRole.WAITER:
      return 'waiter';
    case UserRole.CHEF:
      return 'kds';
    case UserRole.CASHIER:
      return 'cashier';
    case UserRole.RECEPTIONIST:
    case UserRole.HOUSEKEEPING:
    case UserRole.MAINTENANCE:
      return 'reception';
    default:
      return 'admin';
  }
}

export function getDepartmentForRole(role: string): StaffDepartment {
  switch (String(role || '').toUpperCase()) {
    case UserRole.CHEF:
      return StaffDepartment.KITCHEN_CULINARY;
    case UserRole.RECEPTIONIST:
      return StaffDepartment.FRONT_OFFICE;
    case UserRole.HOUSEKEEPING:
      return StaffDepartment.HOUSEKEEPING;
    case UserRole.MAINTENANCE:
      return StaffDepartment.MAINTENANCE_SECURITY;
    default:
      return StaffDepartment.FRONT_OF_HOUSE_SERVICE;
  }
}

export function normalizePayrollPolicy(raw?: any): NormalizedPayrollPolicy {
  const rulesRaw = raw?.portalDeductionRules || {};
  const normalizeRule = (key: PortalRuleKey): PortalDeductionRule => {
    const r = rulesRaw[key];
    const defaultAdmin = key === 'admin';
    if (!r) {
      return defaultAdmin
        ? { deductOnAbsent: false, mode: 'NO_DEDUCTION', perDayAmount: 0, halfDayPercent: 50 }
        : { ...DEFAULT_RULE };
    }
    const mode: DeductionMode =
      r.mode === 'FIXED_AMOUNT' || r.mode === 'NO_DEDUCTION' || r.mode === 'PRO_RATA'
        ? r.mode
        : r.deductOnAbsent === false
          ? 'NO_DEDUCTION'
          : 'PRO_RATA';
    return {
      deductOnAbsent: r.deductOnAbsent !== undefined ? Boolean(r.deductOnAbsent) : mode !== 'NO_DEDUCTION',
      mode: r.deductOnAbsent === false ? 'NO_DEDUCTION' : mode,
      perDayAmount: Math.max(0, Number(r.perDayAmount || 0)),
      halfDayPercent: Math.min(100, Math.max(0, r.halfDayPercent !== undefined ? Number(r.halfDayPercent) : 50)),
    };
  };

  return {
    autoAttendanceEnabled: raw?.autoAttendanceEnabled !== undefined ? Boolean(raw.autoAttendanceEnabled) : true,
    autoMarkAbsentAfterCutoff:
      raw?.autoMarkAbsentAfterCutoff !== undefined ? Boolean(raw.autoMarkAbsentAfterCutoff) : true,
    autoApplyAbsenceDeduction:
      raw?.autoApplyAbsenceDeduction !== undefined ? Boolean(raw.autoApplyAbsenceDeduction) : true,
    absenceCutoffTime:
      typeof raw?.absenceCutoffTime === 'string' && /^\d{2}:\d{2}$/.test(raw.absenceCutoffTime)
        ? raw.absenceCutoffTime
        : '11:30',
    portalDeductionRules: {
      waiter: normalizeRule('waiter'),
      kds: normalizeRule('kds'),
      cashier: normalizeRule('cashier'),
      reception: normalizeRule('reception'),
      admin: normalizeRule('admin'),
    },
  };
}

export interface ResolvedStaffDeduction {
  portalKey: PortalRuleKey;
  source: 'STAFF_OVERRIDE' | 'PORTAL_RULE';
  overrideMode: StaffOverrideMode;
  effectiveMode: DeductionMode;
  deductOnAbsent: boolean;
  effectivePerDayAmount: number;
  halfDayPercent: number;
  halfDayAmount: number;
}

export function resolveStaffDeductionPolicy(
  staff: {
    role: string;
    baseSalary?: number;
    salaryCycle?: string;
    payrollDeductionOverride?: {
      mode?: string;
      perDayDeductionAmount?: number;
      halfDayPercent?: number;
    };
  },
  policy: NormalizedPayrollPolicy
): ResolvedStaffDeduction {
  const portalKey = getRolePortalKey(staff.role);
  const portalRule = policy.portalDeductionRules[portalKey];
  const override = staff.payrollDeductionOverride;
  const overrideMode: StaffOverrideMode =
    override?.mode === 'NO_DEDUCTION' ||
    override?.mode === 'FIXED_AMOUNT' ||
    override?.mode === 'PRO_RATA'
      ? override.mode
      : 'INHERIT_PORTAL';

  const baseSalary = Number(staff.baseSalary || 0);
  const dailyProRata =
    staff.salaryCycle === 'DAILY'
      ? baseSalary
      : staff.salaryCycle === 'WEEKLY'
        ? Math.round(baseSalary / 7)
        : Math.round(baseSalary / 30);

  let effectiveMode: DeductionMode;
  let fixedAmount = 0;
  let halfDayPercent = portalRule.halfDayPercent;

  if (overrideMode !== 'INHERIT_PORTAL') {
    effectiveMode = overrideMode;
    fixedAmount = Math.max(0, Number(override?.perDayDeductionAmount || 0));
    if (override?.halfDayPercent !== undefined) {
      halfDayPercent = Math.min(100, Math.max(0, Number(override.halfDayPercent)));
    }
  } else {
    effectiveMode = portalRule.deductOnAbsent ? portalRule.mode : 'NO_DEDUCTION';
    fixedAmount = portalRule.perDayAmount;
  }

  const deductOnAbsent = effectiveMode !== 'NO_DEDUCTION';
  let effectivePerDayAmount = 0;
  if (effectiveMode === 'FIXED_AMOUNT') {
    effectivePerDayAmount = fixedAmount;
  } else if (effectiveMode === 'PRO_RATA') {
    effectivePerDayAmount = Math.max(0, dailyProRata);
  }

  const halfDayAmount = Math.round((effectivePerDayAmount * halfDayPercent) / 100);

  return {
    portalKey,
    source: overrideMode !== 'INHERIT_PORTAL' ? 'STAFF_OVERRIDE' : 'PORTAL_RULE',
    overrideMode,
    effectiveMode,
    deductOnAbsent,
    effectivePerDayAmount,
    halfDayPercent,
    halfDayAmount,
  };
}

export async function syncAttendanceDeductionForDate(params: {
  hotelId: Types.ObjectId;
  staff: {
    _id?: Types.ObjectId;
    id?: string;
    name: string;
    role: string;
    baseSalary?: number;
    salaryCycle?: string;
    payrollDeductionOverride?: any;
  };
  status: AttendanceStatus | string;
  dateKey: string;
  policy: NormalizedPayrollPolicy;
  recordedBy?: string;
}): Promise<void> {
  const { hotelId, staff, status, dateKey, policy, recordedBy } = params;
  const staffId = new Types.ObjectId(String(staff._id || staff.id));

  if (!policy.autoApplyAbsenceDeduction) {
    return;
  }

  const resolved = resolveStaffDeductionPolicy(staff, policy);

  let deductionAmount = 0;
  let deductionNote = '';

  if (status === AttendanceStatus.ABSENT && resolved.deductOnAbsent && resolved.effectivePerDayAmount > 0) {
    deductionAmount = resolved.effectivePerDayAmount;
    deductionNote = `Auto Absence Deduction (${dateKey}) • ${
      resolved.source === 'STAFF_OVERRIDE' ? 'Staff Policy' : `${resolved.portalKey.toUpperCase()} Portal Rule`
    }`;
  } else if (status === AttendanceStatus.HALF_DAY && resolved.deductOnAbsent && resolved.halfDayAmount > 0) {
    deductionAmount = resolved.halfDayAmount;
    deductionNote = `Auto Half-Day Deduction (${dateKey}) • ${resolved.halfDayPercent}%`;
  }

  const filter = {
    hotelId,
    staffId,
    attendanceDateKey: dateKey,
    source: 'AUTO_ATTENDANCE' as const,
  };

  if (deductionAmount <= 0) {
    await SalaryTransaction.deleteMany(filter);
    return;
  }

  await SalaryTransaction.findOneAndUpdate(
    filter,
    {
      $set: {
        amount: deductionAmount,
        type: 'DEDUCTION',
        date: dateKeyToUtcMidnight(dateKey),
        status: 'PAID',
        paymentMethod: 'PAYROLL_DEDUCTION',
        notes: deductionNote,
        ...(recordedBy && Types.ObjectId.isValid(recordedBy)
          ? { recordedBy: new Types.ObjectId(recordedBy) }
          : {}),
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Automatically marks a staff member PRESENT when they authenticate via Password Login or PIN Terminal.
 * Upgrades prior auto-absent entries and removes unwarranted absence deductions for the day.
 */
export async function autoMarkStaffPresentOnLogin(params: {
  hotelId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  method?: ClockMethod;
}): Promise<void> {
  try {
    const hotelObjId = new Types.ObjectId(String(params.hotelId));
    const userObjId = new Types.ObjectId(String(params.userId));

    const [tenant, staff] = await Promise.all([
      Tenant.findById(hotelObjId).lean(),
      User.findById(userObjId).lean(),
    ]);

    if (!tenant || !staff || staff.role === UserRole.SUPERADMIN || staff.role === UserRole.GUEST) {
      return;
    }

    const policy = normalizePayrollPolicy(tenant.payrollPolicy);
    if (!policy.autoAttendanceEnabled) {
      return;
    }

    const dateKey = getIstDateKey();
    const todayDate = dateKeyToUtcMidnight(dateKey);
    const now = new Date();

    const existing = await StaffAttendanceLog.findOne({
      hotelId: hotelObjId,
      userId: userObjId,
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

    if (!existing) {
      await StaffAttendanceLog.create({
        hotelId: hotelObjId,
        userId: userObjId,
        staffName: staff.name,
        department: getDepartmentForRole(staff.role),
        attendanceDate: todayDate,
        dateKey,
        clockInTime: now,
        status: AttendanceStatus.PRESENT,
        clockMethod: params.method || ClockMethod.AUTO_LOGIN,
        attendanceSource: 'AUTO_LOGIN' as AttendanceSource,
        notes: `Auto-marked PRESENT on ${params.method === ClockMethod.PIN ? 'PIN terminal sign-in' : 'portal login'}`,
      });
    } else if (
      existing.status === AttendanceStatus.ABSENT &&
      existing.attendanceSource === 'AUTO_ABSENT_CUTOFF'
    ) {
      existing.status = AttendanceStatus.PRESENT;
      existing.clockInTime = existing.clockInTime || now;
      existing.clockMethod = params.method || ClockMethod.AUTO_LOGIN;
      existing.attendanceSource = 'AUTO_LOGIN';
      existing.dateKey = dateKey;
      existing.notes = `Upgraded to PRESENT automatically upon staff login at ${now.toLocaleTimeString('en-IN')}`;
      await existing.save();

      // Reverse any auto-absence deduction for today
      await syncAttendanceDeductionForDate({
        hotelId: hotelObjId,
        staff,
        status: AttendanceStatus.PRESENT,
        dateKey,
        policy,
      });
    }

    if (staff.shiftStatus !== ShiftStatus.ON_DUTY) {
      await User.findByIdAndUpdate(userObjId, { shiftStatus: ShiftStatus.ON_DUTY });
    }
  } catch (err) {
    console.warn('[AttendanceAutomation] autoMarkStaffPresentOnLogin skipped:', (err as Error)?.message);
  }
}

/**
 * Evaluates eligible staff for a date; if today and past cutoff with autoMarkAbsentAfterCutoff enabled,
 * marks unpunched staff as ABSENT and posts idempotent auto-deductions if enabled.
 */
export async function evaluateAutoAbsentForDate(params: {
  hotelId: Types.ObjectId;
  tenant: { payrollPolicy?: any; enabledPortals?: string[]; [key: string]: any } | null | undefined;
  eligibleStaff: Array<any>;
  dateKey?: string;
  forceSync?: boolean;
  recordedBy?: string;
}): Promise<number> {
  const { hotelId, tenant, eligibleStaff, forceSync = false, recordedBy } = params;
  const dateKey = params.dateKey || getIstDateKey();
  const todayKey = getIstDateKey();
  const policy = normalizePayrollPolicy(tenant?.payrollPolicy);

  if (!policy.autoAttendanceEnabled) return 0;

  const currentHHMM = getIstCurrentTimeHHMM();
  const isPastCutoff = dateKey < todayKey || (dateKey === todayKey && currentHHMM >= policy.absenceCutoffTime);

  if (!forceSync && (!policy.autoMarkAbsentAfterCutoff || !isPastCutoff)) {
    return 0;
  }

  // Only evaluate auto-absent for today when automatically triggered (so historical views don't silently backfill old unregistered months)
  if (!forceSync && dateKey !== todayKey) {
    return 0;
  }

  const existingLogs = await StaffAttendanceLog.find({
    hotelId,
    $or: [
      { dateKey },
      {
        attendanceDate: {
          $gte: new Date(`${dateKey}T00:00:00.000Z`),
          $lte: new Date(`${dateKey}T23:59:59.999Z`),
        },
      },
    ],
  }).lean();

  const loggedUserIds = new Set(existingLogs.map((l) => String(l.userId)));
  let markedCount = 0;

  for (const staff of eligibleStaff) {
    const uid = String(staff._id || staff.id);
    if (loggedUserIds.has(uid)) continue;

    // If the staff currently has ON_DUTY shiftStatus today without a log, mark them PRESENT instead!
    const isCurrentlyOnDuty = dateKey === todayKey && staff.shiftStatus === ShiftStatus.ON_DUTY;
    const status = isCurrentlyOnDuty ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
    const source: AttendanceSource = isCurrentlyOnDuty ? 'AUTO_LOGIN' : 'AUTO_ABSENT_CUTOFF';

    await StaffAttendanceLog.create({
      hotelId,
      userId: new Types.ObjectId(uid),
      staffName: staff.name,
      department: getDepartmentForRole(staff.role),
      attendanceDate: dateKeyToUtcMidnight(dateKey),
      dateKey,
      clockInTime: isCurrentlyOnDuty ? new Date() : undefined,
      status,
      clockMethod: isCurrentlyOnDuty ? ClockMethod.AUTO_LOGIN : ClockMethod.AUTO_CUTOFF,
      attendanceSource: source,
      notes: isCurrentlyOnDuty
        ? 'Auto-marked PRESENT (active duty session)'
        : `Auto-marked ABSENT after ${policy.absenceCutoffTime} cutoff (no login recorded)`,
    });

    await syncAttendanceDeductionForDate({
      hotelId,
      staff,
      status,
      dateKey,
      policy,
      recordedBy,
    });

    markedCount++;
  }

  return markedCount;
}
