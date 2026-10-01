import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SpilloverTier {
  TIER_1_TEMPORARY = 'TIER_1_TEMPORARY',
  TIER_2_ABSENTEE_ESCALATION = 'TIER_2_ABSENTEE_ESCALATION',
  RECLAIMED_ON_ARRIVAL = 'RECLAIMED_ON_ARRIVAL',
}

export enum SpilloverItemStatus {
  ACTIVE_SPILLOVER = 'ACTIVE_SPILLOVER',
  RECLAIMED = 'RECLAIMED',
  SETTLED_BY_PEER = 'SETTLED_BY_PEER',
}

export interface IReallocatedTable {
  tableNumber: string;
  tableId: Types.ObjectId;
  originalWaiterId: Types.ObjectId;
  assignedToWaiterId: Types.ObjectId;
  assignedToWaiterName: string;
  paxCapacity: number;
  reassignedAt: Date;
  status: SpilloverItemStatus;
}

export interface IStaffSpilloverLog extends Document {
  hotelId: Types.ObjectId;
  scheduledStaffId: Types.ObjectId;
  scheduledStaffName: string;
  floorLevel: string;
  scheduledShift: string;
  plannedStartTime: string;
  delayMinutes: number;
  spilloverTier: SpilloverTier;
  reallocatedTables: IReallocatedTable[];
  triggeredAt: Date;
  staffArrivedAt?: Date;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReallocatedTableSchema = new Schema<IReallocatedTable>(
  {
    tableNumber: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true },
    originalWaiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToWaiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToWaiterName: { type: String, required: true, trim: true },
    paxCapacity: { type: Number, required: true, default: 4 },
    reassignedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: Object.values(SpilloverItemStatus),
      default: SpilloverItemStatus.ACTIVE_SPILLOVER,
    },
  },
  { _id: false }
);

const StaffSpilloverLogSchema = new Schema<IStaffSpilloverLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    scheduledStaffId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledStaffName: { type: String, required: true, trim: true },
    floorLevel: { type: String, default: 'Ground Floor', trim: true },
    scheduledShift: { type: String, default: 'EVENING_DINNER', trim: true },
    plannedStartTime: { type: String, required: true },
    delayMinutes: { type: Number, required: true, min: 0 },
    spilloverTier: {
      type: String,
      enum: Object.values(SpilloverTier),
      required: true,
      default: SpilloverTier.TIER_1_TEMPORARY,
    },
    reallocatedTables: [ReallocatedTableSchema],
    triggeredAt: { type: Date, default: Date.now },
    staffArrivedAt: { type: Date },
    resolvedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

StaffSpilloverLogSchema.index({ hotelId: 1, scheduledStaffId: 1, spilloverTier: 1 });

export const StaffSpilloverLog = mongoose.model<IStaffSpilloverLog>(
  'StaffSpilloverLog',
  StaffSpilloverLogSchema
);
