"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryPoStore = void 0;
class InventoryPoStore {
    state = {
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
    listeners = [];
    getState() {
        return { ...this.state, orders: [...this.state.orders], vendors: [...this.state.vendors], grns: [...this.state.grns] };
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
    setOrders(orders, metrics) {
        this.state.orders = orders;
        if (metrics) {
            this.state.metrics = { ...this.state.metrics, ...metrics };
        }
        this.notify();
    }
    setSelectedOrder(order) {
        this.state.selectedOrder = order;
        this.notify();
    }
    setVendors(vendors) {
        this.state.vendors = vendors;
        this.notify();
    }
    setGrns(grns) {
        this.state.grns = grns;
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
exports.InventoryPoStore = InventoryPoStore;
