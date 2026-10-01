"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KotVoidStore = void 0;
class KotVoidStore {
    static instance = null;
    auditLogs = [];
    summaryStats = null;
    isProcessing = false;
    errorMessage = null;
    listeners = new Set();
    static getInstance() {
        if (!KotVoidStore.instance) {
            KotVoidStore.instance = new KotVoidStore();
        }
        return KotVoidStore.instance;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        this.listeners.forEach((l) => l());
    }
    // Getters
    getAuditLogs() {
        return [...this.auditLogs];
    }
    getSummaryStats() {
        return this.summaryStats;
    }
    getIsProcessing() {
        return this.isProcessing;
    }
    getErrorMessage() {
        return this.errorMessage;
    }
    // Setters & Actions
    setAuditLogs(logs) {
        this.auditLogs = [...logs];
        this.notify();
    }
    addAuditLog(log) {
        this.auditLogs = [log, ...this.auditLogs];
        this.notify();
    }
    setSummaryStats(stats) {
        this.summaryStats = stats;
        this.notify();
    }
    setProcessing(processing) {
        this.isProcessing = processing;
        this.notify();
    }
    setError(error) {
        this.errorMessage = error;
        this.notify();
    }
    clear() {
        this.auditLogs = [];
        this.summaryStats = null;
        this.isProcessing = false;
        this.errorMessage = null;
        this.notify();
    }
}
exports.KotVoidStore = KotVoidStore;
