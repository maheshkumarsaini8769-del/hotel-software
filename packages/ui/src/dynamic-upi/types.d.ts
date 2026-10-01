export declare enum UpiQrStatus {
    PENDING = "PENDING",
    SCANNED = "SCANNED",
    PAID = "PAID",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
export interface DynamicUpiQrDto {
    _id?: string;
    hotelId?: string;
    billId: string;
    orderId?: string;
    tableNumber: string;
    tableId?: string;
    waiterUserId?: string;
    waiterName?: string;
    amount: number;
    currency: string;
    merchantVpa: string;
    merchantName: string;
    transactionRef: string;
    upiUri: string;
    status: UpiQrStatus;
    expiresAt: string | Date;
    paidAt?: string | Date;
    paymentGatewayRef?: string;
    payerVpa?: string;
    soundboxAnnouncement?: string;
    soundboxNotified: boolean;
    timeRemainingSeconds?: number;
}
export interface SoundboxWebhookPayload {
    transactionRef: string;
    paymentGatewayRef?: string;
    payerVpa?: string;
    amount?: number;
    status: 'SUCCESS' | 'FAILURE';
    timestamp?: string;
}
