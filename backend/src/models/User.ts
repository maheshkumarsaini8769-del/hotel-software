import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole, ShiftStatus } from '../types';

export interface IUser extends Document {
  hotelId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  pinCodeHash?: string;
  pinApprovedByAdmin?: boolean;
  pendingPinHash?: string;
  pinStatus?: 'NONE' | 'ACTIVE' | 'PENDING_APPROVAL';
  role: UserRole;
  permissions: string[];
  shiftStatus: ShiftStatus;
  activeDeviceId?: string;
  isMfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
  avatar?: string;
  shift?: string;
  assignedSection?: string;
  assignedStation?: string;
  assignedTableStart?: number;
  assignedTableEnd?: number;
  assignedCounter?: string;
  baseSalary?: number;
  salaryCycle?: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  payrollDeductionOverride?: {
    mode: 'INHERIT_PORTAL' | 'NO_DEDUCTION' | 'FIXED_AMOUNT' | 'PRO_RATA';
    perDayDeductionAmount: number;
    halfDayPercent?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: function (this: IUser) {
        return this.role !== UserRole.SUPERADMIN;
      },
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    pinCodeHash: { type: String },
    pinApprovedByAdmin: { type: Boolean, default: true },
    pendingPinHash: { type: String, select: false },
    pinStatus: {
      type: String,
      enum: ['NONE', 'ACTIVE', 'PENDING_APPROVAL'],
      default: 'NONE',
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    permissions: [{ type: String }],
    shiftStatus: {
      type: String,
      enum: Object.values(ShiftStatus),
      default: ShiftStatus.OFFLINE,
      index: true,
    },
    activeDeviceId: { type: String },
    isMfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    avatar: { type: String },
    shift: { type: String },
    assignedSection: { type: String },
    assignedStation: { type: String },
    assignedTableStart: { type: Number },
    assignedTableEnd: { type: Number },
    assignedCounter: { type: String },
    baseSalary: { type: Number, default: 0, min: 0 },
    salaryCycle: { type: String, enum: ['MONTHLY', 'WEEKLY', 'DAILY'], default: 'MONTHLY' },
    payrollDeductionOverride: {
      mode: {
        type: String,
        enum: ['INHERIT_PORTAL', 'NO_DEDUCTION', 'FIXED_AMOUNT', 'PRO_RATA'],
        default: 'INHERIT_PORTAL',
      },
      perDayDeductionAmount: { type: Number, default: 0, min: 0 },
      halfDayPercent: { type: Number, default: 50, min: 0, max: 100 },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound index: Email must be unique per hotel tenant, but SuperAdmin email is globally unique
UserSchema.index({ hotelId: 1, email: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);
