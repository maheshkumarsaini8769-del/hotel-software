import { AlertPriority, AlertRoutingType, AlertStatus } from './types';

export class WaiterZoneHelper {
  /**
   * Returns human-readable high-contrast badge colors for alert priorities
   */
  static getPriorityColor(priority: AlertPriority): { bg: string; text: string; border: string } {
    switch (priority) {
      case 'CRITICAL':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626' };
      case 'HIGH':
        return { bg: '#FFEDD5', text: '#9A3412', border: '#EA580C' };
      case 'NORMAL':
        return { bg: '#FEF3C7', text: '#92400E', border: '#D97706' };
      case 'LOW':
      default:
        return { bg: '#E0F2FE', text: '#075985', border: '#0284C7' };
    }
  }

  /**
   * Returns color code for alert status
   */
  static getStatusColor(status: AlertStatus): { bg: string; text: string } {
    switch (status) {
      case 'ON_MY_WAY':
        return { bg: '#3B82F6', text: '#FFFFFF' };
      case 'ACKNOWLEDGED':
        return { bg: '#EAB308', text: '#FFFFFF' };
      case 'RESOLVED':
        return { bg: '#10B981', text: '#FFFFFF' };
      case 'SENT':
      case 'DELIVERED':
      default:
        return { bg: '#EF4444', text: '#FFFFFF' };
    }
  }

  /**
   * Checks if an alert belongs to this waiter (or is an escalation to captain)
   */
  static isAlertRelevant(
    targetWaiterId: string | undefined,
    currentWaiterId: string,
    routingType: AlertRoutingType,
    isCaptain: boolean = false
  ): boolean {
    if (isCaptain) return true;
    if (targetWaiterId === currentWaiterId) return true;
    if (routingType === 'ZONE_BROADCAST' || routingType === 'CAPTAIN_ESCALATION') return true;
    return false;
  }

  /**
   * Formats table list concisely (e.g. "T-01 to T-10" or "T-01, T-02, T-03")
   */
  static formatTableList(tableNumbers: string[]): string {
    if (!tableNumbers || tableNumbers.length === 0) return 'No tables assigned';
    if (tableNumbers.length <= 4) return tableNumbers.join(', ');
    return `${tableNumbers[0]} to ${tableNumbers[tableNumbers.length - 1]} (${tableNumbers.length} Tables)`;
  }
}
