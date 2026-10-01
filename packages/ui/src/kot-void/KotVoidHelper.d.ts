import { KotVoidReason, WasteDisposition, KotVoidAuditDTO } from '@spicehub/shared-types';
export declare class KotVoidHelper {
    static formatVoidReasonLabel(reason: KotVoidReason): string;
    static formatWasteDispositionLabel(disposition: WasteDisposition): string;
    static getWasteDispositionBadge(disposition: WasteDisposition): {
        bg: string;
        text: string;
        border: string;
        label: string;
    };
    static calculateVoidWasteCost(logs: KotVoidAuditDTO[]): {
        totalVoidAmount: number;
        scrappedWasteCost: number;
        reusableSavedValue: number;
    };
    static validateManagerPinFormat(pin: string): {
        isValid: boolean;
        error?: string;
    };
}
