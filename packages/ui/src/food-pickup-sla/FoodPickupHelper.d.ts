import { FoodPickupTicketDTO } from './types';
export declare class FoodPickupHelper {
    /**
     * Calculates remaining seconds until effective deadline
     */
    static getRemainingSeconds(ticket: FoodPickupTicketDTO, now?: Date): number;
    /**
     * Determines urgency status
     */
    static getUrgencyLevel(remainingSec: number, totalSlaMinutes?: number): 'safe' | 'warning' | 'urgent' | 'breached';
    /**
     * Format mm:ss string
     */
    static formatMmSs(seconds: number): string;
    /**
     * Status badge styling helper
     */
    static getStatusBadge(status: string): {
        label: string;
        color: string;
        bg: string;
    };
}
