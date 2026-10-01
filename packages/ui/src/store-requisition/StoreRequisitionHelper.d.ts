import { RequisitionUrgencyUI, RequisitionStatusUI, BatchFreshnessUI } from './types';
export declare class StoreRequisitionHelper {
    static formatCurrency(amount: number): string;
    static getUrgencyBadge(urgency: RequisitionUrgencyUI): {
        label: string;
        bg: string;
        border: string;
        text: string;
    };
    static getStatusBadge(status: RequisitionStatusUI): {
        label: string;
        bg: string;
        border: string;
        text: string;
    };
    static getFreshnessBadge(status: BatchFreshnessUI, daysUntilExpiry: number): {
        label: string;
        bg: string;
        border: string;
        text: string;
    };
}
