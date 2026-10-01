import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGuestSession extends Document {
  hotelId: Types.ObjectId;
  stayId: Types.ObjectId;
  roomId: Types.ObjectId;
  sessionTokenHash: string; // Opaque cryptographic token hash
  lastKnownRoute: string;   // e.g. '/room-service/cart', '/my-folio'
  language: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GuestSessionSchema = new Schema<IGuestSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sessionTokenHash: { type: String, required: true, index: true },
    lastKnownRoute: { type: String, default: '/guest-portal/home' },
    language: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const GuestSession = mongoose.model<IGuestSession>('GuestSession', GuestSessionSchema);
