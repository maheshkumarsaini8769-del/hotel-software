import { NightAuditStatusUI } from './types';

export class NightAuditHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static getStatusBadge(status: NightAuditStatusUI): {
    label: string;
    bg: string;
    text: string;
    border: string;
  } {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'AUDIT CLOSED & ROLLED OVER',
          bg: 'rgba(34, 197, 94, 0.15)',
          text: '#4ade80',
          border: '1px solid rgba(34, 197, 94, 0.4)',
        };
      case 'IN_PROGRESS':
        return {
          label: 'AUDIT IN PROGRESS',
          bg: 'rgba(234, 179, 8, 0.15)',
          text: '#facc15',
          border: '1px solid rgba(234, 179, 8, 0.4)',
        };
      case 'FAILED':
      default:
        return {
          label: 'AUDIT FAILED',
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)',
        };
    }
  }

  public static computeKPIs(
    totalRoomRevenue: number,
    totalRooms: number,
    occupiedRooms: number
  ): {
    occupancyRate: number;
    adr: number;
    revPAR: number;
  } {
    const occupancyRate = totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2)) : 0;
    const adr = occupiedRooms > 0 ? Number((totalRoomRevenue / occupiedRooms).toFixed(2)) : 0;
    const revPAR = totalRooms > 0 ? Number((totalRoomRevenue / totalRooms).toFixed(2)) : 0;

    return {
      occupancyRate,
      adr,
      revPAR,
    };
  }
}
