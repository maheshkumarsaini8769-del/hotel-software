"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiterCashFloatHelper = void 0;
const types_1 = require("./types");
class WaiterCashFloatHelper {
    /**
     * Calculates net cash expected in pocket
     */
    static calculateExpectedCash(openingFloat, totalCashCollected, totalChangeGiven) {
        return openingFloat + totalCashCollected - totalChangeGiven;
    }
    /**
     * Returns styling classes and label for float status badge
     */
    static getStatusBadge(status) {
        switch (status) {
            case types_1.WaiterFloatStatus.OPEN:
                return {
                    bg: 'bg-emerald-500/20',
                    text: 'text-emerald-400',
                    border: 'border-emerald-500/40',
                    label: 'SHIFT ACTIVE',
                    icon: '🟢',
                };
            case types_1.WaiterFloatStatus.DROPPED_PENDING_APPROVAL:
                return {
                    bg: 'bg-amber-500/20',
                    text: 'text-amber-400',
                    border: 'border-amber-500/40',
                    label: 'AWAITING CASHIER ACCEPT',
                    icon: '⏳',
                };
            case types_1.WaiterFloatStatus.SETTLED:
                return {
                    bg: 'bg-sky-500/20',
                    text: 'text-sky-400',
                    border: 'border-sky-500/40',
                    label: 'RECONCILED & CLOSED',
                    icon: '✅',
                };
            case types_1.WaiterFloatStatus.CANCELLED:
                return {
                    bg: 'bg-zinc-700/40',
                    text: 'text-zinc-400',
                    border: 'border-zinc-600',
                    label: 'CANCELLED',
                    icon: '🚫',
                };
            default:
                return {
                    bg: 'bg-zinc-800',
                    text: 'text-zinc-300',
                    border: 'border-zinc-700',
                    label: status,
                    icon: 'ℹ️',
                };
        }
    }
    /**
     * Formats variance label with color and sign
     */
    static formatVariance(variance) {
        if (variance === 0) {
            return { text: '₹0.00 (Exact Match)', color: 'text-emerald-400', status: 'MATCH' };
        }
        else if (variance < 0) {
            return { text: `-₹${Math.abs(variance).toFixed(2)} (Shortage)`, color: 'text-rose-400', status: 'SHORT' };
        }
        else {
            return { text: `+₹${variance.toFixed(2)} (Surplus)`, color: 'text-amber-400', status: 'SURPLUS' };
        }
    }
}
exports.WaiterCashFloatHelper = WaiterCashFloatHelper;
