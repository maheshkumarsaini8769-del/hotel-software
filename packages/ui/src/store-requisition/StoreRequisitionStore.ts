import {
  IStoreRequisitionUI,
  IStockTransferUI,
  IStockBatchUI,
  IRequisitionMetricsUI,
  IFefoMetricsUI,
  RequisitionStatusUI,
  RequisitionDepartmentUI,
} from './types';

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

export class StoreRequisitionStore {
  private state: IStoreRequisitionState = {
    requisitions: [],
    selectedRequisition: null,
    transfers: [],
    batches: [],
    metrics: {
      totalPendingCount: 0,
      criticalCount: 0,
      fulfilledTodayCount: 0,
      totalCount: 0,
    },
    fefoMetrics: {
      totalBatchesCount: 0,
      expiringSoonCount: 0,
      expiredCount: 0,
      totalAtRiskValue: 0,
    },
    activeTab: 'REQUISITIONS',
    filterStatus: 'ALL',
    filterDepartment: 'ALL',
    searchQuery: '',
    activeModal: null,
    loading: false,
    error: null,
  };

  private listeners: StoreRequisitionListener[] = [];

  getState(): IStoreRequisitionState {
    return {
      ...this.state,
      requisitions: [...this.state.requisitions],
      transfers: [...this.state.transfers],
      batches: [...this.state.batches],
    };
  }

  subscribe(listener: StoreRequisitionListener): () => void {
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

  setRequisitions(requisitions: IStoreRequisitionUI[], metrics?: Partial<IRequisitionMetricsUI>): void {
    this.state.requisitions = requisitions;
    if (metrics) {
      this.state.metrics = { ...this.state.metrics, ...metrics };
    }
    this.notify();
  }

  setSelectedRequisition(requisition: IStoreRequisitionUI | null): void {
    this.state.selectedRequisition = requisition;
    this.notify();
  }

  setTransfers(transfers: IStockTransferUI[]): void {
    this.state.transfers = transfers;
    this.notify();
  }

  setBatches(batches: IStockBatchUI[], fefoMetrics?: Partial<IFefoMetricsUI>): void {
    this.state.batches = batches;
    if (fefoMetrics) {
      this.state.fefoMetrics = { ...this.state.fefoMetrics, ...fefoMetrics };
    }
    this.notify();
  }

  setActiveTab(tab: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS'): void {
    this.state.activeTab = tab;
    this.notify();
  }

  setFilterStatus(status: RequisitionStatusUI | 'ALL'): void {
    this.state.filterStatus = status;
    this.notify();
  }

  setFilterDepartment(department: RequisitionDepartmentUI | 'ALL'): void {
    this.state.filterDepartment = department;
    this.notify();
  }

  setSearchQuery(q: string): void {
    this.state.searchQuery = q;
    this.notify();
  }

  setActiveModal(modal: 'NEW_REQ' | 'ISSUE_REQ' | 'NEW_TRANSFER' | 'NEW_BATCH' | null): void {
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
