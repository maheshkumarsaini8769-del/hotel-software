"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastCashierStore = void 0;
const FastCashierHelper_1 = require("./FastCashierHelper");
class FastCashierStore {
    state = {
        cart: [],
        numpadBuffer: '',
        activeQuantity: 1,
        tenderAmount: 0,
        paymentMethod: 'CASH',
        customerName: '',
        customerPhone: '',
        cookingInstructions: '',
        callingQueue: {
            totalActiveTakeaways: 0,
            preparingQueue: [],
            readyQueue: [],
            completedQueue: [],
        },
        lastCompletedOrder: null,
        lastTokenNumber: null,
        activeModal: null,
        loading: false,
        error: null,
    };
    listeners = [];
    getState() {
        return { ...this.state, cart: [...this.state.cart] };
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    addItem(item, quantity = 1, variantName) {
        const existingIndex = this.state.cart.findIndex((c) => c.menuItemId === item._id && c.variantName === variantName);
        let price = item.basePrice;
        if (variantName && item.hasVariants && item.variants) {
            const v = item.variants.find((vr) => vr.name === variantName);
            if (v)
                price = v.price;
        }
        if (existingIndex > -1) {
            const current = this.state.cart[existingIndex];
            const newQty = current.quantity + quantity;
            this.state.cart[existingIndex] = {
                ...current,
                quantity: newQty,
                subtotal: newQty * current.unitPrice,
            };
        }
        else {
            this.state.cart.push({
                menuItemId: item._id,
                name: item.name,
                variantName,
                unitPrice: price,
                quantity,
                subtotal: price * quantity,
            });
        }
        // Auto-update tender if zero or matches previous total
        const financials = FastCashierHelper_1.FastCashierHelper.calculateFinancials(this.state.cart);
        this.state.tenderAmount = financials.grandTotal;
        this.state.numpadBuffer = '';
        this.state.activeQuantity = 1;
        this.notify();
    }
    updateQuantity(menuItemId, quantity) {
        if (quantity <= 0) {
            this.removeItem(menuItemId);
            return;
        }
        const idx = this.state.cart.findIndex((c) => c.menuItemId === menuItemId);
        if (idx > -1) {
            this.state.cart[idx].quantity = quantity;
            this.state.cart[idx].subtotal = this.state.cart[idx].unitPrice * quantity;
            const financials = FastCashierHelper_1.FastCashierHelper.calculateFinancials(this.state.cart);
            this.state.tenderAmount = financials.grandTotal;
            this.notify();
        }
    }
    removeItem(menuItemId) {
        this.state.cart = this.state.cart.filter((c) => c.menuItemId !== menuItemId);
        const financials = FastCashierHelper_1.FastCashierHelper.calculateFinancials(this.state.cart);
        this.state.tenderAmount = financials.grandTotal;
        this.notify();
    }
    clearCart() {
        this.state.cart = [];
        this.state.tenderAmount = 0;
        this.state.numpadBuffer = '';
        this.state.activeQuantity = 1;
        this.state.customerName = '';
        this.state.customerPhone = '';
        this.state.cookingInstructions = '';
        this.notify();
    }
    appendNumpad(char) {
        this.state.numpadBuffer += char;
        this.notify();
    }
    clearNumpad() {
        this.state.numpadBuffer = '';
        this.notify();
    }
    setNumpadBuffer(val) {
        this.state.numpadBuffer = val;
        this.notify();
    }
    setActiveQuantity(qty) {
        this.state.activeQuantity = Math.max(1, qty);
        this.notify();
    }
    setTenderAmount(amount) {
        this.state.tenderAmount = Math.max(0, amount);
        this.notify();
    }
    setPaymentMethod(method) {
        this.state.paymentMethod = method;
        this.notify();
    }
    setCustomerInfo(name, phone) {
        this.state.customerName = name;
        this.state.customerPhone = phone;
        this.notify();
    }
    setCookingInstructions(instructions) {
        this.state.cookingInstructions = instructions;
        this.notify();
    }
    setCallingQueue(queue) {
        this.state.callingQueue = queue;
        this.notify();
    }
    setLastCompletedOrder(order, tokenNumber) {
        this.state.lastCompletedOrder = order;
        this.state.lastTokenNumber = tokenNumber;
        this.notify();
    }
    setActiveModal(modal) {
        this.state.activeModal = modal;
        this.notify();
    }
    setLoading(loading) {
        this.state.loading = loading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
    resetForNextCustomer() {
        this.clearCart();
        this.state.lastCompletedOrder = null;
        this.state.activeModal = null;
        this.state.error = null;
        this.notify();
    }
}
exports.FastCashierStore = FastCashierStore;
