export type UrgencyLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type KdsOverallOrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type KdsItemProductionStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface KitchenStationModel {
  id: string;
  stationName: string;
  isOnline: boolean;
  screenToken?: string;
  printerIp?: string;
  printerPort?: number;
}

export interface KdsOrderItemModel {
  itemId?: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  kitchenStationId: string;
  kitchenStationName?: string;
  variantName?: string;
  specialInstructions?: string;
  itemStatus: KdsItemProductionStatus;
  // Shift 47: Allergen & Dietary safety properties
  allergens?: string[];
  dietaryType?: string;
  allergenNotes?: string;
  hasAllergenAlert?: boolean;
  chefAllergenAcknowledged?: boolean;
  acknowledgedChefId?: string;
  acknowledgedChefName?: string;
  acknowledgedAt?: string;
}

export interface KdsAllergenBadgeConfig {
  label: string;
  badgeStyle: string;
  icon: string;
  severity: 'HIGH' | 'MEDIUM' | 'DIETARY';
  category: string;
}

export interface KdsOrderCardModel {
  id: string;
  orderNumber: string;
  orderType: string; // 'DINE_IN' | 'ROOM_SERVICE' | 'TAKEAWAY'
  tableId?: string;
  tableNumber?: string;
  section?: string;
  roomId?: string;
  roomNumber?: string;
  items: KdsOrderItemModel[];
  cookingInstructions?: string;
  orderStatus: KdsOverallOrderStatus;
  placedAt: string;
  preparedAt?: string;
  readyAt?: string;
  servedAt?: string;
  elapsedMinutes: number;
  urgencyLevel: UrgencyLevel;
}
