import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMasterFolio extends Document {
  hotelId: Types.ObjectId;
  stayId: Types.ObjectId;
  bookingId: Types.ObjectId;
  roomId: Types.ObjectId;
  folioNumber: string;
  totalRoomTariff: number;
  totalFoodAndBeverage: number;
  totalLaundry: number;
  totalPaidServices: number;
  totalDamageCharges: number;
  totalDiscounts: number;
  totalTaxes: number;
  advancePaid: number;
  netAmountPayable: number;
  paidAmount: number;
  dueAmount: number;
  folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
  createdAt: Date;
  updatedAt: Date;
}

const MasterFolioSchema = new Schema<IMasterFolio>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    folioNumber: { type: String, required: true },
    totalRoomTariff: { type: Number, default: 0, min: 0 },
    totalFoodAndBeverage: { type: Number, default: 0, min: 0 },
    totalLaundry: { type: Number, default: 0, min: 0 },
    totalPaidServices: { type: Number, default: 0, min: 0 },
    totalDamageCharges: { type: Number, default: 0, min: 0 },
    totalDiscounts: { type: Number, default: 0, min: 0 },
    totalTaxes: { type: Number, default: 0, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    netAmountPayable: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    folioStatus: {
      type: String,
      enum: ['OPEN', 'LOCKED', 'SETTLED'],
      default: 'OPEN',
      index: true,
    },
  },
  { timestamps: true }
);

MasterFolioSchema.index({ hotelId: 1, folioNumber: 1 }, { unique: true });

export const MasterFolio = mongoose.model<IMasterFolio>('MasterFolio', MasterFolioSchema);
