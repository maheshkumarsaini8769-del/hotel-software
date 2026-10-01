import mongoose, { Schema, Document, Types } from 'mongoose';

export enum RequisitionDepartment {
  MAIN_KITCHEN = 'MAIN_KITCHEN',
  BAKERY = 'BAKERY',
  BANQUET_KITCHEN = 'BANQUET_KITCHEN',
  BAR_BEVERAGES = 'BAR_BEVERAGES',
  HOUSEKEEPING = 'HOUSEKEEPING',
  FRONT_OFFICE = 'FRONT_OFFICE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RequisitionUrgency {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL_SERVICE_BLOCKER = 'CRITICAL_SERVICE_BLOCKER',
}

export enum RequisitionStatus {
  PENDING = 'PENDING',
  APPROVED_PARTIALLY = 'APPROVED_PARTIALLY',
  APPROVED_ISSUED = 'APPROVED_ISSUED',
  REJECTED = 'REJECTED',
}

export interface IRequisitionItem {
  itemName: string;
  requestedQuantity: number;
  issuedQuantity: number;
  unit: string;
  unitCost: number;
  status: 'PENDING' | 'ISSUED' | 'OUT_OF_STOCK';
}

export interface IStoreRequisition extends Document {
  hotelId: Types.ObjectId;
  requisitionNumber: string;
  requestingDepartment: RequisitionDepartment;
  kitchenStationId?: Types.ObjectId;
  requestedByUserId: Types.ObjectId;
  urgency: RequisitionUrgency;
  status: RequisitionStatus;
  items: IRequisitionItem[];
  notes?: string;
  rejectionReason?: string;
  issuedByUserId?: Types.ObjectId;
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RequisitionItemSchema = new Schema<IRequisitionItem>(
  {
    itemName: { type: String, required: true, trim: true },
    requestedQuantity: { type: Number, required: true, min: 0.1 },
    issuedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true, default: 'kg' },
    unitCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'ISSUED', 'OUT_OF_STOCK'],
      default: 'PENDING',
    },
  },
  { _id: false }
);

const StoreRequisitionSchema = new Schema<IStoreRequisition>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requisitionNumber: { type: String, required: true, trim: true },
    requestingDepartment: {
      type: String,
      enum: Object.values(RequisitionDepartment),
      required: true,
      index: true,
    },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: 'KitchenStation' },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    urgency: {
      type: String,
      enum: Object.values(RequisitionUrgency),
      default: RequisitionUrgency.NORMAL,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RequisitionStatus),
      default: RequisitionStatus.PENDING,
      index: true,
    },
    items: [RequisitionItemSchema],
    notes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);

StoreRequisitionSchema.index({ hotelId: 1, requisitionNumber: 1 }, { unique: true });
StoreRequisitionSchema.index({ hotelId: 1, status: 1 });

export const StoreRequisition = mongoose.model<IStoreRequisition>(
  'StoreRequisition',
  StoreRequisitionSchema
);
