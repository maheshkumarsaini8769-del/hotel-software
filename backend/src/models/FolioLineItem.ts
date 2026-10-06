import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DepartmentType {
  ROOM_RENT = 'ROOM_RENT',
  RESTAURANT_DINE = 'RESTAURANT_DINE',
  ROOM_SERVICE = 'ROOM_SERVICE',
  LAUNDRY = 'LAUNDRY',
  MINIBAR = 'MINIBAR',
  DAMAGE = 'DAMAGE',
  PAID_AMENITY = 'PAID_AMENITY',
  DISCOUNT = 'DISCOUNT'
}

export interface IFolioLineItem extends Document {
  hotelId: Types.ObjectId;
  folioId: Types.ObjectId;
  department: DepartmentType;
  description: string;
  referenceId?: Types.ObjectId; // Links to Order ID, Laundry ID, etc.
  rate: number;
  quantity: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  postedAt: Date;
  postedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FolioLineItemSchema = new Schema<IFolioLineItem>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    folioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio', required: true, index: true },
    department: {
      type: String,
      enum: Object.values(DepartmentType),
      required: true,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    referenceId: { type: Schema.Types.ObjectId },
    rate: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true },
    postedAt: { type: Date, default: Date.now },
    postedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FolioLineItemSchema.index({ folioId: 1, department: 1 });

export const FolioLineItem = mongoose.model<IFolioLineItem>('FolioLineItem', FolioLineItemSchema);
