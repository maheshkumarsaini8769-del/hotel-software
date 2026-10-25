// ==========================================
// SPICEHUB UNIFIED SHARED TYPES CONTRACT
// ==========================================

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  HOTEL_ADMIN = 'HOTEL_ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER',
  CHEF = 'CHEF',
  HOUSEKEEPING = 'HOUSEKEEPING',
  MAINTENANCE = 'MAINTENANCE',
  GUEST = 'GUEST'
}

export enum ShiftStatus {
  ON_DUTY = 'ON_DUTY',
  BUSY = 'BUSY',
  TEA_BREAK = 'TEA_BREAK',
  ON_BREAK = 'ON_BREAK',
  DO_NOT_ASSIGN = 'DO_NOT_ASSIGN',
  LOCATION_RECHECKING = 'LOCATION_RECHECKING',
  OUT_OF_AREA = 'OUT_OF_AREA',
  OFFLINE = 'OFFLINE'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  PARTIALLY_OCCUPIED = 'PARTIALLY_OCCUPIED',
  OCCUPIED = 'OCCUPIED',
  BILLING = 'BILLING',
  PAYMENT_SETTLED = 'PAYMENT_SETTLED',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  RESERVED = 'RESERVED',
  MERGED = 'MERGED',
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  INSPECTION = 'INSPECTION',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum OrderStatus {
  SUBMITTED = 'SUBMITTED',
  IN_PREPARATION = 'IN_PREPARATION',
  READY_TO_SERVE = 'READY_TO_SERVE',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  EGG = 'EGG',
  BEVERAGE = 'BEVERAGE'
}

export enum DietaryType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  JAIN = 'JAIN',
  VEGAN = 'VEGAN',
  NO_ONION_GARLIC = 'NO_ONION_GARLIC',
  EGG = 'EGG',
  HALAL = 'HALAL',
}

export enum AllergenType {
  NUTS = 'NUTS',
  PEANUT = 'PEANUT',
  TREE_NUTS = 'TREE_NUTS',
  DAIRY = 'DAIRY',
  GLUTEN = 'GLUTEN',
  EGGS = 'EGGS',
  SHELLFISH = 'SHELLFISH',
  SOY = 'SOY',
  JAIN_NO_ROOT = 'JAIN_NO_ROOT',
}

export enum RequestType {
  WATER = 'WATER',
  CUTLERY = 'CUTLERY',
  BILL = 'BILL',
  CALL_WAITER = 'CALL_WAITER',
  CLEANING = 'CLEANING',
  ROOM_CLEANING = 'ROOM_CLEANING',
  TOWEL_REPLENISH = 'TOWEL_REPLENISH',
  LUGGAGE_ASSIST = 'LUGGAGE_ASSIST'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ROOM_FOLIO = 'ROOM_FOLIO',
  SPLIT = 'SPLIT'
}

export enum VIPTier {
  REGULAR = 'REGULAR',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  VIP = 'VIP'
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  hotelId?: string;
  permissions: string[];
  shiftStatus?: ShiftStatus;
}

export interface DiningTableDTO {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  currentStatus: TableStatus;
  activeSessionId?: string;
  assignedWaiterId?: string;
  isMerged?: boolean;
  mergedIntoTableId?: string;
  mergedTableIds?: string[];
  mergedTableNumbers?: string[];
  combinedCapacity?: number;
}

export interface TableMergeEventPayload {
  primaryTableId: string;
  primaryTableNumber: string;
  mergedTableIds: string[];
  mergedTableNumbers: string[];
  combinedCapacity: number;
  unifiedSessionId: string;
  mergedAt: string;
  mergedBy?: string;
  timestamp: number;
}

export interface TableSplitEventPayload {
  primaryTableId: string;
  unmergedTableIds: string[];
  splitAt: string;
  splitBy?: string;
  timestamp: number;
}

export enum Item86Reason {
  INGREDIENT_EXHAUSTED = 'INGREDIENT_EXHAUSTED',
  CHEF_SPECIAL_SOLD_OUT = 'CHEF_SPECIAL_SOLD_OUT',
  SEASONAL_UNAVAILABLE = 'SEASONAL_UNAVAILABLE',
  EQUIPMENT_BREAKDOWN = 'EQUIPMENT_BREAKDOWN',
  QUALITY_HOLD = 'QUALITY_HOLD',
  OTHER = 'OTHER',
}

