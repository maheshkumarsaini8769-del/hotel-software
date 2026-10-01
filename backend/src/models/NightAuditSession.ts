import mongoose, { Schema, Document, Types } from 'mongoose';

export enum NightAuditStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface INightAuditSession extends Document {
  hotelId: Types.ObjectId;
  auditDate: string; // YYYY-MM-DD
  nextBusinessDate: string; // YYYY-MM-DD
  status: NightAuditStatus;
  
  // Room Inventory & Occupancy
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number; // percentage (0 - 100)
  
  // Financial Revenue Metrics
  totalRoomRevenue: number;
  totalFoodAndBeverageRevenue: number;
  totalLaundryRevenue: number;
  totalPaidServicesRevenue: number;
  totalTaxesCollected: number;
  totalGrossRevenue: number;
  totalPaymentsCollected: number;
  
  // Hospitality Key Performance Indicators (KPIs)
  averageDailyRate: number; // ADR = totalRoomRevenue / occupiedRooms
  revPAR: number; // RevPAR = totalRoomRevenue / totalRooms
  
  // Auto-Posting & Audit Reconciliation
  roomsAutoPostedCount: number;
  unpostedChargesCleanedCount: number;
  activeLateDinersQuarantinedCount: number;
  
  // Audit Verification & Security
  performedByUserId?: Types.ObjectId;
  performedByUserName?: string;
  notes?: string;
  isDayClosed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NightAuditSessionSchema = new Schema<INightAuditSession>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    auditDate: { type: String, required: true, trim: true },
    nextBusinessDate: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(NightAuditStatus),
      default: NightAuditStatus.IN_PROGRESS,
      index: true
    },
    totalRooms: { type: Number, default: 0, min: 0 },
    occupiedRooms: { type: Number, default: 0, min: 0 },
    vacantRooms: { type: Number, default: 0, min: 0 },
    occupancyRate: { type: Number, default: 0, min: 0 },
    totalRoomRevenue: { type: Number, default: 0, min: 0 },
    totalFoodAndBeverageRevenue: { type: Number, default: 0, min: 0 },
    totalLaundryRevenue: { type: Number, default: 0, min: 0 },
    totalPaidServicesRevenue: { type: Number, default: 0, min: 0 },
    totalTaxesCollected: { type: Number, default: 0, min: 0 },
    totalGrossRevenue: { type: Number, default: 0, min: 0 },
    totalPaymentsCollected: { type: Number, default: 0, min: 0 },
    averageDailyRate: { type: Number, default: 0, min: 0 },
    revPAR: { type: Number, default: 0, min: 0 },
    roomsAutoPostedCount: { type: Number, default: 0, min: 0 },
    unpostedChargesCleanedCount: { type: Number, default: 0, min: 0 },
    activeLateDinersQuarantinedCount: { type: Number, default: 0, min: 0 },
    performedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByUserName: { type: String, trim: true },
    notes: { type: String, trim: true },
    isDayClosed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

NightAuditSessionSchema.index({ hotelId: 1, auditDate: 1 }, { unique: true });

export const NightAuditSession = mongoose.model<INightAuditSession>(
  'NightAuditSession',
  NightAuditSessionSchema
);
