"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatBillingStore = void 0;
const SeatBillingHelper_1 = require("./SeatBillingHelper");
class SeatBillingStore {
    subFolios = [];
    selectedSubFolio = null;
    isLoading = false;
    errorMessage = null;
    listeners = [];
    constructor(initialSubFolios) {
        if (initialSubFolios) {
            this.subFolios = initialSubFolios;
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
    getSubFolios() {
        return this.subFolios;
    }
    getActiveSubFolios() {
        return this.subFolios.filter((s) => s.status === 'OPEN' || s.status === 'BILL_REQUESTED');
    }
    getSettledSubFolios() {
        return this.subFolios.filter((s) => s.status === 'SETTLED');
    }
    getSelectedSubFolio() {
        return this.selectedSubFolio;
    }
    getTotalOutstandingAmount() {
        return this.getActiveSubFolios().reduce((acc, s) => acc + s.dueAmount, 0);
    }
    getIsLoading() {
        return this.isLoading;
    }
    getErrorMessage() {
        return this.errorMessage;
    }
    // Actions
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    setError(error) {
        this.errorMessage = error;
        this.notify();
    }
    setSubFolios(subFolios) {
        this.subFolios = subFolios;
        if (this.selectedSubFolio) {
            const refreshed = subFolios.find((s) => s._id === this.selectedSubFolio?._id);
            this.selectedSubFolio = refreshed || null;
        }
        this.errorMessage = null;
        this.notify();
    }
    selectSubFolio(subFolio) {
        this.selectedSubFolio = subFolio;
        this.notify();
    }
    addLineItemsToSubFolio(subFolioId, items) {
        const subFolio = this.subFolios.find((s) => s._id === subFolioId);
        if (subFolio) {
            subFolio.lineItems.push(...items);
            const subTotal = subFolio.lineItems.reduce((acc, it) => acc + it.subtotal, 0);
            const tax = SeatBillingHelper_1.SeatBillingHelper.calculateGst5Percent(subTotal, subFolio.discountAmount);
            subFolio.subTotal = subTotal;
            subFolio.cgstAmount = tax.cgstAmount;
            subFolio.sgstAmount = tax.sgstAmount;
            subFolio.totalTax = tax.totalTax;
            subFolio.grandTotal = tax.grandTotal;
            subFolio.dueAmount = Math.max(0, tax.grandTotal - subFolio.paidAmount);
            this.notify();
        }
    }
    settleSubFolioLocally(subFolioId, payload) {
        const subFolio = this.subFolios.find((s) => s._id === subFolioId);
        if (subFolio) {
            subFolio.status = 'SETTLED';
            subFolio.paymentMethod = payload.paymentMethod;
            subFolio.transactionRef = payload.transactionRef;
            subFolio.paidAmount = payload.paidAmount !== undefined ? payload.paidAmount : subFolio.grandTotal;
            subFolio.dueAmount = 0;
            subFolio.settledAt = new Date().toISOString();
            subFolio.settledByStaffName = payload.settledByStaffName || 'Cashier';
            this.notify();
        }
    }
}
exports.SeatBillingStore = SeatBillingStore;
