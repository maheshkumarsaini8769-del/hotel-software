import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BookingSource {
  DIRECT_PUBLIC_WEB = 'DIRECT_PUBLIC_WEB',
  WALK_IN = 'WALK_IN',
  OTA = 'OTA',
  CORPORATE = 'CORPORATE'
}

export enum BookingMode {
  OVERNIGHT = 'OVERNIGHT',
  DAY_USE = 'DAY_USE',
  HOURLY = 'HOURLY'
}

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export interface IBooking extends Document {
  hotelId: Types.ObjectId;
  bookingNumber: string; // Random 8-digit unguessable string
  bookingSource: BookingSource;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofDocumentUrl?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  nights?: number;
  estimatedArrivalTime?: string;
  guestPhoneVerified?: boolean;
  secondaryGuestName?: string;
  secondaryGuestPhone?: string;
  secondaryGuestRelationship?: string;
  distanceFromHotelKm?: number;
  bookingLocation?: 'HOTEL_RADIUS' | 'IN_HOTEL' | 'REMOTE_HOME';
  receptionApprovedAt?: Date;
  receptionApprovedBy?: string;
  checkInDate: Date;
  checkOutDate: Date;
  bookingMode: BookingMode;
  roomTypeId: Types.ObjectId;
  allocatedRoomId?: Types.ObjectId; // Strictly null until Reception Check-in!
  guestCountAdults: number;
  guestCountChildren: number;
  extraBedsCount: number;
  totalTariff: number;
  taxAmount: number;
  grandTotal: number;
  advancePaymentAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  bookingStatus: BookingStatus;
  dpdpConsent?: {
    accepted: boolean;
    timestamp: Date;
    ipAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingNumber: { type: String, required: true },
    bookingSource: {
      type: String,
      enum: Object.values(BookingSource),
      default: BookingSource.DIRECT_PUBLIC_WEB,
    },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true },
    idProofType: { type: String },
    idProofNumber: { type: String },
    idProofDocumentUrl: { type: String },
    aadhaarFrontUrl: { type: String },
    aadhaarBackUrl: { type: String },
    nights: { type: Number, default: 1, min: 1 },
    estimatedArrivalTime: { type: String },
    guestPhoneVerified: { type: Boolean, default: false },
    secondaryGuestName: { type: String, trim: true },
    secondaryGuestPhone: { type: String, trim: true },
    secondaryGuestRelationship: { type: String, trim: true },
    distanceFromHotelKm: { type: Number },
    bookingLocation: { type: String, enum: ['HOTEL_RADIUS', 'IN_HOTEL', 'REMOTE_HOME'], default: 'HOTEL_RADIUS' },
    receptionApprovedAt: { type: Date },
    receptionApprovedBy: { type: String },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    bookingMode: {
      type: String,
      enum: Object.values(BookingMode),
      default: BookingMode.OVERNIGHT,
    },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true, index: true },
    allocatedRoomId: { type: Schema.Types.ObjectId, ref: 'Room', default: null }, // Null until check-in!
    guestCountAdults: { type: Number, default: 2, min: 1 },
    guestCountChildren: { type: Number, default: 0, min: 0 },
    extraBedsCount: { type: Number, default: 0, min: 0 },
    totalTariff: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    advancePaymentAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIAL', 'PAID'],
      default: 'UNPAID',
    },
    bookingStatus: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.CONFIRMED,
      index: true,
    },
    dpdpConsent: {
      accepted: { type: Boolean, default: false },
      timestamp: { type: Date },
      ipAddress: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

BookingSchema.index({ hotelId: 1, bookingNumber: 1 }, { unique: true });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
