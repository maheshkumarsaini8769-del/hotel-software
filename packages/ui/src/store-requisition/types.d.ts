export type RequisitionDepartmentUI = 'MAIN_KITCHEN' | 'BAKERY' | 'BANQUET_KITCHEN' | 'BAR_BEVERAGES' | 'HOUSEKEEPING' | 'FRONT_OFFICE' | 'MAINTENANCE';
export type RequisitionUrgencyUI = 'NORMAL' | 'HIGH' | 'CRITICAL_SERVICE_BLOCKER';
export type RequisitionStatusUI = 'PENDING' | 'APPROVED_PARTIALLY' | 'APPROVED_ISSUED' | 'REJECTED';
export interface IRequisitionItemUI {
    itemName: string;
    requestedQuantity: number;
    issuedQuantity: number;
    unit: string;
    unitCost: number;
    status: 'PENDING' | 'ISSUED' | 'OUT_OF_STOCK';
}
export interface IStoreRequisitionUI {
    _id: string;
    hotelId: string;
    requisitionNumber: string;
    requestingDepartment: RequisitionDepartmentUI;
    kitchenStationId?: any;
    requestedByUserId: any;
    urgency: RequisitionUrgencyUI;
    status: RequisitionStatusUI;
    items: IRequisitionItemUI[];
    notes?: string;
    rejectionReason?: string;
    issuedByUserId?: any;
    issuedAt?: string;
    createdAt: string;
    updatedAt?: string;
}
export interface IRequisitionMetricsUI {
    totalPendingCount: number;
    criticalCount: number;
    fulfilledTodayCount: number;
    totalCount: number;
}
export interface ITransferItemUI {
    itemName: string;
    quantity: number;
    unit: string;
    unitCost: number;
}
export interface IStockTransferUI {
    _id: string;
    hotelId: string;
    transferNumber: string;
    sourceLocation: string;
    destinationLocation: string;
    items: ITransferItemUI[];
    transferredByUserId: any;
    receivedByUserId?: any;
    status: 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
    notes?: string;
    dispatchedAt: string;
    receivedAt?: string;
}
export type BatchFreshnessUI = 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED';
export interface IStockBatchUI {
    _id: string;
    hotelId: string;
    batchNumber: string;
    itemName: string;
    category: string;
    currentQuantity: number;
    unit: string;
    unitCost: number;
    location: string;
    mfgDate: string;
    expiryDate: string;
    status: BatchFreshnessUI;
    daysUntilExpiry: number;
}
export interface IFefoMetricsUI {
    totalBatchesCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    totalAtRiskValue: number;
}
export interface INewRequisitionPayload {
    requestingDepartment: RequisitionDepartmentUI;
    kitchenStationId?: string;
    urgency: RequisitionUrgencyUI;
    items: Array<{
        itemName: string;
        requestedQuantity: number;
        unit: string;
        unitCost?: number;
    }>;
    notes?: string;
}
export interface IIssueRequisitionPayload {
    issuedItems: Array<{
        itemName: string;
        issuedQuantity: number;
        status?: 'ISSUED' | 'OUT_OF_STOCK';
    }>;
}
export interface INewTransferPayload {
    sourceLocation: string;
    destinationLocation: string;
    items: Array<{
        itemName: string;
        quantity: number;
        unit: string;
        unitCost?: number;
    }>;
    notes?: string;
}
