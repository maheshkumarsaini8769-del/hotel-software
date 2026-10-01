import { OrderApprovalStatus } from './types';
export declare class QrLockerHelper {
    /**
     * Calculates seconds remaining on 10s waiter SLA timer
     */
    static calculateSlaSecondsRemaining(approvalDeadline: string | Date): number;
    /**
     * Status badge styling for UI
     */
    static getApprovalStatusBadge(status: OrderApprovalStatus): {
        bg: string;
        text: string;
        border: string;
        label: string;
        icon: string;
    };
    /**
     * Constructs permanent table QR URL
     */
    static buildPermanentQrUrl(domain: string, tenantId: string, tableNumber: string, salt: string): string;
}
