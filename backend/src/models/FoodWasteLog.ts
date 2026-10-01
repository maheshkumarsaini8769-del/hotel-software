import mongoose, { Schema, Document, Types } from 'mongoose';

export enum WasteType {
  SPOILED = 'SPOILED',
  BURNT_OVERCOOKED = 'BURNT_OVERCOOKED',
  EXPIRED = 'EXPIRED',
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  TRIMMING_LOSS = 'TRIMMING_LOSS',
  BUFFET_SURPLUS = 'BUFFET_SURPLUS',
}

export enum KitchenShift {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  MIDNIGHT = 'MIDNIGHT',
}

export enum WasteDisposalMethod {
  TRASH = 'TRASH',
  COMPOST = 'COMPOST',
  STAFF_MEAL = 'STAFF_MEAL',
  BIOGAS = 'BIOGAS',
}

export interface IFoodWasteLog extends Document {
  hotelId: Types.ObjectId;
  wasteNumber: string;
  wasteType: WasteType;
  kitchenStationId?: Types.ObjectId;
  menuItemId?: Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLossAmount: number;
  shift: KitchenShift;
  reason: string;
  preventiveAction?: string;
  reportedByUserId: Types.ObjectId;
  disposalMethod: WasteDisposalMethod;
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FoodWasteLogSchema = new Schema<IFoodWasteLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    wasteNumber: { type: String, required: true, trim: true },
    wasteType: {
      type: String,
      enum: Object.values(WasteType),
      required: true,
      index: true,
    },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: 'KitchenStation' },
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'kg' },
    unitCost: { type: Number, required: true, min: 0 },
    totalLossAmount: { type: Number, required: true, min: 0 },
    shift: {
      type: String,
      enum: Object.values(KitchenShift),
      default: KitchenShift.DINNER,
    },
    reason: { type: String, required: true, trim: true },
    preventiveAction: { type: String, trim: true },
    reportedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    disposalMethod: {
      type: String,
      enum: Object.values(WasteDisposalMethod),
      default: WasteDisposalMethod.TRASH,
    },
    loggedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

FoodWasteLogSchema.index({ hotelId: 1, loggedAt: -1 });
FoodWasteLogSchema.index({ hotelId: 1, wasteType: 1 });

export const FoodWasteLog = mongoose.model<IFoodWasteLog>('FoodWasteLog', FoodWasteLogSchema);
