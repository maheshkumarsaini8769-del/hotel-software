import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CashierShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface ICashierShiftFloat extends Document {
  hotelId: Types.ObjectId;
  shiftNumber: string;
  cashierId: Types.ObjectId;
  cashierName: string;
  terminalId?: string;
  status: CashierShiftStatus;
  openingFloat: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalCardCollected: number;
  totalRoomFolioCollected: number;
  totalCityLedgerCollected: number;
  totalChangeReturned: number;
  expectedCashInDrawer: number;
  actualCashCounted?: number;
  cashVariance?: number; // actualCashCounted - expectedCashInDrawer
  settlementCount: number;
  notes?: string;
  openedAt: Date;
  closedAt?: Date;
  closedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CashierShiftFloatSchema = new Schema<ICashierShiftFloat>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    shiftNumber: { type: String, required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashierName: { type: String, required: true },
    terminalId: { type: String, default: 'COUNTER_01' },
    status: {
      type: String,
      enum: Object.values(CashierShiftStatus),
      default: CashierShiftStatus.OPEN,
      index: true,
    },
    openingFloat: { type: Number, required: true, min: 0, default: 0 },
    totalCashCollected: { type: Number, default: 0, min: 0 },
    totalUpiCollected: { type: Number, default: 0, min: 0 },
    totalCardCollected: { type: Number, default: 0, min: 0 },
    totalRoomFolioCollected: { type: Number, default: 0, min: 0 },
    totalCityLedgerCollected: { type: Number, default: 0, min: 0 },
    totalChangeReturned: { type: Number, default: 0, min: 0 },
    expectedCashInDrawer: { type: Number, default: 0 },
    actualCashCounted: { type: Number },
    cashVariance: { type: Number },
    settlementCount: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CashierShiftFloatSchema.index({ hotelId: 1, shiftNumber: 1 }, { unique: true });

export const CashierShiftFloat = mongoose.model<ICashierShiftFloat>(
  'CashierShiftFloat',
  CashierShiftFloatSchema
);
