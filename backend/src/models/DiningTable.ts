import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  PARTIALLY_OCCUPIED = 'PARTIALLY_OCCUPIED',
  OCCUPIED = 'OCCUPIED',
  BILLING = 'BILLING',
  PAYMENT_SETTLED = 'PAYMENT_SETTLED',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  RESERVED = 'RESERVED',
  MERGED = 'MERGED'
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY'
}

export interface ISeatAllocation {
  seatNumber: number;
  seatLabel: string;
  status: SeatStatus;
  currentSessionId?: Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  occupiedAt?: Date;
}

export interface IDiningTable extends Document {
  hotelId: Types.ObjectId;
  branchId?: Types.ObjectId;
  tableNumber: string;
  floorLevel?: string; // 'Ground Floor', '1st Floor', '2nd Floor', 'Rooftop'
  section: string; // 'AC_HALL', 'GARDEN', 'ROOFTOP', 'COMMUNITY_LOUNGE'
  capacity: number;
  currentStatus: TableStatus;
  isCommunityTable: boolean;
  allowCoDining: boolean;
  seats: ISeatAllocation[];
  availableSeatsCount: number;
  occupiedSeatsCount: number;
  activeSessionId?: Types.ObjectId;
  assignedWaiterId?: Types.ObjectId;
  qrTokenHash?: string;
  coordinates?: { x: number; y: number };
  isMerged?: boolean;
  mergedIntoTableId?: Types.ObjectId;
  mergedTableIds?: Types.ObjectId[];
  mergedTableNumbers?: string[];
  combinedCapacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SeatAllocationSchema = new Schema<ISeatAllocation>(
  {
    seatNumber: { type: Number, required: true },
    seatLabel: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SeatStatus),
      default: SeatStatus.AVAILABLE,
    },
    currentSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession' },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    occupiedAt: { type: Date },
  },
  { _id: false }
);

const DiningTableSchema = new Schema<IDiningTable>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    tableNumber: { type: String, required: true, trim: true },
    floorLevel: { type: String, default: 'Ground Floor', trim: true, index: true },
    section: { type: String, default: 'MAIN_HALL', trim: true, index: true },
    capacity: { type: Number, required: true, min: 1, default: 4 },
    currentStatus: {
      type: String,
      enum: Object.values(TableStatus),
      default: TableStatus.AVAILABLE,
      index: true,
    },
    isCommunityTable: { type: Boolean, default: false, index: true },
    allowCoDining: { type: Boolean, default: false },
    seats: [SeatAllocationSchema],
    availableSeatsCount: { type: Number, default: 4 },
    occupiedSeatsCount: { type: Number, default: 0 },
    activeSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession' },
    assignedWaiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    qrTokenHash: { type: String },
    coordinates: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    isMerged: { type: Boolean, default: false, index: true },
    mergedIntoTableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', index: true },
    mergedTableIds: [{ type: Schema.Types.ObjectId, ref: 'DiningTable' }],
    mergedTableNumbers: [{ type: String }],
    combinedCapacity: { type: Number },
  },
  { timestamps: true }
);

// Compound Index: Table numbers must be unique within a single hotel tenant
DiningTableSchema.index({ hotelId: 1, tableNumber: 1 }, { unique: true });
DiningTableSchema.index({ hotelId: 1, isCommunityTable: 1 });

export const DiningTable = mongoose.model<IDiningTable>('DiningTable', DiningTableSchema);
