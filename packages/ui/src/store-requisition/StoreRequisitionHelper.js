"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreRequisitionHelper = void 0;
class StoreRequisitionHelper {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    }
    static getUrgencyBadge(urgency) {
        switch (urgency) {
            case 'CRITICAL_SERVICE_BLOCKER':
                return {
                    label: 'Critical Blocker 🚨',
                    bg: 'bg-red-950/70',
                    border: 'border-red-500/60',
                    text: 'text-red-400',
                };
            case 'HIGH':
                return {
                    label: 'High Priority 🔥',
                    bg: 'bg-amber-950/60',
                    border: 'border-amber-500/40',
                    text: 'text-amber-400',
                };
            default:
                return {
                    label: 'Normal Indent',
                    bg: 'bg-zinc-900',
                    border: 'border-zinc-800',
                    text: 'text-zinc-400',
                };
        }
    }
    static getStatusBadge(status) {
        switch (status) {
            case 'PENDING':
                return {
                    label: 'Pending Issue',
                    bg: 'bg-amber-950/60',
                    border: 'border-amber-500/40',
                    text: 'text-amber-400',
                };
            case 'APPROVED_ISSUED':
                return {
                    label: '100% Issued',
                    bg: 'bg-emerald-950/60',
                    border: 'border-emerald-500/40',
                    text: 'text-emerald-400',
                };
            case 'APPROVED_PARTIALLY':
                return {
                    label: 'Partially Issued',
                    bg: 'bg-purple-950/60',
                    border: 'border-purple-500/40',
                    text: 'text-purple-400',
                };
            case 'REJECTED':
                return {
                    label: 'Rejected',
                    bg: 'bg-zinc-800',
                    border: 'border-zinc-700',
                    text: 'text-zinc-400',
                };
            default:
                return {
                    label: status,
                    bg: 'bg-zinc-900',
                    border: 'border-zinc-800',
                    text: 'text-zinc-300',
                };
        }
    }
    static getFreshnessBadge(status, daysUntilExpiry) {
        switch (status) {
            case 'EXPIRING_SOON':
                return {
                    label: `Expires in ${daysUntilExpiry}d ⚠️`,
                    bg: 'bg-amber-950/70',
                    border: 'border-amber-500/50',
                    text: 'text-amber-300',
                };
            case 'EXPIRED':
                return {
                    label: 'Expired Past Shelf Life 🛑',
                    bg: 'bg-red-950/70',
                    border: 'border-red-500/60',
                    text: 'text-red-400',
                };
            default:
                return {
                    label: `Fresh (${daysUntilExpiry}d left) ✓`,
                    bg: 'bg-emerald-950/60',
                    border: 'border-emerald-500/40',
                    text: 'text-emerald-400',
                };
        }
    }
}
exports.StoreRequisitionHelper = StoreRequisitionHelper;
