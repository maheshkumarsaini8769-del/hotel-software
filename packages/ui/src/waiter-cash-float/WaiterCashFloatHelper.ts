import { WaiterFloatStatus } from './types';

export class WaiterCashFloatHelper {
  /**
   * Calculates net cash expected in pocket
   */
  public static calculateExpectedCash(
    openingFloat: number,
    totalCashCollected: number,
    totalChangeGiven: number
  ): number {
    return openingFloat + totalCashCollected - totalChangeGiven;
  }

  /**
   * Returns styling classes and label for float status badge
   */
  public static getStatusBadge(status: WaiterFloatStatus): {
    bg: string;
    text: string;
    border: string;
    label: string;
    icon: string;
  } {
    switch (status) {
      case WaiterFloatStatus.OPEN:
        return {
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
          label: 'SHIFT ACTIVE',
          icon: '🟢',
        };
      case WaiterFloatStatus.DROPPED_PENDING_APPROVAL:
        return {
          bg: 'bg-amber-500/20',
          text: 'text-amber-400',
          border: 'border-amber-500/40',
          label: 'AWAITING CASHIER ACCEPT',
          icon: '⏳',
        };
      case WaiterFloatStatus.SETTLED:
        return {
          bg: 'bg-sky-500/20',
          text: 'text-sky-400',
          border: 'border-sky-500/40',
          label: 'RECONCILED & CLOSED',
          icon: '✅',
        };
      case WaiterFloatStatus.CANCELLED:
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
  public static formatVariance(variance: number): { text: string; color: string; status: 'MATCH' | 'SHORT' | 'SURPLUS' } {
    if (variance === 0) {
      return { text: '₹0.00 (Exact Match)', color: 'text-emerald-400', status: 'MATCH' };
    } else if (variance < 0) {
      return { text: `-₹${Math.abs(variance).toFixed(2)} (Shortage)`, color: 'text-rose-400', status: 'SHORT' };
    } else {
      return { text: `+₹${variance.toFixed(2)} (Surplus)`, color: 'text-amber-400', status: 'SURPLUS' };
    }
  }
}
