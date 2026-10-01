"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryAuditHelper = void 0;
class InventoryAuditHelper {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    }
    static getAuditStatusBadge(status) {
        switch (status) {
            case 'IN_PROGRESS':
                return {
                    label: 'IN COUNTING',
                    bg: 'rgba(234, 179, 8, 0.12)',
                    text: '#facc15',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                };
            case 'SUBMITTED':
                return {
                    label: 'SUBMITTED (MATCHED)',
                    bg: 'rgba(59, 130, 246, 0.12)',
                    text: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                };
            case 'DISCREPANCY_FLAGGED':
                return {
                    label: 'VARIANCE FLAGGED',
                    bg: 'rgba(239, 68, 68, 0.15)',
                    text: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                };
            case 'RECONCILED':
                return {
                    label: 'RECONCILED & POSTED',
                    bg: 'rgba(16, 185, 129, 0.15)',
                    text: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                };
            default:
                return {
                    label: status,
                    bg: 'rgba(107, 114, 128, 0.15)',
                    text: '#9ca3af',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                };
        }
    }
    static getAuditTypeLabel(type) {
        switch (type) {
            case 'FULL_MONTH_END':
                return 'Full Month-End Wall-to-Wall';
            case 'WEEKLY_SPOT_CHECK':
                return 'Weekly Spot Audit';
            case 'HIGH_VALUE_CYCLIC':
                return 'High-Value Cyclic (Liquor/Meat/Seafood)';
            default:
                return type;
        }
    }
    static getVarianceReasonLabel(reason) {
        if (!reason)
            return 'Unspecified';
        switch (reason) {
            case 'PILFERAGE_THEFT':
                return 'Unauthorized Pilferage / Theft';
            case 'UNRECORDED_WASTE':
                return 'Unrecorded Spoilage / Wastage';
            case 'COUNTING_ERROR':
                return 'Physical Counting / Tally Error';
            case 'VENDOR_SHORTAGE':
                return 'Vendor Short-Delivery Missed on Dock';
            case 'NORMAL_SHRINKAGE':
                return 'Standard Moisture / Thaw Shrinkage';
            case 'RECIPE_OVER_PORTIONING':
                return 'Kitchen Over-Portioning / Spillage';
            case 'OTHER':
                return 'Other Operational Variance';
            default:
                return reason;
        }
    }
    static getVariancePill(varianceQty, varianceValue) {
        if (varianceQty === 0) {
            return {
                label: 'Balanced (0.00)',
                color: '#10b981',
                badge: 'rgba(16, 185, 129, 0.15)',
            };
        }
        if (varianceQty < 0) {
            return {
                label: `Shortage ${varianceQty} (${InventoryAuditHelper.formatCurrency(Math.abs(varianceValue))})`,
                color: '#ef4444',
                badge: 'rgba(239, 68, 68, 0.15)',
            };
        }
        return {
            label: `Surplus +${varianceQty} (+${InventoryAuditHelper.formatCurrency(varianceValue)})`,
            color: '#3b82f6',
            badge: 'rgba(59, 130, 246, 0.15)',
        };
    }
    static calculateAuditSummary(session) {
        const totalItems = session.items?.length || 0;
        const discrepancies = session.items?.filter((it) => it.varianceQuantity !== 0) || [];
        return {
            totalItems,
            discrepancyCount: discrepancies.length,
            shortageSum: session.totalShortageValue || 0,
            surplusSum: session.totalSurplusValue || 0,
            netValue: session.netDiscrepancyValue || 0,
        };
    }
}
exports.InventoryAuditHelper = InventoryAuditHelper;
