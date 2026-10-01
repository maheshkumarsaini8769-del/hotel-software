import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INoteCount {
  denomination: number; // 500, 200, 100, 50, 20, 10
  count: number;
  total: number;
}

export interface IShiftReconciliation extends Document {
  hotelId: Types.ObjectId;
  cashierUserId: Types.ObjectId;
  shiftStartTime: Date;
  shiftEndTime: Date;
  openingFloatCash: number;
  systemExpectedCash: number;
  actualCountedCash: number;
  varianceAmount: number; // actualCountedCash - systemExpectedCash (Negative = Shortage, Positive = Excess)
  cashBreakdown: INoteCount[];
  isBlindCloseCompleted: boolean;
  isApprovedByManager: boolean;
  managerApprovedBy?: Types.ObjectId;
  reconciliationCertificateNumber: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteCountSchema = new Schema<INoteCount>(
  {
    denomination: { type: Number, required: true },
    count: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ShiftReconciliationSchema = new Schema<IShiftReconciliation>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    cashierUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shiftStartTime: { type: Date, required: true },
    shiftEndTime: { type: Date, default: Date.now },
    openingFloatCash: { type: Number, required: true, min: 0, default: 0 },
    systemExpectedCash: { type: Number, required: true, min: 0 },
    actualCountedCash: { type: Number, required: true, min: 0 },
    varianceAmount: { type: Number, required: true },
    cashBreakdown: [NoteCountSchema],
    isBlindCloseCompleted: { type: Boolean, default: true },
    isApprovedByManager: { type: Boolean, default: false },
    managerApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reconciliationCertificateNumber: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

ShiftReconciliationSchema.index({ hotelId: 1, reconciliationCertificateNumber: 1 }, { unique: true });

export const ShiftReconciliation = mongoose.model<IShiftReconciliation>('ShiftReconciliation', ShiftReconciliationSchema);
