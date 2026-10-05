import mongoose, { Schema, Document, Types } from 'mongoose';

export enum StayStatus {
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  CHECKED_OUT = 'CHECKED_OUT'
}

export interface IRoomMoveRecord {
  fromRoomId: Types.ObjectId;
  fromRoomNumber: string;
  toRoomId: Types.ObjectId;
  toRoomNumber: string;
  movedAt: Date;
  movedByUserId?: Types.ObjectId;
  reason: string;
  upgradeFee: number;
  taxAmount: number;
  totalCharge: number;
  notes?: string;
  newKeyCardIssued?: string;
}

export interface IEarlyCheckInRecord {
  requestedCheckInTime: Date;
  approvedAt: Date;
  approvedByUserId?: Types.ObjectId;
  hoursEarly: number;
  tier: string;
  surchargeAmount: number;
  taxAmount: number;
  totalCharge: number;
  waived: boolean;
  waiverReason?: string;
  vipTierBenefitApplied?: boolean;
}

export interface ILateCheckOutRecord {
  standardCheckOutTime: Date;
  requestedCheckOutTime: Date;
  approvedAt: Date;
  approvedByUserId?: Types.ObjectId;
  hoursLate: number;
  tier: string;
  surchargeAmount: number;
  taxAmount: number;
  totalCharge: number;
  waived: boolean;
  waiverReason?: string;
  vipTierBenefitApplied?: boolean;
  keycardExtendedTo: Date;
  housekeepingNotified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface IStay extends Document {
  hotelId: Types.ObjectId;
  bookingId: Types.ObjectId;
  guestId?: Types.ObjectId;
  roomId: Types.ObjectId;
  checkInTimestamp: Date;
  expectedCheckOutTimestamp: Date;
  actualCheckOutTimestamp?: Date;
  stayStatus: StayStatus;
  masterFolioId?: Types.ObjectId;
  keyCardIssued?: string;
  isCouple?: boolean;
  verificationMode?: 'NONE' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'OTHER';
  idNumberMasked?: string;
  verifiedByReceptionist?: boolean;
  receptionistNotes?: string;
  documentAttachmentUrl?: string;
  checkedInByUserId?: Types.ObjectId;
  checkedOutByUserId?: Types.ObjectId;
  checkoutRequested?: boolean;
  checkoutRequestedAt?: Date;
  checkoutRequestedNotes?: string;
  preferredPaymentMethod?: string;
  checkoutFeedbackRating?: number;
  checkoutFeedbackComment?: string;
  taxInvoiceNumber?: string;
  keyCardVoided?: boolean;
  roomMoveHistory?: IRoomMoveRecord[];
  earlyCheckInRecord?: IEarlyCheckInRecord;
  lateCheckOutRecord?: ILateCheckOutRecord;
  keycardExpiresAt?: Date;
  delayedDepartureTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaySchema = new Schema<IStay>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'GuestProfile' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    checkInTimestamp: { type: Date, default: Date.now },
    expectedCheckOutTimestamp: { type: Date, required: true },
    actualCheckOutTimestamp: { type: Date },
    stayStatus: {
      type: String,
      enum: Object.values(StayStatus),
      default: StayStatus.ACTIVE,
      index: true,
    },
    masterFolioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio' },
    keyCardIssued: { type: String },
    isCouple: { type: Boolean, default: false },
    verificationMode: {
      type: String,
      enum: ['NONE', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'],
      default: 'NONE',
    },
    idNumberMasked: { type: String, trim: true },
    verifiedByReceptionist: { type: Boolean, default: false },
    receptionistNotes: { type: String, trim: true },
    documentAttachmentUrl: { type: String, trim: true },
    checkedInByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedOutByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    checkoutRequested: { type: Boolean, default: false },
    checkoutRequestedAt: { type: Date },
    checkoutRequestedNotes: { type: String, trim: true },
    preferredPaymentMethod: { type: String, trim: true },
    checkoutFeedbackRating: { type: Number, min: 1, max: 5 },
    checkoutFeedbackComment: { type: String, trim: true },
    taxInvoiceNumber: { type: String, trim: true },
    keyCardVoided: { type: Boolean, default: false },
    roomMoveHistory: [
      {
        fromRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
        fromRoomNumber: { type: String },
        toRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
        toRoomNumber: { type: String },
        movedAt: { type: Date, default: Date.now },
        movedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, default: 'GUEST_REQUEST' },
        upgradeFee: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        totalCharge: { type: Number, default: 0 },
        notes: { type: String, trim: true },
        newKeyCardIssued: { type: String },
      },
    ],
    earlyCheckInRecord: {
      requestedCheckInTime: { type: Date },
      approvedAt: { type: Date },
      approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      hoursEarly: { type: Number },
      tier: { type: String },
      surchargeAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      totalCharge: { type: Number, default: 0 },
      waived: { type: Boolean, default: false },
      waiverReason: { type: String, trim: true },
      vipTierBenefitApplied: { type: Boolean, default: false },
    },
    lateCheckOutRecord: {
      standardCheckOutTime: { type: Date },
      requestedCheckOutTime: { type: Date },
      approvedAt: { type: Date },
      approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      hoursLate: { type: Number },
      tier: { type: String },
      surchargeAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      totalCharge: { type: Number, default: 0 },
      waived: { type: Boolean, default: false },
      waiverReason: { type: String, trim: true },
      vipTierBenefitApplied: { type: Boolean, default: false },
      keycardExtendedTo: { type: Date },
      housekeepingNotified: { type: Boolean, default: true },
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'APPROVED',
      },
    },
    keycardExpiresAt: { type: Date },
    delayedDepartureTime: { type: Date },
  },
  { timestamps: true }
);

StaySchema.index({ hotelId: 1, roomId: 1, stayStatus: 1 });

export const Stay = mongoose.model<IStay>('Stay', StaySchema);
