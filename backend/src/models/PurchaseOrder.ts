import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IPoItem {
  itemName: string;
  sku?: string;
  category?: string;
  orderQuantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number; // e.g. 5, 12, 18
  totalAmount: number;
  receivedQuantity: number;
}

export interface IPurchaseOrder extends Document {
  hotelId: Types.ObjectId;
  poNumber: string;
  vendorId: Types.ObjectId;
  status: PurchaseOrderStatus;
  items: IPoItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  expectedDeliveryDate?: Date;
  deliveryLocation: string;
  notes?: string;
  approvedByUserId?: Types.ObjectId;
  approvedAt?: Date;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PoItemSchema = new Schema<IPoItem>(
  {
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, trim: true },
    orderQuantity: { type: Number, required: true, min: 0.1 },
    unit: { type: String, required: true, default: 'kg' },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 5, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    poNumber: { type: String, required: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(PurchaseOrderStatus),
      default: PurchaseOrderStatus.PENDING_APPROVAL,
      index: true,
    },
    items: [PoItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: { type: Date },
    deliveryLocation: { type: String, default: 'Central Store Receiving Dock' },
    notes: { type: String, trim: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ hotelId: 1, poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ hotelId: 1, status: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
