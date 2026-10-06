import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SDBSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  EXTRA_LARGE = 'EXTRA_LARGE'
}

export enum SDBStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  LOCKED_DISPUTED = 'LOCKED_DISPUTED'
}

export interface ISDBAccessVisit {
  visitId: string;
  visitedAt: Date;
  guestName: string;
  roomNumber?: string;
  witnessStaffId?: Types.ObjectId;
  witnessStaffName: string;
  duoKeyTurnConfirmed: boolean;
  purpose: 'DEPOSIT' | 'WITHDRAWAL' | 'INSPECTION';
  remarks?: string;
}

export interface ISafeDepositBox extends Document {
  hotelId: Types.ObjectId;
  boxNumber: string; // e.g. 'SDB-101'
  size: SDBSize;
  locationLockerRow: string; // e.g. 'VAULT-TIER-A'
  status: SDBStatus;

  // Active Allotment
  currentStayId?: Types.ObjectId;
  currentBookingId?: Types.ObjectId;
  currentGuestId?: Types.ObjectId;
  currentGuestName?: string;
  currentGuestPhone?: string;
  currentRoomNumber?: string;

  // Duo-Key & Custody Protocol
  masterKeySerial: string;
  guestKeySerial: string;
  tamperSealNumber?: string;
  keyDepositAmount: number;
  keyDepositStatus: 'PAID' | 'REFUNDED' | 'FORFEITED_LOST_KEY' | 'WAIVED';

  // Custody Timestamps
  allottedAt?: Date;
  allottedByStaffId?: Types.ObjectId;
  allottedByStaffName?: string;
  expectedReleaseDate?: Date;

  // Chain-of-custody Access Logs
  accessVisits: ISDBAccessVisit[];

  // Surrender / Release info
  releasedAt?: Date;
  releasedByStaffName?: string;
  emptyBoxVerifiedByStaff?: boolean;
  keyReturnedByGuest?: boolean;
  lostKeyPenaltyAmount?: number;

  createdAt: Date;
  updatedAt: Date;
}

const SDBAccessVisitSchema = new Schema<ISDBAccessVisit>(
  {
    visitId: { type: String, required: true },
    visitedAt: { type: Date, default: Date.now },
    guestName: { type: String, required: true, trim: true },
    roomNumber: { type: String, trim: true },
    witnessStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
    witnessStaffName: { type: String, required: true, trim: true },
    duoKeyTurnConfirmed: { type: Boolean, default: true },
    purpose: {
      type: String,
      enum: ['DEPOSIT', 'WITHDRAWAL', 'INSPECTION'],
      default: 'INSPECTION',
    },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const SafeDepositBoxSchema = new Schema<ISafeDepositBox>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    boxNumber: { type: String, required: true, trim: true },
    size: {
      type: String,
      enum: Object.values(SDBSize),
      default: SDBSize.MEDIUM,
    },
    locationLockerRow: { type: String, default: 'VAULT-SEC-01', trim: true },
    status: {
      type: String,
      enum: Object.values(SDBStatus),
      default: SDBStatus.AVAILABLE,
      index: true,
    },

    currentStayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
    currentBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    currentGuestId: { type: Schema.Types.ObjectId, ref: 'GuestProfile' },
    currentGuestName: { type: String, trim: true },
    currentGuestPhone: { type: String, trim: true },
    currentRoomNumber: { type: String, trim: true },

    masterKeySerial: { type: String, default: 'MK-VAULT-MASTER', trim: true },
    guestKeySerial: { type: String, default: 'GK-CUSTODY-KEY', trim: true },
    tamperSealNumber: { type: String, trim: true },
    keyDepositAmount: { type: Number, default: 2000, min: 0 },
    keyDepositStatus: {
      type: String,
      enum: ['PAID', 'REFUNDED', 'FORFEITED_LOST_KEY', 'WAIVED'],
      default: 'WAIVED',
    },

    allottedAt: { type: Date },
    allottedByStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
    allottedByStaffName: { type: String, trim: true },
    expectedReleaseDate: { type: Date },

    accessVisits: [SDBAccessVisitSchema],

    releasedAt: { type: Date },
    releasedByStaffName: { type: String, trim: true },
    emptyBoxVerifiedByStaff: { type: Boolean },
    keyReturnedByGuest: { type: Boolean },
    lostKeyPenaltyAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

SafeDepositBoxSchema.index({ hotelId: 1, boxNumber: 1 }, { unique: true });
SafeDepositBoxSchema.index({ hotelId: 1, status: 1 });

export const SafeDepositBox = mongoose.model<ISafeDepositBox>(
  'SafeDepositBox',
  SafeDepositBoxSchema
);
