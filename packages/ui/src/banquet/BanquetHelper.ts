import {
  BanquetEventType,
  BanquetTimeSlot,
  BanquetBookingStatus,
  SeatingLayoutType,
  IBanquetBookingUI,
} from './types';

export class BanquetHelper {
  static getEventTypeInfo(type: BanquetEventType): { label: string; icon: string } {
    switch (type) {
      case BanquetEventType.WEDDING_RECEPTION:
        return { label: 'Wedding & Reception', icon: '💍' };
      case BanquetEventType.CORPORATE_CONFERENCE:
        return { label: 'Corporate Conference', icon: '💼' };
      case BanquetEventType.COCKTAIL_DINNER:
        return { label: 'Cocktail Dinner', icon: '🍸' };
      case BanquetEventType.BIRTHDAY_ANNIVERSARY:
        return { label: 'Birthday / Anniversary', icon: '🎂' };
      case BanquetEventType.EXHIBITION_SEMINAR:
        return { label: 'Exhibition & Seminar', icon: '🏛️' };
      case BanquetEventType.SOCIAL_GATHERING:
        return { label: 'Social Gathering', icon: '🎉' };
      default:
        return { label: type, icon: '📅' };
    }
  }

  static getTimeSlotInfo(slot: BanquetTimeSlot): { label: string; timing: string; badgeClass: string } {
    switch (slot) {
      case BanquetTimeSlot.MORNING:
        return {
          label: 'Morning Slot',
          timing: '09:00 AM – 03:00 PM',
          badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
        };
      case BanquetTimeSlot.EVENING:
        return {
          label: 'Evening Slot',
          timing: '06:00 PM – 12:00 AM',
          badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
        };
      case BanquetTimeSlot.FULL_DAY:
        return {
          label: 'Full Day Pass',
          timing: '09:00 AM – 11:30 PM',
          badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
        };
      default:
        return {
          label: slot,
          timing: '',
          badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
    }
  }

  static getStatusInfo(status: BanquetBookingStatus): { label: string; badgeClass: string; dotColor: string } {
    switch (status) {
      case BanquetBookingStatus.ENQUIRY:
        return {
          label: 'Enquiry / Lead',
          badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
          dotColor: 'bg-zinc-400',
        };
      case BanquetBookingStatus.PROVISIONAL:
        return {
          label: 'Provisional Hold',
          badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
          dotColor: 'bg-amber-400',
        };
      case BanquetBookingStatus.CONFIRMED:
        return {
          label: 'Confirmed Contract',
          badgeClass: 'bg-sky-950/60 text-sky-400 border-sky-500/40',
          dotColor: 'bg-sky-400',
        };
      case BanquetBookingStatus.IN_PROGRESS:
        return {
          label: 'Live In-Progress',
          badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 animate-pulse',
          dotColor: 'bg-emerald-400',
        };
      case BanquetBookingStatus.COMPLETED:
        return {
          label: 'Event Completed',
          badgeClass: 'bg-purple-950/60 text-purple-400 border-purple-500/40',
          dotColor: 'bg-purple-400',
        };
      case BanquetBookingStatus.CANCELLED:
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

  static getSeatingLayoutLabel(layout: SeatingLayoutType): string {
    switch (layout) {
      case SeatingLayoutType.THEATER:
        return 'Theater Style (Auditorium Rows)';
      case SeatingLayoutType.ROUND_TABLE_CLUSTERS:
        return 'Round Table Banquet Clusters';
      case SeatingLayoutType.U_SHAPE:
        return 'U-Shape Executive Board';
      case SeatingLayoutType.CLASSROOM:
        return 'Classroom Style with Desks';
      case SeatingLayoutType.HOLLOW_SQUARE:
        return 'Hollow Square Setup';
      case SeatingLayoutType.COCKTAIL_STANDING:
        return 'High Cocktail Standing Tables';
      default:
        return layout;
    }
  }

  static calculateEventTotals(
    pax: number,
    perPlateRate: number,
    hallRent: number,
    decorAV: number,
    pricingType: string
  ): { cateringSubtotal: number; subtotal: number; taxes: number; grandTotal: number } {
    const cateringSubtotal = pricingType === 'HALL_RENT_ONLY' ? 0 : pax * perPlateRate;
    const subtotal = cateringSubtotal + hallRent + decorAV;
    const taxes = Math.round(subtotal * 0.18); // 18% GST standard
    const grandTotal = subtotal + taxes;
    return { cateringSubtotal, subtotal, taxes, grandTotal };
  }
}
