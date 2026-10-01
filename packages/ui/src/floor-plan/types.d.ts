import { TableStatus, DiningTableDTO } from '@spicehub/shared-types';
export type FloorSection = 'ALL' | 'MAIN_HALL' | 'AC_HALL' | 'GARDEN' | 'TERRACE' | 'VIP_LOUNGE' | 'ROOFTOP';
export interface VisualTablePosition {
    x: number;
    y: number;
    width?: number;
    height?: number;
    shape?: 'RECTANGLE' | 'ROUND' | 'SQUARE';
}
export interface LiveTableCardModel extends DiningTableDTO {
    position?: VisualTablePosition;
    activeOrderTotal?: number;
    activeItemsCount?: number;
    sessionStartTime?: string;
    sessionElapsedMinutes?: number;
    guestCount?: number;
}
export interface FloorPlanFilterOptions {
    section?: string;
    status?: TableStatus | 'ALL';
    minCapacity?: number;
    searchQuery?: string;
}
export interface TableActionPayload {
    tableId: string;
    action: 'START_SESSION' | 'SEAT_RESERVATION' | 'CHANGE_STATUS' | 'CALL_WAITER' | 'BILL_REQUEST';
    newStatus?: TableStatus;
    guestCount?: number;
    reservationId?: string;
}
