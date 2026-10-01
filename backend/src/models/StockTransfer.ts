import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TransferStatus {
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface ITransferItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface IStockTransfer extends Document {
  hotelId: Types.ObjectId;
  transferNumber: string;
  sourceLocation: string;
  destinationLocation: string;
  items: ITransferItem[];
  transferredByUserId: Types.ObjectId;
  receivedByUserId?: Types.ObjectId;
  status: TransferStatus;
  notes?: string;
  dispatchedAt: Date;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransferItemSchema = new Schema<ITransferItem>(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.1 },
    unit: { type: String, required: true, default: 'kg' },
    unitCost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    transferNumber: { type: String, required: true, trim: true },
    sourceLocation: { type: String, required: true, trim: true },
    destinationLocation: { type: String, required: true, trim: true },
    items: [TransferItemSchema],
    transferredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(TransferStatus),
      default: TransferStatus.DISPATCHED,
      index: true,
    },
    notes: { type: String, trim: true },
    dispatchedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date },
  },
  { timestamps: true }
);

StockTransferSchema.index({ hotelId: 1, transferNumber: 1 }, { unique: true });

export const StockTransfer = mongoose.model<IStockTransfer>(
  'StockTransfer',
  StockTransferSchema
);
