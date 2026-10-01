export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY';
export interface SeatItemDTO {
    seatNumber: number;
    seatLabel: string;
    status: SeatStatus;
    currentSessionId?: string;
    guestName?: string;
    guestPhone?: string;
    occupiedAt?: string;
}
export interface CommunityTableDTO {
    tableId: string;
    tableNumber: string;
    section: string;
    capacity: number;
    currentStatus: string;
    isCommunityTable: boolean;
    allowCoDining: boolean;
    occupiedSeatsCount: number;
    availableSeatsCount: number;
    hasOpenSeats: boolean;
    seats: SeatItemDTO[];
}
export interface SeatAllocationPayload {
    tableId: string;
    seatNumbers: number[];
    guestName?: string;
    guestPhone?: string;
    guestCount?: number;
}
