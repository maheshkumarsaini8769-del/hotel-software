export declare class RevenueManagerHelper {
    static formatCurrency(amount: number): string;
    static getTierBadge(tierName: string): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static calculateYieldLift(basePrice: number, dynamicPrice: number): {
        liftPercent: number;
        isSurge: boolean;
    };
}
