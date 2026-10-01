import mongoose, { Schema, Document, Types } from 'mongoose';

export enum LoyaltyTxType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  BONUS = 'BONUS',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRE = 'EXPIRE'
}

export enum LoyaltyReferenceType {
  RESTAURANT_BILL = 'RESTAURANT_BILL',
  ROOM_FOLIO = 'ROOM_FOLIO',
  MANUAL = 'MANUAL',
  CAMPAIGN = 'CAMPAIGN'
}

export interface ILoyaltyTransaction extends Document {
  hotelId: Types.ObjectId;
  guestProfileId: Types.ObjectId;
  transactionType: LoyaltyTxType;
  points: number; // positive for earn/bonus, positive for redeem amount
  conversionRate: number; // e.g. 1 point = $1
  monetaryEquivalent: number;
  referenceType: LoyaltyReferenceType;
  referenceId?: Types.ObjectId;
  balanceAfter: number;
  notes?: string;
  processedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    guestProfileId: { type: Schema.Types.ObjectId, ref: 'GuestProfile', required: true, index: true },
    transactionType: {
      type: String,
      enum: Object.values(LoyaltyTxType),
      required: true,
      index: true,
    },
    points: { type: Number, required: true, min: 1 },
    conversionRate: { type: Number, default: 1, min: 0 },
    monetaryEquivalent: { type: Number, required: true, min: 0 },
    referenceType: {
      type: String,
      enum: Object.values(LoyaltyReferenceType),
      default: LoyaltyReferenceType.MANUAL,
    },
    referenceId: { type: Schema.Types.ObjectId },
    balanceAfter: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    processedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LoyaltyTransactionSchema.index({ hotelId: 1, guestProfileId: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', LoyaltyTransactionSchema);
