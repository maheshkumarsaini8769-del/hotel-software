import mongoose, { Schema, Document, Types } from 'mongoose';

export enum VIPTier {
  REGULAR = 'REGULAR',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  PLATINUM_VIP = 'PLATINUM_VIP',
  VIP = 'VIP'
}

export interface IGuestProfile extends Document {
  hotelId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  vipTier: VIPTier;
  allergies: string[];
  dietaryPreferences: string[];
  specialNotes?: string;
  dateOfBirth?: Date;
  anniversaryDate?: Date;
  totalVisits: number;
  totalLifetimeSpend: number;
  lastVisitDate?: Date;
  idNumberMasked?: string;
  idType?: string;
  isVerified?: boolean;
  lastVerifiedDate?: Date;
  loyaltyPointsBalance: number;
  pointsEarnedLifetime: number;
  pointsRedeemedLifetime: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GuestProfileSchema = new Schema<IGuestProfile>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    vipTier: {
      type: String,
      enum: Object.values(VIPTier),
      default: VIPTier.REGULAR,
      index: true,
    },
    allergies: [{ type: String, trim: true }],
    dietaryPreferences: [{ type: String, trim: true }],
    specialNotes: { type: String },
    dateOfBirth: { type: Date },
    anniversaryDate: { type: Date },
    totalVisits: { type: Number, default: 0, min: 0 },
    totalLifetimeSpend: { type: Number, default: 0, min: 0 },
    lastVisitDate: { type: Date },
    idNumberMasked: { type: String, trim: true },
    idType: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    lastVerifiedDate: { type: Date },
    loyaltyPointsBalance: { type: Number, default: 0, min: 0 },
    pointsEarnedLifetime: { type: Number, default: 0, min: 0 },
    pointsRedeemedLifetime: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

GuestProfileSchema.index({ hotelId: 1, phone: 1 }, { unique: true });
GuestProfileSchema.index({ hotelId: 1, vipTier: 1 });

export const GuestProfile = mongoose.model<IGuestProfile>('GuestProfile', GuestProfileSchema);
