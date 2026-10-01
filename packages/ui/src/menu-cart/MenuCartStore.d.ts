import { MenuItemDTO } from '@spicehub/shared-types';
import { CartItem, MenuFilterState, CartPricingSummary } from './types';
export type MenuCartStoreListener = () => void;
export declare class MenuCartStore {
    private static instance;
    static getInstance(initialItems?: MenuItemDTO[]): MenuCartStore;
    private menuItems;
    private cart;
    private filters;
    private listeners;
    private outOfStockWarnings;
    constructor(initialItems?: MenuItemDTO[]);
    setMenuItems(items: MenuItemDTO[]): void;
    getMenuItems(): MenuItemDTO[];
    getFilteredMenuItems(): MenuItemDTO[];
    setFilters(filters: Partial<MenuFilterState>): void;
    getFilters(): MenuFilterState;
    /**
     * Handle real-time Item 86 Out of Stock toggle from Socket.IO
     */
    handleItem86Toggled(payload: {
        menuItemId: string;
        name?: string;
        isAvailable: boolean;
        outOfStockReason?: string;
    }): void;
    getOutOfStockWarnings(): string[];
    clearWarning(menuItemId: string): void;
    addToCart(item: MenuItemDTO, quantity?: number, variantName?: string, specialInstructions?: string): boolean;
    updateCartQuantity(key: string, delta: number): void;
    removeFromCart(key: string): void;
    clearCart(): void;
    getCartItems(): CartItem[];
    getPricingSummary(taxRate?: number): CartPricingSummary;
    /**
     * Generate RFC-compliant Idempotency Key for client request header
     */
    generateIdempotencyKey(prefix?: string): string;
    subscribe(listener: MenuCartStoreListener): () => void;
    private notify;
}
