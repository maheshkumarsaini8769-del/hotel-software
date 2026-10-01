import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ShiftType {
  MORNING_OPENING = 'MORNING_OPENING', // e.g. 07:00 - 15:30
  EVENING_DINNER = 'EVENING_DINNER',   // e.g. 15:00 - 23:30
  NIGHT_AUDIT = 'NIGHT_AUDIT',         // e.g. 23:00 - 07:30
  FULL_DAY_SPLIT = 'FULL_DAY_SPLIT',   // e.g. 11:00-15:00 & 19:00-23:00
  CUSTOM = 'CUSTOM',
}

export enum StaffDepartment {
  KITCHEN_CULINARY = 'KITCHEN_CULINARY',           // BOH
  FRONT_OF_HOUSE_SERVICE = 'FRONT_OF_HOUSE_SERVICE', // FOH (Waiters, Captains)
  BAR_BEVERAGE = 'BAR_BEVERAGE',                   // FOH / Bar
  HOUSEKEEPING = 'HOUSEKEEPING',
  FRONT_OFFICE = 'FRONT_OFFICE',
  MAINTENANCE_SECURITY = 'MAINTENANCE_SECURITY',
}

export enum RosterStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SWAP_REQUESTED = 'SWAP_REQUESTED',
  CANCELLED = 'CANCELLED',
}

export interface IStaffShiftRoster extends Document {
  hotelId: Types.ObjectId;
  userId: Types.ObjectId;
  staffName: string;
  department: StaffDepartment;
  shiftDate: Date; // Normalized to YYYY-MM-DD
  shiftType: ShiftType;
  plannedStartTime: string; // "07:00"
  plannedEndTime: string;   // "15:30"
  plannedHours: number;     // 8.5
  status: RosterStatus;
  notes?: string;
  assignedByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffShiftRosterSchema = new Schema<IStaffShiftRoster>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    staffName: { type: String, required: true, trim: true },
    department: {
      type: String,
      enum: Object.values(StaffDepartment),
      required: true,
      index: true,
    },
    shiftDate: { type: Date, required: true, index: true },
    shiftType: {
      type: String,
      enum: Object.values(ShiftType),
      default: ShiftType.MORNING_OPENING,
    },
    plannedStartTime: { type: String, required: true, default: '08:00' },
    plannedEndTime: { type: String, required: true, default: '16:30' },
    plannedHours: { type: Number, required: true, default: 8.5 },
    status: {
      type: String,
      enum: Object.values(RosterStatus),
      default: RosterStatus.SCHEDULED,
      index: true,
    },
    notes: { type: String, trim: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StaffShiftRosterSchema.index({ hotelId: 1, shiftDate: 1, department: 1 });

export const StaffShiftRoster = mongoose.model<IStaffShiftRoster>(
  'StaffShiftRoster',
  StaffShiftRosterSchema
);
