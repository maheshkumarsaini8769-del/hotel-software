export type ShiftTypeUI =
  | 'MORNING_OPENING'
  | 'EVENING_DINNER'
  | 'NIGHT_AUDIT'
  | 'FULL_DAY_SPLIT'
  | 'CUSTOM';

export type StaffDepartmentUI =
  | 'KITCHEN_CULINARY'
  | 'FRONT_OF_HOUSE_SERVICE'
  | 'BAR_BEVERAGE'
  | 'HOUSEKEEPING'
  | 'FRONT_OFFICE'
  | 'MAINTENANCE_SECURITY';

export type RosterStatusUI =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SWAP_REQUESTED'
  | 'CANCELLED';

export type AttendanceStatusUI =
  | 'ON_TIME'
  | 'LATE'
  | 'EARLY_EXIT'
  | 'OVERTIME'
  | 'HALF_DAY'
  | 'ABSENT';

export interface IStaffShiftRosterUI {
  _id: string;
  hotelId: string;
  userId: any;
  staffName: string;
  department: StaffDepartmentUI;
  shiftDate: string;
  shiftType: ShiftTypeUI;
  plannedStartTime: string;
  plannedEndTime: string;
  plannedHours: number;
  status: RosterStatusUI;
  notes?: string;
  createdAt: string;
}

export interface IStaffAttendanceLogUI {
  _id: string;
  hotelId: string;
  userId: any;
  rosterId?: string;
  staffName: string;
  department: StaffDepartmentUI;
  attendanceDate: string;
  clockInTime: string;
  clockOutTime?: string;
  totalHoursWorked: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatusUI;
  clockMethod: 'PIN' | 'BIOMETRIC' | 'MANUAL_OVERRIDE';
  notes?: string;
  createdAt: string;
}

export interface ITipStaffPayoutUI {
  userId: string;
  staffName: string;
  department: StaffDepartmentUI;
  hoursWorked: number;
  tipShareAmount: number;
  payoutStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED';
}

export interface ITipPoolSessionUI {
  _id: string;
  hotelId: string;
  sessionNumber: string;
  poolDate: string;
  totalTipsCollected: number;
  fohPercentage: number;
  bohPercentage: number;
  fohPoolAmount: number;
  bohPoolAmount: number;
  payouts: ITipStaffPayoutUI[];
  totalEligibleHours: number;
  status: 'DRAFT' | 'APPROVED' | 'DISBURSED';
  approvedByUserId?: any;
  notes?: string;
  createdAt: string;
}

export interface IRosterMetricsUI {
  totalScheduledShifts: number;
  activeClockedInCount: number;
  lateArrivalsCount: number;
  totalHoursWorkedToday: number;
  todayTipsPool: number;
}
