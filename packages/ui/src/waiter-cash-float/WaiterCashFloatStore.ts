import { WaiterCashFloatDto, WaiterFloatStatus } from './types';

export type WaiterCashFloatListener = (state: WaiterCashFloatState) => void;

export interface WaiterCashFloatState {
  activeFloat: WaiterCashFloatDto | null;
  isLoading: boolean;
  lastReceipt: any | null;
}

export class WaiterCashFloatStore {
  private static instance: WaiterCashFloatStore;
  private state: WaiterCashFloatState = {
    activeFloat: null,
    isLoading: false,
    lastReceipt: null,
  };
  private listeners: Set<WaiterCashFloatListener> = new Set();

  private constructor() {}

  public static getInstance(): WaiterCashFloatStore {
    if (!WaiterCashFloatStore.instance) {
      WaiterCashFloatStore.instance = new WaiterCashFloatStore();
    }
    return WaiterCashFloatStore.instance;
  }

  public getState(): WaiterCashFloatState {
    return { ...this.state };
  }

  public subscribe(listener: WaiterCashFloatListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public setActiveFloat(float: WaiterCashFloatDto | null): void {
    this.state = {
      ...this.state,
      activeFloat: float,
    };
    this.notify();
  }

  public recordCashTender(amountTendered: number, changeGiven: number): void {
    if (!this.state.activeFloat) return;
    const net = amountTendered - changeGiven;
    this.state = {
      ...this.state,
      activeFloat: {
        ...this.state.activeFloat,
        totalCashCollected: this.state.activeFloat.totalCashCollected + amountTendered,
        totalChangeGiven: this.state.activeFloat.totalChangeGiven + changeGiven,
        expectedCashInHand: this.state.activeFloat.expectedCashInHand + net,
      },
    };
    this.notify();
  }

  public setSettled(receipt: any): void {
    this.state = {
      ...this.state,
      activeFloat: this.state.activeFloat
        ? {
            ...this.state.activeFloat,
            status: WaiterFloatStatus.SETTLED,
            receiptNumber: receipt.receiptNumber,
            actualCashHandedOver: receipt.actualCashReceived,
            variance: receipt.variance,
            settledAt: receipt.timestamp,
          }
        : null,
      lastReceipt: receipt,
    };
    this.notify();
  }

  public clear(): void {
    this.state = {
      activeFloat: null,
      isLoading: false,
      lastReceipt: null,
    };
    this.notify();
  }
}
