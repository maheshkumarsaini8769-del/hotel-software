import { IPurchaseOrderUI, IVendorUI, IGoodsReceivedNoteUI, IPoMetricsUI, PurchaseOrderStatusUI } from './types';
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
export declare class InventoryPoStore {
    private state;
    private listeners;
    getState(): IInventoryPoState;
    subscribe(listener: InventoryPoListener): () => void;
    private notify;
    setOrders(orders: IPurchaseOrderUI[], metrics?: Partial<IPoMetricsUI>): void;
    setSelectedOrder(order: IPurchaseOrderUI | null): void;
    setVendors(vendors: IVendorUI[]): void;
    setGrns(grns: IGoodsReceivedNoteUI[]): void;
    setActiveTab(tab: 'PURCHASE_ORDERS' | 'GRN_HISTORY' | 'VENDORS'): void;
    setFilterStatus(status: PurchaseOrderStatusUI | 'ALL'): void;
    setSearchQuery(q: string): void;
    setActiveModal(modal: 'NEW_PO' | 'RECEIVE_GRN' | 'VIEW_PO' | 'NEW_VENDOR' | null): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
}
