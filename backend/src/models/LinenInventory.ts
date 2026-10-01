import mongoose, { Schema, Document, Types } from 'mongoose';

export enum LinenItemType {
  BEDSHEET_KING = 'BEDSHEET_KING',
  BEDSHEET_SINGLE = 'BEDSHEET_SINGLE',
  DUVET_COVER = 'DUVET_COVER',
  PILLOW_CASE = 'PILLOW_CASE',
  BATH_TOWEL = 'BATH_TOWEL',
  HAND_TOWEL = 'HAND_TOWEL',
  FACE_TOWEL = 'FACE_TOWEL',
  BATHROBE = 'BATHROBE'
}

export interface ILinenLog {
  action: 'ISSUED_TO_ROOMS' | 'SENT_TO_LAUNDRY' | 'RETURNED_FROM_LAUNDRY' | 'MARKED_DAMAGED' | 'RESTOCKED';
  quantity: number;
  performedByUserId: Types.ObjectId;
  notes?: string;
  timestamp: Date;
}

export interface ILinenInventory extends Document {
  hotelId: Types.ObjectId;
  itemType: LinenItemType;
  totalStock: number;
  inLaundry: number;
  inRooms: number;
  availableClean: number;
  damaged: number;
  logs: ILinenLog[];
  createdAt: Date;
  updatedAt: Date;
}

const LinenInventorySchema = new Schema<ILinenInventory>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    itemType: {
      type: String,
      enum: Object.values(LinenItemType),
      required: true,
      index: true,
    },
    totalStock: { type: Number, required: true, min: 0 },
    inLaundry: { type: Number, default: 0, min: 0 },
    inRooms: { type: Number, default: 0, min: 0 },
    availableClean: { type: Number, required: true, min: 0 },
    damaged: { type: Number, default: 0, min: 0 },
    logs: [
      {
        action: {
          type: String,
          enum: ['ISSUED_TO_ROOMS', 'SENT_TO_LAUNDRY', 'RETURNED_FROM_LAUNDRY', 'MARKED_DAMAGED', 'RESTOCKED'],
          required: true,
        },
        quantity: { type: Number, required: true },
        performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        notes: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

LinenInventorySchema.index({ hotelId: 1, itemType: 1 }, { unique: true });

export const LinenInventory = mongoose.model<ILinenInventory>('LinenInventory', LinenInventorySchema);
