import { FoodPickupTicketDTO } from './types';

export class FoodPickupHelper {
  /**
   * Calculates remaining seconds until effective deadline
   */
  static getRemainingSeconds(ticket: FoodPickupTicketDTO, now: Date = new Date()): number {
    const deadlineStr = ticket.snoozeExtendedDeadline || ticket.slaDeadline;
    const deadline = new Date(deadlineStr).getTime();
    const current = now.getTime();
    const remaining = Math.round((deadline - current) / 1000);
    return remaining;
  }

  /**
   * Determines urgency status
   */
  static getUrgencyLevel(remainingSec: number, totalSlaMinutes: number = 3): 'safe' | 'warning' | 'urgent' | 'breached' {
    if (remainingSec <= 0) return 'breached';
    const totalSec = totalSlaMinutes * 60;
    const ratio = remainingSec / totalSec;

    if (ratio > 0.5) return 'safe';
    if (ratio > 0.25) return 'warning';
    return 'urgent';
  }

  /**
   * Format mm:ss string
   */
  static formatMmSs(seconds: number): string {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Status badge styling helper
   */
  static getStatusBadge(status: string): { label: string; color: string; bg: string } {
    switch (status) {
      case 'READY_FOR_PICKUP':
        return { label: 'Ready on Counter', color: '#166534', bg: '#dcfce7' };
      case 'WAITER_EN_ROUTE':
        return { label: 'En Route (Snoozed)', color: '#1e40af', bg: '#dbeafe' };
      case 'PICKED_UP':
        return { label: 'Picked Up', color: '#065f46', bg: '#a7f3d0' };
      case 'DELIVERED':
        return { label: 'Delivered', color: '#374151', bg: '#f3f4f6' };
      case 'SLA_BREACHED':
        return { label: 'SLA BREACHED', color: '#991b1b', bg: '#fee2e2' };
      default:
        return { label: status, color: '#4b5563', bg: '#f3f4f6' };
    }
  }
}
