export interface IFastCashierItemVariant {
  name: string;
  price: number;
}

export interface IFastCashierItem {
  _id: string;
  hotelId?: string;
  name: string;
  itemCode?: string;
  barcode?: string;
  category?: string;
  basePrice: number;
  isAvailable: boolean;
  hasVariants?: boolean;
  variants?: IFastCashierItemVariant[];
  kitchenStationId?: any;
}

export interface IFastCashierCartItem {
  menuItemId: string;
  name: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  specialInstructions?: string;
}

export interface ITakeawayOrderUI {
  _id: string;
  orderNumber: string;
  tokenNumber: number;
  orderType?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    menuItemId: string;
    name: string;
    variantName?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    itemStatus?: string;
  }>;
  cookingInstructions?: string;
  orderStatus: string;
  placedAt: string;
  servedAt?: string;
}

export interface IFastCashierFinancials {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  tenderAmount: number;
  changeAmount: number;
}

export interface IFastCounterOrderPayload {
  items: Array<{
    menuItemId: string;
    quantity: number;
    variantName?: string;
    specialInstructions?: string;
  }>;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: 'CASH' | 'UPI' | 'CARD';
  tenderAmount?: number;
  cookingInstructions?: string;
}

export interface ITakeawayCallingQueueUI {
  totalActiveTakeaways: number;
  preparingQueue: ITakeawayOrderUI[];
  readyQueue: ITakeawayOrderUI[];
  completedQueue: ITakeawayOrderUI[];
}
