export interface ICostHealthStatus {
    status: 'OPTIMAL' | 'MODERATE' | 'HIGH_ALERT';
    label: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
}
export declare class RecipeCostingHelper {
    static formatCurrency(amount: number): string;
    static calculateIngredientContribution(qty: number, unitCost: number): number;
    static calculateTotalBatchCost(ingredients: Array<{
        quantity: number;
        unitCost: number;
    }>): number;
    static calculateRecipeMargin(costPerPortion: number, sellingPrice: number): {
        foodCostPct: number;
        grossMarginPct: number;
    };
    static getCostHealthBadge(foodCostPct: number, targetCostPct?: number): ICostHealthStatus;
    static getWasteTypeBadge(type: string): {
        label: string;
        bg: string;
        text: string;
    };
}
