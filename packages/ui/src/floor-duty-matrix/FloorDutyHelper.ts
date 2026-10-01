import { FloorOverviewSummaryDTO, FloorWaiterDutyDTO } from './types';

export class FloorDutyHelper {
  /**
   * Calculates capacity utilization percentage on a floor
   */
  static getFloorUtilization(summary: FloorOverviewSummaryDTO): number {
    if (summary.totalTables === 0) return 0;
    return Math.round((summary.totalAssignedTables / summary.totalTables) * 100);
  }

  /**
   * Evaluates if a waiter is overloaded relative to safety threshold
   */
  static isWaiterOverloaded(duty: FloorWaiterDutyDTO, maxCap: number = 40): boolean {
    return duty.paxCapacity > maxCap;
  }

  /**
   * Color formatting for floor cards
   */
  static getFloorBadgeColor(floorCode: string): { bg: string; text: string; border: string } {
    switch (floorCode.toUpperCase()) {
      case 'GF':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#93C5FD' };
      case '2F':
        return { bg: '#FDF2F8', text: '#9D174D', border: '#F9A8D4' };
      case 'RT':
        return { bg: '#F5F3FF', text: '#5B21B6', border: '#C4B5FD' };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
    }
  }
}
