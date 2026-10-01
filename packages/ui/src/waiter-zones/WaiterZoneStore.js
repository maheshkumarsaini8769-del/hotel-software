"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiterZoneStore = void 0;
class WaiterZoneStore {
    static assignedTables = null;
    static alerts = [];
    static setAssignedTables(data) {
        this.assignedTables = data;
    }
    static getAssignedTables() {
        return this.assignedTables;
    }
    static setAlerts(alerts) {
        this.alerts = alerts;
    }
    static getAlerts() {
        return this.alerts;
    }
    static addAlert(alert) {
        const existingIndex = this.alerts.findIndex((a) => a._id === alert._id);
        if (existingIndex >= 0) {
            this.alerts[existingIndex] = alert;
        }
        else {
            this.alerts.unshift(alert);
        }
    }
    static updateAlertStatus(alertId, status) {
        const target = this.alerts.find((a) => a._id === alertId);
        if (target) {
            target.status = status;
        }
    }
    static clear() {
        this.assignedTables = null;
        this.alerts = [];
    }
}
exports.WaiterZoneStore = WaiterZoneStore;
