"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreRequisitionStore = void 0;
class StoreRequisitionStore {
    state = {
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
    listeners = [];
    getState() {
        return {
            ...this.state,
            requisitions: [...this.state.requisitions],
            transfers: [...this.state.transfers],
            batches: [...this.state.batches],
        };
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    setRequisitions(requisitions, metrics) {
        this.state.requisitions = requisitions;
        if (metrics) {
            this.state.metrics = { ...this.state.metrics, ...metrics };
        }
        this.notify();
    }
    setSelectedRequisition(requisition) {
        this.state.selectedRequisition = requisition;
        this.notify();
    }
    setTransfers(transfers) {
        this.state.transfers = transfers;
        this.notify();
    }
    setBatches(batches, fefoMetrics) {
        this.state.batches = batches;
        if (fefoMetrics) {
            this.state.fefoMetrics = { ...this.state.fefoMetrics, ...fefoMetrics };
        }
        this.notify();
    }
    setActiveTab(tab) {
        this.state.activeTab = tab;
        this.notify();
    }
    setFilterStatus(status) {
        this.state.filterStatus = status;
        this.notify();
    }
    setFilterDepartment(department) {
        this.state.filterDepartment = department;
        this.notify();
    }
    setSearchQuery(q) {
        this.state.searchQuery = q;
        this.notify();
    }
    setActiveModal(modal) {
        this.state.activeModal = modal;
        this.notify();
    }
    setLoading(loading) {
        this.state.loading = loading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
}
exports.StoreRequisitionStore = StoreRequisitionStore;
