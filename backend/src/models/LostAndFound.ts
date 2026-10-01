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
  CLAIMED = 'CLAIMED',
  DISPOSED = 'DISPOSED',
  AUCTIONED = 'AUCTIONED'
}

export interface ILostAndFound extends Document {
  hotelId: Types.ObjectId;
  trackingNumber: string; // e.g. LF-1001
  description: string;
  category: LostAndFoundCategory;
  foundLocation: string; // e.g. Room 204 or Poolside
  foundByUserId: Types.ObjectId;
  guestName?: string;
  roomId?: Types.ObjectId;
  stayId?: Types.ObjectId;
  storageLocation: string;
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
    disposedAt: { type: Date },
    disposalNotes: { type: String },
  },
  { timestamps: true }
);

LostAndFoundSchema.index({ hotelId: 1, trackingNumber: 1 }, { unique: true });

export const LostAndFound = mongoose.model<ILostAndFound>('LostAndFound', LostAndFoundSchema);
