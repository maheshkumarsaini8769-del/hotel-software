import {
  CurrencyDenomination,
  DenominationItem,
  SplitPersonShare,
  CashTenderResult,
  ShiftCloseVarianceResult,
} from './types';

export class BillingCalculatorHelper {
  /**
   * Calculate 5% Restaurant Dining GST (2.5% CGST + 2.5% SGST)
   */
  public static calculate5PercentGst(subtotal: number, discountAmount = 0): {
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalTax: number;
    grandTotal: number;
  } {
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const cgstAmount = Math.round(taxableAmount * 0.025 * 100) / 100;
    const sgstAmount = Math.round(taxableAmount * 0.025 * 100) / 100;
    const totalTax = cgstAmount + sgstAmount;
    const grandTotal = Math.round(taxableAmount + totalTax);

    return {
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal,
    };
  }

  /**
   * Calculate Equal Split Distribution with remainder penny rounding
   */
  public static calculateEqualSplit(totalAmount: number, splitCount: number): SplitPersonShare[] {
    const count = Math.max(1, splitCount);
    const perPerson = Math.floor(totalAmount / count);
    const remainder = totalAmount - perPerson * count;

    return Array.from({ length: count }).map((_, i) => ({
      personNumber: i + 1,
      amount: i === 0 ? perPerson + remainder : perPerson,
    }));
  }

  /**
   * Validate Custom Split: checks if sum of all shares matches grand total
   */
  public static validateCustomSplit(totalAmount: number, splits: SplitPersonShare[]): {
    isValid: boolean;
    sum: number;
    difference: number;
  } {
    const sum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const difference = totalAmount - sum;
    return {
      isValid: Math.round(sum) === Math.round(totalAmount),
      sum,
      difference,
    };
  }

  /**
   * Calculate Cash Tender Change Due
   */
  public static calculateCashChange(billAmount: number, cashTendered: number): CashTenderResult {
    const isSufficient = cashTendered >= billAmount;
    const changeDue = Math.max(0, cashTendered - billAmount);
    return {
      billAmount,
      cashTendered,
      changeDue,
      isSufficient,
    };
  }

  /**
   * Calculate Denomination Total and Breakdown from Note Counts
   */
  public static calculateDenominationsTotal(noteCounts: Record<CurrencyDenomination, number>): {
    total: number;
    breakdown: DenominationItem[];
  } {
    const standardDenominations: CurrencyDenomination[] = [500, 200, 100, 50, 20, 10, 5, 1];
    let total = 0;
    const breakdown: DenominationItem[] = [];

    for (const d of standardDenominations) {
      const count = noteCounts[d] || 0;
      const lineTotal = d * count;
      total += lineTotal;
      if (count > 0) {
        breakdown.push({
          denomination: d,
          count,
          total: lineTotal,
        });
      }
    }

    return { total, breakdown };
  }

  /**
   * Calculate Cashier Blind Shift Variance
   */
  public static calculateShiftVariance(
    openingFloat: number,
    countedCash: number,
    totalCashSales: number
  ): ShiftCloseVarianceResult {
    const systemExpectedCash = openingFloat + totalCashSales;
    const varianceAmount = countedCash - systemExpectedCash;
    let status: 'BALANCED' | 'SHORTAGE' | 'EXCESS' = 'BALANCED';

    if (varianceAmount < 0) {
      status = 'SHORTAGE';
    } else if (varianceAmount > 0) {
      status = 'EXCESS';
    }

    return {
      openingFloat,
      expectedSales: totalCashSales,
      systemExpectedCash,
      actualCountedCash: countedCash,
      varianceAmount,
      status,
    };
  }
}
