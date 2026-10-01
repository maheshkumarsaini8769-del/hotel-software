"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiterStore = void 0;
const shared_types_1 = require("@spicehub/shared-types");
const types_1 = require("./types");
const index_1 = require("../index");
class WaiterStore {
    static instance = null;
    static getInstance(profile, initialRequests = []) {
        if (!WaiterStore.instance) {
            const defaultProfile = {
                userId: 'waiter-default',
                name: 'Waiter',
                hotelId: 'tenant-default',
                shiftStatus: shared_types_1.ShiftStatus.ON_DUTY,
                activeRequestsCount: 0,
                ...profile,
            };
            WaiterStore.instance = new WaiterStore(defaultProfile, initialRequests);
        }
        else if (profile) {
            WaiterStore.instance.setProfile(profile);
        }
        return WaiterStore.instance;
    }
    requests = new Map();
    profile;
    draftKot = null;
    listeners = new Set();
    chimeCallback;
    constructor(profile, initialRequests = []) {
        this.profile = { ...profile };
        for (const r of initialRequests) {
            this.requests.set(r.id, { ...r });
        }
        this.profile.activeRequestsCount = this.getActiveRequests().length;
    }
    registerChimeHandler(handler) {
        this.chimeCallback = handler;
    }
    getProfile() {
        return { ...this.profile };
    }
    setProfile(profileUpdate) {
        this.profile = { ...this.profile, ...profileUpdate };
        this.notify();
    }
    setRequests(reqs) {
        this.requests.clear();
        for (const r of reqs) {
            this.requests.set(r.id, { ...r });
        }
        this.profile.activeRequestsCount = this.getActiveRequests().length;
        this.notify();
    }
    addRequest(req) {
        this.handleNewRequest(req);
    }
    setShiftStatus(status) {
        this.profile.shiftStatus = status;
        this.notify();
    }
    getRequests() {
        return Array.from(this.requests.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getActiveRequests() {
        return this.getRequests().filter((r) => r.status !== types_1.WaiterRequestLifecycle.COMPLETED &&
            r.status !== types_1.WaiterRequestLifecycle.CANCELLED);
    }
    getPendingRequests() {
        return this.getRequests().filter((r) => r.status === types_1.WaiterRequestLifecycle.PENDING ||
            r.status === types_1.WaiterRequestLifecycle.ASSIGNED);
    }
    /**
     * Handle incoming Socket.IO event 'request:new'
     */
    handleNewRequest(payload) {
        this.requests.set(payload.id, { ...payload });
        this.profile.activeRequestsCount = this.getActiveRequests().length;
        // Trigger audio chime cue if waiter is ON_DUTY
        if (this.profile.shiftStatus === shared_types_1.ShiftStatus.ON_DUTY && this.chimeCallback) {
            this.chimeCallback(index_1.WaiterAlertChimePattern);
        }
        this.notify();
    }
    /**
     * Handle incoming Socket.IO event 'request:status_updated'
     */
    handleStatusUpdated(payload) {
        const existing = this.requests.get(payload.requestId);
        if (!existing)
            return;
        existing.status = payload.status;
        if (payload.assignedUserId) {
            existing.assignedUserId = payload.assignedUserId;
        }
        this.profile.activeRequestsCount = this.getActiveRequests().length;
        this.notify();
    }
    /**
     * 1-Tap Acknowledge Action (Local State Prediction)
     */
    markAccepted(requestId) {
        const req = this.requests.get(requestId);
        if (req) {
            req.status = types_1.WaiterRequestLifecycle.ACCEPTED;
            req.assignedUserId = this.profile.userId;
            this.profile.activeRequestsCount = this.getActiveRequests().length;
            this.notify();
        }
    }
    /**
     * 1-Tap Fulfill Action (Local State Prediction)
     */
    markCompleted(requestId) {
        const req = this.requests.get(requestId);
        if (req) {
            req.status = types_1.WaiterRequestLifecycle.COMPLETED;
            this.profile.activeRequestsCount = this.getActiveRequests().length;
            this.notify();
        }
    }
    // --- Quick KOT Punching Logic ---
    initDraftKot(tableId, sessionId, tableNumber) {
        this.draftKot = {
            tableId,
            tableNumber,
            sessionId,
            items: [],
        };
        this.notify();
    }
    getDraftKot() {
        return this.draftKot;
    }
    addItemToKot(item) {
        if (!this.draftKot)
            return;
        const existing = this.draftKot.items.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
            existing.quantity += item.quantity;
            if (item.specialInstructions) {
                existing.specialInstructions = item.specialInstructions;
            }
        }
        else {
            this.draftKot.items.push({ ...item });
        }
        this.notify();
    }
    updateKotItemQuantity(menuItemId, delta) {
        if (!this.draftKot)
            return;
        const item = this.draftKot.items.find((i) => i.menuItemId === menuItemId);
        if (!item)
            return;
        item.quantity += delta;
        if (item.quantity <= 0) {
            this.draftKot.items = this.draftKot.items.filter((i) => i.menuItemId !== menuItemId);
        }
        this.notify();
    }
    clearDraftKot() {
        this.draftKot = null;
        this.notify();
    }
    calculateDraftKotSubtotal() {
        if (!this.draftKot)
            return 0;
        return this.draftKot.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    }
    // --- Subscription ---
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
exports.WaiterStore = WaiterStore;
