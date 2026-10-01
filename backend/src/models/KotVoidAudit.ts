import mongoose, { Schema, Document, Types } from 'mongoose';
import { KotVoidReason, WasteDisposition } from '@spicehub/shared-types';

export { KotVoidReason, WasteDisposition };

export interface IKotVoidAudit extends Document {
  hotelId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  tableNumber: string;
  itemId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalVoidAmount: number;
  voidReason: KotVoidReason;
  wasteDisposition: WasteDisposition;
  authorizedByManagerUserId: Types.ObjectId;
  managerName: string;
  waiterUserId?: Types.ObjectId;
  waiterName?: string;
  kitchenNotified: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KotVoidAuditSchema = new Schema<IKotVoidAudit>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'RestaurantOrder',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    tableNumber: {
      type: String,
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalVoidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    voidReason: {
      type: String,
      enum: Object.values(KotVoidReason),
      required: true,
    },
    wasteDisposition: {
      type: String,
      enum: Object.values(WasteDisposition),
      required: true,
    },
    authorizedByManagerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managerName: {
      type: String,
      required: true,
    },
    waiterUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    waiterName: {
      type: String,
    },
    kitchenNotified: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

KotVoidAuditSchema.index({ hotelId: 1, createdAt: -1 });
KotVoidAuditSchema.index({ hotelId: 1, orderId: 1 });
KotVoidAuditSchema.index({ hotelId: 1, authorizedByManagerUserId: 1 });

export const KotVoidAudit = mongoose.model<IKotVoidAudit>('KotVoidAudit', KotVoidAuditSchema);
