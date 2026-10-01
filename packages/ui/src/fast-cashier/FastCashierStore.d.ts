import { IFastCashierCartItem, IFastCashierItem, ITakeawayCallingQueueUI } from './types';
export interface IFastCashierState {
    cart: IFastCashierCartItem[];
    numpadBuffer: string;
    activeQuantity: number;
    tenderAmount: number;
    paymentMethod: 'CASH' | 'UPI' | 'CARD';
    customerName: string;
    customerPhone: string;
    cookingInstructions: string;
    callingQueue: ITakeawayCallingQueueUI;
    lastCompletedOrder: any | null;
    lastTokenNumber: number | null;
    activeModal: 'RECEIPT' | 'CALLING_BOARD' | null;
    loading: boolean;
    error: string | null;
}
export type FastCashierStateListener = (state: IFastCashierState) => void;
export declare class FastCashierStore {
    private state;
    private listeners;
    getState(): IFastCashierState;
    subscribe(listener: FastCashierStateListener): () => void;
    private notify;
    addItem(item: IFastCashierItem, quantity?: number, variantName?: string): void;
    updateQuantity(menuItemId: string, quantity: number): void;
    removeItem(menuItemId: string): void;
    clearCart(): void;
    appendNumpad(char: string): void;
    clearNumpad(): void;
    setNumpadBuffer(val: string): void;
    setActiveQuantity(qty: number): void;
    setTenderAmount(amount: number): void;
    setPaymentMethod(method: 'CASH' | 'UPI' | 'CARD'): void;
    setCustomerInfo(name: string, phone: string): void;
    setCookingInstructions(instructions: string): void;
    setCallingQueue(queue: ITakeawayCallingQueueUI): void;
    setLastCompletedOrder(order: any, tokenNumber: number): void;
    setActiveModal(modal: 'RECEIPT' | 'CALLING_BOARD' | null): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    resetForNextCustomer(): void;
}
