"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeCostingHelper = void 0;
class RecipeCostingHelper {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 1,
        }).format(amount || 0);
    }
    static calculateIngredientContribution(qty, unitCost) {
        return Math.round((qty || 0) * (unitCost || 0) * 100) / 100;
    }
    static calculateTotalBatchCost(ingredients) {
        const total = ingredients.reduce((sum, ing) => sum + (ing.quantity || 0) * (ing.unitCost || 0), 0);
        return Math.round(total * 100) / 100;
    }
    static calculateRecipeMargin(costPerPortion, sellingPrice) {
        if (!sellingPrice || sellingPrice <= 0) {
            return { foodCostPct: 0, grossMarginPct: 100 };
        }
        const foodCostPct = Math.round((costPerPortion / sellingPrice) * 1000) / 10;
        const grossMarginPct = Math.max(0, Math.round((100 - foodCostPct) * 10) / 10);
        return { foodCostPct, grossMarginPct };
    }
    static getCostHealthBadge(foodCostPct, targetCostPct = 32) {
        if (foodCostPct <= targetCostPct) {
            return {
                status: 'OPTIMAL',
                label: 'Optimal Margin',
                badgeBg: 'bg-emerald-950/60',
                badgeBorder: 'border-emerald-500/40',
                badgeText: 'text-emerald-400',
            };
        }
        else if (foodCostPct <= targetCostPct + 6) {
            return {
                status: 'MODERATE',
                label: 'Moderate Slippage',
                badgeBg: 'bg-amber-950/60',
                badgeBorder: 'border-amber-500/40',
                badgeText: 'text-amber-400',
            };
        }
        else {
            return {
                status: 'HIGH_ALERT',
                label: 'High Cost Alert',
                badgeBg: 'bg-red-950/60',
                badgeBorder: 'border-red-500/50',
                badgeText: 'text-red-400',
            };
        }
    }
    static getWasteTypeBadge(type) {
        switch (type) {
            case 'SPOILED':
                return { label: 'Spoiled Prep', bg: 'bg-rose-950/60', text: 'text-rose-400' };
            case 'BURNT_OVERCOOKED':
                return { label: 'Burnt / Overcooked', bg: 'bg-orange-950/60', text: 'text-orange-400' };
            case 'EXPIRED':
                return { label: 'Expired Expiry', bg: 'bg-red-950/60', text: 'text-red-400' };
            case 'CUSTOMER_RETURN':
                return { label: 'Guest Return', bg: 'bg-purple-950/60', text: 'text-purple-400' };
            case 'TRIMMING_LOSS':
                return { label: 'Trimming Loss', bg: 'bg-yellow-950/60', text: 'text-yellow-400' };
            case 'BUFFET_SURPLUS':
                return { label: 'Buffet Surplus', bg: 'bg-blue-950/60', text: 'text-blue-400' };
            default:
                return { label: type, bg: 'bg-zinc-800', text: 'text-zinc-300' };
        }
    }
}
exports.RecipeCostingHelper = RecipeCostingHelper;
