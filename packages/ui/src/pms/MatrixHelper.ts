import { MatrixDateHeader } from './types';

export interface BlockLayoutResult {
  isVisible: boolean;
  startColIndex: number;
  spanCols: number;
  isContinuationLeft: boolean;
  isContinuationRight: boolean;
}

export class MatrixHelper {
  /**
   * Computes column span and offset for a reservation block in the current calendar date grid
   */
  public static calculateBlockLayout(
    checkInDateStr: string,
    checkOutDateStr: string,
    calendarDates: MatrixDateHeader[]
  ): BlockLayoutResult {
    if (!calendarDates || calendarDates.length === 0) {
      return { isVisible: false, startColIndex: 0, spanCols: 0, isContinuationLeft: false, isContinuationRight: false };
    }

    const windowStart = calendarDates[0].date;
    const windowEnd = calendarDates[calendarDates.length - 1].date;

    const inDate = checkInDateStr.slice(0, 10);
    const outDate = checkOutDateStr.slice(0, 10);

    // If reservation ends on or before window start, or starts after window end -> Not visible
    if (outDate <= windowStart || inDate > windowEnd) {
      return { isVisible: false, startColIndex: 0, spanCols: 0, isContinuationLeft: false, isContinuationRight: false };
    }

    const isContinuationLeft = inDate < windowStart;
    const isContinuationRight = outDate > windowEnd;

    const effectiveStart = isContinuationLeft ? windowStart : inDate;

    let startColIndex = calendarDates.findIndex((d) => d.date === effectiveStart);
    if (startColIndex === -1) startColIndex = 0;

    // Room stays are overnight: night of date D occupies date D column.
    // If checkOut is outDate, the last night occupied is the day before checkOutDate.
    let spanCols = 0;
    for (let i = startColIndex; i < calendarDates.length; i++) {
      const d = calendarDates[i].date;
      if (d < outDate) {
        spanCols++;
      } else {
        break;
      }
    }

    if (spanCols === 0) spanCols = 1;

    return {
      isVisible: true,
      startColIndex,
      spanCols,
      isContinuationLeft,
      isContinuationRight,
    };
  }

  /**
   * Luxury visual styling tokens for PMS reservation blocks
   */
  public static getReservationStatusStyle(status: string): {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
  } {
    switch (status) {
      case 'CHECKED_IN':
      case 'IN_HOUSE':
        return {
          bg: 'bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90',
          border: 'border-amber-500/70 hover:border-amber-400',
          text: 'text-amber-100',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          glow: 'shadow-md shadow-amber-950/50 ring-1 ring-amber-400/20',
        };
      case 'CONFIRMED':
        return {
          bg: 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-emerald-950/90',
          border: 'border-emerald-500/70 hover:border-emerald-400',
          text: 'text-emerald-100',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          glow: 'shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/20',
        };
      case 'CHECKED_OUT':
        return {
          bg: 'bg-slate-850',
          border: 'border-slate-700 hover:border-slate-600',
          text: 'text-slate-300',
          badge: 'bg-slate-700 text-slate-300 border-slate-600',
          glow: 'ring-1 ring-slate-700/50',
        };
      case 'CANCELLED':
      case 'NO_SHOW':
        return {
          bg: 'bg-rose-950/40 opacity-50',
          border: 'border-rose-900 line-through',
          text: 'text-rose-400',
          badge: 'bg-rose-900/40 text-rose-300 border-rose-800',
          glow: 'ring-1 ring-rose-900/30',
        };
      default:
        return {
          bg: 'bg-slate-800',
          border: 'border-slate-600',
          text: 'text-slate-200',
          badge: 'bg-slate-700 text-slate-300',
          glow: 'ring-1 ring-slate-700',
        };
    }
  }

  /**
   * Calculates night count between check-in and check-out
   */
  public static calculateNights(checkInDateStr: string, checkOutDateStr: string): number {
    const start = new Date(checkInDateStr).getTime();
    const end = new Date(checkOutDateStr).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return 1;
    }
    return Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
  }

  /**
   * Authoritative dynamic tariff calculation with 12% / 18% GST tier
   */
  public static calculateEstimatedTariff(
    basePricePerNight: number,
    checkInDateStr: string,
    checkOutDateStr: string
  ): { nights: number; baseTariff: number; gstRate: number; taxAmount: number; grandTotal: number } {
    const nights = this.calculateNights(checkInDateStr, checkOutDateStr);
    const baseTariff = basePricePerNight * nights;
    const gstRate = basePricePerNight > 7500 ? 18 : 12;
    const taxAmount = Math.round(baseTariff * (gstRate / 100) * 100) / 100;
    const grandTotal = baseTariff + taxAmount;

    return {
      nights,
      baseTariff,
      gstRate,
      taxAmount,
      grandTotal,
    };
  }

  /**
   * Short Date format '15 Oct'
   */
  public static formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return `${d.getUTCDate()} ${month}`;
  }
}
