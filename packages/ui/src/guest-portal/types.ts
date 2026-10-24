export interface GuestSessionModel {
  sessionToken?: string;
  hotelId?: string;
  roomNumber: string;
  roomType?: string;
  guestName: string;
  stayId?: string;
  masterFolioId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  expectedCheckOutDate?: string;
  wifiPassword?: string;
  wifiSsid?: string;
  status?: string;
  totalFolioAmount?: number;
  activeOrdersCount?: number;
  lastKnownRoute?: string;
}

export interface ConciergeServiceItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  requestType: string;
  isPopular?: boolean;
  isBillable?: boolean;
  price?: number;
}

export interface InRoomOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
}

export interface LiveRoomOrder {
  id: string;
  orderNumber: string;
  orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  placedAt: string;
  preparedAt?: string;
  readyAt?: string;
  servedAt?: string;
  items: InRoomOrderItem[];
  cookingInstructions?: string;
  grandTotal?: number;
}

export interface FolioLineItemModel {
  id: string;
  department: string;
  description: string;
  rate?: number;
  taxAmount?: number;
  netAmount: number;
  createdAt: string;
}

export interface FolioSummaryModel {
  folioNumber: string;
  totalRoomTariff: number;
  totalFoodAndBeverage: number;
  totalLaundry?: number;
  totalPaidServices?: number;
  totalTaxes: number;
  advancePaid: number;
  paidAmount: number;
  netAmountPayable: number;
  dueAmount: number;
  folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
  lineItems: FolioLineItemModel[];
}
