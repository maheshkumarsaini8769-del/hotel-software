"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrLockerStore = void 0;
const QrLockerHelper_1 = require("./QrLockerHelper");
class QrLockerStore {
    pendingOrders = [];
    activeQrSession = null;
    isLoading = false;
    errorMessage = null;
    listeners = [];
    constructor(initialOrders) {
        if (initialOrders) {
            this.pendingOrders = initialOrders;
        }
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        this.listeners.forEach((l) => l());
    }
    // Getters
    getPendingOrders() {
        return this.pendingOrders;
    }
    getActiveQrSession() {
        return this.activeQrSession;
    }
    getIsLoading() {
        return this.isLoading;
    }
    getErrorMessage() {
        return this.errorMessage;
    }
    // Actions
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    setError(error) {
        this.errorMessage = error;
        this.notify();
    }
    setActiveQrSession(session) {
        this.activeQrSession = session;
        this.notify();
    }
    setPendingOrders(orders) {
        this.pendingOrders = orders.map((o) => ({
            ...o,
            secondsRemaining: QrLockerHelper_1.QrLockerHelper.calculateSlaSecondsRemaining(o.approvalDeadline),
        }));
        this.notify();
    }
    addPendingOrder(order) {
        this.pendingOrders.unshift({
            ...order,
            secondsRemaining: QrLockerHelper_1.QrLockerHelper.calculateSlaSecondsRemaining(order.approvalDeadline),
        });
        this.notify();
    }
    tickCountdown() {
        let changed = false;
        this.pendingOrders.forEach((o) => {
            if (o.approvalStatus === 'PENDING_WAITER_APPROVAL') {
                const remaining = QrLockerHelper_1.QrLockerHelper.calculateSlaSecondsRemaining(o.approvalDeadline);
                if (remaining !== o.secondsRemaining) {
                    o.secondsRemaining = remaining;
                    changed = true;
                }
                if (remaining === 0) {
                    o.approvalStatus = 'AUTO_APPROVED_TIMEOUT';
                    changed = true;
                }
            }
        });
        if (changed) {
            this.notify();
        }
    }
    resolveOrder(orderId, status) {
        const target = this.pendingOrders.find((o) => o.orderId === orderId);
        if (target) {
            target.approvalStatus = status;
            this.notify();
        }
    }
}
exports.QrLockerStore = QrLockerStore;
