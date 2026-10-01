import { AuditSessionStatusUI, AuditTypeUI, VarianceReasonUI, IInventoryAuditSessionUI } from './types';
export declare class InventoryAuditHelper {
    static formatCurrency(amount: number): string;
    static getAuditStatusBadge(status: AuditSessionStatusUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static getAuditTypeLabel(type: AuditTypeUI): string;
    static getVarianceReasonLabel(reason?: VarianceReasonUI): string;
    static getVariancePill(varianceQty: number, varianceValue: number): {
        label: string;
        color: string;
        badge: string;
    };
    static calculateAuditSummary(session: IInventoryAuditSessionUI): {
        totalItems: number;
        discrepancyCount: number;
        shortageSum: number;
        surplusSum: number;
        netValue: number;
    };
}
