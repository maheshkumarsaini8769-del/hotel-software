"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrLockerHelper = void 0;
class QrLockerHelper {
    /**
     * Calculates seconds remaining on 10s waiter SLA timer
     */
    static calculateSlaSecondsRemaining(approvalDeadline) {
        const deadlineMs = new Date(approvalDeadline).getTime();
        const nowMs = Date.now();
        const diffSeconds = Math.ceil((deadlineMs - nowMs) / 1000);
        return Math.max(0, diffSeconds);
    }
    /**
     * Status badge styling for UI
     */
    static getApprovalStatusBadge(status) {
        switch (status) {
            case 'PENDING_WAITER_APPROVAL':
                return {
                    bg: '#FEF3C7',
                    text: '#92400E',
                    border: '#F59E0B',
                    label: 'Waiter 10s Review',
                    icon: '⏳',
                };
            case 'APPROVED_BY_WAITER':
                return {
                    bg: '#D1FAE5',
                    text: '#065F46',
                    border: '#10B981',
                    label: 'Waiter Approved',
                    icon: '✅',
                };
            case 'AUTO_APPROVED_TIMEOUT':
                return {
                    bg: '#EEF2FF',
                    text: '#3730A3',
                    border: '#6366F1',
                    label: '10s SLA Auto-Approved',
                    icon: '⚡',
                };
            case 'REJECTED_BY_WAITER':
                return {
                    bg: '#FEE2E2',
                    text: '#991B1B',
                    border: '#EF4444',
                    label: 'Rejected by Waiter',
                    icon: '❌',
                };
            default:
                return {
                    bg: '#F3F4F6',
                    text: '#374151',
                    border: '#D1D5DB',
                    label: status,
                    icon: '📦',
                };
        }
    }
    /**
     * Constructs permanent table QR URL
     */
    static buildPermanentQrUrl(domain, tenantId, tableNumber, salt) {
        const cleanDomain = domain.replace(/\/+$/, '');
        return `${cleanDomain}/order?tenant=${tenantId}&table=${tableNumber}&salt=${salt}`;
    }
}
exports.QrLockerHelper = QrLockerHelper;
