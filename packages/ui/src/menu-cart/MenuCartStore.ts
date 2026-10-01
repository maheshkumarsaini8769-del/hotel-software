import { FoodType, MenuItemDTO } from '@spicehub/shared-types';
import { CartItem, MenuFilterState, CartPricingSummary } from './types';

export type MenuCartStoreListener = () => void;

export class MenuCartStore {
  private static instance: MenuCartStore | null = null;

  public static getInstance(initialItems: MenuItemDTO[] = []): MenuCartStore {
    if (!MenuCartStore.instance) {
      MenuCartStore.instance = new MenuCartStore(initialItems);
    }
    return MenuCartStore.instance;
  }

  private menuItems: Map<string, MenuItemDTO> = new Map();
  private cart: Map<string, CartItem> = new Map();
  private filters: MenuFilterState = {
    categoryId: 'ALL',
    foodType: 'ALL',
    searchQuery: '',
    inStockOnly: false,
  };
  private listeners: Set<MenuCartStoreListener> = new Set();
  private outOfStockWarnings: Set<string> = new Set();

  constructor(initialItems: MenuItemDTO[] = []) {
    this.setMenuItems(initialItems);
  }

  public setMenuItems(items: MenuItemDTO[]): void {
    this.menuItems.clear();
    for (const item of items) {
      this.menuItems.set(item.id, { ...item });
    }
    this.notify();
  }

  public getMenuItems(): MenuItemDTO[] {
    return Array.from(this.menuItems.values());
  }

  public getFilteredMenuItems(): MenuItemDTO[] {
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

  public setFilters(filters: Partial<MenuFilterState>): void {
    this.filters = { ...this.filters, ...filters };
    this.notify();
  }

  public getFilters(): MenuFilterState {
    return { ...this.filters };
  }

  /**
   * Handle real-time Item 86 Out of Stock toggle from Socket.IO
   */
  public handleItem86Toggled(payload: { menuItemId: string; name?: string; isAvailable: boolean; outOfStockReason?: string }): void {
    const item = this.menuItems.get(payload.menuItemId);
    if (item) {
      item.isAvailable = payload.isAvailable;
      item.outOfStockReason = payload.outOfStockReason;
    }

    // If item was in cart and becomes out of stock, flag warning
    if (!payload.isAvailable && this.cart.has(payload.menuItemId)) {
      this.outOfStockWarnings.add(payload.menuItemId);
    } else if (payload.isAvailable) {
      this.outOfStockWarnings.delete(payload.menuItemId);
    }

    this.notify();
  }

  public getOutOfStockWarnings(): string[] {
    return Array.from(this.outOfStockWarnings);
  }

  public clearWarning(menuItemId: string): void {
    this.outOfStockWarnings.delete(menuItemId);
    this.notify();
  }

  // --- Cart Operations ---

  public addToCart(item: MenuItemDTO, quantity = 1, variantName?: string, specialInstructions?: string): boolean {
    // Defense: Cannot add out-of-stock item
    if (!item.isAvailable) {
      return false;
    }

    const key = variantName ? `${item.id}_${variantName}` : item.id;
    const existing = this.cart.get(key);

    let unitPrice = item.basePrice;
    if (variantName && (item as any).variants) {
      const v = (item as any).variants.find((variant: any) => variant.name === variantName);
      if (v) unitPrice = v.price;
    }

    if (existing) {
      existing.quantity += quantity;
      existing.itemTotal = existing.quantity * existing.unitPrice;
      if (specialInstructions) {
        existing.specialInstructions = specialInstructions;
      }
    } else {
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

  public updateCartQuantity(key: string, delta: number): void {
    const existing = this.cart.get(key);
    if (!existing) return;

    existing.quantity += delta;
    if (existing.quantity <= 0) {
      this.cart.delete(key);
      this.outOfStockWarnings.delete(existing.menuItemId);
    } else {
      existing.itemTotal = existing.quantity * existing.unitPrice;
    }
    this.notify();
  }

  public removeFromCart(key: string): void {
    const existing = this.cart.get(key);
    if (existing) {
      this.outOfStockWarnings.delete(existing.menuItemId);
      this.cart.delete(key);
      this.notify();
    }
  }

  public clearCart(): void {
    this.cart.clear();
    this.outOfStockWarnings.clear();
    this.notify();
  }

  public getCartItems(): CartItem[] {
    return Array.from(this.cart.values());
  }

  public getPricingSummary(taxRate = 0.05): CartPricingSummary {
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
  public generateIdempotencyKey(prefix = 'idemp_cart'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // --- Subscriptions ---

  public subscribe(listener: MenuCartStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
