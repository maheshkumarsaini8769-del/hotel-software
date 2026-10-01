import { TenderLineDTO, TenderMethod } from './types';
export declare class MultiTenderHelper {
    /**
     * Calculates sum of all tender line amounts
     */
    static sumTenders(tenders: TenderLineDTO[]): number;
    /**
     * Computes remaining balance needed to reach target total
     */
    static getRemainingBalance(targetTotal: number, tenders: TenderLineDTO[]): number;
    /**
     * Calculates cash change returned when customer tenders larger cash note
     */
    static calculateCashChange(tenderAmount: number, cashReceived: number): number;
    /**
     * Helper to format currency
     */
    static formatCurrency(amount: number): string;
    /**
     * Badge metadata for payment tender methods
     */
    static getTenderBadge(method: TenderMethod): {
        label: string;
        icon: string;
        bg: string;
        color: string;
    };
}
