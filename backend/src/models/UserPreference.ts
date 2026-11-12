import mongoose, { Document, Schema, Types } from 'mongoose';

export type PreferenceTheme = 'light' | 'dark' | 'system';
export type PreferenceDateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type PreferenceFontSize = 'small' | 'medium' | 'large';

export interface IUserPreference extends Document {
  userId: Types.ObjectId;
  hotelId?: Types.ObjectId;
  general: {
    language: 'en' | 'hi';
    timezone: string;
    dateFormat: PreferenceDateFormat;
  };
  appearance: {
    theme: PreferenceTheme;
    primaryColor: string;
    fontSize: PreferenceFontSize;
    sidebarCollapsed: boolean;
  };
  notifications: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    soundAlerts: boolean;
    desktopPush: boolean;
  };
  print: {
    thermalPrinterWidth: '58mm' | '80mm';
    printHeaderWithLogo: boolean;
    printKotSeparately: boolean;
    autoPrintAfterOrder: boolean;
    footerText: string;
  };
  workstation: {
    shiftStartTime: string;
    shiftEndTime: string;
    showTaxBreakdown: boolean;
    checkInFlow: 'guided' | 'quick';
    soundVolume: number;
    displayDensity: 'comfortable' | 'compact';
    stationName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    general: {
      language: { type: String, enum: ['en', 'hi'], default: 'en' },
      timezone: { type: String, default: 'Asia/Kolkata', trim: true, maxlength: 100 },
      dateFormat: { type: String, enum: ['DD/MM/YYYY', 'MM/DD/YYYY'], default: 'DD/MM/YYYY' },
    },
    appearance: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      primaryColor: { type: String, default: '#2563EB', match: /^#[0-9A-Fa-f]{6}$/ },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      sidebarCollapsed: { type: Boolean, default: false },
    },
    notifications: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      soundAlerts: { type: Boolean, default: true },
      desktopPush: { type: Boolean, default: false },
    },
    print: {
      thermalPrinterWidth: { type: String, enum: ['58mm', '80mm'], default: '80mm' },
      printHeaderWithLogo: { type: Boolean, default: true },
      printKotSeparately: { type: Boolean, default: true },
      autoPrintAfterOrder: { type: Boolean, default: false },
      footerText: { type: String, trim: true, maxlength: 250, default: '' },
    },
    workstation: {
      shiftStartTime: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      shiftEndTime: { type: String, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      showTaxBreakdown: { type: Boolean, default: true },
      checkInFlow: { type: String, enum: ['guided', 'quick'], default: 'guided' },
      soundVolume: { type: Number, min: 0, max: 100, default: 70 },
      displayDensity: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
      stationName: { type: String, trim: true, maxlength: 80, default: '' },
    },
  },
  { timestamps: true }
);

export const UserPreference = mongoose.model<IUserPreference>('UserPreference', UserPreferenceSchema);
