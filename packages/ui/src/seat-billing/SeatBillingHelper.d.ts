import { SeatSubFolioDTO, SubFolioStatus } from './types';
export declare class SeatBillingHelper {
    /**
     * Calculates 5% GST (2.5% CGST + 2.5% SGST) and net total
     */
    static calculateGst5Percent(subTotal: number, discountAmount?: number): {
        cgstAmount: number;
        sgstAmount: number;
        totalTax: number;
        grandTotal: number;
    };
    /**
     * Status styling badge for Sub-Folio
     */
    static getSubFolioStatusBadge(status: SubFolioStatus): {
        bg: string;
        text: string;
        border: string;
        label: string;
    };
    /**
     * Human title for seat card
     */
    static formatSubFolioTitle(subFolio: SeatSubFolioDTO): string;
    /**
     * Formats thermal receipt print text
     */
    static formatThermalReceiptText(subFolio: SeatSubFolioDTO, hotelName?: string): string;
}
