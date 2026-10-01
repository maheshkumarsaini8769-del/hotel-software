import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ReviewSource {
  TABLE_QR = 'TABLE_QR',
  ROOM_PORTAL = 'ROOM_PORTAL',
  FRONT_DESK = 'FRONT_DESK',
  FAST_TAKEAWAY = 'FAST_TAKEAWAY',
}

export enum ServiceRecoveryStatus {
  NONE = 'NONE',
  TRIGGERED = 'TRIGGERED',
  MANAGER_VISITING = 'MANAGER_VISITING',
  COMPLIMENTARY_OFFERED = 'COMPLIMENTARY_OFFERED',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export interface IRatingDimensions {
  overall: number; // 1 to 5
  foodQuality?: number; // 1 to 5
  serviceSpeed?: number; // 1 to 5
  ambienceCleanliness?: number; // 1 to 5
  valueForMoney?: number; // 1 to 5
}

export interface IServiceRecovery {
  status: ServiceRecoveryStatus;
  assignedManagerId?: Types.ObjectId;
  assignedManagerName?: string;
  recoveryAction?: string;
  discountPercentage?: number;
  recoveryNotes?: string;
  triggeredAt?: Date;
  resolvedAt?: Date;
}

export interface IGuestReview extends Document {
  hotelId: Types.ObjectId;
  guestName: string;
  guestPhone?: string;
  orderId?: Types.ObjectId;
  billId?: Types.ObjectId;
  stayId?: Types.ObjectId;
  source: ReviewSource;
  tableNumber?: string;
  roomNumber?: string;
  waiterId?: Types.ObjectId;
  waiterName?: string;
  ratings: IRatingDimensions;
  tags: string[];
  comments?: string;
  isNegative: boolean;
  serviceRecovery: IServiceRecovery;
  googleReviewPrompted: boolean;
  googleReviewClicked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RatingDimensionsSchema = new Schema<IRatingDimensions>(
  {
    overall: { type: Number, required: true, min: 1, max: 5 },
    foodQuality: { type: Number, min: 1, max: 5 },
    serviceSpeed: { type: Number, min: 1, max: 5 },
    ambienceCleanliness: { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
  },
  { _id: false }
);

const ServiceRecoverySchema = new Schema<IServiceRecovery>(
  {
    status: {
      type: String,
      enum: Object.values(ServiceRecoveryStatus),
      default: ServiceRecoveryStatus.NONE,
      index: true,
    },
    assignedManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedManagerName: { type: String },
    recoveryAction: { type: String },
    discountPercentage: { type: Number, default: 0 },
    recoveryNotes: { type: String },
    triggeredAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { _id: false }
);

const GuestReviewSchema = new Schema<IGuestReview>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'RestaurantOrder' },
    billId: { type: Schema.Types.ObjectId, ref: 'RestaurantBill' },
    stayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
    source: {
      type: String,
      enum: Object.values(ReviewSource),
      default: ReviewSource.TABLE_QR,
      required: true,
    },
    tableNumber: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    waiterName: { type: String, trim: true },
    ratings: { type: RatingDimensionsSchema, required: true },
    tags: [{ type: String, trim: true }],
    comments: { type: String, trim: true },
    isNegative: { type: Boolean, default: false, index: true },
    serviceRecovery: { type: ServiceRecoverySchema, default: () => ({ status: ServiceRecoveryStatus.NONE }) },
    googleReviewPrompted: { type: Boolean, default: false },
    googleReviewClicked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GuestReviewSchema.index({ hotelId: 1, createdAt: -1 });
GuestReviewSchema.index({ hotelId: 1, isNegative: 1, 'serviceRecovery.status': 1 });

export const GuestReview = mongoose.model<IGuestReview>('GuestReview', GuestReviewSchema);
