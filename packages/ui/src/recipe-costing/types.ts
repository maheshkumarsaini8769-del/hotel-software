export interface IRecipeIngredientUI {
  ingredientName: string;
  quantity: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
  unitCost: number;
  costContribution: number;
  rawMaterialSku?: string;
}

export interface IRecipeUI {
  _id: string;
  hotelId: string;
  menuItemId: any; // Populated or string ID
  recipeCode: string;
  title: string;
  yieldPortions: number;
  portionSizeDescription?: string;
  ingredients: IRecipeIngredientUI[];
  preparationSteps: string[];
  totalBatchCost: number;
  costPerPortion: number;
  targetSellingPrice: number;
  foodCostPercentage: number;
  grossMarginPercentage: number;
  targetCostPercentage: number;
  isActive: boolean;
  lastReviewedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface IRecipeMetricsUI {
  totalRecipesCount: number;
  highCostRecipesCount: number;
  averageFoodCostPercentage: number;
  targetFoodCostPercentage: number;
}

export type WasteTypeUI =
  | 'SPOILED'
  | 'BURNT_OVERCOOKED'
  | 'EXPIRED'
  | 'CUSTOMER_RETURN'
  | 'TRIMMING_LOSS'
  | 'BUFFET_SURPLUS';

export type KitchenShiftUI = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'MIDNIGHT';

export interface IFoodWasteLogUI {
  _id: string;
  hotelId: string;
  wasteNumber: string;
  wasteType: WasteTypeUI;
  kitchenStationId?: any;
  menuItemId?: any;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLossAmount: number;
  shift: KitchenShiftUI;
  reason: string;
  preventiveAction?: string;
  reportedByUserId?: any;
  disposalMethod: string;
  loggedAt: string;
}

export interface IFoodWasteSummaryUI {
  totalEntriesCount: number;
  totalLossAmount: number;
  daysAudited: number;
  wasteBreakdownByType: Record<string, number>;
  lossByShift: Record<string, number>;
}

export interface INewRecipePayload {
  menuItemId: string;
  title: string;
  recipeCode?: string;
  yieldPortions: number;
  portionSizeDescription?: string;
  ingredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
    unitCost: number;
    rawMaterialSku?: string;
  }>;
  preparationSteps?: string[];
  sellingPrice?: number;
  targetCostPercentage?: number;
}

export interface ILogWastePayload {
  wasteType: WasteTypeUI;
  kitchenStationId?: string;
  menuItemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  shift: KitchenShiftUI;
  reason: string;
  preventiveAction?: string;
  disposalMethod?: string;
}
