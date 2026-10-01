import {
  IPurchaseOrderUI,
  IVendorUI,
  IGoodsReceivedNoteUI,
  IPoMetricsUI,
  PurchaseOrderStatusUI,
} from './types';

export interface IInventoryPoState {
  orders: IPurchaseOrderUI[];
  selectedOrder: IPurchaseOrderUI | null;
  vendors: IVendorUI[];
  grns: IGoodsReceivedNoteUI[];
  metrics: IPoMetricsUI;
  activeTab: 'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS';
  filterStatus: PurchaseOrderStatusUI | 'ALL';
  searchQuery: string;
  activeModal: 'NEW_PO' | 'RECEIVE_GRN' | 'VIEW_PO' | 'NEW_VENDOR' | null;
  loading: boolean;
  error: string | null;
}

export type InventoryPoListener = (state: IInventoryPoState) => void;

export class InventoryPoStore {
  private state: IInventoryPoState = {
    orders: [],
    selectedOrder: null,
    vendors: [],
    grns: [],
    metrics: {
      totalPoCount: 0,
      pendingApprovalCount: 0,
      totalOpenPoValue: 0,
      completedPoCount: 0,
    },
    activeTab: 'PURCHASE_ORDERS',
    filterStatus: 'ALL',
    searchQuery: '',
    activeModal: null,
    loading: false,
    error: null,
  };

  private listeners: InventoryPoListener[] = [];

  getState(): IInventoryPoState {
    return { ...this.state, orders: [...this.state.orders], vendors: [...this.state.vendors], grns: [...this.state.grns] };
  }

  subscribe(listener: InventoryPoListener): () => void {
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

  setOrders(orders: IPurchaseOrderUI[], metrics?: Partial<IPoMetricsUI>): void {
    this.state.orders = orders;
    if (metrics) {
      this.state.metrics = { ...this.state.metrics, ...metrics };
    }
    this.notify();
  }

  setSelectedOrder(order: IPurchaseOrderUI | null): void {
    this.state.selectedOrder = order;
    this.notify();
  }

  setVendors(vendors: IVendorUI[]): void {
    this.state.vendors = vendors;
    this.notify();
  }

  setGrns(grns: IGoodsReceivedNoteUI[]): void {
    this.state.grns = grns;
    this.notify();
  }

  setActiveTab(tab: 'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS'): void {
    this.state.activeTab = tab;
    this.notify();
  }

  setFilterStatus(status: PurchaseOrderStatusUI | 'ALL'): void {
    this.state.filterStatus = status;
    this.notify();
  }

  setSearchQuery(q: string): void {
    this.state.searchQuery = q;
    this.notify();
  }

  setActiveModal(modal: 'NEW_PO' | 'RECEIVE_GRN' | 'VIEW_PO' | 'NEW_VENDOR' | null): void {
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
}
