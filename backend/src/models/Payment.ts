import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  CHARGE_TO_ROOM = 'CHARGE_TO_ROOM',
  CITY_LEDGER = 'CITY_LEDGER',
  COMPLIMENTARY = 'COMPLIMENTARY'
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED'
}

export interface IPayment extends Document {
  hotelId: Types.ObjectId;
  billId?: Types.ObjectId;
  folioId?: Types.ObjectId;
  paymentMode: PaymentMode;
  amount: number;
  currency: string;
  gatewayTransactionId?: string;
  gatewaySignature?: string;
  utrNumber?: string;
  status: PaymentStatus;
  cashReceived?: number;
  cashChangeReturned?: number;
  collectedByUserId?: Types.ObjectId;
  refundAmount?: number;
  refundReason?: string;
  refundApprovedBy?: Types.ObjectId;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    billId: { type: Schema.Types.ObjectId, ref: 'RestaurantBill', index: true },
    folioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio', index: true },
    paymentMode: {
      type: String,
      enum: Object.values(PaymentMode),
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    gatewayTransactionId: { type: String, trim: true },
    gatewaySignature: { type: String, trim: true },
    utrNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.INITIATED,
      index: true,
    },
    cashReceived: { type: Number, min: 0 },
    cashChangeReturned: { type: Number, min: 0, default: 0 },
    collectedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    refundAmount: { type: Number, min: 0, default: 0 },
    refundReason: { type: String },
    refundApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    idempotencyKey: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ hotelId: 1, idempotencyKey: 1 }, { unique: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
