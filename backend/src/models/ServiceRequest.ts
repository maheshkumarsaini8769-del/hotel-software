import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ServiceRequestType {
  WATER = 'WATER',
  CALL_WAITER = 'CALL_WAITER',
  BILL = 'BILL',
  CUTLERY = 'CUTLERY',
  CLEANING = 'CLEANING',
  ROOM_CLEANING = 'ROOM_CLEANING',
  TOWEL_REPLENISH = 'TOWEL_REPLENISH',
  LUGGAGE_ASSIST = 'LUGGAGE_ASSIST',
  EXTRA_CHAIR = 'EXTRA_CHAIR',
  ASSISTANCE = 'ASSISTANCE',
  HOUSEKEEPING = 'HOUSEKEEPING',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ServiceRequestPriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ServiceRequestStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ESCALATED_FALLBACK = 'ESCALATED_FALLBACK'
}

export enum RoutingLevel {
  ASSIGNED_STAFF = 'ASSIGNED_STAFF',
  SECTION_FALLBACK = 'SECTION_FALLBACK',
  GLOBAL_FALLBACK = 'GLOBAL_FALLBACK',
  ADMIN_ESCALATION = 'ADMIN_ESCALATION'
}

export interface IServiceRequest extends Document {
  hotelId: Types.ObjectId;
  sourceType: 'TABLE_SESSION' | 'HOTEL_STAY';
  tableId?: Types.ObjectId;
  tableSessionId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  stayId?: Types.ObjectId;
  requestType: ServiceRequestType;
  priority: ServiceRequestPriority;
  assignedUserId?: Types.ObjectId;
  routingLevel: RoutingLevel;
  status: ServiceRequestStatus;
  notes?: string;
  slaMinutes: number;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  escalatedAt?: Date;
  reassignmentHistory: Array<{
    fromUserId?: Types.ObjectId;
    toUserId?: Types.ObjectId;
    reason: string;
    timestamp: Date;
  }>;
}

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sourceType: { type: String, enum: ['TABLE_SESSION', 'HOTEL_STAY'], default: 'TABLE_SESSION', index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', index: true },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession', index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', index: true },
    requestType: {
      type: String,
      enum: Object.values(ServiceRequestType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(ServiceRequestPriority),
      default: ServiceRequestPriority.NORMAL,
    },
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    routingLevel: {
      type: String,
      enum: Object.values(RoutingLevel),
      default: RoutingLevel.ASSIGNED_STAFF,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ServiceRequestStatus),
      default: ServiceRequestStatus.CREATED,
      index: true,
    },
    notes: { type: String, trim: true },
    slaMinutes: { type: Number, default: 3 }, // 3 minutes SLA threshold
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    escalatedAt: { type: Date },
    reassignmentHistory: [
      {
        fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ServiceRequestSchema.index({ hotelId: 1, status: 1, createdAt: -1 });

export const ServiceRequest = mongoose.model<IServiceRequest>('ServiceRequest', ServiceRequestSchema);
