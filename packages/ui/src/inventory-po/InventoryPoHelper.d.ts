import { PurchaseOrderStatusUI, GrnInspectionStatusUI } from './types';
export declare class InventoryPoHelper {
    static formatCurrency(amount: number): string;
    static calculatePoTotals(items: Array<{
        orderQuantity: number;
        unitPrice: number;
        taxRate?: number;
    }>): {
        subtotal: number;
        taxAmount: number;
        grandTotal: number;
    };
    static getPoStatusBadge(status: PurchaseOrderStatusUI): {
        label: string;
        bg: string;
        border: string;
        text: string;
    };
    static getGrnStatusBadge(status: GrnInspectionStatusUI): {
        label: string;
        bg: string;
        border: string;
        text: string;
    };
}
