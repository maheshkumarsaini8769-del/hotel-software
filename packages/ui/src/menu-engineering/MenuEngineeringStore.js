"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuEngineeringStore = void 0;
class MenuEngineeringStore {
    state = {
        reports: [],
        activeReport: null,
        selectedItem: null,
        selectedQuadrantFilter: 'ALL',
        activeTab: 'MATRIX',
        simulationResult: null,
        isLoading: false,
        error: null,
    };
    listeners = [];
    getState() {
        return { ...this.state };
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
    setReports(reports) {
        this.state.reports = reports;
        if (!this.state.activeReport && reports.length > 0) {
            this.state.activeReport = reports[0];
        }
        this.notify();
    }
    setActiveReport(report) {
        this.state.activeReport = report;
        this.notify();
    }
    setSelectedItem(item) {
        this.state.selectedItem = item;
        this.notify();
    }
    setSelectedQuadrantFilter(filter) {
        this.state.selectedQuadrantFilter = filter;
        this.notify();
    }
    setActiveTab(tab) {
        this.state.activeTab = tab;
        this.notify();
    }
    setSimulationResult(res) {
        this.state.simulationResult = res;
        this.notify();
    }
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
}
exports.MenuEngineeringStore = MenuEngineeringStore;
