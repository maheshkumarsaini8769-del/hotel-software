import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFoodPickupSlaConfig extends Document {
  hotelId: Types.ObjectId;
  defaultPickupSlaMinutes: number; // e.g. 3 (range 2 - 10 minutes)
  maxSnoozeSeconds: number; // e.g. 60 seconds
  maxAllowedSnoozes: number; // e.g. 1 max snooze
  escalateToCaptainOnBreach: boolean;
  buzzerAudioEnabled: boolean;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FoodPickupSlaConfigSchema = new Schema<IFoodPickupSlaConfig>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    defaultPickupSlaMinutes: { type: Number, required: true, default: 3, min: 2, max: 10 },
    maxSnoozeSeconds: { type: Number, default: 60, min: 30, max: 180 },
    maxAllowedSnoozes: { type: Number, default: 1, min: 1, max: 2 },
    escalateToCaptainOnBreach: { type: Boolean, default: true },
    buzzerAudioEnabled: { type: Boolean, default: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const FoodPickupSlaConfig = mongoose.model<IFoodPickupSlaConfig>(
  'FoodPickupSlaConfig',
  FoodPickupSlaConfigSchema
);
