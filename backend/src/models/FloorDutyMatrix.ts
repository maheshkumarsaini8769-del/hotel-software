import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFloorWaiterDuty {
  waiterId: Types.ObjectId;
  waiterName: string;
  assignedTables: string[]; // e.g. ['GF-01', 'GF-02', ..., 'GF-12']
  tableCount: number;
  paxCapacity: number;
  isRovingWaiter: boolean;
  assignedAt: Date;
}

export interface IFloorDutyMatrix extends Document {
  hotelId: Types.ObjectId;
  floorName: string; // 'Ground Floor', '2nd Floor', 'Rooftop Lounge'
  floorCode: string; // 'GF', '2F', 'RT'
  supervisorId?: Types.ObjectId;
  supervisorName?: string;
  totalTables: number;
  totalCapacity: number;
  dutyRoster: IFloorWaiterDuty[];
  unassignedTables: string[];
  maxPaxPerWaiterCap: number; // e.g. 40 pax capacity warning limit
  shift: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  date: string; // 'YYYY-MM-DD'
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FloorWaiterDutySchema = new Schema<IFloorWaiterDuty>(
  {
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    waiterName: { type: String, required: true, trim: true },
    assignedTables: [{ type: String, required: true, trim: true }],
    tableCount: { type: Number, required: true, default: 0 },
    paxCapacity: { type: Number, required: true, default: 0 },
    isRovingWaiter: { type: Boolean, default: false },
    assignedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FloorDutyMatrixSchema = new Schema<IFloorDutyMatrix>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    floorName: { type: String, required: true, trim: true },
    floorCode: { type: String, required: true, trim: true },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    supervisorName: { type: String, trim: true },
    totalTables: { type: Number, required: true, default: 0 },
    totalCapacity: { type: Number, required: true, default: 0 },
    dutyRoster: [FloorWaiterDutySchema],
    unassignedTables: [{ type: String, trim: true }],
    maxPaxPerWaiterCap: { type: Number, default: 40 },
    shift: {
      type: String,
      enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
      default: 'EVENING',
    },
    date: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

FloorDutyMatrixSchema.index({ hotelId: 1, floorCode: 1, date: 1, shift: 1 });
FloorDutyMatrixSchema.index({ hotelId: 1, isActive: 1 });

export const FloorDutyMatrix = mongoose.model<IFloorDutyMatrix>(
  'FloorDutyMatrix',
  FloorDutyMatrixSchema
);
