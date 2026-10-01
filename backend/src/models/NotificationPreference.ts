import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AlertCategory {
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  KITCHEN_DELAY = 'KITCHEN_DELAY',
  NEGATIVE_REVIEW = 'NEGATIVE_REVIEW',
  VOID_COMPLIMENTARY = 'VOID_COMPLIMENTARY',
  CASH_DRAWER_SECURITY = 'CASH_DRAWER_SECURITY',
  VIP_CHECKIN = 'VIP_CHECKIN',
  HOUSEKEEPING_OVERDUE = 'HOUSEKEEPING_OVERDUE',
  RESERVATION_SURGE = 'RESERVATION_SURGE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
  SOUNDBOX = 'SOUNDBOX',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  DESKTOP_POPUP = 'DESKTOP_POPUP',
}

export interface ISubscriptionToggle {
  category: AlertCategory;
  enabled: boolean;
  minThreshold: number; // e.g., amount for transactions, minutes for delays, rating for reviews
  channels: NotificationChannel[];
  soundChime: boolean;
  urgentVibration: boolean;
}

export interface IQuietHoursConfig {
  enabled: boolean;
  startTime: string; // e.g. "23:00"
  endTime: string; // e.g. "06:00"
  allowCriticalOnly: boolean;
}

export interface INotificationPreference extends Document {
  hotelId: Types.ObjectId;
  userId: Types.ObjectId;
  role: string;
  subscriptions: ISubscriptionToggle[];
  quietHours: IQuietHoursConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionToggleSchema = new Schema<ISubscriptionToggle>(
  {
    category: {
      type: String,
      enum: Object.values(AlertCategory),
      required: true,
    },
    enabled: { type: Boolean, default: true },
    minThreshold: { type: Number, default: 0 },
    channels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
        default: [NotificationChannel.IN_APP],
      },
    ],
    soundChime: { type: Boolean, default: true },
    urgentVibration: { type: Boolean, default: false },
  },
  { _id: false }
);

const QuietHoursSchema = new Schema<IQuietHoursConfig>(
  {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '23:00' },
    endTime: { type: String, default: '06:00' },
    allowCriticalOnly: { type: Boolean, default: true },
  },
  { _id: false }
);

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    subscriptions: { type: [SubscriptionToggleSchema], default: [] },
    quietHours: { type: QuietHoursSchema, default: () => ({ enabled: false, startTime: '23:00', endTime: '06:00', allowCriticalOnly: true }) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound unique index per hotel and user
NotificationPreferenceSchema.index({ hotelId: 1, userId: 1 }, { unique: true });

export const NotificationPreference = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  NotificationPreferenceSchema
);
