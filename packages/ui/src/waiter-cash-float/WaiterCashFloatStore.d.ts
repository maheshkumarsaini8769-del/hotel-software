import { WaiterCashFloatDto } from './types';
export type WaiterCashFloatListener = (state: WaiterCashFloatState) => void;
export interface WaiterCashFloatState {
    activeFloat: WaiterCashFloatDto | null;
    isLoading: boolean;
    lastReceipt: any | null;
}
export declare class WaiterCashFloatStore {
    private static instance;
    private state;
    private listeners;
    private constructor();
    static getInstance(): WaiterCashFloatStore;
    getState(): WaiterCashFloatState;
    subscribe(listener: WaiterCashFloatListener): () => void;
    private notify;
    setActiveFloat(float: WaiterCashFloatDto | null): void;
    recordCashTender(amountTendered: number, changeGiven: number): void;
    setSettled(receipt: any): void;
    clear(): void;
}
