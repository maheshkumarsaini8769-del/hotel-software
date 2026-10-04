import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY'
}

export enum MaintenanceStatus {
  REPORTED = 'REPORTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface IMaintenancePart {
  partName: string;
  cost: number;
  quantity: number;
}

export interface IMaintenanceRequest extends Document {
  hotelId: Types.ObjectId;
  ticketNumber: string;
  title: string;
  description: string;
  category: 'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'CARPENTRY' | 'ELECTRONICS' | 'GENERAL';
  priority: MaintenancePriority;
  assetId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  blocksRoom: boolean;
  reportedByUserId: Types.ObjectId;
  assignedTechnicianId?: Types.ObjectId;
  assignedTechnicianName?: string;
  status: MaintenanceStatus;
  slaHours: number;
  slaDeadline: Date;
  partsUsed: IMaintenancePart[];
  totalCost: number;
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ticketNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['ELECTRICAL', 'PLUMBING', 'HVAC', 'CARPENTRY', 'ELECTRONICS', 'GENERAL'],
      default: 'GENERAL',
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(MaintenancePriority),
      default: MaintenancePriority.MEDIUM,
      index: true,
    },
    assetId: { type: Schema.Types.ObjectId, ref: 'HotelAsset', index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    blocksRoom: { type: Boolean, default: false },
    reportedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedTechnicianName: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(MaintenanceStatus),
      default: MaintenanceStatus.REPORTED,
      index: true,
    },
    slaHours: { type: Number, default: 24 },
    slaDeadline: { type: Date, required: true },
    partsUsed: [
      {
        partName: { type: String, required: true },
        cost: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalCost: { type: Number, default: 0, min: 0 },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

MaintenanceRequestSchema.index({ hotelId: 1, ticketNumber: 1 }, { unique: true });

export const MaintenanceRequest = mongoose.model<IMaintenanceRequest>('MaintenanceRequest', MaintenanceRequestSchema);
