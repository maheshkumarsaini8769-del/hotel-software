"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminControlStore = void 0;
class AdminControlStore {
    telemetry = null;
    preferences = null;
    alerts = [];
    listeners = [];
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        this.listeners.forEach((l) => l());
    }
    setTelemetry(data) {
        this.telemetry = data;
        this.notify();
    }
    getTelemetry() {
        return this.telemetry;
    }
    setPreferences(pref) {
        this.preferences = pref;
        this.notify();
    }
    getPreferences() {
        return this.preferences;
    }
    updateSubscriptionToggle(category, updates) {
        if (!this.preferences)
            return;
        this.preferences.subscriptions = this.preferences.subscriptions.map((sub) => {
            if (sub.category === category) {
                return { ...sub, ...updates };
            }
            return sub;
        });
        this.notify();
    }
    setAlerts(alerts) {
        this.alerts = alerts;
        this.notify();
    }
    getAlerts() {
        return [...this.alerts];
    }
    addAlert(alert) {
        this.alerts = [alert, ...this.alerts];
        this.notify();
    }
    markAlertAcknowledged(alertId, acknowledgedByName) {
        this.alerts = this.alerts.map((a) => {
            if (a._id === alertId) {
                return {
                    ...a,
                    status: 'ACKNOWLEDGED',
                    acknowledgedByName,
                    acknowledgedAt: new Date().toISOString(),
                };
            }
            return a;
        });
        this.notify();
    }
    getActiveAlertsCount() {
        return this.alerts.filter((a) => a.status === 'ACTIVE').length;
    }
    getCriticalAlerts() {
        return this.alerts.filter((a) => a.status === 'ACTIVE' && (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY'));
    }
}
exports.AdminControlStore = AdminControlStore;
