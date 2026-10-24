import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PettyCashCategory {
  KITCHEN_SUPPLIES = 'KITCHEN_SUPPLIES',
  GAS_FUEL = 'GAS_FUEL',
  MAINTENANCE = 'MAINTENANCE',
  STAFF_REFRESHMENTS = 'STAFF_REFRESHMENTS',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

export interface IPettyCashVoucher extends Document {
  hotelId: Types.ObjectId;
  shiftId?: Types.ObjectId;
  cashierId?: Types.ObjectId;
  category: PettyCashCategory;
  description: string;
  amount: number;
  paidTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const PettyCashVoucherSchema = new Schema<IPettyCashVoucher>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'CashierShiftFloat', index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User' },
    category: {
      type: String,
      enum: Object.values(PettyCashCategory),
      default: PettyCashCategory.MISCELLANEOUS,
      required: true,
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paidTo: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

PettyCashVoucherSchema.index({ hotelId: 1, createdAt: -1 });

export const PettyCashVoucher = mongoose.model<IPettyCashVoucher>(
  'PettyCashVoucher',
  PettyCashVoucherSchema
);
