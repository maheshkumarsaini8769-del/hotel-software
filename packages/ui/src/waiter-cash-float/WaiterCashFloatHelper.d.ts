import { WaiterFloatStatus } from './types';
export declare class WaiterCashFloatHelper {
    /**
     * Calculates net cash expected in pocket
     */
    static calculateExpectedCash(openingFloat: number, totalCashCollected: number, totalChangeGiven: number): number;
    /**
     * Returns styling classes and label for float status badge
     */
    static getStatusBadge(status: WaiterFloatStatus): {
        bg: string;
        text: string;
        border: string;
        label: string;
        icon: string;
    };
    /**
     * Formats variance label with color and sign
     */
    static formatVariance(variance: number): {
        text: string;
        color: string;
        status: 'MATCH' | 'SHORT' | 'SURPLUS';
    };
}
