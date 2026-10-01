import { KotVoidReason, WasteDisposition, KotVoidAuditDTO } from '@spicehub/shared-types';
export { KotVoidReason, WasteDisposition };
export type { KotVoidAuditDTO };
export interface VoidItemRequestPayload {
    orderId: string;
    itemId: string;
    managerPin: string;
    managerUserId?: string;
    voidReason: KotVoidReason;
    wasteDisposition: WasteDisposition;
    notes?: string;
}
export interface VoidSummaryStats {
    totalVoidEvents: number;
    totalVoidValue: number;
    totalScrappedWasteCost: number;
    reasonBreakdown: Record<string, number>;
    dispositionBreakdown: Record<string, number>;
    topVoidedItems: {
        itemName: string;
        count: number;
        totalAmount: number;
    }[];
}
export interface ManagerVoidSecurityPolicy {
    requireManagerPin: boolean;
    minPinLength: number;
    allowWaiterSelfVoid: boolean;
    trackScrapCost: boolean;
    alertKitchenOnVoid: boolean;
}
