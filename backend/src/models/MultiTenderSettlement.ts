import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TenderMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ROOM_FOLIO = 'ROOM_FOLIO',
  CITY_LEDGER = 'CITY_LEDGER',
  COMPLIMENTARY = 'COMPLIMENTARY'
}

export enum SettlementStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  VOIDED = 'VOIDED'
}

export interface ITenderLine {
  method: TenderMethod;
  amount: number;
  referenceNumber?: string; // UPI UTR, Card Last 4 / Auth Code, Room Number, Corporate Account ID
  cashReceived?: number;    // If Cash: e.g. received ₹4500 for ₹4000 tender
  cashChangeReturned?: number; // e.g. ₹500 change given back
  notes?: string;
}

export interface IMultiTenderSettlement extends Document {
  hotelId: Types.ObjectId;
  settlementNumber: string;
  billId: Types.ObjectId;
  billNumber: string;
  tableId?: Types.ObjectId;
  tableNumber?: string;
  cashierId: Types.ObjectId;
  cashierName: string;
  billGrandTotal: number;
  tenders: ITenderLine[];
  totalSettledAmount: number;
  totalCashChangeReturned: number;
  status: SettlementStatus;
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: Types.ObjectId;
  idempotencyKey: string;
  voidReason?: string;
  voidedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TenderLineSchema = new Schema<ITenderLine>(
  {
    method: {
      type: String,
      enum: Object.values(TenderMethod),
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    referenceNumber: { type: String, trim: true },
    cashReceived: { type: Number, min: 0 },
    cashChangeReturned: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const MultiTenderSettlementSchema = new Schema<IMultiTenderSettlement>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    settlementNumber: { type: String, required: true },
    billId: { type: Schema.Types.ObjectId, ref: 'RestaurantBill', required: true, index: true },
    billNumber: { type: String, required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable' },
    tableNumber: { type: String },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashierName: { type: String, required: true },
    billGrandTotal: { type: Number, required: true, min: 0 },
    tenders: {
      type: [TenderLineSchema],
      required: true,
      validate: [(v: ITenderLine[]) => v.length > 0, 'At least one tender method is required'],
    },
    totalSettledAmount: { type: Number, required: true, min: 0 },
    totalCashChangeReturned: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(SettlementStatus),
      default: SettlementStatus.COMPLETED,
      index: true,
    },
    isReconciled: { type: Boolean, default: false, index: true },
    reconciledAt: { type: Date },
    reconciledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    idempotencyKey: { type: String, required: true, index: true },
    voidReason: { type: String },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MultiTenderSettlementSchema.index({ hotelId: 1, settlementNumber: 1 }, { unique: true });
MultiTenderSettlementSchema.index({ hotelId: 1, idempotencyKey: 1 }, { unique: true });

export const MultiTenderSettlement = mongoose.model<IMultiTenderSettlement>(
  'MultiTenderSettlement',
  MultiTenderSettlementSchema
);
