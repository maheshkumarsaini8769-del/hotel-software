import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AlertType {
  CUSTOMER_CALL = 'CUSTOMER_CALL',
  QR_ORDER_PLACED = 'QR_ORDER_PLACED',
  BILL_REQUEST = 'BILL_REQUEST',
  CLEANING_REQUEST = 'CLEANING_REQUEST',
  WATER_REFILL = 'WATER_REFILL',
}

export enum AlertRoutingType {
  PRIMARY_TARGETED = 'PRIMARY_TARGETED',
  BACKUP_TARGETED = 'BACKUP_TARGETED',
  ZONE_BROADCAST = 'ZONE_BROADCAST',
  CAPTAIN_ESCALATION = 'CAPTAIN_ESCALATION',
}

export enum AlertPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ON_MY_WAY = 'ON_MY_WAY',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export interface ITargetedPushAlert extends Document {
  hotelId: Types.ObjectId;
  alertType: AlertType;
  tableId: Types.ObjectId;
  tableNumber: string;
  targetWaiterId?: Types.ObjectId;
  targetWaiterName?: string;
  routingType: AlertRoutingType;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  sentAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedByUserId?: Types.ObjectId;
  acknowledgedByName?: string;
  orderId?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TargetedPushAlertSchema = new Schema<ITargetedPushAlert>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    alertType: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
      default: AlertType.CUSTOMER_CALL,
    },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    targetWaiterId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    targetWaiterName: { type: String, trim: true },
    routingType: {
      type: String,
      enum: Object.values(AlertRoutingType),
      required: true,
      default: AlertRoutingType.PRIMARY_TARGETED,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: Object.values(AlertPriority),
      default: AlertPriority.NORMAL,
    },
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.SENT,
      index: true,
    },
    sentAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    acknowledgedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedByName: { type: String, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'RestaurantOrder' },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

TargetedPushAlertSchema.index({ hotelId: 1, targetWaiterId: 1, status: 1 });
TargetedPushAlertSchema.index({ hotelId: 1, tableNumber: 1, status: 1 });

export const TargetedPushAlert = mongoose.model<ITargetedPushAlert>(
  'TargetedPushAlert',
  TargetedPushAlertSchema
);
