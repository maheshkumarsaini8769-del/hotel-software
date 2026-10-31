import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromoCode extends Document {
  hotelId: Types.ObjectId;
  code: string; // e.g. WELCOME10
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number; // e.g. 10 (%) or 200 (INR)
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
  usageCount: number;
  maxUsageLimit?: number;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: 'PERCENTAGE' },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number },
    isActive: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date, default: () => new Date(Date.now() + 365 * 86400000) },
    usageCount: { type: Number, default: 0 },
    maxUsageLimit: { type: Number },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ hotelId: 1, code: 1 }, { unique: true });

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
