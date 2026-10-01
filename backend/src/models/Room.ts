import mongoose, { Schema, Document, Types } from 'mongoose';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  INSPECTION = 'INSPECTION',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface IRoom extends Document {
  hotelId: Types.ObjectId;
  roomNumber: string; // '101', '204', '302'
  roomTypeId: Types.ObjectId;
  floorNumber: number;
  wing?: string;
  status: RoomStatus;
  currentStayId?: Types.ObjectId;
  keyCardNumber?: string;
  permanentQrCodeHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true, index: true },
    floorNumber: { type: Number, required: true },
    wing: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(RoomStatus),
      default: RoomStatus.AVAILABLE,
      index: true,
    },
    currentStayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
    keyCardNumber: { type: String, trim: true },
    permanentQrCodeHash: { type: String, required: true },
  },
  { timestamps: true }
);

RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
