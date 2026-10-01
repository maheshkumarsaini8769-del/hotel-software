import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  gstin?: string;
  fssai?: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  featureFlags: {
    pmsEnabled: boolean;
    kdsEnabled: boolean;
    qrDineInEnabled: boolean;
    roomServiceEnabled: boolean;
    banquetEnabled: boolean;
    loyaltyEnabled: boolean;
    aiInsightsEnabled: boolean;
    tallyExportEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    domain: { type: String, trim: true, lowercase: true },
    logoUrl: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
    },
    gstin: { type: String, uppercase: true, trim: true },
    fssai: { type: String, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'],
      default: 'TRIAL',
      index: true,
    },
    featureFlags: {
      pmsEnabled: { type: Boolean, default: true },
      kdsEnabled: { type: Boolean, default: true },
      qrDineInEnabled: { type: Boolean, default: true },
      roomServiceEnabled: { type: Boolean, default: true },
      banquetEnabled: { type: Boolean, default: true },
      loyaltyEnabled: { type: Boolean, default: true },
      aiInsightsEnabled: { type: Boolean, default: false },
      tallyExportEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
