import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  stayImageUrl?: string;
  diningImageUrl?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  googleMapUrl?: string;
  locationNotes?: string;
  photos?: string[];
  tagline?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  gstin?: string;
  fssai?: string;
  primaryColor?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    tagline?: string;
  };
  wifiSsid?: string;
  wifiPassword?: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  subscriptionPlanId?: Types.ObjectId;
  subscriptionPlanCode?: string;
  subscriptionPlanName?: string;
  subscriptionMonthlyINR?: number;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  customPricingAdjustmentINR?: number;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionDurationMonths?: number;
  maxRooms?: number;
  maxTables?: number;
  subscription?: {
    billingCycle: 'MONTHLY' | 'ANNUAL';
    monthlyRateINR: number;
    annualRateINR: number;
    effectiveRateINR: number;
    customPricingAdjustmentINR: number;
    cycleStartDate?: Date;
    nextBillingDate?: Date;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    durationMonths?: number;
    lastPaymentDate?: Date;
    paymentStatus?: 'PAID' | 'PENDING' | 'OVERDUE';
  };
  enabledPortals: string[];
  featureFlags: {
    pmsEnabled: boolean;
    kdsEnabled: boolean;
    qrDineInEnabled: boolean;
    roomServiceEnabled: boolean;
    waiterEnabled: boolean;
    posEnabled: boolean;
    banquetEnabled: boolean;
    loyaltyEnabled: boolean;
    aiInsightsEnabled: boolean;
    tallyExportEnabled: boolean;
  };
  taxConfig?: {
    cgstPercent?: number;
    sgstPercent?: number;
    serviceChargePercent?: number;
    roomGstUnderThresholdPercent?: number;
    roomGstAboveThresholdPercent?: number;
    roomGstTariffThreshold?: number;
    roundOffBills?: boolean;
    autoPrintKot?: boolean;
    kotSoundAlert?: boolean;
    smsReceipts?: boolean;
    whatsappReceipts?: boolean;
    autoCloseShiftTime?: string;
    billFooterNote?: string;
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
    coverImageUrl: { type: String },
    stayImageUrl: { type: String },
    diningImageUrl: { type: String },
    coordinates: {
      latitude: { type: Number, default: 26.9124 },
      longitude: { type: Number, default: 75.7873 },
    },
    googleMapUrl: { type: String, trim: true },
    locationNotes: { type: String, trim: true },
    photos: { type: [String], default: [] },
    tagline: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
    },
    gstin: { type: String, uppercase: true, trim: true },
    fssai: { type: String, trim: true },
    primaryColor: { type: String, trim: true, default: '#f97316' },
    branding: {
      primaryColor: { type: String, trim: true },
      secondaryColor: { type: String, trim: true },
      logoUrl: { type: String },
      tagline: { type: String },
    },
    wifiSsid: { type: String, trim: true, default: 'TajGateway_HighSpeed' },
    wifiPassword: { type: String, trim: true, default: 'SpiceGuest@2026' },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'TRIAL'],
      default: 'TRIAL',
      index: true,
    },
    subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    subscriptionPlanCode: { type: String, uppercase: true, trim: true },
    subscriptionPlanName: { type: String, trim: true },
    subscriptionMonthlyINR: { type: Number, default: 0, min: 0 },
    billingCycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    customPricingAdjustmentINR: { type: Number, default: 0 },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    subscriptionDurationMonths: { type: Number, default: 1 },
    maxRooms: { type: Number, default: 30, min: 1 },
    maxTables: { type: Number, default: 20, min: 1 },
    enabledPortals: {
      type: [String],
      default: ['admin', 'cashier', 'reception', 'kds', 'waiter', 'customer', 'guest'],
      index: true,
    },
    featureFlags: {
      pmsEnabled: { type: Boolean, default: true },
      kdsEnabled: { type: Boolean, default: true },
      qrDineInEnabled: { type: Boolean, default: true },
      roomServiceEnabled: { type: Boolean, default: true },
      waiterEnabled: { type: Boolean, default: true },
      posEnabled: { type: Boolean, default: true },
      banquetEnabled: { type: Boolean, default: true },
      loyaltyEnabled: { type: Boolean, default: true },
      aiInsightsEnabled: { type: Boolean, default: false },
      tallyExportEnabled: { type: Boolean, default: true },
    },
    subscription: {
      billingCycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
      monthlyRateINR: { type: Number, default: 0 },
      annualRateINR: { type: Number, default: 0 },
      effectiveRateINR: { type: Number, default: 0 },
      customPricingAdjustmentINR: { type: Number, default: 0 },
      cycleStartDate: { type: Date, default: Date.now },
      nextBillingDate: { type: Date },
      subscriptionStartDate: { type: Date },
      subscriptionEndDate: { type: Date },
      durationMonths: { type: Number, default: 1 },
      lastPaymentDate: { type: Date },
      paymentStatus: { type: String, enum: ['PAID', 'PENDING', 'OVERDUE'], default: 'PAID' },
    },
    taxConfig: {
      cgstPercent: { type: Number, default: 2.5, min: 0, max: 14 },
      sgstPercent: { type: Number, default: 2.5, min: 0, max: 14 },
      serviceChargePercent: { type: Number, default: 5.0, min: 0, max: 20 },
      roomGstUnderThresholdPercent: { type: Number, default: 12, min: 0, max: 28 },
      roomGstAboveThresholdPercent: { type: Number, default: 18, min: 0, max: 28 },
      roomGstTariffThreshold: { type: Number, default: 7500, min: 0 },
      roundOffBills: { type: Boolean, default: true },
      autoPrintKot: { type: Boolean, default: true },
      kotSoundAlert: { type: Boolean, default: true },
      smsReceipts: { type: Boolean, default: true },
      whatsappReceipts: { type: Boolean, default: true },
      autoCloseShiftTime: { type: String, default: '02:00 AM' },
      billFooterNote: {
        type: String,
        trim: true,
        default: 'Thank you for dining with us! All prices subject to GST.',
      },
    },
  },
  { timestamps: true }
);

