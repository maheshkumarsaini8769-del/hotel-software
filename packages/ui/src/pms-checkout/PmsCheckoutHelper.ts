import { KeycardVoidReason, PaymentTenderItem } from './types';

export class PmsCheckoutHelper {
  public static calculateTotalTendered(payments: PaymentTenderItem[]): number {
    return Math.round(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
  }

  public static calculateRemainingDue(dueAmount: number, payments: PaymentTenderItem[]): number {
    const totalTendered = this.calculateTotalTendered(payments);
    return Math.max(0, Math.round((dueAmount - totalTendered) * 100) / 100);
  }

  public static isFullySettled(dueAmount: number, payments: PaymentTenderItem[]): boolean {
    if (dueAmount <= 0) return true;
    const totalTendered = this.calculateTotalTendered(payments);
    return totalTendered >= dueAmount;
  }

  public static formatPaymentModeBadge(mode: string): { bg: string; text: string; border: string; label: string } {
    switch (mode) {
      case 'CASH':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Cash Tender' };
      case 'UPI':
        return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Instant UPI' };
      case 'CARD':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Credit/Debit Card' };
      case 'CITY_LEDGER':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Corporate City Ledger' };
      case 'COMPLIMENTARY':
        return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Complimentary / Waiver' };
      default:
        return { bg: 'bg-zinc-700/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: mode };
    }
  }

  public static formatVoidReasonLabel(reason: KeycardVoidReason | string): string {
    switch (reason) {
      case KeycardVoidReason.CHECKOUT:
        return 'Standard Check-out Revocation';
      case KeycardVoidReason.LOST:
        return 'Guest Lost Keycard';
      case KeycardVoidReason.DAMAGED:
        return 'Damaged / Demagnetized RFID';
      case KeycardVoidReason.EXPIRED:
        return 'Expired Stay Keycard';
      case KeycardVoidReason.MANUAL_REVOCATION:
        return 'Manual Front Desk Revocation';
      default:
        return String(reason);
    }
  }

  public static getVoidReasonBadge(reason: KeycardVoidReason | string): { bg: string; text: string; border: string; label: string } {
    switch (reason) {
      case KeycardVoidReason.CHECKOUT:
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Check-out' };
      case KeycardVoidReason.LOST:
        return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: 'Lost Card' };
      case KeycardVoidReason.DAMAGED:
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Damaged' };
      case KeycardVoidReason.EXPIRED:
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Expired' };
      default:
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', label: 'Revoked' };
    }
  }

  public static formatDepartmentLabel(department: string): string {
    switch (department) {
      case 'ROOM_RENT':
        return 'Room Accommodation Tariff';
      case 'RESTAURANT_DINE':
        return 'Restaurant Dining';
      case 'ROOM_SERVICE':
        return 'In-Room Dining / Room Service';
      case 'LAUNDRY':
        return 'Laundry & Dry Cleaning';
      case 'MINIBAR':
        return 'Minibar Consumption';
      case 'DAMAGE':
        return 'Property Damage Assessment';
      case 'PAID_AMENITY':
        return 'Paid Amenity / Spa Service';
      default:
        return department;
    }
  }

  public static formatFolioStatusBadge(status: 'OPEN' | 'LOCKED' | 'SETTLED' | string): { bg: string; text: string; border: string; label: string } {
    switch (status) {
      case 'OPEN':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Folio Open' };
      case 'LOCKED':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Locked For Check-out' };
      case 'SETTLED':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Settled & Closed' };
      default:
        return { bg: 'bg-zinc-700/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: String(status) };
    }
  }

  public static calculateProjectedDueWithPending(dueAmount: number, pendingOrdersTotal: number): number {
    return Math.round(((Number(dueAmount) || 0) + (Number(pendingOrdersTotal) || 0)) * 100) / 100;
  }
}
