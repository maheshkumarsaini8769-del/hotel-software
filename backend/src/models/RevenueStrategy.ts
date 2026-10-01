import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISurgeTier {
  tierName: string; // 'LOW_DEMAND', 'STANDARD', 'HIGH_DEMAND', 'PEAK_SURGE'
  minOccupancyPercent: number; // e.g. 0, 40, 70, 85
  maxOccupancyPercent: number; // e.g. 40, 70, 85, 100
  multiplier: number; // e.g. 0.90, 1.00, 1.20, 1.40
  fixedAdjustment?: number; // e.g. +500
}

export interface ICompetitorBenchmark {
  competitorName: string;
  benchmarkPrice: number;
  lastUpdated: Date;
}

export interface IRevenueStrategy extends Document {
  hotelId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  strategyName: string;
  isActive: boolean;
  basePrice: number;
  minPriceFloor: number; // Safety floor - never sell below this
  maxPriceCeiling: number; // Legal/market cap - never charge above this
  surgeTiers: ISurgeTier[];
  weekendMultiplier: number; // e.g. 1.15 for Fri/Sat/Sun
  competitorBenchmarks: ICompetitorBenchmark[];
  lastCalculatedRate?: number;
  lastCalculatedOccupancy?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SurgeTierSchema = new Schema<ISurgeTier>(
  {
    tierName: { type: String, required: true },
    minOccupancyPercent: { type: Number, required: true, min: 0, max: 100 },
    maxOccupancyPercent: { type: Number, required: true, min: 0, max: 100 },
    multiplier: { type: Number, required: true, min: 0.1, default: 1.0 },
    fixedAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const CompetitorBenchmarkSchema = new Schema<ICompetitorBenchmark>(
  {
    competitorName: { type: String, required: true, trim: true },
    benchmarkPrice: { type: Number, required: true, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RevenueStrategySchema = new Schema<IRevenueStrategy>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true, index: true },
    strategyName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    basePrice: { type: Number, required: true, min: 0 },
    minPriceFloor: { type: Number, required: true, min: 0 },
    maxPriceCeiling: { type: Number, required: true, min: 0 },
    surgeTiers: {
      type: [SurgeTierSchema],
      default: [
        { tierName: 'LOW_DEMAND', minOccupancyPercent: 0, maxOccupancyPercent: 40, multiplier: 0.9, fixedAdjustment: 0 },
        { tierName: 'STANDARD', minOccupancyPercent: 40, maxOccupancyPercent: 70, multiplier: 1.0, fixedAdjustment: 0 },
        { tierName: 'HIGH_DEMAND', minOccupancyPercent: 70, maxOccupancyPercent: 85, multiplier: 1.25, fixedAdjustment: 0 },
        { tierName: 'PEAK_SURGE', minOccupancyPercent: 85, maxOccupancyPercent: 100, multiplier: 1.45, fixedAdjustment: 0 },
      ],
    },
    weekendMultiplier: { type: Number, default: 1.15, min: 1.0 },
    competitorBenchmarks: { type: [CompetitorBenchmarkSchema], default: [] },
    lastCalculatedRate: { type: Number },
    lastCalculatedOccupancy: { type: Number },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

RevenueStrategySchema.index({ hotelId: 1, roomTypeId: 1 }, { unique: true });

export const RevenueStrategy = mongoose.model<IRevenueStrategy>(
  'RevenueStrategy',
  RevenueStrategySchema
);
