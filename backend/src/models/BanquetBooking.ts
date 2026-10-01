import mongoose, { Schema, Document, Types } from 'mongoose';

export enum BanquetEventType {
  WEDDING_RECEPTION = 'WEDDING_RECEPTION',
  CORPORATE_CONFERENCE = 'CORPORATE_CONFERENCE',
  COCKTAIL_DINNER = 'COCKTAIL_DINNER',
  BIRTHDAY_ANNIVERSARY = 'BIRTHDAY_ANNIVERSARY',
  EXHIBITION_SEMINAR = 'EXHIBITION_SEMINAR',
  SOCIAL_GATHERING = 'SOCIAL_GATHERING',
}

export enum BanquetTimeSlot {
  MORNING = 'MORNING', // 09:00 AM - 03:00 PM
  EVENING = 'EVENING', // 06:00 PM - 12:00 AM
  FULL_DAY = 'FULL_DAY', // 09:00 AM - 11:30 PM
}

export enum BanquetBookingStatus {
  ENQUIRY = 'ENQUIRY',
  PROVISIONAL = 'PROVISIONAL',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SeatingLayoutType {
  THEATER = 'THEATER',
  ROUND_TABLE_CLUSTERS = 'ROUND_TABLE_CLUSTERS',
  U_SHAPE = 'U_SHAPE',
  CLASSROOM = 'CLASSROOM',
  HOLLOW_SQUARE = 'HOLLOW_SQUARE',
  COCKTAIL_STANDING = 'COCKTAIL_STANDING',
}

export interface IFunctionProspectus {
  seatingLayout: SeatingLayoutType;
  stageDimensions?: string;
  hasAudioVisual: boolean;
  audioVisualNotes?: string;
  foodServiceStartTime: string;
  foodServiceEndTime: string;
  welcomeDrinksTiming?: string;
  starterCirculationTiming?: string;
  mainBuffetOpenTiming?: string;
  dessertStationTiming?: string;
  specialDietaryRequirements?: string;
  chefSignOff: boolean;
  banquetManagerSignOff: boolean;
  electricianAvSignOff: boolean;
  additionalInstructions?: string;
}

export interface IBanquetBooking extends Document {
  hotelId: Types.ObjectId;
  bookingCode: string; // e.g. BNQ-202610-001
  eventName: string;
  eventType: BanquetEventType;
  venueName: string; // e.g. 'Royal Kohinoor Ballroom', 'Crystal Lawn'
  eventDate: Date;
  timeSlot: BanquetTimeSlot;
  guaranteedPax: number;
  expectedPax: number;
  pricingType: 'PER_PLATE' | 'HALL_RENT_ONLY' | 'COMBO_PACKAGE';
  perPlateRate: number;
  hallRentAmount: number;
  decorAndAudioVisualAmount: number;
  cateringSubtotal: number;
  taxes: number; // 18% GST (9% CGST + 9% SGST) or 5% F&B
  totalEstimatedAmount: number;
  advanceDepositPaid: number;
  paidAmount: number;
  dueAmount: number;
  status: BanquetBookingStatus;
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  companyName?: string;
  companyGst?: string;
  billingAddress?: string;
  functionProspectus: IFunctionProspectus;
  masterFolioId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BanquetBookingSchema = new Schema<IBanquetBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingCode: { type: String, required: true, trim: true },
    eventName: { type: String, required: true, trim: true },
    eventType: {
      type: String,
      enum: Object.values(BanquetEventType),
      default: BanquetEventType.WEDDING_RECEPTION,
      index: true,
    },
    venueName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    timeSlot: {
      type: String,
      enum: Object.values(BanquetTimeSlot),
      default: BanquetTimeSlot.EVENING,
    },
    guaranteedPax: { type: Number, required: true, min: 10 },
    expectedPax: { type: Number, required: true, min: 10 },
    pricingType: {
      type: String,
      enum: ['PER_PLATE', 'HALL_RENT_ONLY', 'COMBO_PACKAGE'],
      default: 'PER_PLATE',
    },
    perPlateRate: { type: Number, default: 0, min: 0 },
    hallRentAmount: { type: Number, default: 0, min: 0 },
    decorAndAudioVisualAmount: { type: Number, default: 0, min: 0 },
    cateringSubtotal: { type: Number, default: 0, min: 0 },
    taxes: { type: Number, default: 0, min: 0 },
    totalEstimatedAmount: { type: Number, required: true, min: 0 },
    advanceDepositPaid: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(BanquetBookingStatus),
      default: BanquetBookingStatus.CONFIRMED,
      index: true,
    },
    organizerName: { type: String, required: true, trim: true },
    organizerPhone: { type: String, required: true, trim: true },
    organizerEmail: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, trim: true },
    companyGst: { type: String, trim: true },
    billingAddress: { type: String, trim: true },
    functionProspectus: {
      seatingLayout: {
        type: String,
        enum: Object.values(SeatingLayoutType),
        default: SeatingLayoutType.ROUND_TABLE_CLUSTERS,
      },
      stageDimensions: { type: String, default: '24ft x 16ft x 2ft' },
      hasAudioVisual: { type: Boolean, default: true },
      audioVisualNotes: { type: String, default: 'JBL Line Array + 2 Cordless Mics + LED Wall Display' },
      foodServiceStartTime: { type: String, default: '19:30' },
      foodServiceEndTime: { type: String, default: '23:30' },
      welcomeDrinksTiming: { type: String, default: '19:00' },
      starterCirculationTiming: { type: String, default: '19:30 - 21:00' },
      mainBuffetOpenTiming: { type: String, default: '21:00' },
      dessertStationTiming: { type: String, default: '21:30' },
      specialDietaryRequirements: { type: String, default: 'Jain counter required for 30 pax' },
      chefSignOff: { type: Boolean, default: false },
      banquetManagerSignOff: { type: Boolean, default: false },
      electricianAvSignOff: { type: Boolean, default: false },
      additionalInstructions: { type: String, default: '' },
    },
    masterFolioId: { type: Schema.Types.ObjectId, ref: 'MasterFolio' },
  },
  { timestamps: true }
);

BanquetBookingSchema.index({ hotelId: 1, bookingCode: 1 }, { unique: true });
BanquetBookingSchema.index({ hotelId: 1, eventDate: 1, venueName: 1, timeSlot: 1 });

export const BanquetBooking = mongoose.model<IBanquetBooking>('BanquetBooking', BanquetBookingSchema);
