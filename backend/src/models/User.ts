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
  role: UserRole;
  permissions: string[];
  shiftStatus: ShiftStatus;
  activeDeviceId?: string;
  isMfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
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
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    pinCodeHash: { type: String },
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
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound index: Email must be unique per hotel tenant, but SuperAdmin email is globally unique
UserSchema.index({ hotelId: 1, email: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);
