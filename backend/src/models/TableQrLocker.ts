import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITableQrLocker extends Document {
  hotelId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: string;
  permanentSalt: string;
  permanentQrUrl: string;
  activeSessionToken?: string;
  sessionCreatedAt?: Date;
  sessionExpiresAt?: Date;
  deviceFingerprint?: string;
  clientIp?: string;
  isLocked: boolean;
  assignedWaiterId?: Types.ObjectId;
  assignedWaiterName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TableQrLockerSchema = new Schema<ITableQrLocker>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    permanentSalt: { type: String, required: true },
    permanentQrUrl: { type: String, required: true },
    activeSessionToken: { type: String, index: true },
    sessionCreatedAt: { type: Date },
    sessionExpiresAt: { type: Date },
    deviceFingerprint: { type: String },
    clientIp: { type: String },
    isLocked: { type: Boolean, default: false },
    assignedWaiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedWaiterName: { type: String, trim: true },
  },
  { timestamps: true }
);

TableQrLockerSchema.index({ hotelId: 1, tableNumber: 1 }, { unique: true });
TableQrLockerSchema.index({ hotelId: 1, activeSessionToken: 1 });

export const TableQrLocker = mongoose.model<ITableQrLocker>('TableQrLocker', TableQrLockerSchema);
