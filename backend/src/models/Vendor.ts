import mongoose, { Schema, Document, Types } from 'mongoose';

export enum VendorCategory {
  FOOD_BEVERAGE = 'FOOD_BEVERAGE',
  DAIRY = 'DAIRY',
  MEAT_POULTRY = 'MEAT_POULTRY',
  DRY_GROCERY = 'DRY_GROCERY',
  HOUSEKEEPING_CHEMICALS = 'HOUSEKEEPING_CHEMICALS',
  PACKAGING = 'PACKAGING',
  BEVERAGES_LIQUOR = 'BEVERAGES_LIQUOR',
  GENERAL_SUPPLIES = 'GENERAL_SUPPLIES',
}

export enum PaymentTerms {
  IMMEDIATE = 'IMMEDIATE',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_60 = 'NET_60',
}

export interface IVendor extends Document {
  hotelId: Types.ObjectId;
  vendorCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin?: string;
  category: VendorCategory;
  paymentTerms: PaymentTerms;
  address?: string;
  rating: number; // 1 to 5
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    vendorCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    category: {
      type: String,
      enum: Object.values(VendorCategory),
      default: VendorCategory.FOOD_BEVERAGE,
      index: true,
    },
    paymentTerms: {
      type: String,
      enum: Object.values(PaymentTerms),
      default: PaymentTerms.NET_30,
    },
    address: { type: String, trim: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

VendorSchema.index({ hotelId: 1, vendorCode: 1 }, { unique: true });
VendorSchema.index({ hotelId: 1, name: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
