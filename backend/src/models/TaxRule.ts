import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TaxType {
  GST = 'GST',
  VAT = 'VAT',
  SERVICE_CHARGE = 'SERVICE_CHARGE',
  CUSTOM = 'CUSTOM',
}

export enum TaxApplicability {
  RESTAURANT_DINE_IN = 'RESTAURANT_DINE_IN',
  ROOM_SERVICE = 'ROOM_SERVICE',
  TAKEAWAY = 'TAKEAWAY',
  ROOM_STAY = 'ROOM_STAY',
  BANQUET = 'BANQUET',
  ALL = 'ALL',
}

export interface ITaxRule extends Document {
  hotelId: Types.ObjectId;
  taxName: string;
  taxType: TaxType;
  applicableTo: TaxApplicability;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  serviceChargeRate: number;
  totalEffectiveRate: number;
  isDefault: boolean;
  isActive: boolean;
  hsnCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaxRuleSchema = new Schema<ITaxRule>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    taxName: { type: String, required: true, trim: true },
    taxType: {
      type: String,
      enum: Object.values(TaxType),
      default: TaxType.GST,
    },
    applicableTo: {
      type: String,
      enum: Object.values(TaxApplicability),
      default: TaxApplicability.RESTAURANT_DINE_IN,
      index: true,
    },
    cgstRate: { type: Number, default: 2.5, min: 0 },
    sgstRate: { type: Number, default: 2.5, min: 0 },
    igstRate: { type: Number, default: 0, min: 0 },
    serviceChargeRate: { type: Number, default: 0, min: 0 },
    totalEffectiveRate: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    hsnCodes: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

TaxRuleSchema.index({ hotelId: 1, applicableTo: 1, isActive: 1 });

export const TaxRule = mongoose.model<ITaxRule>('TaxRule', TaxRuleSchema);
