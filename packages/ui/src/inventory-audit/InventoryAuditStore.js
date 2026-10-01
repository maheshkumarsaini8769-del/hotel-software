"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryAuditStore = void 0;
class InventoryAuditStore {
    state = {
        sessions: [],
        metrics: {
            totalAuditsCount: 0,
            openAuditsCount: 0,
            totalNetShortageLoss: 0,
            reconciledCount: 0,
        },
        selectedSession: null,
        selectedTab: 'SESSIONS',
        filterStatus: 'ALL',
        filterLocation: 'ALL',
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
    setSessions(sessions) {
        this.state.sessions = sessions;
        this.notify();
    }
    setMetrics(metrics) {
        this.state.metrics = metrics;
        this.notify();
    }
    setSelectedSession(session) {
        this.state.selectedSession = session;
        this.notify();
    }
    setSelectedTab(tab) {
        this.state.selectedTab = tab;
        this.notify();
    }
    setFilterStatus(status) {
        this.state.filterStatus = status;
        this.notify();
    }
    setFilterLocation(location) {
        this.state.filterLocation = location;
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
    addSession(session) {
        this.state.sessions = [session, ...this.state.sessions];
        this.notify();
    }
    updateSession(session) {
        this.state.sessions = this.state.sessions.map((s) => (s._id === session._id ? session : s));
        if (this.state.selectedSession?._id === session._id) {
            this.state.selectedSession = session;
        }
        this.notify();
    }
}
exports.InventoryAuditStore = InventoryAuditStore;
