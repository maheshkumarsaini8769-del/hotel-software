import { CustomerServiceMode, PortalCartItem, ServiceRequestType } from './types';
export declare class CustomerPortalHelper {
    /**
     * Computes subtotal, 5% GST tax, and net grand total
     */
    static calculateCartTotals(items: PortalCartItem[], taxRatePercent?: number): {
        subTotal: number;
        taxAmount: number;
        grandTotal: number;
        totalItemCount: number;
    };
    /**
     * Human-friendly mode title
     */
    static formatServiceModeLabel(mode: CustomerServiceMode): string;
    /**
     * Human-friendly service request title
     */
    static formatServiceRequestLabel(type: ServiceRequestType): string;
    /**
     * Status badge styling for UI
     */
    static getStatusBadgeStyle(status: string): {
        bg: string;
        text: string;
        label: string;
    };
    /**
     * Estimate delivery ETA in minutes
     */
    static getEstimatedDeliveryMinutes(mode: CustomerServiceMode, itemCount: number): number;
}
