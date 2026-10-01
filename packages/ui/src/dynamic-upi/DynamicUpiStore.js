"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicUpiStore = void 0;
const types_1 = require("./types");
class DynamicUpiStore {
    static instance;
    state = {
        activeQr: null,
        timeRemaining: 0,
        isPolling: false,
        soundboxNotificationReceived: false,
        lastAnnouncement: null,
    };
    listeners = new Set();
    timerInterval = null;
    constructor() { }
    static getInstance() {
        if (!DynamicUpiStore.instance) {
            DynamicUpiStore.instance = new DynamicUpiStore();
        }
        return DynamicUpiStore.instance;
    }
    getState() {
        return { ...this.state };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    setDynamicQr(qr) {
        this.clearInterval();
        const expiry = new Date(qr.expiresAt).getTime();
        const now = Date.now();
        const seconds = Math.max(0, Math.floor((expiry - now) / 1000));
        this.state = {
            ...this.state,
            activeQr: qr,
            timeRemaining: seconds,
            isPolling: qr.status === types_1.UpiQrStatus.PENDING,
            soundboxNotificationReceived: qr.soundboxNotified || qr.status === types_1.UpiQrStatus.PAID,
            lastAnnouncement: qr.soundboxAnnouncement || null,
        };
        this.notify();
        if (qr.status === types_1.UpiQrStatus.PENDING && seconds > 0) {
            this.startCountdown();
        }
    }
    updateStatus(status, soundboxAnnouncement) {
        if (!this.state.activeQr)
            return;
        const isPaid = status === types_1.UpiQrStatus.PAID;
        this.state = {
            ...this.state,
            activeQr: {
                ...this.state.activeQr,
                status,
                soundboxNotified: isPaid ? true : this.state.activeQr.soundboxNotified,
                soundboxAnnouncement: soundboxAnnouncement || this.state.activeQr.soundboxAnnouncement,
            },
            isPolling: status === types_1.UpiQrStatus.PENDING,
            soundboxNotificationReceived: isPaid,
            lastAnnouncement: soundboxAnnouncement || this.state.lastAnnouncement,
        };
        if (status !== types_1.UpiQrStatus.PENDING) {
            this.clearInterval();
        }
        this.notify();
    }
    clearQr() {
        this.clearInterval();
        this.state = {
            activeQr: null,
            timeRemaining: 0,
            isPolling: false,
            soundboxNotificationReceived: false,
            lastAnnouncement: null,
        };
        this.notify();
    }
    startCountdown() {
        this.timerInterval = setInterval(() => {
            if (this.state.timeRemaining <= 1) {
                this.clearInterval();
                this.updateStatus(types_1.UpiQrStatus.EXPIRED);
            }
            else {
                this.state = {
                    ...this.state,
                    timeRemaining: this.state.timeRemaining - 1,
                };
                this.notify();
            }
        }, 1000);
    }
    clearInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}
exports.DynamicUpiStore = DynamicUpiStore;
