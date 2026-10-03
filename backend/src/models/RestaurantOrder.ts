import mongoose, { Schema, Document, Types } from 'mongoose';

export enum OrderType {
  DINE_IN = 'DINE_IN',
  ROOM_SERVICE = 'ROOM_SERVICE',
  TAKEAWAY = 'TAKEAWAY'
}

export enum OverallOrderStatus {
  PLACED = 'PLACED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum ItemProductionStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export interface IOrderItem {
  _id?: Types.ObjectId;
  menuItemId: Types.ObjectId;
  kitchenStationId: Types.ObjectId;
  name: string;
  variantName?: string;
  selectedAddons?: string[];
  unitPrice: number;
  quantity: number;
  subtotal: number;
  seatNumber?: number; // Person/seat assignment
  specialInstructions?: string;
  itemStatus: ItemProductionStatus;
  // Allergen & Dietary safety properties
  allergens?: string[];
  dietaryType?: string;
  allergenNotes?: string;
  hasAllergenAlert?: boolean;
  chefAllergenAcknowledged?: boolean;
  acknowledgedChefId?: Types.ObjectId;
  acknowledgedChefName?: string;
  acknowledgedAt?: Date;
}

export enum OrderApprovalStatus {
  PENDING_WAITER_APPROVAL = 'PENDING_WAITER_APPROVAL',
  APPROVED_BY_WAITER = 'APPROVED_BY_WAITER',
  AUTO_APPROVED_TIMEOUT = 'AUTO_APPROVED_TIMEOUT',
  REJECTED_BY_WAITER = 'REJECTED_BY_WAITER'
}

export interface IRestaurantOrder extends Document {
  hotelId: Types.ObjectId;
  orderNumber: string;
  orderType: OrderType;
  tableSessionId?: Types.ObjectId;
  tableId?: Types.ObjectId;
  stayId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  folioId?: Types.ObjectId;
  waiterId?: Types.ObjectId;
  items: IOrderItem[];
  cookingInstructions?: string;
  orderStatus: OverallOrderStatus;
  approvalStatus: OrderApprovalStatus;
  approvalDeadline?: Date;
  approvedAt?: Date;
  approvedByWaiterId?: Types.ObjectId;
  qrSessionToken?: string;
  placedAt: Date;
  acceptedAt?: Date;
  preparedAt?: Date;
  readyAt?: Date;
  servedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancellationApprovedBy?: Types.ObjectId;
  tokenNumber?: number;
  customerName?: string;
  customerPhone?: string;
  idempotencyKey: string;
  isBilled?: boolean;
  isSweptToFolio?: boolean;
  sweptAt?: Date;
  sweptToFolioId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    kitchenStationId: { type: Schema.Types.ObjectId, ref: 'KitchenStation', required: true },
    name: { type: String, required: true },
    variantName: { type: String },
    selectedAddons: [{ type: String }],
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    seatNumber: { type: Number },
    specialInstructions: { type: String },
    itemStatus: {
      type: String,
      enum: Object.values(ItemProductionStatus),
      default: ItemProductionStatus.PENDING,
    },
    allergens: [{ type: String }],
    dietaryType: { type: String },
    allergenNotes: { type: String },
    hasAllergenAlert: { type: Boolean, default: false },
    chefAllergenAcknowledged: { type: Boolean, default: false },
    acknowledgedChefId: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedChefName: { type: String },
    acknowledgedAt: { type: Date },
  },
  { _id: true }
);

const RestaurantOrderSchema = new Schema<IRestaurantOrder>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    orderNumber: { type: String, required: true },
    orderType: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.DINE_IN,
      index: true,
    },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession', index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', index: true },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay', index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    folioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio', index: true },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [OrderItemSchema],
    cookingInstructions: { type: String },
    orderStatus: {
      type: String,
      enum: Object.values(OverallOrderStatus),
      default: OverallOrderStatus.PLACED,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(OrderApprovalStatus),
      default: OrderApprovalStatus.APPROVED_BY_WAITER,
      index: true,
    },
    approvalDeadline: { type: Date, index: true },
    approvedAt: { type: Date },
    approvedByWaiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    qrSessionToken: { type: String, index: true },
    placedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    preparedAt: { type: Date },
    readyAt: { type: Date },
    servedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    cancellationApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenNumber: { type: Number, index: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    idempotencyKey: { type: String, required: true, index: true },
    isBilled: { type: Boolean, default: false, index: true },
    isSweptToFolio: { type: Boolean, default: false, index: true },
    sweptAt: { type: Date },
    sweptToFolioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio', index: true },
  },
  { timestamps: true }
);

// Compound index to guarantee idempotency per hotel tenant
RestaurantOrderSchema.index({ hotelId: 1, idempotencyKey: 1 }, { unique: true });
RestaurantOrderSchema.index({ hotelId: 1, orderNumber: 1 }, { unique: true });

export const RestaurantOrder = mongoose.model<IRestaurantOrder>('RestaurantOrder', RestaurantOrderSchema);
