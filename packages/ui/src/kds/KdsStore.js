"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KdsStore = void 0;
const KdsHelper_1 = require("./KdsHelper");
const index_1 = require("../index");
class KdsStore {
    static instance = null;
    static getInstance(initialOrders = [], stations = []) {
        if (!KdsStore.instance) {
            KdsStore.instance = new KdsStore(initialOrders, stations);
        }
        return KdsStore.instance;
    }
    orders = new Map();
    stations = [];
    selectedStationId = 'ALL';
    selectedStatus = 'ALL';
    listeners = new Set();
    chimeHandler;
    constructor(initialOrders = [], stations = []) {
        this.stations = [...stations];
        for (const o of initialOrders) {
            const elapsedMinutes = KdsHelper_1.KdsHelper.calculateElapsedMinutes(o.placedAt);
            const urgencyLevel = KdsHelper_1.KdsHelper.getUrgencyLevel(elapsedMinutes);
            this.orders.set(o.id, {
                ...o,
                elapsedMinutes,
                urgencyLevel,
            });
        }
    }
    registerChimeHandler(handler) {
        this.chimeHandler = handler;
    }
    setStations(stations) {
        this.stations = [...stations];
        this.notify();
    }
    markReady(orderId) {
        this.markOrderReady(orderId);
    }
    getStations() {
        return [...this.stations];
    }
    setOrders(orders) {
        this.orders.clear();
        for (const o of orders) {
            const id = o.id || o.orderId;
            const elapsedMinutes = o.placedAt ? KdsHelper_1.KdsHelper.calculateElapsedMinutes(o.placedAt) : 0;
            const urgencyLevel = KdsHelper_1.KdsHelper.getUrgencyLevel(elapsedMinutes);
            this.orders.set(id, {
                ...o,
                id,
                elapsedMinutes,
                urgencyLevel,
            });
        }
        this.notify();
    }
    getOrders() {
        return Array.from(this.orders.values()).sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
    }
    getSelectedStationId() {
        return this.selectedStationId;
    }
    selectStation(stationId) {
        this.selectedStationId = stationId;
        this.notify();
    }
    getSelectedStatus() {
        return this.selectedStatus;
    }
    selectStatus(status) {
        this.selectedStatus = status;
        this.notify();
    }
    getFilteredOrders() {
        let result = this.getOrders();
        result = KdsHelper_1.KdsHelper.filterOrdersByStation(result, this.selectedStationId);
        result = KdsHelper_1.KdsHelper.filterOrdersByStatus(result, this.selectedStatus);
        return result;
    }
    getPendingCountForStation(stationId) {
        const stationOrders = KdsHelper_1.KdsHelper.filterOrdersByStation(this.getOrders(), stationId);
        return stationOrders.filter((o) => o.orderStatus === 'PLACED' || o.orderStatus === 'ACCEPTED' || o.orderStatus === 'PREPARING').length;
    }
    /**
     * Handle incoming Socket.IO event 'order:created'
     */
    handleNewOrder(order) {
        const elapsedMinutes = KdsHelper_1.KdsHelper.calculateElapsedMinutes(order.placedAt);
        const urgencyLevel = KdsHelper_1.KdsHelper.getUrgencyLevel(elapsedMinutes);
        this.orders.set(order.id, {
            ...order,
            elapsedMinutes,
            urgencyLevel,
        });
        if (this.chimeHandler) {
            this.chimeHandler(index_1.KitchenKdsChimePattern);
        }
        this.notify();
    }
    /**
     * Handle incoming Socket.IO event 'order:status_updated'
     */
    handleStatusUpdated(payload) {
        const existing = this.orders.get(payload.orderId);
        if (!existing)
            return;
        existing.orderStatus = payload.orderStatus;
        if (payload.readyAt) {
            existing.readyAt = payload.readyAt;
        }
        // If marked SERVED or CANCELLED, remove from active board or update status
        this.notify();
    }
    // --- Optimistic Local Action Methods ---
    markOrderPreparing(orderId) {
        const existing = this.orders.get(orderId);
        if (!existing)
            return;
        if (KdsHelper_1.KdsHelper.isOrderBlockedByAllergen(existing)) {
            throw new Error(`Safety Lock Active: Order ${existing.orderNumber} has unacknowledged allergen/dietary warnings!`);
        }
        existing.orderStatus = 'PREPARING';
        existing.items.forEach((item) => {
            if (item.itemStatus === 'PENDING')
                item.itemStatus = 'PREPARING';
        });
        this.notify();
    }
    markOrderReady(orderId) {
        const existing = this.orders.get(orderId);
        if (!existing)
            return;
        if (KdsHelper_1.KdsHelper.isOrderBlockedByAllergen(existing)) {
            throw new Error(`Safety Lock Active: Order ${existing.orderNumber} has unacknowledged allergen/dietary warnings!`);
        }
        existing.orderStatus = 'READY';
        existing.readyAt = new Date().toISOString();
        existing.items.forEach((item) => {
            item.itemStatus = 'READY';
        });
        this.notify();
    }
    markOrderServed(orderId) {
        const existing = this.orders.get(orderId);
        if (!existing)
            return;
        existing.orderStatus = 'SERVED';
        existing.servedAt = new Date().toISOString();
        existing.items.forEach((item) => {
            item.itemStatus = 'SERVED';
        });
        this.notify();
    }
    markItemStatus(orderId, itemId, status) {
        const order = this.orders.get(orderId);
        if (!order)
            return;
        const item = order.items.find((i) => i.itemId === itemId || i.menuItemId === itemId);
        if (item) {
            if ((status === 'PREPARING' || status === 'READY') && KdsHelper_1.KdsHelper.isItemBlockedByAllergen(item)) {
                throw new Error(`Safety Lock Active: Item '${item.name}' has unacknowledged allergen warnings!`);
            }
            item.itemStatus = status;
        }
        const allReady = order.items.every((i) => i.itemStatus === 'READY');
        if (allReady) {
            order.orderStatus = 'READY';
            order.readyAt = new Date().toISOString();
        }
        else {
            order.orderStatus = 'PREPARING';
        }
        this.notify();
    }
    /**
     * Shift 47: Acknowledge allergen for a specific item (local optimistic update)
     */
    acknowledgeItemAllergen(orderId, itemIndex, chefName) {
        const order = this.orders.get(orderId);
        if (!order || !order.items[itemIndex])
            return false;
        const item = order.items[itemIndex];
        item.chefAllergenAcknowledged = true;
        item.acknowledgedChefName = chefName;
        item.acknowledgedAt = new Date().toISOString();
        this.notify();
        return true;
    }
    /**
     * Shift 47: Acknowledge all pending allergens for an entire order
     */
    acknowledgeAllOrderAllergens(orderId, chefName) {
        const order = this.orders.get(orderId);
        if (!order)
            return 0;
        let count = 0;
        const now = new Date().toISOString();
        for (const item of order.items) {
            if (item.hasAllergenAlert && !item.chefAllergenAcknowledged) {
                item.chefAllergenAcknowledged = true;
                item.acknowledgedChefName = chefName;
                item.acknowledgedAt = now;
                count++;
            }
        }
        if (count > 0) {
            this.notify();
        }
        return count;
    }
    /**
     * Shift 47: Handle incoming real-time socket event 'kds:allergen_acknowledged'
     */
    handleAllergenAcknowledged(payload) {
        const order = this.orders.get(payload.orderId);
        if (!order)
            return;
        const dateStr = typeof payload.acknowledgedAt === 'string' ? payload.acknowledgedAt : payload.acknowledgedAt.toISOString();
        if (payload.itemIndex !== undefined && order.items[payload.itemIndex]) {
            const item = order.items[payload.itemIndex];
            item.chefAllergenAcknowledged = true;
            item.acknowledgedChefName = payload.acknowledgedBy;
            item.acknowledgedAt = dateStr;
        }
        else {
            // All items acknowledged
            for (const item of order.items) {
                if (item.hasAllergenAlert) {
                    item.chefAllergenAcknowledged = true;
                    item.acknowledgedChefName = payload.acknowledgedBy;
                    item.acknowledgedAt = dateStr;
                }
            }
        }
        this.notify();
    }
    /**
     * Periodic live timer updater (e.g. called every 30s or 60s)
     */
    tickTimers(now = new Date()) {
        for (const order of this.orders.values()) {
            order.elapsedMinutes = KdsHelper_1.KdsHelper.calculateElapsedMinutes(order.placedAt, now);
            order.urgencyLevel = KdsHelper_1.KdsHelper.getUrgencyLevel(order.elapsedMinutes);
        }
        this.notify();
    }
    // --- Pub/Sub ---
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
exports.KdsStore = KdsStore;
