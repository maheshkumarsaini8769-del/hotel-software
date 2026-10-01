"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorPlanStore = void 0;
const shared_types_1 = require("@spicehub/shared-types");
const FloorLayoutHelper_1 = require("./FloorLayoutHelper");
class FloorPlanStore {
    tables = new Map();
    filters = { section: 'ALL', status: 'ALL' };
    listeners = new Set();
    constructor(initialTables = []) {
        this.setTables(initialTables);
    }
    /**
     * Bulk set or replace table list
     */
    setTables(tables) {
        this.tables.clear();
        for (const t of tables) {
            this.tables.set(t.id, { ...t });
        }
        this.notify();
    }
    /**
     * Get single table by ID
     */
    getTable(tableId) {
        return this.tables.get(tableId);
    }
    /**
     * Get all raw tables
     */
    getAllTables() {
        return Array.from(this.tables.values());
    }
    /**
     * Get filtered tables based on current filter state
     */
    getFilteredTables() {
        return FloorLayoutHelper_1.FloorLayoutHelper.filterTables(this.getAllTables(), this.filters);
    }
    /**
     * Set filter options and re-notify listeners
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notify();
    }
    getFilters() {
        return { ...this.filters };
    }
    /**
     * Handle real-time Socket.IO event 'table:status_changed'
     */
    handleTableStatusChanged(payload) {
        const table = this.tables.get(payload.tableId);
        if (!table)
            return;
        table.currentStatus = payload.status;
        if (payload.sessionId !== undefined) {
            table.activeSessionId = payload.sessionId;
        }
        if (payload.status === shared_types_1.TableStatus.OCCUPIED && !table.sessionStartTime) {
            table.sessionStartTime = new Date().toISOString();
        }
        else if (payload.status === shared_types_1.TableStatus.AVAILABLE) {
            table.activeSessionId = undefined;
            table.sessionStartTime = undefined;
            table.activeOrderTotal = 0;
            table.activeItemsCount = 0;
        }
        this.notify();
    }
    /**
     * Handle real-time Socket.IO event 'order:created' to update table active order total
     */
    handleOrderCreated(payload) {
        if (!payload.tableId)
            return;
        const table = this.tables.get(payload.tableId);
        if (!table)
            return;
        table.activeOrderTotal = (table.activeOrderTotal || 0) + payload.totalAmount;
        if (payload.itemCount) {
            table.activeItemsCount = (table.activeItemsCount || 0) + payload.itemCount;
        }
        this.notify();
    }
    /**
     * Subscribe to floor plan state changes
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        const list = this.getFilteredTables();
        for (const listener of this.listeners) {
            listener(list);
        }
    }
    /**
     * Quick action: Seat a table directly
     */
    seatTable(tableId, sessionId, guestCount) {
        const table = this.tables.get(tableId);
        if (!table)
            return;
        table.currentStatus = shared_types_1.TableStatus.OCCUPIED;
        table.activeSessionId = sessionId;
        table.guestCount = guestCount;
        table.sessionStartTime = new Date().toISOString();
        table.activeOrderTotal = 0;
        table.activeItemsCount = 0;
        this.notify();
    }
    /**
     * Quick action: Request Bill for table
     */
    markBilling(tableId) {
        const table = this.tables.get(tableId);
        if (!table)
            return;
        table.currentStatus = shared_types_1.TableStatus.BILLING;
        this.notify();
    }
    /**
     * Quick action: Reset table to Dirty for busser / cleaning
     */
    markDirty(tableId) {
        const table = this.tables.get(tableId);
        if (!table)
            return;
        table.currentStatus = shared_types_1.TableStatus.DIRTY;
        table.activeSessionId = undefined;
        table.sessionStartTime = undefined;
        table.activeOrderTotal = 0;
        table.activeItemsCount = 0;
        this.notify();
    }
    /**
     * Quick action: Mark cleaned and available
     */
    markAvailable(tableId) {
        const table = this.tables.get(tableId);
        if (!table)
            return;
        table.currentStatus = shared_types_1.TableStatus.AVAILABLE;
        table.activeSessionId = undefined;
        table.sessionStartTime = undefined;
        table.activeOrderTotal = 0;
        table.activeItemsCount = 0;
        this.notify();
    }
}
exports.FloorPlanStore = FloorPlanStore;
