import { VIPTierUI, DiningReservationStatusUI, MealPeriodUI } from './types';
export declare class DiningReservationHelper {
    static formatCurrency(amount: number): string;
    static getVipBadge(tier: VIPTierUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static getReservationStatusBadge(status: DiningReservationStatusUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static getAllergenTag(allergen: string): {
        label: string;
        bg: string;
        text: string;
    };
    static getMealPeriodLabel(period: MealPeriodUI): string;
}
