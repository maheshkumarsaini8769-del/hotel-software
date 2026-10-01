import {
  VIPTierUI,
  DiningReservationStatusUI,
  MealPeriodUI,
} from './types';

export class DiningReservationHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static getVipBadge(tier: VIPTierUI): {
    label: string;
    bg: string;
    text: string;
    border: string;
  } {
    switch (tier) {
      case 'PLATINUM_VIP':
        return {
          label: 'PLATINUM VIP',
          bg: 'rgba(217, 70, 239, 0.15)',
          text: '#f0abfc',
          border: '1px solid rgba(217, 70, 239, 0.4)',
        };
      case 'GOLD':
        return {
          label: 'GOLD VIP',
          bg: 'rgba(234, 179, 8, 0.15)',
          text: '#facc15',
          border: '1px solid rgba(234, 179, 8, 0.4)',
        };
      case 'SILVER':
        return {
          label: 'SILVER',
          bg: 'rgba(148, 163, 184, 0.15)',
          text: '#cbd5e1',
          border: '1px solid rgba(148, 163, 184, 0.4)',
        };
      default:
        return {
          label: 'REGULAR',
          bg: 'rgba(107, 114, 128, 0.12)',
          text: '#9ca3af',
          border: '1px solid rgba(107, 114, 128, 0.3)',
        };
    }
  }

  public static getReservationStatusBadge(status: DiningReservationStatusUI): {
    label: string;
    bg: string;
    text: string;
    border: string;
  } {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'CONFIRMED',
          bg: 'rgba(59, 130, 246, 0.15)',
          text: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.4)',
        };
      case 'SEATED':
        return {
          label: 'SEATED / DINING',
          bg: 'rgba(16, 185, 129, 0.15)',
          text: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.4)',
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          bg: 'rgba(107, 114, 128, 0.15)',
          text: '#9ca3af',
          border: '1px solid rgba(107, 114, 128, 0.3)',
        };
      case 'NO_SHOW':
        return {
          label: 'NO SHOW',
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)',
        };
      case 'CANCELLED':
        return {
          label: 'CANCELLED',
          bg: 'rgba(244, 63, 94, 0.15)',
          text: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.4)',
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

  public static getAllergenTag(allergen: string): {
    label: string;
    bg: string;
    text: string;
  } {
    switch (allergen.toUpperCase()) {
      case 'PEANUTS_TREENUTS':
        return { label: '🥜 Nuts', bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' };
      case 'GLUTEN':
        return { label: '🌾 Gluten', bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d' };
      case 'DAIRY_LACTOSE':
        return { label: '🥛 Dairy', bg: 'rgba(6, 182, 212, 0.2)', text: '#67e8f9' };
      case 'SHELLFISH_SEAFOOD':
        return { label: '🦐 Shellfish', bg: 'rgba(225, 29, 72, 0.2)', text: '#fda4af' };
      case 'EGGS':
        return { label: '🥚 Egg', bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047' };
      case 'SOY':
        return { label: '🌱 Soy', bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac' };
      default:
        return { label: `⚠️ ${allergen}`, bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
    }
  }

  public static getMealPeriodLabel(period: MealPeriodUI): string {
    switch (period) {
      case 'BREAKFAST':
        return 'Breakfast (07:00 - 10:30)';
      case 'LUNCH':
        return 'Lunch Service (12:00 - 15:30)';
      case 'HIGH_TEA':
        return 'High Tea (16:00 - 18:30)';
      case 'DINNER':
        return 'Dinner Service (19:00 - 23:30)';
      case 'LATE_NIGHT':
        return 'Late Night (23:30 - 02:00)';
      default:
        return period;
    }
  }
}
