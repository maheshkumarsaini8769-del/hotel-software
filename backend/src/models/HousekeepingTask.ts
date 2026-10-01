import mongoose, { Schema, Document, Types } from 'mongoose';

export enum HousekeepingTaskType {
  CHECKOUT_CLEAN = 'CHECKOUT_CLEAN',
  STAYOVER_CLEAN = 'STAYOVER_CLEAN',
  DEEP_CLEAN = 'DEEP_CLEAN',
  INSPECTION_ONLY = 'INSPECTION_ONLY'
}

export enum HousekeepingTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INSPECTED_PASSED = 'INSPECTED_PASSED',
  INSPECTED_FAILED = 'INSPECTED_FAILED' // triggers re-clean
}

export interface IHousekeepingTask extends Document {
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  taskType: HousekeepingTaskType;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  assignedAttendantId?: Types.ObjectId;
  status: HousekeepingTaskStatus;
  checklist: Array<{ taskName: string; isDone: boolean }>;
  inspectionNotes?: string;
  inspectedByUserId?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  inspectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HousekeepingTaskSchema = new Schema<IHousekeepingTask>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    taskType: {
      type: String,
      enum: Object.values(HousekeepingTaskType),
      default: HousekeepingTaskType.CHECKOUT_CLEAN,
    },
    priority: { type: String, enum: ['NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL', index: true },
    assignedAttendantId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: Object.values(HousekeepingTaskStatus),
      default: HousekeepingTaskStatus.PENDING,
      index: true,
    },
    checklist: [
      {
        taskName: { type: String, required: true },
        isDone: { type: Boolean, default: false },
      },
    ],
    inspectionNotes: { type: String },
    inspectedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    inspectedAt: { type: Date },
  },
  { timestamps: true }
);

export const HousekeepingTask = mongoose.model<IHousekeepingTask>('HousekeepingTask', HousekeepingTaskSchema);
