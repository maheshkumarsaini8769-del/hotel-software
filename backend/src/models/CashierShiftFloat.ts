import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CashierShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum ShiftType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  GENERAL = 'GENERAL'
}

export enum DiscrepancyStatus {
  NONE = 'NONE',
  RESOLVED = 'RESOLVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  FLAGGED = 'FLAGGED'
}

export interface IDenominationBreakdown {
  count500: number;
  count200: number;
  count100: number;
  count50: number;
  count20: number;
  count10: number;
  coins: number;
}

export interface ICashierShiftFloat extends Document {
  hotelId: Types.ObjectId;
  shiftNumber: string;
  cashierId: Types.ObjectId;
  cashierName: string;
  terminalId?: string;
  status: CashierShiftStatus;
  shiftType: ShiftType;
  openingFloat: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalCardCollected: number;
  totalRoomFolioCollected: number;
  totalCityLedgerCollected: number;
  totalChangeReturned: number;
  totalGuestAdvanceCash: number;
  totalFolioSettlementCash: number;
  totalPettyCashDisbursed: number;
  expectedCashInDrawer: number;
  actualCashCounted?: number;
  cashVariance?: number; // actualCashCounted - expectedCashInDrawer
  settlementCount: number;
  notes?: string;
  openedAt: Date;
  closedAt?: Date;
  closedBy?: Types.ObjectId;
  
  // Shift 68 additions: physical cash reconciliation & safe drop
  denominationBreakdown?: IDenominationBreakdown;
  safeDropAmount: number;
  safeDropReceiptNumber?: string;
  closingFloatRetained: number;
  discrepancyReason?: string;
  discrepancyStatus: DiscrepancyStatus;
  handoverToCashierId?: Types.ObjectId;
  handoverToCashierName?: string;
  incomingCashierAcknowledged: boolean;
  incomingCashierAcknowledgedAt?: Date;
  supervisorVerified: boolean;
  supervisorId?: Types.ObjectId;
  supervisorName?: string;
  supervisorPinVerifiedAt?: Date;
  supervisorRemarks?: string;
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
    shiftType: {
      type: String,
      enum: Object.values(ShiftType),
      default: ShiftType.MORNING,
    },
    openingFloat: { type: Number, required: true, min: 0, default: 0 },
    totalCashCollected: { type: Number, default: 0, min: 0 },
    totalUpiCollected: { type: Number, default: 0, min: 0 },
    totalCardCollected: { type: Number, default: 0, min: 0 },
    totalRoomFolioCollected: { type: Number, default: 0, min: 0 },
    totalCityLedgerCollected: { type: Number, default: 0, min: 0 },
    totalChangeReturned: { type: Number, default: 0, min: 0 },
    totalGuestAdvanceCash: { type: Number, default: 0, min: 0 },
    totalFolioSettlementCash: { type: Number, default: 0, min: 0 },
    totalPettyCashDisbursed: { type: Number, default: 0, min: 0 },
    expectedCashInDrawer: { type: Number, default: 0 },
    actualCashCounted: { type: Number, min: 0 },
    cashVariance: { type: Number },
    settlementCount: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Shift 68 additions
    denominationBreakdown: {
      count500: { type: Number, default: 0, min: 0 },
      count200: { type: Number, default: 0, min: 0 },
      count100: { type: Number, default: 0, min: 0 },
      count50: { type: Number, default: 0, min: 0 },
      count20: { type: Number, default: 0, min: 0 },
      count10: { type: Number, default: 0, min: 0 },
      coins: { type: Number, default: 0, min: 0 },
    },
    safeDropAmount: { type: Number, default: 0, min: 0 },
    safeDropReceiptNumber: { type: String, trim: true },
    closingFloatRetained: { type: Number, default: 0, min: 0 },
    discrepancyReason: { type: String, trim: true },
    discrepancyStatus: {
      type: String,
      enum: Object.values(DiscrepancyStatus),
      default: DiscrepancyStatus.NONE,
      index: true,
    },
    handoverToCashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    handoverToCashierName: { type: String, trim: true },
    incomingCashierAcknowledged: { type: Boolean, default: false },
    incomingCashierAcknowledgedAt: { type: Date },
    supervisorVerified: { type: Boolean, default: false },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    supervisorName: { type: String, trim: true },
    supervisorPinVerifiedAt: { type: Date },
    supervisorRemarks: { type: String, trim: true },
  },
  { timestamps: true }
);

CashierShiftFloatSchema.index({ hotelId: 1, shiftNumber: 1 }, { unique: true });
CashierShiftFloatSchema.index({ hotelId: 1, status: 1 });

export const CashierShiftFloat = mongoose.model<ICashierShiftFloat>(
  'CashierShiftFloat',
  CashierShiftFloatSchema
);
