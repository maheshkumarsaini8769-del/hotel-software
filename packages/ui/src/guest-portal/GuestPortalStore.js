"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestPortalStore = void 0;
class GuestPortalStore {
    static instance = null;
    static getInstance(initialSession = null) {
        if (!GuestPortalStore.instance) {
            GuestPortalStore.instance = new GuestPortalStore(initialSession);
        }
        return GuestPortalStore.instance;
    }
    session = null;
    liveOrders = [];
    recentRequests = [];
    folioSummary = null;
    activeTab = 'HOME';
    selectedLiveOrder = null;
    isLoading = false;
    listeners = new Set();
    constructor(initialSession = null) {
        this.session = initialSession;
    }
    setStayDetails(details) {
        this.session = {
            ...(this.session || {}),
            ...details,
            hotelId: details.hotelId || 'tenant-1',
            roomNumber: details.roomNumber,
            guestName: details.guestName,
            checkInDate: details.checkInDate,
            checkOutDate: details.checkOutDate,
            wifiPassword: details.wifiPassword,
            status: 'ACTIVE',
            totalFolioAmount: details.totalFolioAmount || 0,
            activeOrdersCount: details.activeOrdersCount || 0,
        };
        this.notify();
    }
    getSession() {
        return this.session ? { ...this.session } : null;
    }
    setSession(session) {
        this.session = session ? { ...session } : null;
        this.notify();
    }
    getLiveOrders() {
        return [...this.liveOrders];
    }
    setLiveOrders(orders) {
        this.liveOrders = [...orders];
        this.notify();
    }
    getActiveOrdersCount() {
        return this.liveOrders.filter((o) => o.orderStatus !== 'SERVED' && o.orderStatus !== 'CANCELLED').length;
    }
    getRecentRequests() {
        return [...this.recentRequests];
    }
    addConciergeRequest(req) {
        this.recentRequests.unshift(req);
        this.notify();
    }
    getFolioSummary() {
        return this.folioSummary ? { ...this.folioSummary } : null;
    }
    setFolioSummary(summary) {
        this.folioSummary = summary ? { ...summary } : null;
        this.notify();
    }
    getActiveTab() {
        return this.activeTab;
    }
    setActiveTab(tab) {
        this.activeTab = tab;
        this.notify();
    }
    getSelectedLiveOrder() {
        return this.selectedLiveOrder;
    }
    openOrderTracker(order) {
        this.selectedLiveOrder = { ...order };
        this.notify();
    }
    closeOrderTracker() {
        this.selectedLiveOrder = null;
        this.notify();
    }
    setIsLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    getIsLoading() {
        return this.isLoading;
    }
    /**
     * Handle real-time Socket event 'order:status_updated'
     */
    handleOrderStatusUpdated(payload) {
        const order = this.liveOrders.find((o) => o.id === payload.orderId);
        if (order) {
            order.orderStatus = payload.orderStatus;
            if (payload.readyAt)
                order.readyAt = payload.readyAt;
            if (this.selectedLiveOrder && this.selectedLiveOrder.id === payload.orderId) {
                this.selectedLiveOrder.orderStatus = payload.orderStatus;
                if (payload.readyAt)
                    this.selectedLiveOrder.readyAt = payload.readyAt;
            }
            this.notify();
        }
    }
    /**
     * Handle real-time Socket event 'request:status_updated'
     */
    handleRequestStatusUpdated(payload) {
        const req = this.recentRequests.find((r) => r.id === payload.requestId);
        if (req) {
            req.status = payload.status;
            this.notify();
        }
    }
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
exports.GuestPortalStore = GuestPortalStore;