/**
 * Single Source of Truth Enforcement Hook:
 * enabledPortals -> featureFlags auto-synchronization
 * Guarantees zero-drift between enabledPortals array and boolean feature flags.
 */
TenantSchema.pre('save', function (next) {
  if (Array.isArray(this.enabledPortals)) {
    // Hotel Admin ERP is the required base portal
    if (!this.enabledPortals.includes('admin')) {
      this.enabledPortals.unshift('admin');
    }
    // Deduplicate portals array
    this.enabledPortals = Array.from(new Set(this.enabledPortals));

    if (!this.featureFlags) {
      (this as any).featureFlags = {} as any;
    }

    this.featureFlags.pmsEnabled = this.enabledPortals.includes('reception');
    this.featureFlags.posEnabled = this.enabledPortals.includes('cashier');
    this.featureFlags.kdsEnabled = this.enabledPortals.includes('kds');
    this.featureFlags.waiterEnabled = this.enabledPortals.includes('waiter');
    this.featureFlags.qrDineInEnabled = this.enabledPortals.includes('customer');
    this.featureFlags.roomServiceEnabled = this.enabledPortals.includes('guest');
  }

  // Synchronize structured subscription object
  const monthly = this.subscriptionMonthlyINR || 0;
  const cycle = (this.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as 'MONTHLY' | 'ANNUAL';
  const adj = this.customPricingAdjustmentINR || 0;
  const annual = monthly * 10;
  const effective = cycle === 'ANNUAL' ? annual : monthly;

  const existingSub = this.subscription || ({} as any);
  const start = this.subscriptionStartDate || existingSub.subscriptionStartDate || existingSub.cycleStartDate || (this as any).createdAt || new Date();
  
  const durationMonths = this.subscriptionDurationMonths || existingSub.durationMonths || (cycle === 'ANNUAL' ? 12 : 1);
  let end = this.subscriptionEndDate || existingSub.subscriptionEndDate || existingSub.nextBillingDate;
  if (!end) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + durationMonths);
    end = d;
  }

  this.subscriptionStartDate = start;
  this.subscriptionEndDate = end;
  this.subscriptionDurationMonths = durationMonths;

  this.subscription = {
    billingCycle: cycle,
    monthlyRateINR: monthly,
    annualRateINR: annual,
    effectiveRateINR: effective,
    customPricingAdjustmentINR: adj,
    cycleStartDate: start,
    nextBillingDate: end,
    subscriptionStartDate: start,
    subscriptionEndDate: end,
    durationMonths,
    paymentStatus: existingSub.paymentStatus || 'PAID',
    lastPaymentDate: existingSub.lastPaymentDate || new Date(),
  };

  next();
});

/**
 * Single Source of Truth Enforcement Hook for findOneAndUpdate:
 * Guarantees zero-drift between enabledPortals array and boolean feature flags.
 */
TenantSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (!update) return next();

  const enabledPortals = update.enabledPortals || update.$set?.enabledPortals;
  if (Array.isArray(enabledPortals)) {
    if (!enabledPortals.includes('admin')) {
      enabledPortals.unshift('admin');
    }
    const uniquePortals = Array.from(new Set(enabledPortals));
    if (update.enabledPortals) update.enabledPortals = uniquePortals;
    if (update.$set?.enabledPortals) update.$set.enabledPortals = uniquePortals;

    const flagSync = {
      pmsEnabled: uniquePortals.includes('reception'),
      posEnabled: uniquePortals.includes('cashier'),
      kdsEnabled: uniquePortals.includes('kds'),
      waiterEnabled: uniquePortals.includes('waiter'),
      qrDineInEnabled: uniquePortals.includes('customer'),
      roomServiceEnabled: uniquePortals.includes('guest'),
    };

    if (update.featureFlags) {
      update.featureFlags = { ...update.featureFlags, ...flagSync };
    } else if (update.$set?.featureFlags) {
      update.$set.featureFlags = { ...update.$set.featureFlags, ...flagSync };
    } else {
      if (!update.$set) update.$set = {};
      update.$set['featureFlags.pmsEnabled'] = flagSync.pmsEnabled;
      update.$set['featureFlags.posEnabled'] = flagSync.posEnabled;
      update.$set['featureFlags.kdsEnabled'] = flagSync.kdsEnabled;
      update.$set['featureFlags.waiterEnabled'] = flagSync.waiterEnabled;
      update.$set['featureFlags.qrDineInEnabled'] = flagSync.qrDineInEnabled;
      update.$set['featureFlags.roomServiceEnabled'] = flagSync.roomServiceEnabled;
    }
  }
  next();
});

TenantSchema.index({ contactEmail: 1 });
TenantSchema.index({ createdAt: -1 });

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
