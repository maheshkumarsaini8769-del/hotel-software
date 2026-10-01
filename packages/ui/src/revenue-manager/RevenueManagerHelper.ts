export class RevenueManagerHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static getTierBadge(tierName: string): {
    label: string;
    bg: string;
    text: string;
    border: string;
  } {
    switch (tierName) {
      case 'PEAK_SURGE':
        return {
          label: 'PEAK SURGE (>85%)',
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)',
        };
      case 'HIGH_DEMAND':
        return {
          label: 'HIGH DEMAND (70-85%)',
          bg: 'rgba(249, 115, 22, 0.15)',
          text: '#fb923c',
          border: '1px solid rgba(249, 115, 22, 0.4)',
        };
      case 'STANDARD':
        return {
          label: 'STANDARD (40-70%)',
          bg: 'rgba(59, 130, 246, 0.15)',
          text: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.4)',
        };
      case 'LOW_DEMAND':
      default:
        return {
          label: 'LOW DEMAND (<40%)',
          bg: 'rgba(34, 197, 94, 0.15)',
          text: '#4ade80',
          border: '1px solid rgba(34, 197, 94, 0.4)',
        };
    }
  }

  public static calculateYieldLift(basePrice: number, dynamicPrice: number): {
    liftPercent: number;
    isSurge: boolean;
  } {
    if (!basePrice || basePrice <= 0) return { liftPercent: 0, isSurge: false };
    const diff = dynamicPrice - basePrice;
    const liftPercent = Number(((diff / basePrice) * 100).toFixed(1));
    return {
      liftPercent,
      isSurge: liftPercent > 0,
    };
  }
}
