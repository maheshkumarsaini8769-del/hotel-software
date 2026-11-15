import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffAppBranding {
  backgroundImageUrl: string;
  heroImageUrl: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  badgeText: string;
  cardTheme: 'luxury-dark' | 'glass-emerald' | 'royal-palace' | 'clean-light';
  overlayOpacity: number;
  accentColor: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface IPlatformBranding extends Document {
  key: string;
  staffAppBranding: IStaffAppBranding;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_STAFF_APP_BRANDING: IStaffAppBranding = {
  backgroundImageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2000&auto=format&fit=crop',
  heroImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop',
  welcomeTitle: 'SpiceHub Staff Workstation',
  welcomeSubtitle: 'Enter your hotel code provided by your administration to view visible portals and sign in with your staff PIN.',
  badgeText: 'SPICEHUB ENTERPRISE • HOSPITALITY WORKSTATION',
  cardTheme: 'luxury-dark',
  overlayOpacity: 0.75,
  accentColor: '#16A34A',
  updatedAt: new Date(),
};

const StaffAppBrandingSubSchema = new Schema<IStaffAppBranding>(
  {
    backgroundImageUrl: {
      type: String,
      default: DEFAULT_STAFF_APP_BRANDING.backgroundImageUrl,
      trim: true,
    },
    heroImageUrl: {
      type: String,
      default: DEFAULT_STAFF_APP_BRANDING.heroImageUrl,
      trim: true,
    },
    welcomeTitle: {
      type: String,
      default: DEFAULT_STAFF_APP_BRANDING.welcomeTitle,
      trim: true,
    },
    welcomeSubtitle: {
      type: String,
      default: DEFAULT_STAFF_APP_BRANDING.welcomeSubtitle,
      trim: true,
    },
    badgeText: {
      type: String,
      default: DEFAULT_STAFF_APP_BRANDING.badgeText,
      trim: true,
    },
    cardTheme: {
      type: String,
      enum: ['luxury-dark', 'glass-emerald', 'royal-palace', 'clean-light'],
      default: 'luxury-dark',
    },
    overlayOpacity: {
      type: Number,
      default: 0.75,
      min: 0.1,
      max: 0.98,
    },
    accentColor: {
      type: String,
      default: '#16A34A',
      trim: true,
    },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, trim: true },
  },
  { _id: false }
);

const PlatformBrandingSchema = new Schema<IPlatformBranding>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'platform_branding_config',
      index: true,
    },
    staffAppBranding: {
      type: StaffAppBrandingSubSchema,
      default: () => ({ ...DEFAULT_STAFF_APP_BRANDING }),
    },
  },
  { timestamps: true }
);

export const PlatformBranding = mongoose.model<IPlatformBranding>(
  'PlatformBranding',
  PlatformBrandingSchema
);
