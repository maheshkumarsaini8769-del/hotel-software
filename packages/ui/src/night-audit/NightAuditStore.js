"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NightAuditStore = void 0;
class NightAuditStore {
    auditHistory = [];
    currentPreAuditStatus = null;
    isAuditing = false;
    listeners = [];
    constructor(initialHistory = []) {
        this.auditHistory = initialHistory;
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
    setHistory(history) {
        this.auditHistory = history;
        this.notify();
    }
    getHistory() {
        return this.auditHistory;
    }
    setPreAuditStatus(status) {
        this.currentPreAuditStatus = status;
        this.notify();
    }
    getPreAuditStatus() {
        return this.currentPreAuditStatus;
    }
    setIsAuditing(auditing) {
        this.isAuditing = auditing;
        this.notify();
    }
    getIsAuditing() {
        return this.isAuditing;
    }
    addCompletedAudit(audit) {
        this.auditHistory = [audit, ...this.auditHistory.filter((a) => a._id !== audit._id)];
        if (this.currentPreAuditStatus) {
            this.currentPreAuditStatus = {
                ...this.currentPreAuditStatus,
                currentBusinessDate: audit.nextBusinessDate,
                lastCompletedAuditDate: audit.auditDate,
            };
        }
        this.isAuditing = false;
        this.notify();
    }
}
exports.NightAuditStore = NightAuditStore;
