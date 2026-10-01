import { IStoreRequisitionUI, IStockTransferUI, IStockBatchUI, IRequisitionMetricsUI, IFefoMetricsUI, RequisitionStatusUI, RequisitionDepartmentUI } from './types';
export interface IStoreRequisitionState {
    requisitions: IStoreRequisitionUI[];
    selectedRequisition: IStoreRequisitionUI | null;
    transfers: IStockTransferUI[];
    batches: IStockBatchUI[];
    metrics: IRequisitionMetricsUI;
    fefoMetrics: IFefoMetricsUI;
    activeTab: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS';
    filterStatus: RequisitionStatusUI | 'ALL';
    filterDepartment: RequisitionDepartmentUI | 'ALL';
    searchQuery: string;
    activeModal: 'NEW_REQ' | 'ISSUE_REQ' | 'NEW_TRANSFER' | 'NEW_BATCH' | null;
    loading: boolean;
    error: string | null;
}
export type StoreRequisitionListener = (state: IStoreRequisitionState) => void;
export declare class StoreRequisitionStore {
    private state;
    private listeners;
    getState(): IStoreRequisitionState;
    subscribe(listener: StoreRequisitionListener): () => void;
    private notify;
    setRequisitions(requisitions: IStoreRequisitionUI[], metrics?: Partial<IRequisitionMetricsUI>): void;
    setSelectedRequisition(requisition: IStoreRequisitionUI | null): void;
    setTransfers(transfers: IStockTransferUI[]): void;
    setBatches(batches: IStockBatchUI[], fefoMetrics?: Partial<IFefoMetricsUI>): void;
    setActiveTab(tab: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS'): void;
    setFilterStatus(status: RequisitionStatusUI | 'ALL'): void;
    setFilterDepartment(department: RequisitionDepartmentUI | 'ALL'): void;
    setSearchQuery(q: string): void;
    setActiveModal(modal: 'NEW_REQ' | 'ISSUE_REQ' | 'NEW_TRANSFER' | 'NEW_BATCH' | null): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
}
