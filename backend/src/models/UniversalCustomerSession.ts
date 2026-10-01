import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CustomerServiceMode {
  IN_ROOM_DINING = 'IN_ROOM_DINING',
  DINE_IN_RESTAURANT = 'DINE_IN_RESTAURANT',
  TAKEAWAY_PICKUP = 'TAKEAWAY_PICKUP',
  POOLSIDE_LOUNGE = 'POOLSIDE_LOUNGE',
}

export enum CustomerSessionStatus {
  ACTIVE = 'ACTIVE',
  ORDER_PLACED = 'ORDER_PLACED',
  SERVED = 'SERVED',
  CLOSED = 'CLOSED',
}

export enum ServiceRequestType {
  WATER_REFILL = 'WATER_REFILL',
  CALL_WAITER = 'CALL_WAITER',
  CALL_ROOM_SERVICE = 'CALL_ROOM_SERVICE',
  EXTRA_CUTLERY = 'EXTRA_CUTLERY',
  REQUEST_BILL = 'REQUEST_BILL',
  ROOM_CLEANING = 'ROOM_CLEANING',
  CUSTOM = 'CUSTOM',
}

export enum ServiceRequestStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export interface IPortalCartItem {
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
}

export interface IPortalServiceRequest {
  requestId: string;
  requestType: ServiceRequestType;
  notes?: string;
  status: ServiceRequestStatus;
  requestedAt: Date;
  resolvedAt?: Date;
  resolvedByStaffName?: string;
}

export interface IUniversalCustomerSession extends Document {
  hotelId: Types.ObjectId;
  sessionToken: string;
  serviceMode: CustomerServiceMode;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'GUEST_SELF_DECLARED';
  guestInfo: {
    guestName?: string;
    phone?: string;
    paxCount?: number;
  };
  inRoomContext?: {
    roomId?: Types.ObjectId;
    roomNumber?: string;
    stayId?: Types.ObjectId;
    folioId?: Types.ObjectId;
    billingPreference?: 'POST_TO_ROOM' | 'PAY_ONLINE_NOW';
  };
  dineInContext?: {
    tableId?: Types.ObjectId;
    tableNumber?: string;
    tableSessionId?: Types.ObjectId;
    section?: string;
    seatingType?: 'PRIVATE_TABLE' | 'COMMUNITY_SHARED';
  };
  takeawayContext?: {
    pickupToken?: string;
    estimatedReadyMinutes?: number;
  };
  cartItems: IPortalCartItem[];
  activeOrders: Types.ObjectId[];
  serviceRequests: IPortalServiceRequest[];
  status: CustomerSessionStatus;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PortalCartItemSchema = new Schema<IPortalCartItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    specialInstructions: { type: String, trim: true },
  },
  { _id: false }
);

const PortalServiceRequestSchema = new Schema<IPortalServiceRequest>(
  {
    requestId: { type: String, required: true },
    requestType: {
      type: String,
      enum: Object.values(ServiceRequestType),
      required: true,
    },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(ServiceRequestStatus),
      default: ServiceRequestStatus.PENDING,
    },
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedByStaffName: { type: String },
  },
  { _id: false }
);

const UniversalCustomerSessionSchema = new Schema<IUniversalCustomerSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sessionToken: { type: String, required: true, unique: true, index: true },
    serviceMode: {
      type: String,
      enum: Object.values(CustomerServiceMode),
      default: CustomerServiceMode.DINE_IN_RESTAURANT,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'GUEST_SELF_DECLARED'],
      default: 'GUEST_SELF_DECLARED',
    },
    guestInfo: {
      guestName: { type: String, trim: true },
      phone: { type: String, trim: true },
      paxCount: { type: Number, default: 1, min: 1 },
    },
    inRoomContext: {
      roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
      roomNumber: { type: String, trim: true },
      stayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
      folioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio' },
      billingPreference: {
        type: String,
        enum: ['POST_TO_ROOM', 'PAY_ONLINE_NOW'],
        default: 'POST_TO_ROOM',
      },
    },
    dineInContext: {
      tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable' },
      tableNumber: { type: String, trim: true },
      tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession' },
      section: { type: String, default: 'MAIN_HALL' },
      seatingType: {
        type: String,
        enum: ['PRIVATE_TABLE', 'COMMUNITY_SHARED'],
        default: 'PRIVATE_TABLE',
      },
    },
    takeawayContext: {
      pickupToken: { type: String },
      estimatedReadyMinutes: { type: Number, default: 20 },
    },
    cartItems: [PortalCartItemSchema],
    activeOrders: [{ type: Schema.Types.ObjectId, ref: 'RestaurantOrder' }],
    serviceRequests: [PortalServiceRequestSchema],
    status: {
      type: String,
      enum: Object.values(CustomerSessionStatus),
      default: CustomerSessionStatus.ACTIVE,
      index: true,
    },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UniversalCustomerSessionSchema.index({ hotelId: 1, status: 1 });
UniversalCustomerSessionSchema.index({ hotelId: 1, 'inRoomContext.roomNumber': 1 });
UniversalCustomerSessionSchema.index({ hotelId: 1, 'dineInContext.tableNumber': 1 });

export const UniversalCustomerSession = mongoose.model<IUniversalCustomerSession>(
  'UniversalCustomerSession',
  UniversalCustomerSessionSchema
);
