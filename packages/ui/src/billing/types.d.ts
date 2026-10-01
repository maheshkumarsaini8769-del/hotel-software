export type CurrencyDenomination = 500 | 200 | 100 | 50 | 20 | 10 | 5 | 1;
export interface DenominationItem {
    denomination: CurrencyDenomination;
    count: number;
    total: number;
}
export interface SplitPersonShare {
    personNumber: number;
    amount: number;
}
export interface SplitBillResult {
    splitType: 'EQUAL' | 'CUSTOM';
    totalAmount: number;
    splits: SplitPersonShare[];
}
export interface CashTenderResult {
    billAmount: number;
    cashTendered: number;
    changeDue: number;
    isSufficient: boolean;
}
export interface ShiftCloseVarianceResult {
    openingFloat: number;
    expectedSales: number;
    systemExpectedCash: number;
    actualCountedCash: number;
    varianceAmount: number;
    status: 'BALANCED' | 'SHORTAGE' | 'EXCESS';
}
