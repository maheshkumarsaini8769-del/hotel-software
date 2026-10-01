export interface ISurgeTierUI {
  tierName: string;
  minOccupancyPercent: number;
  maxOccupancyPercent: number;
  multiplier: number;
  fixedAdjustment?: number;
}

export interface ICompetitorBenchmarkUI {
  competitorName: string;
  benchmarkPrice: number;
  lastUpdated: string;
}

export interface IRevenueStrategyUI {
  _id: string;
  hotelId: string;
  roomTypeId: any;
  strategyName: string;
  isActive: boolean;
  basePrice: number;
  minPriceFloor: number;
  maxPriceCeiling: number;
  surgeTiers: ISurgeTierUI[];
  weekendMultiplier: number;
  competitorBenchmarks: ICompetitorBenchmarkUI[];
  lastCalculatedRate?: number;
  lastCalculatedOccupancy?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDynamicRateQuoteUI {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  finalDynamicRate: number;
  activeTierName: string;
  surgeMultiplier: number;
  occupancyPercent: number;
  isWeekend: boolean;
  weekendMultiplierApplied: number;
  tax12Percent: number;
  totalWithGst: number;
  competitorAverage: number;
  competitorComparison: Array<{
    competitorName: string;
    benchmarkPrice: number;
    priceDelta: number;
  }>;
  yieldRecommendation: string;
}
