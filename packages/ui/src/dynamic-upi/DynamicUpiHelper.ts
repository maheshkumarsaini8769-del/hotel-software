import { UpiQrStatus } from './types';

export class DynamicUpiHelper {
  /**
   * Formats seconds remaining into MM:SS display
   */
  public static formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Returns styling classes and label for UPI status badge
   */
  public static getStatusBadge(status: UpiQrStatus): {
    bg: string;
    text: string;
    border: string;
    label: string;
    icon: string;
  } {
    switch (status) {
      case UpiQrStatus.PAID:
        return {
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
          label: 'PAID & VERIFIED',
          icon: '✅',
        };
      case UpiQrStatus.PENDING:
        return {
          bg: 'bg-amber-500/20',
          text: 'text-amber-400',
          border: 'border-amber-500/40',
          label: 'WAITING FOR SCAN',
          icon: '⏳',
        };
      case UpiQrStatus.SCANNED:
        return {
          bg: 'bg-sky-500/20',
          text: 'text-sky-400',
          border: 'border-sky-500/40',
          label: 'QR SCANNED BY GUEST',
          icon: '📱',
        };
      case UpiQrStatus.EXPIRED:
        return {
          bg: 'bg-rose-500/20',
          text: 'text-rose-400',
          border: 'border-rose-500/40',
          label: 'QR EXPIRED',
          icon: '⏰',
        };
      case UpiQrStatus.CANCELLED:
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
   * Builds high-contrast speech announcement for Soundbox
   */
  public static formatSoundboxSpeech(amount: number, tableNumber: string): string {
    return `Received Rupees ${amount} on UPI for Table ${tableNumber}`;
  }
}
