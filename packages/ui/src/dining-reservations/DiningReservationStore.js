"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiningReservationStore = void 0;
class DiningReservationStore {
    state = {
        reservations: [],
        selectedReservation: null,
        selectedDate: new Date().toISOString().split('T')[0],
        selectedMealPeriod: 'ALL',
        selectedVipFilter: 'ALL',
        metrics: {
            totalReservationsCount: 0,
            confirmedCount: 0,
            seatedCount: 0,
            vipCount: 0,
            allergenAlertsCount: 0,
        },
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
    setReservations(reservations) {
        this.state.reservations = reservations;
        this.notify();
    }
    setMetrics(metrics) {
        this.state.metrics = metrics;
        this.notify();
    }
    setSelectedReservation(res) {
        this.state.selectedReservation = res;
        this.notify();
    }
    setSelectedDate(date) {
        this.state.selectedDate = date;
        this.notify();
    }
    setSelectedMealPeriod(period) {
        this.state.selectedMealPeriod = period;
        this.notify();
    }
    setSelectedVipFilter(filter) {
        this.state.selectedVipFilter = filter;
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
    addReservation(res) {
        this.state.reservations = [res, ...this.state.reservations];
        this.notify();
    }
    updateReservation(res) {
        this.state.reservations = this.state.reservations.map((r) => r._id === res._id ? res : r);
        if (this.state.selectedReservation?._id === res._id) {
            this.state.selectedReservation = res;
        }
        this.notify();
    }
}
exports.DiningReservationStore = DiningReservationStore;
