import { UpiQrStatus } from './types';
export declare class DynamicUpiHelper {
    /**
     * Formats seconds remaining into MM:SS display
     */
    static formatRemainingTime(seconds: number): string;
    /**
     * Returns styling classes and label for UPI status badge
     */
    static getStatusBadge(status: UpiQrStatus): {
        bg: string;
        text: string;
        border: string;
        label: string;
        icon: string;
    };
    /**
     * Builds high-contrast speech announcement for Soundbox
     */
    static formatSoundboxSpeech(amount: number, tableNumber: string): string;
}
