import { SeatSubFolioDTO, SubFolioStatus } from './types';

export class SeatBillingHelper {
  /**
   * Calculates 5% GST (2.5% CGST + 2.5% SGST) and net total
   */
  static calculateGst5Percent(subTotal: number, discountAmount: number = 0): {
    cgstAmount: number;
    sgstAmount: number;
    totalTax: number;
    grandTotal: number;
  } {
    const discountedBase = Math.max(0, subTotal - discountAmount);
    const cgstAmount = Math.round(discountedBase * 0.025 * 100) / 100;
    const sgstAmount = Math.round(discountedBase * 0.025 * 100) / 100;
    const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;
    const grandTotal = Math.round((discountedBase + totalTax) * 100) / 100;

    return {
      cgstAmount,
      sgstAmount,
      totalTax,
      grandTotal,
    };
  }

  /**
   * Status styling badge for Sub-Folio
   */
  static getSubFolioStatusBadge(status: SubFolioStatus): {
    bg: string;
    text: string;
    border: string;
    label: string;
  } {
    switch (status) {
      case 'OPEN':
        return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', label: 'Dining (Open)' };
      case 'BILL_REQUESTED':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6', label: 'Bill Requested' };
      case 'SETTLED':
        return { bg: '#D1FAE5', text: '#065F46', border: '#10B981', label: 'Settled & Paid' };
      case 'MERGED':
        return { bg: '#F3F4F6', text: '#4B5563', border: '#9CA3AF', label: 'Merged Bill' };
      case 'VOID':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444', label: 'Voided' };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB', label: status };
    }
  }

  /**
   * Human title for seat card
   */
  static formatSubFolioTitle(subFolio: SeatSubFolioDTO): string {
    const seatsText =
      subFolio.seatNumbers.length === 1
        ? `Seat ${subFolio.seatNumbers[0]}`
        : `Seats ${subFolio.seatNumbers.join(', ')}`;
    return `${seatsText} • ${subFolio.customerName || 'Diner'}`;
  }

  /**
   * Formats thermal receipt print text
   */
  static formatThermalReceiptText(
    subFolio: SeatSubFolioDTO,
    hotelName: string = 'SpiceHub Heritage Resort'
  ): string {
    const divider = '--------------------------------';
    const lines = [
      hotelName,
      `Table: ${subFolio.tableNumber} | Bill #${subFolio.subFolioNumber}`,
      `Guest: ${subFolio.customerName} (Seats: ${subFolio.seatNumbers.join(', ')})`,
      divider,
      'ITEM             QTY   RATE   AMOUNT',
      divider,
    ];

    subFolio.lineItems.forEach((it) => {
      const name = it.name.padEnd(16).substring(0, 16);
      const qty = String(it.quantity).padStart(3);
      const rate = String(it.unitPrice).padStart(6);
      const total = String(it.subtotal).padStart(7);
      lines.push(`${name} ${qty} ${rate} ${total}`);
    });

    lines.push(divider);
    lines.push(`Subtotal:                    ₹${subFolio.subTotal}`);
    lines.push(`CGST (2.5%):                 ₹${subFolio.cgstAmount}`);
    lines.push(`SGST (2.5%):                 ₹${subFolio.sgstAmount}`);
    lines.push(divider);
    lines.push(`GRAND TOTAL:                 ₹${subFolio.grandTotal}`);
    lines.push(`Payment: ${subFolio.paymentMethod || 'PENDING'} - Status: ${subFolio.status}`);
    lines.push(divider);
    lines.push('Thank you for dining with us!');

    return lines.join('\n');
  }
}
