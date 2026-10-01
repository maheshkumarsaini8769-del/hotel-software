"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTenderStore = void 0;
class MultiTenderStore {
    static activeShift = null;
    static settlements = [];
    static shiftListeners = [];
    static settlementListeners = [];
    static setActiveShift(shift) {
        this.activeShift = shift;
        this.shiftListeners.forEach((fn) => fn(shift));
    }
    static getActiveShift() {
        return this.activeShift;
    }
    static addSettlement(settlement) {
        this.settlements.unshift(settlement);
        this.settlementListeners.forEach((fn) => fn(this.settlements));
    }
    static getSettlements() {
        return this.settlements;
    }
    static subscribeShift(listener) {
        this.shiftListeners.push(listener);
        return () => {
            this.shiftListeners = this.shiftListeners.filter((fn) => fn !== listener);
        };
    }
    static subscribeSettlements(listener) {
        this.settlementListeners.push(listener);
        return () => {
            this.settlementListeners = this.settlementListeners.filter((fn) => fn !== listener);
        };
    }
}
exports.MultiTenderStore = MultiTenderStore;
