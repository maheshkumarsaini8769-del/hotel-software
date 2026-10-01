import { CurrencyDenomination, DenominationItem, SplitPersonShare, CashTenderResult, ShiftCloseVarianceResult } from './types';
export declare class BillingCalculatorHelper {
    /**
     * Calculate 5% Restaurant Dining GST (2.5% CGST + 2.5% SGST)
     */
    static calculate5PercentGst(subtotal: number, discountAmount?: number): {
        taxableAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        totalTax: number;
        grandTotal: number;
    };
    /**
     * Calculate Equal Split Distribution with remainder penny rounding
     */
    static calculateEqualSplit(totalAmount: number, splitCount: number): SplitPersonShare[];
    /**
     * Validate Custom Split: checks if sum of all shares matches grand total
     */
    static validateCustomSplit(totalAmount: number, splits: SplitPersonShare[]): {
        isValid: boolean;
        sum: number;
        difference: number;
    };
    /**
     * Calculate Cash Tender Change Due
     */
    static calculateCashChange(billAmount: number, cashTendered: number): CashTenderResult;
    /**
     * Calculate Denomination Total and Breakdown from Note Counts
     */
    static calculateDenominationsTotal(noteCounts: Record<CurrencyDenomination, number>): {
        total: number;
        breakdown: DenominationItem[];
    };
    /**
     * Calculate Cashier Blind Shift Variance
     */
    static calculateShiftVariance(openingFloat: number, countedCash: number, totalCashSales: number): ShiftCloseVarianceResult;
}
