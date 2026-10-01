export interface GuestSessionModel {
    sessionToken: string;
    roomNumber: string;
    guestName: string;
    stayId: string;
    masterFolioId?: string;
    checkInDate?: string;
    expectedCheckOutDate?: string;
    lastKnownRoute?: string;
}
export interface ConciergeServiceItem {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    requestType: string;
    isPopular?: boolean;
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
    totalTaxes: number;
    advancePaid: number;
    paidAmount: number;
    netAmountPayable: number;
    dueAmount: number;
    folioStatus: 'OPEN' | 'LOCKED' | 'SETTLED';
    lineItems: FolioLineItemModel[];
}
