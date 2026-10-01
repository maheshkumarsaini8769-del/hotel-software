export type SubFolioStatus = 'OPEN' | 'BILL_REQUESTED' | 'SETTLED' | 'MERGED' | 'VOID';
export interface SubFolioLineItemDTO {
    menuItemId: string;
    orderId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    seatNumber?: number;
    specialInstructions?: string;
}
export interface SeatSubFolioDTO {
    _id: string;
    hotelId: string;
    tableId: string;
    tableNumber: string;
    tableSessionId: string;
    subFolioNumber: string;
    seatNumbers: number[];
    customerName: string;
    customerPhone?: string;
    orderIds: string[];
    lineItems: SubFolioLineItemDTO[];
    subTotal: number;
    cgstAmount: number;
    sgstAmount: number;
    totalTax: number;
    discountAmount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'POST_TO_ROOM';
    transactionRef?: string;
    status: SubFolioStatus;
    mergedIntoSubFolioId?: string;
    settledAt?: string;
    settledByStaffName?: string;
    createdAt: string;
    updatedAt: string;
}
export interface SettleSubFolioPayload {
    paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'POST_TO_ROOM';
    transactionRef?: string;
    paidAmount?: number;
    settledByStaffName?: string;
}
