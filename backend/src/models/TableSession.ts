import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  BILLING = 'BILLING',
  SETTLED = 'SETTLED',
  CLOSED = 'CLOSED'
}

export interface ITableSession extends Document {
  hotelId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionTokenHash: string; // Ephemeral cryptographic session token hash
  openedAt: Date;
  closedAt?: Date;
  guestCount: number;
  customerName?: string;
  customerPhone?: string;
  status: SessionStatus;
  seatNumbers?: number[];
  isCoDining?: boolean;
  seatLabel?: string;
  isMergedSession?: boolean;
  mergedTableIds?: Types.ObjectId[];
  mergedTableNumbers?: string[];
  mergedAt?: Date;
  mergedBy?: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TableSessionSchema = new Schema<ITableSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true, index: true },
    sessionTokenHash: { type: String, required: true, index: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    guestCount: { type: Number, default: 2, min: 1 },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.ACTIVE,
      index: true,
    },
    seatNumbers: [{ type: Number }],
    isCoDining: { type: Boolean, default: false },
    seatLabel: { type: String, trim: true },
    isMergedSession: { type: Boolean, default: false, index: true },
    mergedTableIds: [{ type: Schema.Types.ObjectId, ref: 'DiningTable' }],
    mergedTableNumbers: [{ type: String }],
    mergedAt: { type: Date },
    mergedBy: { type: String, trim: true },
    totalAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const TableSession = mongoose.model<ITableSession>('TableSession', TableSessionSchema);
