export const POSITIVE_FEEDBACK_TAGS = [
  'Exemplary Service',
  'Rich Authentic Flavors',
  'Prompt Delivery',
  'Stunning Ambience',
  'Courteous Staff',
  'Chef Compliments',
  'Great Value',
];

export const CONSTRUCTIVE_FEEDBACK_TAGS = [
  'Slow Kitchen Delivery',
  'Food Served Lukewarm',
  'Too Spicy / Salty',
  'Missing Item / Request',
  'Table Cleaning Delayed',
  'Noisy Ambience',
];

export function getStarColor(rating: number): string {
  if (rating >= 4.5) return '#fbbf24'; // Luxury Gold
  if (rating >= 4.0) return '#f59e0b'; // Amber
  if (rating >= 3.0) return '#38bdf8'; // Sky Blue
  if (rating >= 2.0) return '#f97316'; // Orange Warning
  return '#ef4444'; // Red Critical
}

export function getRecoveryStatusBadge(status: string): { label: string; bg: string; text: string; icon: string } {
  switch (status) {
    case 'RESOLVED':
      return { label: 'Recovery Completed', bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', icon: '✅' };
    case 'COMPLIMENTARY_OFFERED':
      return { label: 'Complimentary Given', bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8', icon: '🍨' };
    case 'MANAGER_VISITING':
      return { label: 'Manager at Table', bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', icon: '🏃' };
    case 'TRIGGERED':
      return { label: 'Urgent Recovery Needed', bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', icon: '🚨' };
    case 'ESCALATED':
      return { label: 'Escalated to GM', bg: 'rgba(225, 29, 72, 0.2)', text: '#fb7185', icon: '⚠️' };
    default:
      return { label: 'Standard Feedback', bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', icon: '💬' };
  }
}

export function shouldTriggerServiceRecovery(overallRating: number): boolean {
  return overallRating <= 2;
}

export function getGoogleReviewDeepLink(propertySlug: string = 'taj-gateway'): string {
  return `https://search.google.com/local/writereview?placeid=ChIJ_${propertySlug}`;
}
