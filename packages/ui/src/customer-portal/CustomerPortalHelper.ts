import { CustomerServiceMode, PortalCartItem, ServiceRequestType } from './types';

export class CustomerPortalHelper {
  /**
   * Computes subtotal, 5% GST tax, and net grand total
   */
  static calculateCartTotals(items: PortalCartItem[], taxRatePercent: number = 5): {
    subTotal: number;
    taxAmount: number;
    grandTotal: number;
    totalItemCount: number;
  } {
    const subTotal = items.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const taxAmount = Math.round(subTotal * (taxRatePercent / 100));
    const grandTotal = subTotal + taxAmount;
    const totalItemCount = items.reduce((acc, it) => acc + it.quantity, 0);

    return {
      subTotal,
      taxAmount,
      grandTotal,
      totalItemCount,
    };
  }

  /**
   * Human-friendly mode title
   */
  static formatServiceModeLabel(mode: CustomerServiceMode): string {
    switch (mode) {
      case 'IN_ROOM_DINING':
        return 'In-Room Dining (Room Service)';
      case 'DINE_IN_RESTAURANT':
        return 'Dine-In Restaurant Table';
      case 'TAKEAWAY_PICKUP':
        return 'Takeaway Express Pickup';
      case 'POOLSIDE_LOUNGE':
        return 'Poolside & Cabana Service';
      default:
        return mode;
    }
  }

  /**
   * Human-friendly service request title
   */
  static formatServiceRequestLabel(type: ServiceRequestType): string {
    switch (type) {
      case 'WATER_REFILL':
        return 'Request Fresh Water';
      case 'CALL_WAITER':
        return 'Call Waiter to Table';
      case 'CALL_ROOM_SERVICE':
        return 'Call Room Attendant';
      case 'EXTRA_CUTLERY':
        return 'Extra Cutlery & Plates';
      case 'REQUEST_BILL':
        return 'Request Final Bill';
      case 'ROOM_CLEANING':
        return 'Housekeeping Room Service';
      default:
        return 'Special Request';
    }
  }

  /**
   * Status badge styling for UI
   */
  static getStatusBadgeStyle(status: string): { bg: string; text: string; label: string } {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Dispatched to Staff' };
      case 'ACKNOWLEDGED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Attendant on the Way' };
      case 'RESOLVED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
      default:
        return { bg: '#F3F4F6', text: '#374151', label: status };
    }
  }

  /**
   * Estimate delivery ETA in minutes
   */
  static getEstimatedDeliveryMinutes(mode: CustomerServiceMode, itemCount: number): number {
    const baseMinutes = mode === 'IN_ROOM_DINING' ? 30 : 20;
    const extraMinutes = Math.min(15, Math.floor(itemCount / 3) * 5);
    return baseMinutes + extraMinutes;
  }
}
