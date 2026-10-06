import mongoose, { Schema, Document, Types } from 'mongoose';

export enum LuggageStorageType {
  EARLY_ARRIVAL = 'EARLY_ARRIVAL',
  POST_CHECKOUT = 'POST_CHECKOUT',
  LONG_TERM_STORAGE = 'LONG_TERM_STORAGE',
  TRANSIT_HOLD = 'TRANSIT_HOLD',
}

export enum LuggageStatus {
  STORED = 'STORED',
  DISPATCH_REQUESTED = 'DISPATCH_REQUESTED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED_TO_ROOM = 'DELIVERED_TO_ROOM',
  CLAIMED_AT_COUNTER = 'CLAIMED_AT_COUNTER',
  OVERDUE_UNCLAIMED = 'OVERDUE_UNCLAIMED',
  DISPUTED_LOST = 'DISPUTED_LOST',
}

export interface ILuggagePiece {
  pieceId: string;
  type: 'SUITCASE' | 'BACKPACK' | 'DUFFEL' | 'GARMENT_BAG' | 'CARTON' | 'OTHER';
  colorDescription: string;
  isFragile: boolean;
  hasPerishables: boolean;
}

export interface IPorterDispatchLog {
  dispatchId: string;
  dispatchedAt: Date;
  porterName: string;
  porterStaffId?: string;
  targetLocation: string; // e.g. "Room 304", "Porch Valet / Taxi"
  completedAt?: Date;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'RETURNED_TO_RACK';
  notes?: string;
}

export interface ILeftLuggageClaim extends Document {
  hotelId: Types.ObjectId;
  claimTag: string; // e.g. "LLG-2026-1001"
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  roomNumber?: string;
  stayId?: Types.ObjectId;
  storageType: LuggageStorageType;
  status: LuggageStatus;
  rackLocation: string; // e.g. "RACK-A02", "BAY-WEST-01"
  pieces: ILuggagePiece[];
  totalPieces: number;
  checkInTime: Date;
  expectedPickupTime: Date;
  actualReleaseTime?: Date;
  claimPin: string; // 4-digit guest claim verification PIN
  dispatches: IPorterDispatchLog[];
  currentPorterName?: string;
  receivedByStaffName: string;
  releasedByStaffName?: string;
  releaseNotes?: string;
  isDiscrepancy: boolean;
  discrepancyNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LuggagePieceSchema = new Schema<ILuggagePiece>(
  {
    pieceId: { type: String, required: true },
    type: {
      type: String,
      enum: ['SUITCASE', 'BACKPACK', 'DUFFEL', 'GARMENT_BAG', 'CARTON', 'OTHER'],
      default: 'SUITCASE',
    },
    colorDescription: { type: String, default: 'Standard Black Trolley' },
    isFragile: { type: Boolean, default: false },
    hasPerishables: { type: Boolean, default: false },
  },
  { _id: false }
);

const PorterDispatchLogSchema = new Schema<IPorterDispatchLog>(
  {
    dispatchId: { type: String, required: true },
    dispatchedAt: { type: Date, default: Date.now },
    porterName: { type: String, required: true },
    porterStaffId: { type: String },
    targetLocation: { type: String, required: true },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'RETURNED_TO_RACK'],
      default: 'ASSIGNED',
    },
    notes: { type: String },
  },
  { _id: false }
);

const LeftLuggageClaimSchema = new Schema<ILeftLuggageClaim>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    claimTag: { type: String, required: true, uppercase: true, trim: true },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    guestEmail: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'GuestStay' },
    storageType: {
      type: String,
      enum: Object.values(LuggageStorageType),
      default: LuggageStorageType.POST_CHECKOUT,
    },
    status: {
      type: String,
      enum: Object.values(LuggageStatus),
      default: LuggageStatus.STORED,
      index: true,
    },
    rackLocation: { type: String, required: true, trim: true, default: 'RACK-A01' },
    pieces: { type: [LuggagePieceSchema], default: [] },
    totalPieces: { type: numberSchemaHelper(), default: 1 },
    checkInTime: { type: Date, default: Date.now },
    expectedPickupTime: {
      type: Date,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000), // Default 6 hours later
    },
    actualReleaseTime: { type: Date },
    claimPin: { type: String, required: true, default: '1234' },
    dispatches: { type: [PorterDispatchLogSchema], default: [] },
    currentPorterName: { type: String },
    receivedByStaffName: { type: String, required: true, default: 'Bell Captain Desk' },
    releasedByStaffName: { type: String },
    releaseNotes: { type: String },
    isDiscrepancy: { type: Boolean, default: false },
    discrepancyNote: { type: String },
  },
  { timestamps: true }
);

function numberSchemaHelper() {
  return Number;
}

LeftLuggageClaimSchema.index({ hotelId: 1, claimTag: 1 }, { unique: true });
LeftLuggageClaimSchema.index({ hotelId: 1, status: 1 });

export const LeftLuggageClaim = mongoose.model<ILeftLuggageClaim>(
  'LeftLuggageClaim',
  LeftLuggageClaimSchema
);
