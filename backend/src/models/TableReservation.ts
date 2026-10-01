import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum DepositStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FORFEITED = 'FORFEITED'
}

export interface ITableReservation extends Document {
  hotelId: Types.ObjectId;
  reservationNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationDate: Date; // Date component
  timeSlot: string; // "19:30"
  durationMinutes: number;
  assignedTableIds: Types.ObjectId[];
  mealPeriod?: 'BREAKFAST' | 'LUNCH' | 'HIGH_TEA' | 'DINNER' | 'LATE_NIGHT';
  tableTypePreference?: 'STANDARD_DINING' | 'VIP_BOOTH' | 'WINDOW_VIEW' | 'OUTDOOR_PATIO' | 'PRIVATE_DINING_ROOM_PDR' | 'CHEF_TABLE';
  vipTier?: 'REGULAR' | 'SILVER' | 'GOLD' | 'PLATINUM_VIP';
  dietaryPreferences?: string[];
  allergens?: string[];
  specialOccasion?: 'NONE' | 'BIRTHDAY' | 'ANNIVERSARY' | 'BUSINESS_MEETING' | 'DATE_NIGHT' | 'PROPOSAL';
  chefNotes?: string;
  preOrderedItems?: Array<{ itemName: string; quantity: number; notes?: string }>;
  guestProfileId?: Types.ObjectId;
  specialRequests?: string;
  depositAmount: number;
  depositStatus: DepositStatus;
  status: ReservationStatus;
  seatedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TableReservationSchema = new Schema<ITableReservation>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    reservationNumber: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true },
    partySize: { type: Number, required: true, min: 1 },
    reservationDate: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, default: 90, min: 30 },
    assignedTableIds: [{ type: Schema.Types.ObjectId, ref: 'DiningTable' }],
    mealPeriod: {
      type: String,
      enum: ['BREAKFAST', 'LUNCH', 'HIGH_TEA', 'DINNER', 'LATE_NIGHT'],
      default: 'DINNER',
      index: true,
    },
    tableTypePreference: {
      type: String,
      enum: [
        'STANDARD_DINING',
        'VIP_BOOTH',
        'WINDOW_VIEW',
        'OUTDOOR_PATIO',
        'PRIVATE_DINING_ROOM_PDR',
        'CHEF_TABLE',
      ],
      default: 'STANDARD_DINING',
    },
    vipTier: {
      type: String,
      enum: ['REGULAR', 'SILVER', 'GOLD', 'PLATINUM_VIP'],
      default: 'REGULAR',
      index: true,
    },
    dietaryPreferences: [{ type: String, trim: true }],
    allergens: [{ type: String, trim: true, index: true }],
    specialOccasion: {
      type: String,
      enum: ['NONE', 'BIRTHDAY', 'ANNIVERSARY', 'BUSINESS_MEETING', 'DATE_NIGHT', 'PROPOSAL'],
      default: 'NONE',
    },
    chefNotes: { type: String, trim: true },
    preOrderedItems: [
      {
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        notes: { type: String },
      },
    ],
    guestProfileId: { type: Schema.Types.ObjectId, ref: 'GuestProfile' },
    specialRequests: { type: String, trim: true },
    depositAmount: { type: Number, default: 0, min: 0 },
    depositStatus: {
      type: String,
      enum: Object.values(DepositStatus),
      default: DepositStatus.NONE,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.CONFIRMED,
      index: true,
    },
    seatedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

TableReservationSchema.index({ hotelId: 1, reservationNumber: 1 }, { unique: true });
TableReservationSchema.index({ hotelId: 1, reservationDate: 1, timeSlot: 1 });

export const TableReservation = mongoose.model<ITableReservation>('TableReservation', TableReservationSchema);
