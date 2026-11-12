export type PortalRuleKey = 'waiter' | 'kds' | 'cashier' | 'reception' | 'admin';
export type DeductionMode = 'NO_DEDUCTION' | 'FIXED_AMOUNT' | 'PRO_RATA';
export type StaffOverrideMode = 'INHERIT_PORTAL' | DeductionMode;
export type AttendanceStatusValue =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'PAID_LEAVE'
  | 'UNMARKED'
  | 'ON_TIME'
  | 'LATE'
  | 'OVERTIME';

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

export interface StaffDeductionOverride {
  mode: StaffOverrideMode;
  perDayDeductionAmount: number;
  halfDayPercent?: number;
}

export interface AttendanceStatsSummary {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
}

export interface PayrollStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  portalTag?: string;
  portalKey?: PortalRuleKey;
  avatar?: string;
  shift: string;
  shiftStatus: string;
  baseSalary: number;
  salaryCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  totalPaid: number;
  totalSalaryPaid: number;
  advancesTaken: number;
  totalBonus: number;
  totalDeductions: number;
  autoAbsenceDeductions?: number;
  pendingBalance: number;
  netPayable?: number;
  currentMonthPaid?: number;
  lastPaymentDate?: string | null;
  lastPaidDate?: string | null;
  lastPaidAmount?: number;
  transactionCount: number;
  todayAttendanceStatus?: string;
  todayAttendanceSource?: string | null;
  todayClockInTime?: string | null;
  attendanceStats?: AttendanceStatsSummary;
  payrollDeductionOverride?: StaffDeductionOverride;
  resolvedDeductionPolicy?: ResolvedStaffDeduction;
}

export interface PayrollSummary {
  totalMonthlyPayroll: number;
  paidThisMonth: number;
  totalPendingAmount: number;
  totalMonthDeductions?: number;
  totalStaffCount: number;
  presentTodayCount?: number;
  absentTodayCount?: number;
  portalFilterSummary: {
    activeStaffCount?: number;
    excludedStaffCount?: number;
    totalEligibleStaff: number;
    enabledPortals: string[];
  };
}

export const PORTAL_RULE_META: Array<{
  key: PortalRuleKey;
  label: string;
  shortLabel: string;
  description: string;
  rolesLabel: string;
}> = [
  {
    key: 'waiter',
    label: 'Waiter & Floor Service Portal',
    shortLabel: 'Waiters',
    description: 'Table service captains & waiters logged into Waiter Handheld',
    rolesLabel: 'WAITER',
  },
  {
    key: 'kds',
    label: 'Kitchen & KDS Culinary Portal',
    shortLabel: 'Kitchen / Chefs',
    description: 'Chefs & line cooks operating Kitchen Display screens',
    rolesLabel: 'CHEF',
  },
  {
    key: 'cashier',
    label: 'Cashier & Billing POS Portal',
    shortLabel: 'Cashiers',
    description: 'Express Cashier POS operators & settlement clerks',
    rolesLabel: 'CASHIER',
  },
  {
    key: 'reception',
    label: 'Reception & Housekeeping Portal',
    shortLabel: 'Reception / HK',
    description: 'Front desk receptionists, housekeeping & maintenance staff',
    rolesLabel: 'RECEPTIONIST, HOUSEKEEPING, MAINTENANCE',
  },
  {
    key: 'admin',
    label: 'Hotel Management & Supervisors',
    shortLabel: 'Management',
    description: 'Property managers & department heads using Hotel Admin ERP',
    rolesLabel: 'HOTEL_ADMIN, MANAGER',
  },
];

export const DEFAULT_PAYROLL_POLICY: NormalizedPayrollPolicy = {
  autoAttendanceEnabled: true,
  autoMarkAbsentAfterCutoff: true,
  autoApplyAbsenceDeduction: true,
  absenceCutoffTime: '11:30',
  portalDeductionRules: {
    waiter: { deductOnAbsent: true, mode: 'PRO_RATA', perDayAmount: 0, halfDayPercent: 50 },
    kds: { deductOnAbsent: true, mode: 'PRO_RATA', perDayAmount: 0, halfDayPercent: 50 },
    cashier: { deductOnAbsent: true, mode: 'PRO_RATA', perDayAmount: 0, halfDayPercent: 50 },
    reception: { deductOnAbsent: true, mode: 'PRO_RATA', perDayAmount: 0, halfDayPercent: 50 },
    admin: { deductOnAbsent: false, mode: 'NO_DEDUCTION', perDayAmount: 0, halfDayPercent: 50 },
  },
};

export function formatInr(amount: number): string {
  return `₹${Math.round(Number(amount || 0)).toLocaleString('en-IN')}`;
}

export function normalizeDisplayStatus(rawStatus?: string | null): 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PAID_LEAVE' | 'UNMARKED' {
  const s = String(rawStatus || '').toUpperCase();
  if (s === 'PRESENT' || s === 'ON_TIME' || s === 'LATE' || s === 'OVERTIME') return 'PRESENT';
  if (s === 'ABSENT') return 'ABSENT';
  if (s === 'HALF_DAY') return 'HALF_DAY';
  if (s === 'PAID_LEAVE' || s === 'LEAVE') return 'PAID_LEAVE';
  return 'UNMARKED';
}

export function getAttendanceBadgeClasses(status?: string | null): {
  label: string;
  classes: string;
} {
  const normalized = normalizeDisplayStatus(status);
  switch (normalized) {
    case 'PRESENT':
      return {
        label: 'Present',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'HALF_DAY':
      return {
        label: 'Half-Day',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'ABSENT':
      return {
        label: 'Absent',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'PAID_LEAVE':
      return {
        label: 'Paid Leave',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    default:
      return {
        label: 'Not Marked',
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}

export function getAttendanceSourceLabel(source?: string | null): string {
  switch (String(source || '').toUpperCase()) {
    case 'AUTO_LOGIN':
      return 'Auto via Login';
    case 'PIN_CLOCK':
      return 'Auto via PIN';
    case 'AUTO_ABSENT_CUTOFF':
      return 'Auto Cutoff';
    case 'ADMIN_MANUAL':
      return 'Admin Manual';
    default:
      return 'Awaiting Clock-In';
  }
}

export function getPortalShortLabel(portalKey?: string): string {
  const found = PORTAL_RULE_META.find((m) => m.key === portalKey);
  return found ? found.shortLabel : (portalKey || 'Staff').toUpperCase();
}
