import { IFastCashierCartItem, IFastCashierFinancials } from './types';

export class FastCashierHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static calculateFinancials(items: IFastCashierCartItem[], tenderAmount?: number): IFastCashierFinancials {
    const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const taxAmount = Math.round(subtotal * 0.05); // 5% GST standard
    const grandTotal = subtotal + taxAmount;
    const tender = tenderAmount !== undefined ? tenderAmount : grandTotal;
    const changeAmount = Math.max(0, tender - grandTotal);

    return {
      subtotal,
      taxAmount,
      grandTotal,
      tenderAmount: tender,
      changeAmount,
    };
  }

  public static calculateChange(tenderAmount: number, grandTotal: number): number {
    return Math.max(0, (tenderAmount || 0) - (grandTotal || 0));
  }

  public static getQuickTenderSuggestions(grandTotal: number): number[] {
    if (grandTotal <= 0) return [100, 200, 500];
    const notes = [50, 100, 200, 500, 2000];
    const suggestions: Set<number> = new Set();
    suggestions.add(grandTotal);

    for (const note of notes) {
      if (note > grandTotal) {
        suggestions.add(note);
      } else {
        const nextMultiple = Math.ceil(grandTotal / note) * note;
        if (nextMultiple > grandTotal) {
          suggestions.add(nextMultiple);
        }
      }
    }

    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 5);
  }

  public static generate80mmReceiptText(
    tokenNumber: number,
    orderNumber: string,
    items: IFastCashierCartItem[],
    financials: IFastCashierFinancials,
    paymentMethod: string,
    customerName?: string
  ): string {
    const divider = '================================';
    const subDivider = '--------------------------------';
    const lines: string[] = [];

    lines.push('       SPICEHUB EXPRESS POS      ');
    lines.push('       FAST TAKEAWAY COUNTER     ');
    lines.push(divider);
    lines.push(`       *** TOKEN #${tokenNumber} ***       `);
    lines.push(divider);
    lines.push(`Order #: ${orderNumber}`);
    lines.push(`Date: ${new Date().toLocaleString('en-IN')}`);
    if (customerName) lines.push(`Guest: ${customerName}`);
    lines.push(subDivider);

    items.forEach((item) => {
      const namePart = item.name.length > 18 ? item.name.substring(0, 18) : item.name.padEnd(18, ' ');
      const qtyPart = `x${item.quantity}`.padStart(4, ' ');
      const pricePart = FastCashierHelper.formatCurrency(item.subtotal).padStart(10, ' ');
      lines.push(`${namePart}${qtyPart}${pricePart}`);
    });

    lines.push(subDivider);
    lines.push(`Subtotal:            ${FastCashierHelper.formatCurrency(financials.subtotal).padStart(12, ' ')}`);
    lines.push(`GST (5%):            ${FastCashierHelper.formatCurrency(financials.taxAmount).padStart(12, ' ')}`);
    lines.push(`GRAND TOTAL:         ${FastCashierHelper.formatCurrency(financials.grandTotal).padStart(12, ' ')}`);
    lines.push(divider);
    lines.push(`Payment Method:      ${paymentMethod}`);
    lines.push(`Tender Paid:         ${FastCashierHelper.formatCurrency(financials.tenderAmount).padStart(12, ' ')}`);
    lines.push(`Change Due:          ${FastCashierHelper.formatCurrency(financials.changeAmount).padStart(12, ' ')}`);
    lines.push('  Please listen for your Token # ');
    lines.push('     Thank You! Visit Again!     ');

    return lines.join('\n');
  }

  public static generate58mmReceiptText(
    tokenNumber: number,
    orderNumber: string,
    items: IFastCashierCartItem[],
    financials: IFastCashierFinancials,
    paymentMethod: string,
    customerName?: string
  ): string {
    const divider = '================================';
    const subDivider = '--------------------------------';
    const lines: string[] = [];

    lines.push('       SPICEHUB EXPRESS POS      ');
    lines.push(divider);
    lines.push(`       *** TOKEN #${tokenNumber} ***       `);
    lines.push(divider);
    lines.push(`Order: ${orderNumber}`);
    if (customerName) lines.push(`Guest: ${customerName}`);
    lines.push(subDivider);

    items.forEach((item) => {
      const name = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16, ' ');
      const qty = `x${item.quantity}`.padStart(4, ' ');
      const amt = `₹${item.subtotal}`.padStart(10, ' ');
      lines.push(`${name}${qty}${amt}`);
    });

    lines.push(subDivider);
    lines.push(`Total:           ₹${financials.grandTotal}`);
    lines.push(`Paid (${paymentMethod}):  ₹${financials.tenderAmount}`);
    if (financials.changeAmount > 0) {
      lines.push(`Change:          ₹${financials.changeAmount}`);
    }
    lines.push(divider);
    lines.push('     Thank You! Visit Again!     ');

    return lines.join('\n');
  }

  public static getCashDrawerKickCommand(): { pulseHex: string; commandName: string } {
    return {
      pulseHex: '1b700019fa', // ESC p 0 25 250
      commandName: 'DRAWER_KICK_PULSE',
    };
  }
}

