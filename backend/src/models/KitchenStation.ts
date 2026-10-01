import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKitchenStation extends Document {
  hotelId: Types.ObjectId;
  stationName: string; // 'TANDOOR', 'CURRY_MAIN', 'CHINESE', 'BAKERY', 'BAR_BEVERAGE'
  screenToken: string;
  assignedChefIds: Types.ObjectId[];
  printerIp?: string;
  printerPort?: number;
  printerType?: 'ESC_POS_80MM' | 'ESC_POS_58MM';
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KitchenStationSchema = new Schema<IKitchenStation>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    stationName: { type: String, required: true, trim: true },
    screenToken: { type: String, required: true },
    assignedChefIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    printerIp: { type: String, trim: true },
    printerPort: { type: Number, default: 9100 },
    printerType: {
      type: String,
      enum: ['ESC_POS_80MM', 'ESC_POS_58MM'],
      default: 'ESC_POS_80MM',
    },
    isOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

KitchenStationSchema.index({ hotelId: 1, stationName: 1 }, { unique: true });

export const KitchenStation = mongoose.model<IKitchenStation>('KitchenStation', KitchenStationSchema);
