export type OrderApprovalStatus = 'PENDING_WAITER_APPROVAL' | 'APPROVED_BY_WAITER' | 'AUTO_APPROVED_TIMEOUT' | 'REJECTED_BY_WAITER';
export interface QrSessionDTO {
    qrSessionToken: string;
    tableNumber: string;
    expiresAt: string;
    isLocked: boolean;
}
export interface PendingQrOrderDTO {
    orderId: string;
    orderNumber: string;
    tableNumber: string;
    customerName: string;
    itemsCount: number;
    subTotal: number;
    placedAt: string;
    approvalDeadline: string;
    approvalStatus: OrderApprovalStatus;
    secondsRemaining: number;
}
