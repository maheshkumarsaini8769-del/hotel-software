import { KdsOrderCardModel, KdsOrderItemModel, KdsAllergenBadgeConfig, UrgencyLevel, KdsOverallOrderStatus } from './types';
export declare class KdsHelper {
    /**
     * Calculates elapsed minutes from order placement time
     */
    static calculateElapsedMinutes(placedAt: string | Date, now?: Date): number;
    /**
     * Urgency rules:
     * < 10 mins: NORMAL (Green)
     * 10 - 20 mins: WARNING (Amber)
     * > 20 mins: CRITICAL (Red alert)
     */
    static getUrgencyLevel(elapsedMinutes: number): UrgencyLevel;
    /**
     * Visual design tokens based on urgency level
     */
    static getUrgencyStyle(urgency: UrgencyLevel): {
        border: string;
        bg: string;
        badge: string;
        badgeBg: string;
        text: string;
        timerText: string;
    };
    /**
     * Filter orders by kitchen station ID (or ALL)
     */
    static filterOrdersByStation(orders: KdsOrderCardModel[], stationId: string | 'ALL'): KdsOrderCardModel[];
    /**
     * Filter orders by status (or ALL active)
     */
    static filterOrdersByStatus(orders: KdsOrderCardModel[], status: KdsOverallOrderStatus | 'ALL'): KdsOrderCardModel[];
    /**
     * Human-readable timer formatted string (e.g., '14m' or '25m (LATE)')
     */
    /**
     * Human-readable timer formatted string (e.g., '14m' or '25m (LATE)')
     */
    static formatElapsedTimer(elapsedMinutes: number): string;
    /**
     * Shift 47: Generates high-contrast luxury UI allergen and dietary warning badges
     */
    static getAllergenBadges(item: KdsOrderItemModel): KdsAllergenBadgeConfig[];
    /**
     * Checks if an individual item is safety-blocked awaiting mandatory chef acknowledgment
     */
    static isItemBlockedByAllergen(item: KdsOrderItemModel): boolean;
    /**
     * Checks if an entire order is blocked from proceeding because at least one item requires chef acknowledgment
     */
    static isOrderBlockedByAllergen(order: KdsOrderCardModel): boolean;
    /**
     * Generates a concise summary banner for chef KDS screen
     */
    static getAllergenAlertSummary(order: KdsOrderCardModel): string | null;
}
