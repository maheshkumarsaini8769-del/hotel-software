import mongoose, { Document, Schema, Types } from 'mongoose';

export enum UpiQrStatus {
  PENDING = 'PENDING',
  SCANNED = 'SCANNED',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum UpiProvider {
  BHIM_NPCI = 'BHIM_NPCI',
  PAYTM = 'PAYTM',
  PHONEPE = 'PHONEPE',
  GPAY = 'GPAY',
  GENERIC = 'GENERIC',
}

export interface IDynamicUpiQr extends Document {
  hotelId: Types.ObjectId;
  billId: Types.ObjectId | string;
  orderId?: Types.ObjectId | string;
  tableNumber: string;
  tableId?: Types.ObjectId | string;
  waiterUserId: Types.ObjectId;
  waiterName: string;
  amount: number;
  currency: string;
  merchantVpa: string;
  merchantName: string;
  transactionRef: string;
  upiUri: string;
  status: UpiQrStatus;
  expiresAt: Date;
  paidAt?: Date;
  paymentGatewayRef?: string;
  payerVpa?: string;
  soundboxAnnouncement?: string;
  soundboxNotified: boolean;
  soundboxNotifiedAt?: Date;
  webhookReceivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DynamicUpiQrSchema = new Schema<IDynamicUpiQr>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    billId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.Mixed,
      required: false,
    },
    tableNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tableId: {
      type: Schema.Types.Mixed,
      required: false,
    },
    waiterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    waiterName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least ₹1'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    merchantVpa: {
      type: String,
      required: true,
      trim: true,
    },
    merchantName: {
      type: String,
      required: true,
      trim: true,
    },
    transactionRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    upiUri: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UpiQrStatus),
      default: UpiQrStatus.PENDING,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
    paymentGatewayRef: {
      type: String,
      trim: true,
    },
    payerVpa: {
      type: String,
      trim: true,
    },
    soundboxAnnouncement: {
      type: String,
      trim: true,
    },
    soundboxNotified: {
      type: Boolean,
      default: false,
    },
    soundboxNotifiedAt: {
      type: Date,
    },
    webhookReceivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DynamicUpiQrSchema.index({ hotelId: 1, tableNumber: 1, status: 1 });
DynamicUpiQrSchema.index({ hotelId: 1, billId: 1 });
DynamicUpiQrSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DynamicUpiQr = mongoose.model<IDynamicUpiQr>('DynamicUpiQr', DynamicUpiQrSchema);
