import mongoose, { Document, Schema, Types } from 'mongoose';

export enum WaiterFloatStatus {
  OPEN = 'OPEN',
  DROPPED_PENDING_APPROVAL = 'DROPPED_PENDING_APPROVAL',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export interface IWaiterCashTransaction {
  billId: Types.ObjectId | string;
  tableNumber: string;
  billAmount: number;
  amountTendered: number;
  changeGiven: number;
  netCashReceived: number;
  recordedAt: Date;
}

export interface IWaiterCashFloat extends Document {
  hotelId: Types.ObjectId;
  waiterUserId: Types.ObjectId;
  waiterName: string;
  shiftDate: Date;
  status: WaiterFloatStatus;
  openingFloat: number;
  totalCashCollected: number;
  totalChangeGiven: number;
  expectedCashInHand: number;
  actualCashHandedOver?: number;
  variance?: number; // actual - expected
  varianceReason?: string;
  transactions: IWaiterCashTransaction[];
  dropRequestedAt?: Date;
  cashierUserId?: Types.ObjectId;
  cashierName?: string;
  settledAt?: Date;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaiterCashTransactionSchema = new Schema<IWaiterCashTransaction>(
  {
    billId: {
      type: Schema.Types.Mixed,
      required: true,
    },
    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },
    billAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountTendered: {
      type: Number,
      required: true,
      min: 0,
    },
    changeGiven: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    netCashReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const WaiterCashFloatSchema = new Schema<IWaiterCashFloat>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    waiterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    waiterName: {
      type: String,
      required: true,
      trim: true,
    },
    shiftDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WaiterFloatStatus),
      default: WaiterFloatStatus.OPEN,
      index: true,
    },
    openingFloat: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalCashCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalChangeGiven: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedCashInHand: {
      type: Number,
      default: 0,
    },
    actualCashHandedOver: {
      type: Number,
    },
    variance: {
      type: Number,
      default: 0,
    },
    varianceReason: {
      type: String,
      trim: true,
    },
    transactions: {
      type: [WaiterCashTransactionSchema],
      default: [],
    },
    dropRequestedAt: {
      type: Date,
    },
    cashierUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cashierName: {
      type: String,
      trim: true,
    },
    settledAt: {
      type: Date,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

WaiterCashFloatSchema.index({ hotelId: 1, waiterUserId: 1, status: 1 });
WaiterCashFloatSchema.index({ hotelId: 1, shiftDate: 1 });

export const WaiterCashFloat = mongoose.model<IWaiterCashFloat>('WaiterCashFloat', WaiterCashFloatSchema);
