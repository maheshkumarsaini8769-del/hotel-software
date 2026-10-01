import { KotVoidReason, WasteDisposition, KotVoidAuditDTO } from '@spicehub/shared-types';

export class KotVoidHelper {
  public static formatVoidReasonLabel(reason: KotVoidReason): string {
    switch (reason) {
      case KotVoidReason.CUSTOMER_CANCELLED:
        return 'Customer Cancelled';
      case KotVoidReason.WRONG_ITEM_PUNCHED:
        return 'Wrong Item Punched';
      case KotVoidReason.QUALITY_REJECTED:
        return 'Quality Issue / Guest Rejected';
      case KotVoidReason.OUT_OF_STOCK:
        return '86 Out of Stock';
      case KotVoidReason.DELAYED_PREPARATION:
        return 'Kitchen Delay Exceeded';
      case KotVoidReason.ACCIDENTAL_DOUBLE_PUNCH:
        return 'Duplicate Punch Mistake';
      default:
        return reason;
    }
  }

  public static formatWasteDispositionLabel(disposition: WasteDisposition): string {
    switch (disposition) {
      case WasteDisposition.WASTED_SCRAPPED:
        return 'Kitchen Scrap (Wasted Food)';
      case WasteDisposition.REUSABLE_RETURNED_TO_STORE:
        return 'Reusable (Returned to Store / Bar)';
      case WasteDisposition.CANCELLED_BEFORE_COOKING:
        return 'Saved (Cancelled Before Cooking)';
      default:
        return disposition;
    }
  }

  public static getWasteDispositionBadge(disposition: WasteDisposition): { bg: string; text: string; border: string; label: string } {
    switch (disposition) {
      case WasteDisposition.WASTED_SCRAPPED:
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          label: 'Food Wasted (Scrap Loss)',
        };
      case WasteDisposition.REUSABLE_RETURNED_TO_STORE:
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          label: 'Reusable (Returned)',
        };
      case WasteDisposition.CANCELLED_BEFORE_COOKING:
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

  public static calculateVoidWasteCost(logs: KotVoidAuditDTO[]): {
    totalVoidAmount: number;
    scrappedWasteCost: number;
    reusableSavedValue: number;
  } {
    let totalVoidAmount = 0;
    let scrappedWasteCost = 0;
    let reusableSavedValue = 0;

    for (const log of logs) {
      const amt = log.totalVoidAmount || 0;
      totalVoidAmount += amt;

      if (log.wasteDisposition === WasteDisposition.WASTED_SCRAPPED) {
        scrappedWasteCost += amt;
      } else {
        reusableSavedValue += amt;
      }
    }

    return {
      totalVoidAmount,
      scrappedWasteCost,
      reusableSavedValue,
    };
  }

  public static validateManagerPinFormat(pin: string): { isValid: boolean; error?: string } {
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
