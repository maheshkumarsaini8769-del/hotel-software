import mongoose, { Schema, Document, Types } from 'mongoose';

export type SalaryTransactionType = 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION';
export type SalaryTransactionStatus = 'PAID' | 'PENDING';

export type SalaryTransactionSource = 'MANUAL' | 'AUTO_ATTENDANCE';

export interface ISalaryTransaction extends Document {
  hotelId: Types.ObjectId;
  staffId: Types.ObjectId;
  amount: number;
  type: SalaryTransactionType;
  date: Date;
  status: SalaryTransactionStatus;
  paymentMethod: string;
  notes?: string;
  source?: SalaryTransactionSource;
  attendanceDateKey?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryTransactionSchema = new Schema<ISalaryTransaction>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['SALARY', 'ADVANCE', 'BONUS', 'DEDUCTION'],
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['PAID', 'PENDING'],
      default: 'PAID',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'BANK_TRANSFER',
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['MANUAL', 'AUTO_ATTENDANCE'],
      default: 'MANUAL',
      index: true,
    },
    attendanceDateKey: {
      type: String,
      trim: true,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries by hotel and staff
SalaryTransactionSchema.index({ hotelId: 1, staffId: 1, date: -1 });
SalaryTransactionSchema.index({ hotelId: 1, staffId: 1, attendanceDateKey: 1, source: 1 });

export const SalaryTransaction = mongoose.model<ISalaryTransaction>(
  'SalaryTransaction',
  SalaryTransactionSchema
);
