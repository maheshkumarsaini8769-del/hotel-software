import mongoose, { Schema, Document, Types } from 'mongoose';

export enum KeycardVoidReason {
  CHECKOUT = 'CHECKOUT',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  MANUAL_REVOCATION = 'MANUAL_REVOCATION',
}

export interface IKeycardVoidAudit extends Document {
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  roomNumber: string;
  stayId?: Types.ObjectId;
  keyCardNumber: string;
  voidReason: KeycardVoidReason;
  voidedByUserId?: Types.ObjectId;
  voidedAt: Date;
  hardwareRevoked: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KeycardVoidAuditSchema = new Schema<IKeycardVoidAudit>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    roomNumber: { type: String, required: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', index: true },
    keyCardNumber: { type: String, required: true, index: true },
    voidReason: {
      type: String,
      enum: Object.values(KeycardVoidReason),
      default: KeycardVoidReason.CHECKOUT,
      index: true,
    },
    voidedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date, default: Date.now },
    hardwareRevoked: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

KeycardVoidAuditSchema.index({ hotelId: 1, roomId: 1, createdAt: -1 });

export const KeycardVoidAudit = mongoose.model<IKeycardVoidAudit>('KeycardVoidAudit', KeycardVoidAuditSchema);
