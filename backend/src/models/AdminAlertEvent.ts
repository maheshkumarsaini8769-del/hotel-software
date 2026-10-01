import mongoose, { Schema, Document, Types } from 'mongoose';
import { AlertCategory, NotificationChannel } from './NotificationPreference';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

export enum AlertEventStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export interface IAdminAlertEvent extends Document {
  hotelId: Types.ObjectId;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  payload?: Record<string, any>;
  triggeredBy: string;
  notifiedUserIds: Types.ObjectId[];
  deliveredChannels: NotificationChannel[];
  soundboxDispatched: boolean;
  soundboxSpeech?: string;
  status: AlertEventStatus;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedByName?: string;
  acknowledgedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminAlertEventSchema = new Schema<IAdminAlertEvent>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    category: {
      type: String,
      enum: Object.values(AlertCategory),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AlertSeverity),
      default: AlertSeverity.INFO,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    triggeredBy: { type: String, default: 'SYSTEM' },
    notifiedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredChannels: [
      {
        type: String,
        enum: Object.values(NotificationChannel),
      },
    ],
    soundboxDispatched: { type: Boolean, default: false },
    soundboxSpeech: { type: String },
    status: {
      type: String,
      enum: Object.values(AlertEventStatus),
      default: AlertEventStatus.ACTIVE,
      index: true,
    },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedByName: { type: String },
    acknowledgedAt: { type: Date },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
);

AdminAlertEventSchema.index({ hotelId: 1, createdAt: -1 });
AdminAlertEventSchema.index({ hotelId: 1, status: 1 });

export const AdminAlertEvent = mongoose.model<IAdminAlertEvent>(
  'AdminAlertEvent',
  AdminAlertEventSchema
);
