"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaiterCashFloatStore = void 0;
const types_1 = require("./types");
class WaiterCashFloatStore {
    static instance;
    state = {
        activeFloat: null,
        isLoading: false,
        lastReceipt: null,
    };
    listeners = new Set();
    constructor() { }
    static getInstance() {
        if (!WaiterCashFloatStore.instance) {
            WaiterCashFloatStore.instance = new WaiterCashFloatStore();
        }
        return WaiterCashFloatStore.instance;
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
    setActiveFloat(float) {
        this.state = {
            ...this.state,
            activeFloat: float,
        };
        this.notify();
    }
    recordCashTender(amountTendered, changeGiven) {
        if (!this.state.activeFloat)
            return;
        const net = amountTendered - changeGiven;
        this.state = {
            ...this.state,
            activeFloat: {
                ...this.state.activeFloat,
                totalCashCollected: this.state.activeFloat.totalCashCollected + amountTendered,
                totalChangeGiven: this.state.activeFloat.totalChangeGiven + changeGiven,
                expectedCashInHand: this.state.activeFloat.expectedCashInHand + net,
            },
        };
        this.notify();
    }
    setSettled(receipt) {
        this.state = {
            ...this.state,
            activeFloat: this.state.activeFloat
                ? {
                    ...this.state.activeFloat,
                    status: types_1.WaiterFloatStatus.SETTLED,
                    receiptNumber: receipt.receiptNumber,
                    actualCashHandedOver: receipt.actualCashReceived,
                    variance: receipt.variance,
                    settledAt: receipt.timestamp,
                }
                : null,
            lastReceipt: receipt,
        };
        this.notify();
    }
    clear() {
        this.state = {
            activeFloat: null,
            isLoading: false,
            lastReceipt: null,
        };
        this.notify();
    }
}
exports.WaiterCashFloatStore = WaiterCashFloatStore;
