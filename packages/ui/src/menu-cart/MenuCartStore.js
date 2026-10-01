"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuCartStore = void 0;
class MenuCartStore {
    static instance = null;
    static getInstance(initialItems = []) {
        if (!MenuCartStore.instance) {
            MenuCartStore.instance = new MenuCartStore(initialItems);
        }
        return MenuCartStore.instance;
    }
    menuItems = new Map();
    cart = new Map();
    filters = {
        categoryId: 'ALL',
        foodType: 'ALL',
        searchQuery: '',
        inStockOnly: false,
    };
    listeners = new Set();
    outOfStockWarnings = new Set();
    constructor(initialItems = []) {
        this.setMenuItems(initialItems);
    }
    setMenuItems(items) {
        this.menuItems.clear();
        for (const item of items) {
            this.menuItems.set(item.id, { ...item });
        }
        this.notify();
    }
    getMenuItems() {
        return Array.from(this.menuItems.values());
    }
    getFilteredMenuItems() {
        return this.getMenuItems().filter((item) => {
            // Category Filter
            if (this.filters.categoryId !== 'ALL' && item.categoryId !== this.filters.categoryId) {
                return false;
            }
            // FoodType Filter
            if (this.filters.foodType !== 'ALL' && item.foodType !== this.filters.foodType) {
                return false;
            }
            // InStockOnly Filter
            if (this.filters.inStockOnly && !item.isAvailable) {
                return false;
            }
            // Search Query Filter
            if (this.filters.searchQuery.trim().length > 0) {
                const q = this.filters.searchQuery.trim().toLowerCase();
                if (!item.name.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notify();
    }
    getFilters() {
        return { ...this.filters };
    }
    /**
     * Handle real-time Item 86 Out of Stock toggle from Socket.IO
     */
    handleItem86Toggled(payload) {
        const item = this.menuItems.get(payload.menuItemId);
        if (item) {
            item.isAvailable = payload.isAvailable;
            item.outOfStockReason = payload.outOfStockReason;
        }
        // If item was in cart and becomes out of stock, flag warning
        if (!payload.isAvailable && this.cart.has(payload.menuItemId)) {
            this.outOfStockWarnings.add(payload.menuItemId);
        }
        else if (payload.isAvailable) {
            this.outOfStockWarnings.delete(payload.menuItemId);
        }
        this.notify();
    }
    getOutOfStockWarnings() {
        return Array.from(this.outOfStockWarnings);
    }
    clearWarning(menuItemId) {
        this.outOfStockWarnings.delete(menuItemId);
        this.notify();
    }
    // --- Cart Operations ---
    addToCart(item, quantity = 1, variantName, specialInstructions) {
        // Defense: Cannot add out-of-stock item
        if (!item.isAvailable) {
            return false;
        }
        const key = variantName ? `${item.id}_${variantName}` : item.id;
        const existing = this.cart.get(key);
        let unitPrice = item.basePrice;
        if (variantName && item.variants) {
            const v = item.variants.find((variant) => variant.name === variantName);
            if (v)
                unitPrice = v.price;
        }
        if (existing) {
            existing.quantity += quantity;
            existing.itemTotal = existing.quantity * existing.unitPrice;
            if (specialInstructions) {
                existing.specialInstructions = specialInstructions;
            }
        }
        else {
            this.cart.set(key, {
                menuItemId: item.id,
                name: item.name,
                foodType: item.foodType,
                unitPrice,
                quantity,
                variantName,
                specialInstructions,
                itemTotal: quantity * unitPrice,
            });
        }
        this.notify();
        return true;
    }
    updateCartQuantity(key, delta) {
        const existing = this.cart.get(key);
        if (!existing)
            return;
        existing.quantity += delta;
        if (existing.quantity <= 0) {
            this.cart.delete(key);
            this.outOfStockWarnings.delete(existing.menuItemId);
        }
        else {
            existing.itemTotal = existing.quantity * existing.unitPrice;
        }
        this.notify();
    }
    removeFromCart(key) {
        const existing = this.cart.get(key);
        if (existing) {
            this.outOfStockWarnings.delete(existing.menuItemId);
            this.cart.delete(key);
            this.notify();
        }
    }
    clearCart() {
        this.cart.clear();
        this.outOfStockWarnings.clear();
        this.notify();
    }
    getCartItems() {
        return Array.from(this.cart.values());
    }
    getPricingSummary(taxRate = 0.05) {
        const items = this.getCartItems();
        const subtotal = items.reduce((acc, i) => acc + i.itemTotal, 0);
        const taxAmount = Math.round(subtotal * taxRate);
        const totalAmount = subtotal + taxAmount;
        const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
        return {
            subtotal,
            taxRate,
            taxAmount,
            totalAmount,
            itemCount,
        };
    }
    /**
     * Generate RFC-compliant Idempotency Key for client request header
     */
    generateIdempotencyKey(prefix = 'idemp_cart') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    // --- Subscriptions ---
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
exports.MenuCartStore = MenuCartStore;
