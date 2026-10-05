import mongoose, { Schema, Document, Types } from 'mongoose';

export enum LostAndFoundCategory {
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  JEWELRY = 'JEWELRY',
  DOCUMENTS = 'DOCUMENTS',
  KEYS = 'KEYS',
  OTHER = 'OTHER'
}

export enum LostAndFoundStatus {
  LOGGED = 'LOGGED',
  INQUIRY_RECEIVED = 'INQUIRY_RECEIVED',
  VERIFIED_PENDING_DISPATCH = 'VERIFIED_PENDING_DISPATCH',
  CLAIMED = 'CLAIMED',
  CLAIMED_IN_PERSON = 'CLAIMED_IN_PERSON',
  COURIER_DISPATCHED = 'COURIER_DISPATCHED',
  DISPOSED = 'DISPOSED',
  AUCTIONED = 'AUCTIONED'
}

export interface ICustodyTransfer {
  action: 'LOGGED' | 'MOVED_TO_VAULT' | 'INSPECTED' | 'VERIFIED' | 'DISPATCH_PREPARED' | 'HANDOVER' | 'DISPOSED';
  performedByUserId?: Types.ObjectId;
  performedByName?: string;
  fromLocation?: string;
  toLocation?: string;
  timestamp: Date;
  notes?: string;
}

export interface IClaimVerification {
  claimantName: string;
  claimantPhone: string;
  claimantEmail?: string;
  idProofType: 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENSE' | 'OTHER';
  idProofNumber: string;
  verificationNotes?: string;
  verifiedByUserId?: Types.ObjectId;
  verifiedAt: Date;
  serialNumberMatched?: boolean;
  matchConfidenceScore?: number;
}

export interface ICourierDispatch {
  courierPartner: 'BLUE_DART' | 'FEDEX' | 'DHL' | 'DELHIVERY' | 'HOTEL_INTERNAL';
  waybillNumber: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  shippingFeePaidBy: 'GUEST' | 'HOTEL_COMPLIMENTARY';
  shippingFeeAmount?: number;
  dispatchedAt: Date;
  dispatchedByUserId?: Types.ObjectId;
  courierStatus: 'LABEL_CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED';
  deliveryConfirmationDate?: Date;
  notes?: string;
}

export interface ILostAndFound extends Document {
  hotelId: Types.ObjectId;
  trackingNumber: string; // e.g. LF-2026-10001
  description: string;
  category: LostAndFoundCategory;
  foundLocation: string; // e.g. Room 204 or Poolside
  foundByUserId: Types.ObjectId;
  guestName?: string;
  roomId?: Types.ObjectId;
  stayId?: Types.ObjectId;
  storageLocation: string;
  secureVaultLocker?: string;
  estimatedValue?: number;
  isHighValue: boolean;
  retentionExpiryDate: Date;
  photoUrl?: string;
  status: LostAndFoundStatus;
  claimedBy?: {
    claimantName: string;
    contactNumber: string;
    idProof: string;
    verifiedByUserId: Types.ObjectId;
    claimedAt: Date;
    notes?: string;
  };
  claimVerification?: IClaimVerification;
  courierDispatch?: ICourierDispatch;
  custodyChain: ICustodyTransfer[];
  disposedAt?: Date;
  disposalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LostAndFoundSchema = new Schema<ILostAndFound>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    trackingNumber: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(LostAndFoundCategory),
      default: LostAndFoundCategory.OTHER,
      index: true,
    },
    foundLocation: { type: String, required: true, trim: true },
    foundByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guestName: { type: String, trim: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', index: true },
    storageLocation: { type: String, required: true, trim: true },
    secureVaultLocker: { type: String, trim: true },
    estimatedValue: { type: Number, default: 0 },
    isHighValue: { type: Boolean, default: false, index: true },
    retentionExpiryDate: { type: Date, required: true, index: true },
    photoUrl: { type: String },
    status: {
      type: String,
      enum: Object.values(LostAndFoundStatus),
      default: LostAndFoundStatus.LOGGED,
      index: true,
    },
    claimedBy: {
      claimantName: { type: String },
      contactNumber: { type: String },
      idProof: { type: String },
      verifiedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      claimedAt: { type: Date },
      notes: { type: String },
    },
    claimVerification: {
      claimantName: { type: String },
      claimantPhone: { type: String },
      claimantEmail: { type: String },
      idProofType: { type: String, enum: ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'] },
      idProofNumber: { type: String },
      verificationNotes: { type: String },
      verifiedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      serialNumberMatched: { type: Boolean, default: false },
      matchConfidenceScore: { type: Number, default: 100 },
    },
    courierDispatch: {
      courierPartner: {
        type: String,
        enum: ['BLUE_DART', 'FEDEX', 'DHL', 'DELHIVERY', 'HOTEL_INTERNAL'],
      },
      waybillNumber: { type: String, trim: true },
      recipientName: { type: String, trim: true },
      recipientPhone: { type: String, trim: true },
      shippingAddress: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        country: { type: String, default: 'India' },
      },
      shippingFeePaidBy: {
        type: String,
        enum: ['GUEST', 'HOTEL_COMPLIMENTARY'],
        default: 'GUEST',
      },
      shippingFeeAmount: { type: Number, default: 0 },
      dispatchedAt: { type: Date },
      dispatchedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
      courierStatus: {
        type: String,
        enum: ['LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'],
        default: 'LABEL_CREATED',
      },
      deliveryConfirmationDate: { type: Date },
      notes: { type: String },
    },
    custodyChain: [
      {
        action: {
          type: String,
          enum: ['LOGGED', 'MOVED_TO_VAULT', 'INSPECTED', 'VERIFIED', 'DISPATCH_PREPARED', 'HANDOVER', 'DISPOSED'],
          required: true,
        },
        performedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String },
        fromLocation: { type: String },
        toLocation: { type: String },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    disposedAt: { type: Date },
    disposalNotes: { type: String },
  },
  { timestamps: true }
);

LostAndFoundSchema.index({ hotelId: 1, trackingNumber: 1 }, { unique: true });

export const LostAndFound = mongoose.model<ILostAndFound>('LostAndFound', LostAndFoundSchema);
