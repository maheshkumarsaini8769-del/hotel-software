// Category Metas and Display Helpers for Admin Switchboard

export interface AlertCategoryMeta {
  key: string;
  label: string;
  description: string;
  defaultThresholdUnit: string;
  defaultThreshold: number;
  icon: string;
}

export const ALERT_CATEGORY_METAS: Record<string, AlertCategoryMeta> = {
  LARGE_TRANSACTION: {
    key: 'LARGE_TRANSACTION',
    label: 'High-Value Bill & Payment',
    description: 'Trigger when any single invoice or payment exceeds the configured rupee threshold.',
    defaultThresholdUnit: '₹',
    defaultThreshold: 5000,
    icon: '💰',
  },
  KITCHEN_DELAY: {
    key: 'KITCHEN_DELAY',
    label: 'Kitchen KDS Prep SLA Exceeded',
    description: 'Notify when chef tickets remain in prep beyond SLA minutes without completion.',
    defaultThresholdUnit: 'mins',
    defaultThreshold: 15,
    icon: '⏱️',
  },
  NEGATIVE_REVIEW: {
    key: 'NEGATIVE_REVIEW',
    label: 'Guest Negative CSAT Rating',
    description: 'Service recovery alert when a customer rates dining or room stay at or below threshold.',
    defaultThresholdUnit: 'stars',
    defaultThreshold: 2,
    icon: '⭐',
  },
  VOID_COMPLIMENTARY: {
    key: 'VOID_COMPLIMENTARY',
    label: 'Void / Non-Chargeable (NC) Items',
    description: 'Anti-theft pilferage alert when high-value dishes are voided or marked complimentary.',
    defaultThresholdUnit: '₹',
    defaultThreshold: 500,
    icon: '🛡️',
  },
  CASH_DRAWER_SECURITY: {
    key: 'CASH_DRAWER_SECURITY',
    label: 'Cash Drawer Kick & Float Variance',
    description: 'Instant alert upon manual drawer kicks, unexpected opening, or end-of-shift cash discrepancy.',
    defaultThresholdUnit: 'event',
    defaultThreshold: 0,
    icon: '💵',
  },
  VIP_CHECKIN: {
    key: 'VIP_CHECKIN',
    label: 'VIP & High-Profile Guest Arrival',
    description: 'Immediate alert when a VIP guest completes digital or front-desk check-in.',
    defaultThresholdUnit: 'event',
    defaultThreshold: 0,
    icon: '👑',
  },
  HOUSEKEEPING_OVERDUE: {
    key: 'HOUSEKEEPING_OVERDUE',
    label: 'Housekeeping Turnaround Overdue',
    description: 'Alert when dirty guest room cleaning turnaround exceeds scheduled SLA.',
    defaultThresholdUnit: 'mins',
    defaultThreshold: 45,
    icon: '🧹',
  },
  RESERVATION_SURGE: {
    key: 'RESERVATION_SURGE',
    label: 'Dining Peak Reservation Surge',
    description: 'Notification when upcoming dining bookings exceed floor capacity threshold.',
    defaultThresholdUnit: 'covers',
    defaultThreshold: 10,
    icon: '📈',
  },
};

export const NOTIFICATION_CHANNELS = [
  { id: 'IN_APP', label: 'In-App Toast', icon: '📱' },
  { id: 'SOUNDBOX', label: 'Counter Soundbox (Audio)', icon: '🔊' },
  { id: 'DESKTOP_POPUP', label: 'Desktop Popup', icon: '🖥️' },
  { id: 'SMS', label: 'Priority SMS', icon: '💬' },
  { id: 'EMAIL', label: 'Email Digest', icon: '📧' },
  { id: 'WEBHOOK', label: 'Automated Webhook', icon: '🌐' },
];

export function getSeverityStyle(severity: string): { bg: string; text: string; border: string; badge: string } {
  switch (severity) {
    case 'EMERGENCY':
      return { bg: '#450a0a', text: '#fecaca', border: '#ef4444', badge: '🚨 EMERGENCY' };
    case 'CRITICAL':
      return { bg: '#7f1d1d', text: '#fee2e2', border: '#dc2626', badge: '⚠️ CRITICAL' };
    case 'WARNING':
      return { bg: '#78350f', text: '#fef3c7', border: '#f59e0b', badge: '⚡ WARNING' };
    case 'INFO':
    default:
      return { bg: '#082f49', text: '#e0f2fe', border: '#0284c7', badge: 'ℹ️ INFO' };
  }
}

// Generate soundbox speech synthesis text for verbal announcement
export function buildSoundboxSpeechAnnouncement(alert: {
  category: string;
  title: string;
  message: string;
  payload?: any;
}): string {
  if (alert.category === 'LARGE_TRANSACTION' && alert.payload?.amount) {
    return `Payment Alert: Received Rupees ${Number(alert.payload.amount).toLocaleString('en-IN')}.`;
  }
  if (alert.category === 'KITCHEN_DELAY') {
    return `Kitchen Alert: Order delayed by ${alert.payload?.delayMinutes || 'several'} minutes.`;
  }
  if (alert.category === 'CASH_DRAWER_SECURITY') {
    return `Security Alert: Cash drawer opened.`;
  }
  return alert.message || alert.title;
}

// Browser Web Audio API Chime Synthesizer
export function playAlertChime(severity: string = 'INFO'): void {
  const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : undefined;
  if (!win) return;
  try {
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'CRITICAL' || severity === 'EMERGENCY') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // A4
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (err) {
    // AudioContext blocked or not allowed by browser autoplay policy
  }
}
