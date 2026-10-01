import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AssetCategory {
  HVAC = 'HVAC',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  FURNITURE = 'FURNITURE',
  ELECTRONICS = 'ELECTRONICS',
  APPLIANCE = 'APPLIANCE'
}

export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  DECOMMISSIONED = 'DECOMMISSIONED'
}

export interface IHotelAsset extends Document {
  hotelId: Types.ObjectId;
  assetCode: string; // e.g. AC-304
  name: string;
  category: AssetCategory;
  roomId?: Types.ObjectId;
  locationArea: string; // Room 304, Reception, Restaurant
  status: AssetStatus;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  lastMaintainedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HotelAssetSchema = new Schema<IHotelAsset>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    assetCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(AssetCategory),
      required: true,
      index: true,
    },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    locationArea: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.OPERATIONAL,
      index: true,
    },
    serialNumber: { type: String, trim: true },
    purchaseDate: { type: Date },
    warrantyExpiry: { type: Date },
    lastMaintainedAt: { type: Date },
  },
  { timestamps: true }
);

HotelAssetSchema.index({ hotelId: 1, assetCode: 1 }, { unique: true });

export const HotelAsset = mongoose.model<IHotelAsset>('HotelAsset', HotelAssetSchema);
