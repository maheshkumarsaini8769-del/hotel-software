import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SplitBillingPolicy {
  MASTER_PAYS_ROOM_ONLY = 'MASTER_PAYS_ROOM_ONLY', // Corporate pays rooms; guests pay F&B/extras
  MASTER_PAYS_ALL = 'MASTER_PAYS_ALL',             // Company foots the entire bill
  INDIVIDUAL_SETTLEMENT = 'INDIVIDUAL_SETTLEMENT'  // Each room settles its own account
}

export enum GroupBookingStatus {
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_CHECKED_IN = 'PARTIALLY_CHECKED_IN',
  FULLY_CHECKED_IN = 'FULLY_CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface IGroupRoomEntry {
  _id?: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  allocatedRoomId?: Types.ObjectId;
  primaryGuestName: string;
  primaryGuestPhone: string;
  tariffPerNight: number;
  stayId?: Types.ObjectId;
  folioId?: Types.ObjectId;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
}

export interface IGroupBooking extends Document {
  hotelId: Types.ObjectId;
  groupBookingCode: string; // e.g. GRP-91024
  groupName: string;
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  companyName?: string;
  companyGst?: string;
  checkInDate: Date;
  checkOutDate: Date;
  rooms: IGroupRoomEntry[];
  splitBillingPolicy: SplitBillingPolicy;
  masterFolioId?: Types.ObjectId;
  advanceDepositPaid: number;
  totalEstimatedAmount: number;
  status: GroupBookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const GroupBookingSchema = new Schema<IGroupBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    groupBookingCode: { type: String, required: true, trim: true },
    groupName: { type: String, required: true, trim: true },
    organizerName: { type: String, required: true, trim: true },
    organizerPhone: { type: String, required: true, trim: true },
    organizerEmail: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, trim: true },
    companyGst: { type: String, trim: true },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    rooms: [
      {
        roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
        allocatedRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
        primaryGuestName: { type: String, required: true },
        primaryGuestPhone: { type: String, required: true },
        tariffPerNight: { type: Number, required: true, min: 0 },
        stayId: { type: Schema.Types.ObjectId, ref: 'Stay' },
        folioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio' },
        status: {
          type: String,
          enum: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'],
          default: 'CONFIRMED',
        },
      },
    ],
    splitBillingPolicy: {
      type: String,
      enum: Object.values(SplitBillingPolicy),
      default: SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY,
    },
    masterFolioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio' },
    advanceDepositPaid: { type: Number, default: 0, min: 0 },
    totalEstimatedAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(GroupBookingStatus),
      default: GroupBookingStatus.CONFIRMED,
      index: true,
    },
  },
  { timestamps: true }
);

GroupBookingSchema.index({ hotelId: 1, groupBookingCode: 1 }, { unique: true });

export const GroupBooking = mongoose.model<IGroupBooking>('GroupBooking', GroupBookingSchema);
