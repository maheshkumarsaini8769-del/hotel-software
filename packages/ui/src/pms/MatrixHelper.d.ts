import { MatrixDateHeader } from './types';
export interface BlockLayoutResult {
    isVisible: boolean;
    startColIndex: number;
    spanCols: number;
    isContinuationLeft: boolean;
    isContinuationRight: boolean;
}
export declare class MatrixHelper {
    /**
     * Computes column span and offset for a reservation block in the current calendar date grid
     */
    static calculateBlockLayout(checkInDateStr: string, checkOutDateStr: string, calendarDates: MatrixDateHeader[]): BlockLayoutResult;
    /**
     * Luxury visual styling tokens for PMS reservation blocks
     */
    static getReservationStatusStyle(status: string): {
        bg: string;
        border: string;
        text: string;
        badge: string;
        glow: string;
    };
    /**
     * Calculates night count between check-in and check-out
     */
    static calculateNights(checkInDateStr: string, checkOutDateStr: string): number;
    /**
     * Authoritative dynamic tariff calculation with 12% / 18% GST tier
     */
    static calculateEstimatedTariff(basePricePerNight: number, checkInDateStr: string, checkOutDateStr: string): {
        nights: number;
        baseTariff: number;
        gstRate: number;
        taxAmount: number;
        grandTotal: number;
    };
    /**
     * Short Date format '15 Oct'
     */
    static formatDateShort(dateStr: string): string;
}
