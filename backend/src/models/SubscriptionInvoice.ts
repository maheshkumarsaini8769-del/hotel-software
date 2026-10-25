import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubscriptionInvoice extends Document {
  invoiceNumber: string;
  tenantId: Types.ObjectId;
  hotelName: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  periodStart: Date;
  periodEnd: Date;
  allocatedPortals: string[];
  baseAmountINR: number;
  customAdjustmentINR: number;
  taxAmountINR: number;
  totalAmountINR: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';
  paymentMethod?: 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'CHEQUE' | 'GATEWAY';
  paymentReference?: string;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionInvoiceSchema = new Schema<ISubscriptionInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    hotelName: { type: String, required: true, trim: true },
    billingCycle: {
      type: String,
      enum: ['MONTHLY', 'ANNUAL'],
      default: 'MONTHLY',
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    allocatedPortals: { type: [String], default: [] },
    baseAmountINR: { type: Number, required: true, min: 0 },
    customAdjustmentINR: { type: Number, default: 0 },
    taxAmountINR: { type: Number, default: 0 },
    totalAmountINR: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'OVERDUE', 'VOID'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'GATEWAY'],
    },
    paymentReference: { type: String, trim: true },
    paidAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const SubscriptionInvoice = mongoose.model<ISubscriptionInvoice>(
  'SubscriptionInvoice',
  SubscriptionInvoiceSchema
);