export interface Item86EventPayload {
  menuItemId: string;
  itemCode?: string;
  name: string;
  isAvailable: boolean;
  outOfStockReason?: string;
  markedAt?: string;
  markedBy?: string;
  timestamp: number;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  code?: string;
  categoryId: string;
  foodType: FoodType;
  basePrice: number;
  isAvailable: boolean;
  preparationTimeMinutes?: number;
  allergens?: string[];
  description?: string;
  outOfStockReason?: string;
  markedOutOfStockAt?: string;
  markedOutOfStockBy?: string;
  restockedAt?: string;
  restockedBy?: string;
}

export interface OrderItemDTO {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  notes?: string;
  kitchenStationId?: string;
}

export interface RestaurantOrderDTO {
  id: string;
  orderNumber: string;
  tableId?: string;
  tableNumber?: string;
  stayId?: string;
  roomNumber?: string;
  isRoomService: boolean;
  items: OrderItemDTO[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  placedAt: string;
}

export interface RoomDTO {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName?: string;
  floorNumber: number;
  wing?: string;
  status: RoomStatus;
  keyCardNumber?: string;
  permanentQrCodeHash: string;
}

export interface ServiceRequestDTO {
  id: string;
  requestType: RequestType;
  tableId?: string;
  tableNumber?: string;
  roomId?: string;
  roomNumber?: string;
  status: RequestStatus;
  assignedStaffId?: string;
  createdAt: string;
}

export interface GuestProfileDTO {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vipTier: VIPTier;
  allergies: string[];
  dietaryPreferences: string[];
  totalLifetimeSpend: number;
  loyaltyPointsBalance: number;
  tags: string[];
}

// Live Socket.IO Channel & Event Map
export interface SocketEventMap {
  'request:new': ServiceRequestDTO;
  'request:acknowledged': { requestId: string; acknowledgedByStaffId: string };
  'order:created': RestaurantOrderDTO;
  'order:status_changed': { orderId: string; newStatus: OrderStatus };
  'table:status_changed': { tableId: string; status: TableStatus; sessionId?: string };
  'room:status_changed': { roomId: string; roomNumber?: string; status: RoomStatus };
  'tenant:status_changed': { tenantId: string; newStatus: string; reason?: string };
  'tenant:portals_updated': { tenantId: string; enabledPortals: string[]; monthlyPriceINR: number; featureFlags: any };
  'tenant:flags_updated': { tenantId: string; featureFlags: any };
  'kot:item_voided': KotVoidAuditDTO;
  'pms:room_checked_out': {
    stayId: string;
    roomId: string;
    roomNumber: string;
    folioId: string;
    bookingId: string;
    checkedOutAt: string | Date;
    settledAmount: number;
    dueAmount: number;
  };
  'keycard:voided': {
    keyCardNumber: string;
    roomId: string;
    roomNumber: string;
    stayId?: string;
    voidedAt: string | Date;
  };
  'housekeeping:task_created': {
    taskId: string;
    roomNumber: string;
    taskType: string;
    priority: string;
    roomId?: string;
  };
}

// ==========================================
// KOT LOCK & MANAGER VOID TYPES
// ==========================================

export enum KotVoidReason {
  CUSTOMER_CANCELLED = 'CUSTOMER_CANCELLED',
  WRONG_ITEM_PUNCHED = 'WRONG_ITEM_PUNCHED',
  QUALITY_REJECTED = 'QUALITY_REJECTED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DELAYED_PREPARATION = 'DELAYED_PREPARATION',
  ACCIDENTAL_DOUBLE_PUNCH = 'ACCIDENTAL_DOUBLE_PUNCH',
}

export enum WasteDisposition {
  WASTED_SCRAPPED = 'WASTED_SCRAPPED',
  REUSABLE_RETURNED_TO_STORE = 'REUSABLE_RETURNED_TO_STORE',
  CANCELLED_BEFORE_COOKING = 'CANCELLED_BEFORE_COOKING',
}

export interface KotVoidAuditDTO {
  id: string;
  hotelId: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  itemId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalVoidAmount: number;
  voidReason: KotVoidReason;
  wasteDisposition: WasteDisposition;
  authorizedByManagerUserId: string;
  managerName: string;
  waiterUserId?: string;
  waiterName?: string;
  kitchenNotified: boolean;
  notes?: string;
  createdAt: string;
}

// ==========================================
// PMS CHECKOUT & KEYCARD VOID TYPES
// ==========================================

export enum KeycardVoidReason {
  CHECKOUT = 'CHECKOUT',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  MANUAL_REVOCATION = 'MANUAL_REVOCATION',
}

export interface KeycardVoidAuditDTO {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  stayId?: string;
  keyCardNumber: string;
  voidReason: KeycardVoidReason;
  voidedByUserId?: string;
  voidedAt: string;
  hardwareRevoked: boolean;
  notes?: string;
}

export interface CheckoutPaymentPayload {
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CITY_LEDGER' | 'COMPLIMENTARY';
  amount: number;
  transactionRef?: string;
  cashReceived?: number;
  cashChangeReturned?: number;
  notes?: string;
}

export interface CheckoutRequestPayload {
  stayId?: string;
  roomId?: string;
  payments?: CheckoutPaymentPayload[];
  targetRoomStatus?: RoomStatus;
  keyCardVoided?: boolean;
  housekeepingPriority?: 'NORMAL' | 'HIGH' | 'URGENT';
  notes?: string;
}

export interface FolioSummaryDTO {
  folioId: string;
  folioNumber: string;
  totalRoomTariff: number;
  totalFoodAndBeverage: number;
  totalLaundry: number;
  totalPaidServices: number;
  totalDamageCharges: number;
  totalDiscounts: number;
  totalTaxes: number;
  grossAmount: number;
  advancePaid: number;
  paidAmount: number;
  netAmountPayable: number;
  dueAmount: number;
  folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
  settledAt?: string;
  lockedAt?: string;
  lockedByUserId?: string;
  lockReason?: string;
}

export interface FolioLockRequestPayload {
  stayId?: string;
  roomId?: string;
  folioId?: string;
  reason?: string;
}

export interface FolioLockResponseDTO {
  success: boolean;
  message: string;
  data: {
    folioId: string;
    folioNumber: string;
    folioStatus: 'LOCKED';
    lockedAt: string;
    lockedByUserId?: string;
    lockReason?: string;
  };
}

export interface FolioUnlockRequestPayload {
  stayId?: string;
  roomId?: string;
  folioId?: string;
  reason?: string;
}

export interface FolioUnlockResponseDTO {
  success: boolean;
  message: string;
  data: {
    folioId: string;
    folioNumber: string;
    folioStatus: 'OPEN';
  };
}

export interface ChargeSweepRequestPayload {
  stayId?: string;
  roomId?: string;
  folioId?: string;
  finalizeCookingOrders?: boolean;
}

export interface SweptOrderSummary {
  orderId: string;
  orderNumber: string;
  orderType: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  itemCount: number;
}

export interface ChargeSweepResponseDTO {
  success: boolean;
  message: string;
  data: {
    sweptOrdersCount: number;
    totalSweptSubtotal: number;
    totalSweptTax: number;
    totalSweptAmount: number;
    sweptOrders: SweptOrderSummary[];
    folio: FolioSummaryDTO;
  };
}

// ==========================================
// MODULAR PORTAL SUBSCRIPTION & PRICING
// ==========================================

export type PortalKey =
  | 'admin'
  | 'cashier'
  | 'reception'
  | 'kds'
  | 'waiter'
  | 'customer'
  | 'guest';

export interface PortalCatalogItem {
  id: PortalKey;
  name: string;
  role: string;
  port: number;
  category: 'GUEST' | 'OPERATIONS' | 'BILLING' | 'MANAGEMENT';
  categoryLabel: string;
  defaultMonthlyPriceINR: number;
  emoji: string;
  badge: string;
  colorScheme: 'orange' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'purple' | 'cyan';
  description: string;
  requiredBase?: boolean;
  featureFlagKey?: string;
}

export const DEFAULT_PORTAL_CATALOG: PortalCatalogItem[] = [
  {
    id: 'admin',
    name: 'Hotel Admin ERP Command Center',
    role: 'General Manager / Operations Head',
    port: 3005,
    category: 'MANAGEMENT',
    categoryLabel: 'Command Center',
    defaultMonthlyPriceINR: 1999,
    emoji: '📊',
    badge: 'Hotel ERP',
    colorScheme: 'cyan',
    description: 'Central operational control, rooms & tables setup, inventory, tax settings, staff management & business analytics.',
    requiredBase: true,
  },
  {
    id: 'reception',
    name: 'Reception & Front Desk PMS',
    role: 'Front Office Agents & Concierge',
    port: 3008,
    category: 'BILLING',
    categoryLabel: 'Front Desk PMS',
    defaultMonthlyPriceINR: 1499,
    emoji: '🏨',
    badge: 'PMS & Arrivals',
    colorScheme: 'indigo',
    description: 'PMS reservation matrix, guest check-in/out, room keys, corporate folios, night audit & lost & found custody.',
    featureFlagKey: 'pmsEnabled',
  },
  {
    id: 'cashier',
    name: 'Express Cashier POS',
    role: 'Cashiers & Billing Staff',
    port: 3007,
    category: 'BILLING',
    categoryLabel: 'Settlement & POS',
    defaultMonthlyPriceINR: 1199,
    emoji: '💳',
    badge: 'Billing & POS',
    colorScheme: 'emerald',
    description: 'High-speed billing terminal, cash drawer float custody, split bills, KOT void approvals & blind shift close.',
    featureFlagKey: 'posEnabled',
  },
  {
    id: 'kds',
    name: 'Kitchen Display System (KDS)',
    role: 'Chefs & Line Cooks',
    port: 3003,
    category: 'OPERATIONS',
    categoryLabel: 'Kitchen Display',
    defaultMonthlyPriceINR: 899,
    emoji: '👨‍🍳',
    badge: 'Kitchen Production',
    colorScheme: 'rose',
    description: 'Live order station queues, course firing timers, item 86 out-of-stock toggles & ready status chimes.',
    featureFlagKey: 'kdsEnabled',
  },
  {
    id: 'waiter',
    name: 'Waiter Mobile Handheld',
    role: 'Floor Captains & Servers',
    port: 3002,
    category: 'OPERATIONS',
    categoryLabel: 'Floor Operations',
    defaultMonthlyPriceINR: 999,
    emoji: '📱',
    badge: 'Floor Ordering',
    colorScheme: 'amber',
    description: 'Mobile touch terminal for table orders, instant KOT firing, live dish ready alerts & bill requests.',
    featureFlagKey: 'waiterEnabled',
  },
  {
    id: 'customer',
    name: 'Customer Table QR Menu',
    role: 'Dine-In Restaurant Guests',
    port: 3001,
    category: 'GUEST',
    categoryLabel: 'Guest Services',
    defaultMonthlyPriceINR: 699,
    emoji: '🍽️',
    badge: 'Table Self-Order',
    colorScheme: 'orange',
    description: 'Interactive digital menu, table cart, waiter assistance buzzers & live kitchen status tracker.',
    featureFlagKey: 'qrDineInEnabled',
  },
  {
    id: 'guest',
    name: 'In-Room Guest Portal (IRD)',
    role: 'Hotel Room Guests',
    port: 3004,
    category: 'GUEST',
    categoryLabel: 'Guest Services',
    defaultMonthlyPriceINR: 699,
    emoji: '🛎️',
    badge: 'Room Services',
    colorScheme: 'purple',
    description: 'In-room dining service, housekeeping requests, spa/laundry, room folio balance & express checkout.',
    featureFlagKey: 'roomServiceEnabled',
  },
];

export const ALL_PORTAL_KEYS: PortalKey[] = [
  'admin',
  'reception',
  'cashier',
  'kds',
  'waiter',
  'customer',
  'guest',
];

export interface ModularSubscriptionSummary {
  enabledPortals: PortalKey[];
  baseMonthlyTotalINR: number;
  customAdjustmentINR: number;
  finalMonthlyTotalINR: number;
  annualTotalINR: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
}

export function calculateModularSubscription(
  enabledPortals: PortalKey[],
  customAdjustment = 0,
  billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY'
): ModularSubscriptionSummary {
  const baseMonthlyTotalINR = enabledPortals.reduce((sum, portalKey) => {
    const item = DEFAULT_PORTAL_CATALOG.find((p) => p.id === portalKey);
    return sum + (item ? item.defaultMonthlyPriceINR : 0);
  }, 0);

  const finalMonthlyTotalINR = Math.max(0, baseMonthlyTotalINR + customAdjustment);
  // Annual subscription offers 2 months free (10x monthly price)
  const annualTotalINR = finalMonthlyTotalINR * 10;

  return {
    enabledPortals,
    baseMonthlyTotalINR,
    customAdjustmentINR: customAdjustment,
    finalMonthlyTotalINR,
    annualTotalINR,
    billingCycle,
  };
}


