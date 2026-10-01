export type PickupTicketStatus = 'READY_FOR_PICKUP' | 'WAITER_EN_ROUTE' | 'PICKED_UP' | 'DELIVERED' | 'SLA_BREACHED' | 'CANCELLED';
export interface FoodPickupSlaConfigDTO {
    _id?: string;
    hotelId: string;
    defaultPickupSlaMinutes: number;
    maxSnoozeSeconds: number;
    maxAllowedSnoozes: number;
    escalateToCaptainOnBreach: boolean;
    buzzerAudioEnabled: boolean;
}
export interface FoodPickupTicketDTO {
    _id: string;
    hotelId: string;
    orderId: string;
    orderNumber: string;
    tableId: string;
    tableNumber: string;
    floorLevel: string;
    assignedWaiterId?: string;
    assignedWaiterName?: string;
    itemsSummary: string;
    readyAt: string | Date;
    slaMinutes: number;
    slaDeadline: string | Date;
    snoozeCount: number;
    snoozedAt?: string | Date;
    snoozeExtendedDeadline?: string | Date;
    status: PickupTicketStatus;
    pickedUpAt?: string | Date;
    pickupLatencySeconds?: number;
    isBreached: boolean;
    escalatedToCaptain: boolean;
}
