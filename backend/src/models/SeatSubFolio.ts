import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SubFolioStatus {
  OPEN = 'OPEN',
  BILL_REQUESTED = 'BILL_REQUESTED',
  SETTLED = 'SETTLED',
  MERGED = 'MERGED',
  VOID = 'VOID'
}

export interface ISubFolioLineItem {
  menuItemId: Types.ObjectId;
  orderId?: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  seatNumber?: number;
  specialInstructions?: string;
}

export interface ISeatSubFolio extends Document {
  hotelId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: string;
  tableSessionId: Types.ObjectId;
  subFolioNumber: string;
  seatNumbers: number[];
  customerName: string;
  customerPhone?: string;
  orderIds: Types.ObjectId[];
  lineItems: ISubFolioLineItem[];
  subTotal: number;
  cgstAmount: number; // 2.5%
  sgstAmount: number; // 2.5%
  totalTax: number;   // 5%
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'POST_TO_ROOM';
  transactionRef?: string;
  status: SubFolioStatus;
  mergedIntoSubFolioId?: Types.ObjectId;
  settledAt?: Date;
  settledByStaffName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubFolioLineItemSchema = new Schema<ISubFolioLineItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'RestaurantOrder' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    seatNumber: { type: Number },
    specialInstructions: { type: String },
  },
  { _id: false }
);

const SeatSubFolioSchema = new Schema<ISeatSubFolio>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession', required: true, index: true },
    subFolioNumber: { type: String, required: true },
    seatNumbers: [{ type: Number, required: true }],
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: 'RestaurantOrder' }],
    lineItems: [SubFolioLineItemSchema],
    subTotal: { type: Number, default: 0, min: 0 },
    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'POST_TO_ROOM'],
    },
    transactionRef: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(SubFolioStatus),
      default: SubFolioStatus.OPEN,
      index: true,
    },
    mergedIntoSubFolioId: { type: Schema.Types.ObjectId, ref: 'SeatSubFolio' },
    settledAt: { type: Date },
    settledByStaffName: { type: String, trim: true },
  },
  { timestamps: true }
);

SeatSubFolioSchema.index({ hotelId: 1, subFolioNumber: 1 }, { unique: true });
SeatSubFolioSchema.index({ hotelId: 1, tableId: 1, status: 1 });

export const SeatSubFolio = mongoose.model<ISeatSubFolio>('SeatSubFolio', SeatSubFolioSchema);
