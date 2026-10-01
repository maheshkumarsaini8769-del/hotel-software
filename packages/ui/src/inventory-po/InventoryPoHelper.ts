import { PurchaseOrderStatusUI, GrnInspectionStatusUI } from './types';

export class InventoryPoHelper {
  public static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  public static calculatePoTotals(items: Array<{ orderQuantity: number; unitPrice: number; taxRate?: number }>): {
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const lineSubtotal = (item.orderQuantity || 0) * (item.unitPrice || 0);
      const tax = lineSubtotal * ((item.taxRate || 5) / 100);
      subtotal += lineSubtotal;
      taxAmount += tax;
    });

    subtotal = Math.round(subtotal * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

    return { subtotal, taxAmount, grandTotal };
  }

  public static getPoStatusBadge(status: PurchaseOrderStatusUI): {
    label: string;
    bg: string;
    border: string;
    text: string;
  } {
    switch (status) {
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          bg: 'bg-amber-950/60',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
        };
      case 'APPROVED':
        return {
          label: 'Approved (Awaiting Truck)',
          bg: 'bg-blue-950/60',
          border: 'border-blue-500/40',
          text: 'text-blue-400',
        };
      case 'PARTIALLY_RECEIVED':
        return {
          label: 'Partially Received',
          bg: 'bg-purple-950/60',
          border: 'border-purple-500/40',
          text: 'text-purple-400',
        };
      case 'COMPLETED':
        return {
          label: 'Fully Received / Fulfilled',
          bg: 'bg-emerald-950/60',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bg: 'bg-zinc-800',
          border: 'border-zinc-700',
          text: 'text-zinc-400',
        };
      default:
        return {
          label: 'Draft',
          bg: 'bg-zinc-900',
          border: 'border-zinc-800',
          text: 'text-zinc-300',
        };
    }
  }

  public static getGrnStatusBadge(status: GrnInspectionStatusUI): {
    label: string;
    bg: string;
    border: string;
    text: string;
  } {
    switch (status) {
      case 'VERIFIED':
        return {
          label: 'Verified & Accepted',
          bg: 'bg-emerald-950/60',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
        };
      case 'FLAGGED_DISCREPANCY':
        return {
          label: 'Discrepancy / Partial Rejection',
          bg: 'bg-rose-950/60',
          border: 'border-rose-500/40',
          text: 'text-rose-400',
        };
      case 'REJECTED':
        return {
          label: 'Rejected Shipment',
          bg: 'bg-red-950/60',
          border: 'border-red-500/50',
          text: 'text-red-400',
        };
      default:
        return {
          label: 'Inspected',
          bg: 'bg-zinc-900',
          border: 'border-zinc-800',
          text: 'text-zinc-300',
        };
    }
  }
}
