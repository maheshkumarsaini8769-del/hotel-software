import { FoodType } from '@spicehub/shared-types';
export interface CartItem {
    menuItemId: string;
    name: string;
    foodType: FoodType;
    unitPrice: number;
    quantity: number;
    variantName?: string;
    specialInstructions?: string;
    itemTotal: number;
}
export interface MenuCategoryTab {
    id: string;
    name: string;
    icon?: string;
}
export interface MenuFilterState {
    categoryId: string | 'ALL';
    foodType: FoodType | 'ALL';
    searchQuery: string;
    inStockOnly: boolean;
}
export interface CartPricingSummary {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    itemCount: number;
}
