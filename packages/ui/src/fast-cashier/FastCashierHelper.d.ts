import { IFastCashierCartItem, IFastCashierFinancials } from './types';
export declare class FastCashierHelper {
    static formatCurrency(amount: number): string;
    static calculateFinancials(items: IFastCashierCartItem[], tenderAmount?: number): IFastCashierFinancials;
    static calculateChange(tenderAmount: number, grandTotal: number): number;
    static getQuickTenderSuggestions(grandTotal: number): number[];
    static generate80mmReceiptText(tokenNumber: number, orderNumber: string, items: IFastCashierCartItem[], financials: IFastCashierFinancials, paymentMethod: string, customerName?: string): string;
    static generate58mmReceiptText(tokenNumber: number, orderNumber: string, items: IFastCashierCartItem[], financials: IFastCashierFinancials, paymentMethod: string, customerName?: string): string;
    static getCashDrawerKickCommand(): {
        pulseHex: string;
        commandName: string;
    };
}
