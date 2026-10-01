import { MenuQuadrantUI } from './types';

export class MenuEngineeringHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static getQuadrantBadge(quadrant: MenuQuadrantUI): {
    label: string;
    icon: string;
    bg: string;
    text: string;
    border: string;
    description: string;
  } {
    switch (quadrant) {
      case 'STAR':
        return {
          label: 'STAR',
          icon: '⭐',
          bg: 'rgba(234, 179, 8, 0.15)',
          text: '#facc15',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          description: 'High Margin & High Popularity',
        };
      case 'PLOWHORSE':
        return {
          label: 'PLOWHORSE',
          icon: '🐎',
          bg: 'rgba(59, 130, 246, 0.15)',
          text: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          description: 'Low Margin & High Popularity',
        };
      case 'PUZZLE':
        return {
          label: 'PUZZLE',
          icon: '🧩',
          bg: 'rgba(168, 85, 247, 0.15)',
          text: '#c084fc',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          description: 'High Margin & Low Popularity',
        };
      case 'DOG':
        return {
          label: 'DOG',
          icon: '🐕',
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          description: 'Low Margin & Low Popularity',
        };
      default:
        return {
          label: quadrant,
          icon: '•',
          bg: 'rgba(107, 114, 128, 0.15)',
          text: '#9ca3af',
          border: '1px solid rgba(107, 114, 128, 0.3)',
          description: 'Unclassified',
        };
    }
  }

  public static getFoodCostHealth(percentage: number): {
    label: string;
    color: string;
    bg: string;
  } {
    if (percentage <= 28) {
      return {
        label: 'Excellent (< 28%)',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
      };
    } else if (percentage <= 35) {
      return {
        label: 'Healthy (28-35%)',
        color: '#facc15',
        bg: 'rgba(234, 179, 8, 0.15)',
      };
    } else {
      return {
        label: 'High Cost (> 35%)',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
      };
    }
  }
}
