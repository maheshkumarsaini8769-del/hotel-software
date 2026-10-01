import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MenuQuadrant {
  STAR = 'STAR',           // High Popularity, High Margin
  PLOWHORSE = 'PLOWHORSE', // High Popularity, Low Margin
  PUZZLE = 'PUZZLE',       // Low Popularity, High Margin
  DOG = 'DOG',             // Low Popularity, Low Margin
}

export interface IMenuEngineeringItem {
  menuItemId: Types.ObjectId;
  itemName: string;
  category?: string;
  sellingPrice: number;
  foodCost: number;
  foodCostPercentage: number;
  contributionMargin: number;
  quantitySold: number;
  totalRevenue: number;
  totalContributionMargin: number;
  menuSharePercentage: number;
  quadrant: MenuQuadrant;
  actionStrategy: string;
}

export interface IMenuEngineeringReport extends Document {
  hotelId: Types.ObjectId;
  reportTitle: string;
  periodStart: Date;
  periodEnd: Date;
  totalSalesVolume: number;
  totalRevenue: number;
  totalFoodCost: number;
  totalContributionMargin: number;
  overallFoodCostPercentage: number;
  averageVolumeBenchmark: number;
  averageMarginBenchmark: number;
  items: IMenuEngineeringItem[];
  summaryCounts: {
    starsCount: number;
    plowhorsesCount: number;
    puzzlesCount: number;
    dogsCount: number;
  };
  generatedByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuEngineeringItemSchema = new Schema<IMenuEngineeringItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    itemName: { type: String, required: true, trim: true },
    category: { type: String, default: 'General' },
    sellingPrice: { type: Number, required: true, min: 0 },
    foodCost: { type: Number, required: true, min: 0 },
    foodCostPercentage: { type: Number, required: true, default: 0 },
    contributionMargin: { type: Number, required: true },
    quantitySold: { type: Number, required: true, default: 0, min: 0 },
    totalRevenue: { type: Number, required: true, default: 0, min: 0 },
    totalContributionMargin: { type: Number, required: true, default: 0 },
    menuSharePercentage: { type: Number, required: true, default: 0 },
    quadrant: {
      type: String,
      enum: Object.values(MenuQuadrant),
      required: true,
      index: true,
    },
    actionStrategy: { type: String, required: true },
  },
  { _id: false }
);

const MenuEngineeringReportSchema = new Schema<IMenuEngineeringReport>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    reportTitle: { type: String, required: true, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalSalesVolume: { type: Number, required: true, default: 0 },
    totalRevenue: { type: Number, required: true, default: 0 },
    totalFoodCost: { type: Number, required: true, default: 0 },
    totalContributionMargin: { type: Number, required: true, default: 0 },
    overallFoodCostPercentage: { type: Number, required: true, default: 0 },
    averageVolumeBenchmark: { type: Number, required: true, default: 0 },
    averageMarginBenchmark: { type: Number, required: true, default: 0 },
    items: [MenuEngineeringItemSchema],
    summaryCounts: {
      starsCount: { type: Number, default: 0 },
      plowhorsesCount: { type: Number, default: 0 },
      puzzlesCount: { type: Number, default: 0 },
      dogsCount: { type: Number, default: 0 },
    },
    generatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MenuEngineeringReportSchema.index({ hotelId: 1, createdAt: -1 });

export const MenuEngineeringReport = mongoose.model<IMenuEngineeringReport>(
  'MenuEngineeringReport',
  MenuEngineeringReportSchema
);
