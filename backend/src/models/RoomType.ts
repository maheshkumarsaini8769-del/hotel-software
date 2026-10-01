import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoomType extends Document {
  hotelId: Types.ObjectId;
  name: string; // 'Deluxe Room', 'Super Deluxe', 'Executive Suite'
  code: string; // 'DLX', 'SDX', 'STE'
  baseCapacityAdults: number;
  baseCapacityChildren: number;
  maxCapacity: number;
  basePriceOvernight: number;
  basePriceDayUse: number;
  basePriceHourly: number;
  amenities: string[];
  images: string[];
  description?: string;
  totalRoomsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomTypeSchema = new Schema<IRoomType>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    baseCapacityAdults: { type: Number, default: 2, min: 1 },
    baseCapacityChildren: { type: Number, default: 1, min: 0 },
    maxCapacity: { type: Number, default: 3, min: 1 },
    basePriceOvernight: { type: Number, required: true, min: 0 },
    basePriceDayUse: { type: Number, default: 0, min: 0 },
    basePriceHourly: { type: Number, default: 0, min: 0 },
    amenities: [{ type: String }],
    images: [{ type: String }],
    description: { type: String },
    totalRoomsCount: { type: Number, default: 10, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

RoomTypeSchema.index({ hotelId: 1, code: 1 }, { unique: true });

export const RoomType = mongoose.model<IRoomType>('RoomType', RoomTypeSchema);
