"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KotVoidHelper = void 0;
const shared_types_1 = require("@spicehub/shared-types");
class KotVoidHelper {
    static formatVoidReasonLabel(reason) {
        switch (reason) {
            case shared_types_1.KotVoidReason.CUSTOMER_CANCELLED:
                return 'Customer Cancelled';
            case shared_types_1.KotVoidReason.WRONG_ITEM_PUNCHED:
                return 'Wrong Item Punched';
            case shared_types_1.KotVoidReason.QUALITY_REJECTED:
                return 'Quality Issue / Guest Rejected';
            case shared_types_1.KotVoidReason.OUT_OF_STOCK:
                return '86 Out of Stock';
            case shared_types_1.KotVoidReason.DELAYED_PREPARATION:
                return 'Kitchen Delay Exceeded';
            case shared_types_1.KotVoidReason.ACCIDENTAL_DOUBLE_PUNCH:
                return 'Duplicate Punch Mistake';
            default:
                return reason;
        }
    }
    static formatWasteDispositionLabel(disposition) {
        switch (disposition) {
            case shared_types_1.WasteDisposition.WASTED_SCRAPPED:
                return 'Kitchen Scrap (Wasted Food)';
            case shared_types_1.WasteDisposition.REUSABLE_RETURNED_TO_STORE:
                return 'Reusable (Returned to Store / Bar)';
            case shared_types_1.WasteDisposition.CANCELLED_BEFORE_COOKING:
                return 'Saved (Cancelled Before Cooking)';
            default:
                return disposition;
        }
    }
    static getWasteDispositionBadge(disposition) {
        switch (disposition) {
            case shared_types_1.WasteDisposition.WASTED_SCRAPPED:
                return {
                    bg: 'bg-rose-500/10',
                    text: 'text-rose-400',
                    border: 'border-rose-500/30',
                    label: 'Food Wasted (Scrap Loss)',
                };
            case shared_types_1.WasteDisposition.REUSABLE_RETURNED_TO_STORE:
                return {
                    bg: 'bg-emerald-500/10',
                    text: 'text-emerald-400',
                    border: 'border-emerald-500/30',
                    label: 'Reusable (Returned)',
                };
            case shared_types_1.WasteDisposition.CANCELLED_BEFORE_COOKING:
                return {
                    bg: 'bg-amber-500/10',
                    text: 'text-amber-400',
                    border: 'border-amber-500/30',
                    label: 'Pre-Cook Cancellation',
                };
            default:
                return {
                    bg: 'bg-slate-500/10',
                    text: 'text-slate-400',
                    border: 'border-slate-500/30',
                    label: disposition,
                };
        }
    }
    static calculateVoidWasteCost(logs) {
        let totalVoidAmount = 0;
        let scrappedWasteCost = 0;
        let reusableSavedValue = 0;
        for (const log of logs) {
            const amt = log.totalVoidAmount || 0;
            totalVoidAmount += amt;
            if (log.wasteDisposition === shared_types_1.WasteDisposition.WASTED_SCRAPPED) {
                scrappedWasteCost += amt;
            }
            else {
                reusableSavedValue += amt;
            }
        }
        return {
            totalVoidAmount,
            scrappedWasteCost,
            reusableSavedValue,
        };
    }
    static validateManagerPinFormat(pin) {
        if (!pin) {
            return { isValid: false, error: 'Manager PIN is required' };
        }
        const cleanPin = pin.trim();
        if (!/^\d{4,6}$/.test(cleanPin)) {
            return { isValid: false, error: 'Manager PIN must be 4 to 6 digits' };
        }
        return { isValid: true };
    }
}
exports.KotVoidHelper = KotVoidHelper;
