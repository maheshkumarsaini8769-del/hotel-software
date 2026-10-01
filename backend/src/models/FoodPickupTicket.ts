import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PickupTicketStatus {
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  WAITER_EN_ROUTE = 'WAITER_EN_ROUTE', // Snoozed ("On My Way")
  PICKED_UP = 'PICKED_UP',
  SLA_BREACHED = 'SLA_BREACHED',
  DELIVERED = 'DELIVERED',
}

export interface IFoodPickupTicket extends Document {
  hotelId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  tableId: Types.ObjectId;
  tableNumber: string;
  floorLevel: string;
  assignedWaiterId?: Types.ObjectId;
  assignedWaiterName?: string;
  itemsSummary: string;
  readyAt: Date;
  slaMinutes: number;
  slaDeadline: Date;
  snoozeCount: number;
  snoozedAt?: Date;
  snoozeExtendedDeadline?: Date;
  status: PickupTicketStatus;
  pickedUpAt?: Date;
  pickupLatencySeconds?: number;
  isBreached: boolean;
  escalatedToCaptain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FoodPickupTicketSchema = new Schema<IFoodPickupTicket>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'RestaurantOrder', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true },
    tableNumber: { type: String, required: true, trim: true },
    floorLevel: { type: String, default: 'Ground Floor', trim: true },
    assignedWaiterId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedWaiterName: { type: String, trim: true },
    itemsSummary: { type: String, required: true },
    readyAt: { type: Date, default: Date.now },
    slaMinutes: { type: Number, required: true, default: 3 },
    slaDeadline: { type: Date, required: true },
    snoozeCount: { type: Number, default: 0 },
    snoozedAt: { type: Date },
    snoozeExtendedDeadline: { type: Date },
    status: {
      type: String,
      enum: Object.values(PickupTicketStatus),
      default: PickupTicketStatus.READY_FOR_PICKUP,
      index: true,
    },
    pickedUpAt: { type: Date },
    pickupLatencySeconds: { type: Number },
    isBreached: { type: Boolean, default: false },
    escalatedToCaptain: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

FoodPickupTicketSchema.index({ hotelId: 1, status: 1 });
FoodPickupTicketSchema.index({ hotelId: 1, assignedWaiterId: 1, status: 1 });

export const FoodPickupTicket = mongoose.model<IFoodPickupTicket>(
  'FoodPickupTicket',
  FoodPickupTicketSchema
);
