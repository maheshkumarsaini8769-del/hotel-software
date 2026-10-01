import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BillStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOID = 'VOID'
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT'
}

export interface ITaxBreakup {
  taxName: string; // 'CGST', 'SGST', 'IGST'
  rate: number;    // e.g. 2.5
  amount: number;  // live calculated
}

export interface IRestaurantBill extends Document {
  hotelId: Types.ObjectId;
  billNumber: string;
  tableSessionId?: Types.ObjectId;
  tableId?: Types.ObjectId;
  orderIds: Types.ObjectId[];
  subTotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  discountApprovedBy?: Types.ObjectId;
  discountReason?: string;
  taxBreakup: ITaxBreakup[];
  totalTax: number;
  serviceCharge: number;
  grandTotal: number;
  roundOff: number;
  paidAmount: number;
  dueAmount: number;
  billStatus: BillStatus;
  generatedByUserId?: Types.ObjectId;
  isSnapshotLocked: boolean; // Immutable once generated
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaxBreakupSchema = new Schema<ITaxBreakup>(
  {
    taxName: { type: String, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const RestaurantBillSchema = new Schema<IRestaurantBill>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    billNumber: { type: String, required: true },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession', required: false, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: false, index: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'RestaurantOrder' }],
    subTotal: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: Object.values(DiscountType) },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    discountReason: { type: String },
    taxBreakup: [TaxBreakupSchema],
    totalTax: { type: Number, required: true, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    roundOff: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    billStatus: {
      type: String,
      enum: Object.values(BillStatus),
      default: BillStatus.UNPAID,
      index: true,
    },
    generatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    isSnapshotLocked: { type: Boolean, default: false },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

RestaurantBillSchema.index({ hotelId: 1, billNumber: 1 }, { unique: true });

export const RestaurantBill = mongoose.model<IRestaurantBill>('RestaurantBill', RestaurantBillSchema);
