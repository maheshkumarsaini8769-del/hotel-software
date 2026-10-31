export interface DynamicPricingResult {
  basePrice: number;
  dynamicPrice: number;
  multiplier: number;
  occupancySurcharge: number;
  weekendSurcharge: number;
  reasons: string[];
}

/**
 * Calculates AI-driven dynamic room price based on real-time occupancy and day of week.
 * - Occupancy > 80%: +20% demand surge
 * - Weekend (Friday = 5, Saturday = 6): +15% high-demand surge
 */
export function calculateDynamicPrice(
  basePrice: number,
  currentOccupancy: number,
  dayOfWeek: number
): DynamicPricingResult {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  let multiplier = 1.0;
  const reasons: string[] = [];
  let occupancySurcharge = 0;
  let weekendSurcharge = 0;

  // 1. High Occupancy Surge (> 80%)
  if (currentOccupancy > 80) {
    const surge = 0.20;
    multiplier += surge;
    occupancySurcharge = Math.round(safeBase * surge);
    reasons.push(`High occupancy (${currentOccupancy}%) triggered +20% surge (+₹${occupancySurcharge})`);
  }

  // 2. Weekend Surge (Friday = 5, Saturday = 6)
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    const surge = 0.15;
    multiplier += surge;
    weekendSurcharge = Math.round(safeBase * surge);
    const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
    reasons.push(`Peak weekend demand (${dayName}) triggered +15% surge (+₹${weekendSurcharge})`);
  }

  const dynamicPrice = Math.round(safeBase * multiplier);

  return {
    basePrice: safeBase,
    dynamicPrice,
    multiplier: Math.round(multiplier * 100) / 100,
    occupancySurcharge,
    weekendSurcharge,
    reasons: reasons.length > 0 ? reasons : ['Standard baseline rate applied'],
  };
}
