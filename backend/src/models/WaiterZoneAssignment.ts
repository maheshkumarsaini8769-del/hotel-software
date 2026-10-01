import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWaiterZoneAssignment extends Document {
  hotelId: Types.ObjectId;
  zoneName: string;
  floorLevel: string; // e.g. 'Ground Floor', '1st Floor', 'Rooftop'
  waiterId: Types.ObjectId;
  waiterName: string;
  tableIds: Types.ObjectId[];
  tableNumbers: string[]; // e.g. ['T-01', 'T-02', ..., 'T-10']
  backupWaiterId?: Types.ObjectId;
  backupWaiterName?: string;
  isActive: boolean;
  shiftStartTime?: Date;
  shiftEndTime?: Date;
  isPrimary: boolean;
  assignedByUserId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaiterZoneAssignmentSchema = new Schema<IWaiterZoneAssignment>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    zoneName: { type: String, required: true, trim: true },
    floorLevel: { type: String, default: 'Ground Floor', trim: true },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    waiterName: { type: String, required: true, trim: true },
    tableIds: [{ type: Schema.Types.ObjectId, ref: 'DiningTable' }],
    tableNumbers: [{ type: String, required: true, trim: true }],
    backupWaiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    backupWaiterName: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    shiftStartTime: { type: Date },
    shiftEndTime: { type: Date },
    isPrimary: { type: Boolean, default: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

WaiterZoneAssignmentSchema.index({ hotelId: 1, waiterId: 1, isActive: 1 });
WaiterZoneAssignmentSchema.index({ hotelId: 1, tableNumbers: 1, isActive: 1 });

export const WaiterZoneAssignment = mongoose.model<IWaiterZoneAssignment>(
  'WaiterZoneAssignment',
  WaiterZoneAssignmentSchema
);
