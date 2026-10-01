"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerPortalStore = void 0;
const CustomerPortalHelper_1 = require("./CustomerPortalHelper");
class CustomerPortalStore {
    session = null;
    cartItems = [];
    serviceRequests = [];
    activeOrders = [];
    isLoading = false;
    errorMessage = null;
    listeners = [];
    constructor(initialSession) {
        if (initialSession) {
            this.setSession(initialSession);
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
    getSession() {
        return this.session;
    }
    getServiceMode() {
        return this.session?.serviceMode;
    }
    getCartItems() {
        return this.cartItems;
    }
    getCartTotals() {
        return CustomerPortalHelper_1.CustomerPortalHelper.calculateCartTotals(this.cartItems, 5);
    }
    getServiceRequests() {
        return this.serviceRequests;
    }
    getActiveOrders() {
        return this.activeOrders;
    }
    getIsLoading() {
        return this.isLoading;
    }
    getErrorMessage() {
        return this.errorMessage;
    }
    // Setters & Actions
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    setError(error) {
        this.errorMessage = error;
        this.notify();
    }
    setSession(session) {
        this.session = session;
        this.cartItems = session.cartItems || [];
        this.serviceRequests = session.serviceRequests || [];
        this.activeOrders = session.activeOrders || [];
        this.errorMessage = null;
        this.notify();
    }
    setServiceMode(mode) {
        if (this.session) {
            this.session.serviceMode = mode;
            this.notify();
        }
    }
    addToCart(item) {
        const existing = this.cartItems.find((c) => c.menuItemId === item.menuItemId);
        if (existing) {
            existing.quantity += item.quantity;
            existing.subtotal = existing.quantity * existing.unitPrice;
        }
        else {
            this.cartItems.push({
                ...item,
                subtotal: item.quantity * item.unitPrice,
            });
        }
        this.notify();
    }
    updateCartQuantity(menuItemId, delta) {
        const itemIndex = this.cartItems.findIndex((c) => c.menuItemId === menuItemId);
        if (itemIndex > -1) {
            const item = this.cartItems[itemIndex];
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.cartItems.splice(itemIndex, 1);
            }
            else {
                item.subtotal = item.quantity * item.unitPrice;
            }
            this.notify();
        }
    }
    clearCart() {
        this.cartItems = [];
        this.notify();
    }
    addServiceRequest(request) {
        this.serviceRequests.unshift(request);
        this.notify();
    }
    updateServiceRequestStatus(requestId, status) {
        const srv = this.serviceRequests.find((s) => s.requestId === requestId);
        if (srv) {
            srv.status = status;
            if (status === 'RESOLVED') {
                srv.resolvedAt = new Date().toISOString();
            }
            this.notify();
        }
    }
    addActiveOrder(order) {
        this.activeOrders.unshift(order);
        this.clearCart();
        if (this.session) {
            this.session.status = 'ORDER_PLACED';
        }
        this.notify();
    }
}
exports.CustomerPortalStore = CustomerPortalStore;
