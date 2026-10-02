import mongoose, { Schema, Document, Types } from 'mongoose';

export enum GrnInspectionStatus {
  VERIFIED = 'VERIFIED',
  FLAGGED_DISCREPANCY = 'FLAGGED_DISCREPANCY',
  REJECTED = 'REJECTED',
}

export interface IGrnReceivedItem {
  itemName: string;
  sku?: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  unit: string;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface IGoodsReceivedNote extends Document {
  hotelId: Types.ObjectId;
  grnNumber: string;
  poId: Types.ObjectId;
  vendorId: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  receivedItems: IGrnReceivedItem[];
  totalAcceptedAmount: number;
  totalTaxAmount: number;
  finalInvoiceAmount: number;
  inspectorUserId: Types.ObjectId;
  status: GrnInspectionStatus;
  dockNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GrnReceivedItemSchema = new Schema<IGrnReceivedItem>(
  {
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    orderedQty: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, required: true, min: 0 },
    acceptedQty: { type: Number, required: true, min: 0 },
    rejectedQty: { type: Number, default: 0, min: 0 },
    rejectionReason: { type: String, trim: true },
    unit: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 5, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const GoodsReceivedNoteSchema = new Schema<IGoodsReceivedNote>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    grnNumber: { type: String, required: true, trim: true },
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    receivedItems: [GrnReceivedItemSchema],
    totalAcceptedAmount: { type: Number, required: true, min: 0 },
    totalTaxAmount: { type: Number, required: true, min: 0 },
    finalInvoiceAmount: { type: Number, required: true, min: 0 },
    inspectorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(GrnInspectionStatus),
      default: GrnInspectionStatus.VERIFIED,
      index: true,
    },
    dockNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

GoodsReceivedNoteSchema.index({ hotelId: 1, grnNumber: 1 }, { unique: true });
GoodsReceivedNoteSchema.index({ hotelId: 1, poId: 1 });

export const GoodsReceivedNote = mongoose.model<IGoodsReceivedNote>('GoodsReceivedNote', GoodsReceivedNoteSchema);
