import mongoose, { Schema, Document, Types } from 'mongoose';
import { StaffDepartment } from './StaffShiftRoster';

export enum TipPoolStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  DISBURSED = 'DISBURSED',
}

export interface ITipStaffPayout {
  userId: Types.ObjectId;
  staffName: string;
  department: StaffDepartment;
  hoursWorked: number;
  tipShareAmount: number;
  payoutStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED';
}

export interface ITipPoolSession extends Document {
  hotelId: Types.ObjectId;
  sessionNumber: string;
  poolDate: Date;
  totalTipsCollected: number;
  fohPercentage: number; // e.g. 60
  bohPercentage: number; // e.g. 40
  fohPoolAmount: number;
  bohPoolAmount: number;
  payouts: ITipStaffPayout[];
  totalEligibleHours: number;
  status: TipPoolStatus;
  approvedByUserId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TipStaffPayoutSchema = new Schema<ITipStaffPayout>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String, required: true, trim: true },
    department: {
      type: String,
      enum: Object.values(StaffDepartment),
      required: true,
    },
    hoursWorked: { type: Number, required: true, min: 0 },
    tipShareAmount: { type: Number, required: true, min: 0 },
    payoutStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'DISBURSED'],
      default: 'PENDING_APPROVAL',
    },
  },
  { _id: false }
);

const TipPoolSessionSchema = new Schema<ITipPoolSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sessionNumber: { type: String, required: true, trim: true },
    poolDate: { type: Date, required: true, index: true },
    totalTipsCollected: { type: Number, required: true, min: 0 },
    fohPercentage: { type: Number, default: 60, min: 0, max: 100 },
    bohPercentage: { type: Number, default: 40, min: 0, max: 100 },
    fohPoolAmount: { type: Number, default: 0, min: 0 },
    bohPoolAmount: { type: Number, default: 0, min: 0 },
    payouts: [TipStaffPayoutSchema],
    totalEligibleHours: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(TipPoolStatus),
      default: TipPoolStatus.DRAFT,
      index: true,
    },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

TipPoolSessionSchema.index({ hotelId: 1, sessionNumber: 1 }, { unique: true });

export const TipPoolSession = mongoose.model<ITipPoolSession>(
  'TipPoolSession',
  TipPoolSessionSchema
);
