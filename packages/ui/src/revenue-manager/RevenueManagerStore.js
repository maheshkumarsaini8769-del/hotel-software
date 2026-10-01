"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueManagerStore = void 0;
class RevenueManagerStore {
    strategies = [];
    currentQuote = null;
    isCalculating = false;
    listeners = [];
    constructor(initialStrategies = []) {
        this.strategies = initialStrategies;
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
    setStrategies(strategies) {
        this.strategies = strategies;
        this.notify();
    }
    getStrategies() {
        return this.strategies;
    }
    setCurrentQuote(quote) {
        this.currentQuote = quote;
        this.notify();
    }
    getCurrentQuote() {
        return this.currentQuote;
    }
    setIsCalculating(calculating) {
        this.isCalculating = calculating;
        this.notify();
    }
    getIsCalculating() {
        return this.isCalculating;
    }
    updateStrategy(strategy) {
        this.strategies = [strategy, ...this.strategies.filter((s) => s._id !== strategy._id)];
        this.notify();
    }
}
exports.RevenueManagerStore = RevenueManagerStore;
