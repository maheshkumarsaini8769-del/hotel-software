import { TenderLineDTO, TenderMethod } from './types';

export class MultiTenderHelper {
  /**
   * Calculates sum of all tender line amounts
   */
  static sumTenders(tenders: TenderLineDTO[]): number {
    return Math.round(
      tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) * 100
    ) / 100;
  }

  /**
   * Computes remaining balance needed to reach target total
   */
  static getRemainingBalance(targetTotal: number, tenders: TenderLineDTO[]): number {
    const totalTendered = this.sumTenders(tenders);
    const remaining = Math.round((targetTotal - totalTendered) * 100) / 100;
    return remaining;
  }

  /**
   * Calculates cash change returned when customer tenders larger cash note
   */
  static calculateCashChange(tenderAmount: number, cashReceived: number): number {
    if (cashReceived <= tenderAmount) return 0;
    return Math.round((cashReceived - tenderAmount) * 100) / 100;
  }

  /**
   * Helper to format currency
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Badge metadata for payment tender methods
   */
  static getTenderBadge(method: TenderMethod): { label: string; icon: string; bg: string; color: string } {
    switch (method) {
      case 'CASH':
        return { label: 'Cash Tender', icon: '💵', bg: '#DCFCE7', color: '#166534' };
      case 'UPI':
        return { label: 'Instant UPI', icon: '⚡', bg: '#DBEAFE', color: '#1E40AF' };
      case 'CARD':
        return { label: 'Credit/Debit Card', icon: '💳', bg: '#F3E8FF', color: '#6B21A8' };
      case 'ROOM_FOLIO':
        return { label: 'Post to Room Folio', icon: '🏨', bg: '#FEF3C7', color: '#92400E' };
      case 'CITY_LEDGER':
        return { label: 'Corporate City Ledger', icon: '🏢', bg: '#E0E7FF', color: '#3730A3' };
      case 'COMPLIMENTARY':
        return { label: 'Complimentary (NC)', icon: '🎁', bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { label: method, icon: '💰', bg: '#F3F4F6', color: '#374151' };
    }
  }
}
