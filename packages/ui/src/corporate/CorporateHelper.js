"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorporateHelper = void 0;
const types_1 = require("./types");
class CorporateHelper {
    static getSplitPolicyInfo(policy) {
        switch (policy) {
            case types_1.SplitBillingPolicy.MASTER_PAYS_ROOM_ONLY:
                return {
                    label: 'Master Pays Room Only',
                    description: 'Company covers room tariffs & room taxes; guests pay personal dining, laundry, and minibar.',
                    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
                    chipColor: '#d97706',
                };
            case types_1.SplitBillingPolicy.MASTER_PAYS_ALL:
                return {
                    label: 'Master Pays All (100% Sponsor)',
                    description: 'Company covers entire stay, including room tariff, dining, bar, laundry, and amenities.',
                    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
                    chipColor: '#10b981',
                };
            case types_1.SplitBillingPolicy.INDIVIDUAL_SETTLEMENT:
                return {
                    label: 'Individual Settlement',
                    description: 'Group reservation only; each guest personally settles their own room tariff and extras.',
                    badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-500/40',
                    chipColor: '#3b82f6',
                };
            default:
                return {
                    label: 'Custom Policy',
                    description: 'Standard booking terms apply.',
                    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
                    chipColor: '#71717a',
                };
        }
    }
    static getStatusInfo(status) {
        switch (status) {
            case types_1.GroupBookingStatus.CONFIRMED:
                return {
                    label: 'Confirmed',
                    badgeClass: 'bg-sky-950/60 text-sky-400 border-sky-600/40',
                    dotColor: 'bg-sky-400',
                };
            case types_1.GroupBookingStatus.PARTIALLY_CHECKED_IN:
                return {
                    label: 'Partial Check-In',
                    badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
                    dotColor: 'bg-amber-400',
                };
            case types_1.GroupBookingStatus.FULLY_CHECKED_IN:
                return {
                    label: 'Fully In-House',
                    badgeClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
                    dotColor: 'bg-emerald-400',
                };
            case types_1.GroupBookingStatus.COMPLETED:
                return {
                    label: 'Completed / Settled',
                    badgeClass: 'bg-purple-950/60 text-purple-400 border-purple-500/40',
                    dotColor: 'bg-purple-400',
                };
            case types_1.GroupBookingStatus.CANCELLED:
                return {
                    label: 'Cancelled',
                    badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-500/40',
                    dotColor: 'bg-rose-400',
                };
            default:
                return {
                    label: status,
                    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
                    dotColor: 'bg-zinc-400',
                };
        }
    }
    static calculateNights(checkInDate, checkOutDate) {
        const inDate = new Date(checkInDate);
        const outDate = new Date(checkOutDate);
        const diff = outDate.getTime() - inDate.getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
    }
    static calculateEstimatedCost(roomTariffs, nights) {
        const totalTariff = roomTariffs.reduce((sum, rate) => sum + rate * nights, 0);
        const avgTariff = roomTariffs.length > 0 ? totalTariff / (roomTariffs.length * nights) : 0;
        const taxRate = avgTariff <= 7500 ? 0.12 : 0.18; // Indian GST standard for hotel accommodation
        const taxAmount = Math.round(totalTariff * taxRate);
        const grandTotal = totalTariff + taxAmount;
        return { totalTariff, taxRate, taxAmount, grandTotal };
    }
    static extractMasterFolio(group) {
        if (!group.masterFolioId)
            return null;
        if (typeof group.masterFolioId === 'object' && 'folioNumber' in group.masterFolioId) {
            return group.masterFolioId;
        }
        return null;
    }
}
exports.CorporateHelper = CorporateHelper;
