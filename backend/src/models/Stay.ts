import mongoose, { Schema, Document, Types } from 'mongoose';

export enum StayStatus {
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  CHECKED_OUT = 'CHECKED_OUT'
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
  checkedInByUserId?: Types.ObjectId;
  checkedOutByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaySchema = new Schema<IStay>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
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
    checkedInByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedOutByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StaySchema.index({ hotelId: 1, roomId: 1, stayStatus: 1 });

export const Stay = mongoose.model<IStay>('Stay', StaySchema);
