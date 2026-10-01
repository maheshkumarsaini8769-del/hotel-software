import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string; // 'STARTER', 'GROWTH', 'ENTERPRISE'
  code: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  limits: {
    maxRooms: number;
    maxTables: number;
    maxStaffUsers: number;
  };
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    monthlyPriceINR: { type: Number, required: true, min: 0 },
    annualPriceINR: { type: Number, required: true, min: 0 },
    limits: {
      maxRooms: { type: Number, default: 20 },
      maxTables: { type: Number, default: 10 },
      maxStaffUsers: { type: Number, default: 5 },
    },
    featureFlags: {
      pmsEnabled: { type: Boolean, default: true },
      kdsEnabled: { type: Boolean, default: true },
      qrDineInEnabled: { type: Boolean, default: true },
      roomServiceEnabled: { type: Boolean, default: true },
      banquetEnabled: { type: Boolean, default: false },
      loyaltyEnabled: { type: Boolean, default: false },
      aiInsightsEnabled: { type: Boolean, default: false },
      tallyExportEnabled: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
