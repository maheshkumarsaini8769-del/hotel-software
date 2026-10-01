export type MenuQuadrantUI = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';

export interface IMenuEngineeringItemUI {
  menuItemId: string;
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
  quadrant: MenuQuadrantUI;
  actionStrategy: string;
}

export interface IMenuEngineeringReportUI {
  _id: string;
  hotelId: string;
  reportTitle: string;
  periodStart: string;
  periodEnd: string;
  totalSalesVolume: number;
  totalRevenue: number;
  totalFoodCost: number;
  totalContributionMargin: number;
  overallFoodCostPercentage: number;
  averageVolumeBenchmark: number;
  averageMarginBenchmark: number;
  items: IMenuEngineeringItemUI[];
  summaryCounts: {
    starsCount: number;
    plowhorsesCount: number;
    puzzlesCount: number;
    dogsCount: number;
  };
  generatedByUserId?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface IPriceSimulationResultUI {
  itemName: string;
  currentState: {
    price: number;
    cost: number;
    volume: number;
    margin: number;
    totalProfit: number;
    foodCostPercentage: number;
    quadrant: MenuQuadrantUI;
  };
  projectedState: {
    price: number;
    cost: number;
    volume: number;
    margin: number;
    totalProfit: number;
    foodCostPercentage: number;
    quadrant: MenuQuadrantUI;
    actionStrategy: string;
  };
  impact: {
    profitDifference: number;
    profitGrowthPercentage: number;
  };
}

export interface ISimulatePricePayload {
  itemName: string;
  currentPrice: number;
  currentFoodCost: number;
  currentVolume: number;
  priceDeltaPercent: number;
  costDeltaPercent: number;
  volumeElasticityFactor?: number;
  avgVolumeBenchmark?: number;
  avgMarginBenchmark?: number;
}
