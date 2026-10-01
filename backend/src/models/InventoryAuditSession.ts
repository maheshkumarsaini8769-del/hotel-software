import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AuditType {
  FULL_MONTH_END = 'FULL_MONTH_END',
  WEEKLY_SPOT_CHECK = 'WEEKLY_SPOT_CHECK',
  HIGH_VALUE_CYCLIC = 'HIGH_VALUE_CYCLIC',
}

export enum AuditSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  DISCREPANCY_FLAGGED = 'DISCREPANCY_FLAGGED',
  RECONCILED = 'RECONCILED',
}

export enum VarianceReason {
  PILFERAGE_THEFT = 'PILFERAGE_THEFT',
  UNRECORDED_WASTE = 'UNRECORDED_WASTE',
  COUNTING_ERROR = 'COUNTING_ERROR',
  VENDOR_SHORTAGE = 'VENDOR_SHORTAGE',
  NORMAL_SHRINKAGE = 'NORMAL_SHRINKAGE',
  RECIPE_OVER_PORTIONING = 'RECIPE_OVER_PORTIONING',
  OTHER = 'OTHER',
}

export interface IAuditItem {
  itemName: string;
  sku?: string;
  category: string;
  unit: string;
  systemBookQuantity: number;
  physicalCountQuantity: number;
  varianceQuantity: number; // physical - system
  unitCost: number;
  varianceValue: number; // varianceQty * unitCost
  varianceReason?: VarianceReason;
  actionTaken?: 'ADJUST_BOOK_STOCK' | 'RECOUNT_REQUESTED' | 'WRITE_OFF_TO_P_AND_L';
}

export interface IInventoryAuditSession extends Document {
  hotelId: Types.ObjectId;
  auditNumber: string;
  auditType: AuditType;
  storeLocation: string;
  isBlindStocktake: boolean;
  status: AuditSessionStatus;
  items: IAuditItem[];
  totalShortageValue: number;
  totalSurplusValue: number;
  netDiscrepancyValue: number;
  notes?: string;
  auditedByUserId: Types.ObjectId;
  approvedByUserId?: Types.ObjectId;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditItemSchema = new Schema<IAuditItem>(
  {
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, default: 'General Supplies' },
    unit: { type: String, required: true, default: 'kg' },
    systemBookQuantity: { type: Number, required: true, min: 0 },
    physicalCountQuantity: { type: Number, required: true, min: 0 },
    varianceQuantity: { type: Number, required: true, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    varianceValue: { type: Number, required: true, default: 0 },
    varianceReason: {
      type: String,
      enum: Object.values(VarianceReason),
    },
    actionTaken: {
      type: String,
      enum: ['ADJUST_BOOK_STOCK', 'RECOUNT_REQUESTED', 'WRITE_OFF_TO_P_AND_L'],
      default: 'ADJUST_BOOK_STOCK',
    },
  },
  { _id: false }
);

const InventoryAuditSessionSchema = new Schema<IInventoryAuditSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    auditNumber: { type: String, required: true, trim: true },
    auditType: {
      type: String,
      enum: Object.values(AuditType),
      default: AuditType.WEEKLY_SPOT_CHECK,
      index: true,
    },
    storeLocation: { type: String, required: true, trim: true },
    isBlindStocktake: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(AuditSessionStatus),
      default: AuditSessionStatus.IN_PROGRESS,
      index: true,
    },
    items: [AuditItemSchema],
    totalShortageValue: { type: Number, default: 0, min: 0 },
    totalSurplusValue: { type: Number, default: 0, min: 0 },
    netDiscrepancyValue: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    auditedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reconciledAt: { type: Date },
  },
  { timestamps: true }
);

InventoryAuditSessionSchema.index({ hotelId: 1, auditNumber: 1 }, { unique: true });
InventoryAuditSessionSchema.index({ hotelId: 1, status: 1 });

export const InventoryAuditSession = mongoose.model<IInventoryAuditSession>(
  'InventoryAuditSession',
  InventoryAuditSessionSchema
);
