import {
  IFastCashierCartItem,
  IFastCashierItem,
  ITakeawayCallingQueueUI,
  IFastCashierFinancials,
} from './types';
import { FastCashierHelper } from './FastCashierHelper';

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

export class FastCashierStore {
  private state: IFastCashierState = {
    cart: [],
    numpadBuffer: '',
    activeQuantity: 1,
    tenderAmount: 0,
    paymentMethod: 'CASH',
    customerName: '',
    customerPhone: '',
    cookingInstructions: '',
    callingQueue: {
      totalActiveTakeaways: 0,
      preparingQueue: [],
      readyQueue: [],
      completedQueue: [],
    },
    lastCompletedOrder: null,
    lastTokenNumber: null,
    activeModal: null,
    loading: false,
    error: null,
  };

  private listeners: FastCashierStateListener[] = [];

  getState(): IFastCashierState {
    return { ...this.state, cart: [...this.state.cart] };
  }

  subscribe(listener: FastCashierStateListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  addItem(item: IFastCashierItem, quantity = 1, variantName?: string): void {
    const existingIndex = this.state.cart.findIndex(
      (c) => c.menuItemId === item._id && c.variantName === variantName
    );

    let price = item.basePrice;
    if (variantName && item.hasVariants && item.variants) {
      const v = item.variants.find((vr) => vr.name === variantName);
      if (v) price = v.price;
    }

    if (existingIndex > -1) {
      const current = this.state.cart[existingIndex];
      const newQty = current.quantity + quantity;
      this.state.cart[existingIndex] = {
        ...current,
        quantity: newQty,
        subtotal: newQty * current.unitPrice,
      };
    } else {
      this.state.cart.push({
        menuItemId: item._id,
        name: item.name,
        variantName,
        unitPrice: price,
        quantity,
        subtotal: price * quantity,
      });
    }

    // Auto-update tender if zero or matches previous total
    const financials = FastCashierHelper.calculateFinancials(this.state.cart);
    this.state.tenderAmount = financials.grandTotal;
    this.state.numpadBuffer = '';
    this.state.activeQuantity = 1;
    this.notify();
  }

  updateQuantity(menuItemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(menuItemId);
      return;
    }
    const idx = this.state.cart.findIndex((c) => c.menuItemId === menuItemId);
    if (idx > -1) {
      this.state.cart[idx].quantity = quantity;
      this.state.cart[idx].subtotal = this.state.cart[idx].unitPrice * quantity;
      const financials = FastCashierHelper.calculateFinancials(this.state.cart);
      this.state.tenderAmount = financials.grandTotal;
      this.notify();
    }
  }

  removeItem(menuItemId: string): void {
    this.state.cart = this.state.cart.filter((c) => c.menuItemId !== menuItemId);
    const financials = FastCashierHelper.calculateFinancials(this.state.cart);
    this.state.tenderAmount = financials.grandTotal;
    this.notify();
  }

  clearCart(): void {
    this.state.cart = [];
    this.state.tenderAmount = 0;
    this.state.numpadBuffer = '';
    this.state.activeQuantity = 1;
    this.state.customerName = '';
    this.state.customerPhone = '';
    this.state.cookingInstructions = '';
    this.notify();
  }

  appendNumpad(char: string): void {
    this.state.numpadBuffer += char;
    this.notify();
  }

  clearNumpad(): void {
    this.state.numpadBuffer = '';
    this.notify();
  }

  setNumpadBuffer(val: string): void {
    this.state.numpadBuffer = val;
    this.notify();
  }

  setActiveQuantity(qty: number): void {
    this.state.activeQuantity = Math.max(1, qty);
    this.notify();
  }

  setTenderAmount(amount: number): void {
    this.state.tenderAmount = Math.max(0, amount);
    this.notify();
  }

  setPaymentMethod(method: 'CASH' | 'UPI' | 'CARD'): void {
    this.state.paymentMethod = method;
    this.notify();
  }

  setCustomerInfo(name: string, phone: string): void {
    this.state.customerName = name;
    this.state.customerPhone = phone;
    this.notify();
  }

  setCookingInstructions(instructions: string): void {
    this.state.cookingInstructions = instructions;
    this.notify();
  }

  setCallingQueue(queue: ITakeawayCallingQueueUI): void {
    this.state.callingQueue = queue;
    this.notify();
  }

  setLastCompletedOrder(order: any, tokenNumber: number): void {
    this.state.lastCompletedOrder = order;
    this.state.lastTokenNumber = tokenNumber;
    this.notify();
  }

  setActiveModal(modal: 'RECEIPT' | 'CALLING_BOARD' | null): void {
    this.state.activeModal = modal;
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  resetForNextCustomer(): void {
    this.clearCart();
    this.state.lastCompletedOrder = null;
    this.state.activeModal = null;
    this.state.error = null;
    this.notify();
  }
}
