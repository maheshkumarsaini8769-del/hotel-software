import mongoose, { Schema, Document, Types } from 'mongoose';
import { StaffDepartment } from './StaffShiftRoster';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ON_TIME = 'ON_TIME',
  LATE = 'LATE',
  EARLY_EXIT = 'EARLY_EXIT',
  OVERTIME = 'OVERTIME',
  HALF_DAY = 'HALF_DAY',
  ABSENT = 'ABSENT',
  PAID_LEAVE = 'PAID_LEAVE',
}

export enum ClockMethod {
  PIN = 'PIN',
  BIOMETRIC = 'BIOMETRIC',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
  AUTO_LOGIN = 'AUTO_LOGIN',
  AUTO_CUTOFF = 'AUTO_CUTOFF',
}

export type AttendanceSource = 'AUTO_LOGIN' | 'PIN_CLOCK' | 'AUTO_ABSENT_CUTOFF' | 'ADMIN_MANUAL';

export interface IStaffAttendanceLog extends Document {
  hotelId: Types.ObjectId;
  userId: Types.ObjectId;
  rosterId?: Types.ObjectId;
  staffName: string;
  department: StaffDepartment;
  attendanceDate: Date;
  dateKey?: string; // 'YYYY-MM-DD'
  clockInTime?: Date;
  clockOutTime?: Date;
  totalHoursWorked: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  clockMethod: ClockMethod;
  attendanceSource?: AttendanceSource;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAttendanceLogSchema = new Schema<IStaffAttendanceLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rosterId: { type: Schema.Types.ObjectId, ref: 'StaffShiftRoster' },
    staffName: { type: String, required: true, trim: true },
    department: {
      type: String,
      enum: Object.values(StaffDepartment),
      required: true,
      index: true,
    },
    attendanceDate: { type: Date, required: true, index: true },
    dateKey: { type: String, trim: true, index: true },
    clockInTime: { type: Date },
    clockOutTime: { type: Date },
    totalHoursWorked: { type: Number, default: 0, min: 0 },
    lateMinutes: { type: Number, default: 0, min: 0 },
    earlyExitMinutes: { type: Number, default: 0, min: 0 },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.ON_TIME,
      index: true,
    },
    clockMethod: {
      type: String,
      enum: Object.values(ClockMethod),
      default: ClockMethod.PIN,
    },
    attendanceSource: {
      type: String,
      enum: ['AUTO_LOGIN', 'PIN_CLOCK', 'AUTO_ABSENT_CUTOFF', 'ADMIN_MANUAL'],
      default: 'PIN_CLOCK',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

StaffAttendanceLogSchema.index({ hotelId: 1, attendanceDate: 1, userId: 1 });
StaffAttendanceLogSchema.index({ hotelId: 1, dateKey: 1, userId: 1 });

export const StaffAttendanceLog = mongoose.model<IStaffAttendanceLog>(
  'StaffAttendanceLog',
  StaffAttendanceLogSchema
);
