import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BatchFreshnessStatus {
  FRESH = 'FRESH',
  EXPIRING_SOON = 'EXPIRING_SOON', // Within 3 days
  EXPIRED = 'EXPIRED',
}

export interface IStockBatch extends Document {
  hotelId: Types.ObjectId;
  batchNumber: string;
  itemName: string;
  category: string;
  currentQuantity: number;
  unit: string;
  unitCost: number;
  location: string; // e.g. 'Central Cold Room A', 'Bakery Deep Freezer'
  mfgDate: Date;
  expiryDate: Date;
  status: BatchFreshnessStatus;
  createdAt: Date;
  updatedAt: Date;
}

const StockBatchSchema = new Schema<IStockBatch>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: 'General Supplies' },
    currentQuantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'kg' },
    unitCost: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    mfgDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(BatchFreshnessStatus),
      default: BatchFreshnessStatus.FRESH,
      index: true,
    },
  },
  { timestamps: true }
);

StockBatchSchema.index({ hotelId: 1, itemName: 1, expiryDate: 1 }); // FEFO index!
StockBatchSchema.index({ hotelId: 1, batchNumber: 1 }, { unique: true });

export const StockBatch = mongoose.model<IStockBatch>('StockBatch', StockBatchSchema);
