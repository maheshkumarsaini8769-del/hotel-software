export type ReservationTabMode = 'DINING' | 'ROOMS';
export type TableReservationStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
export type TableDepositStatus = 'NONE' | 'PAID' | 'REFUNDED' | 'FORFEITED';
export interface AssignedDiningTable {
    _id: string;
    tableNumber: string;
    section: string;
    capacity: number;
}
export interface TableReservationDTO {
    _id: string;
    reservationNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize: number;
    reservationDate: string;
    timeSlot: string;
    durationMinutes: number;
    assignedTableIds: AssignedDiningTable[];
    specialRequests?: string;
    depositAmount: number;
    depositStatus: TableDepositStatus;
    status: TableReservationStatus;
    seatedAt?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    createdAt: string;
}
export interface TableReservationSummary {
    totalReservations: number;
    totalCovers: number;
    confirmed: number;
    seated: number;
    cancelled: number;
    noShow: number;
}
export interface RoomArrivalBookingDTO {
    _id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    checkInDate: string;
    checkOutDate: string;
    grandTotal: number;
    advancePaymentAmount: number;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    bookingStatus: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
    roomTypeId?: {
        _id: string;
        name: string;
        code: string;
        basePriceOvernight: number;
    };
    allocatedRoomId?: {
        _id: string;
        roomNumber: string;
        floorNumber: number;
        status: string;
    };
}
export interface RoomArrivalsSummary {
    totalArrivals: number;
    pendingArrivals: number;
    totalDepartures: number;
    inHouseCount: number;
    unassignedCount: number;
}
export interface CleanRoomOption {
    _id: string;
    roomNumber: string;
    floorNumber: number;
    roomTypeId?: {
        _id: string;
        name: string;
        code: string;
    };
}
export interface CreateDiningReservationPayload {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize: number;
    reservationDate: string;
    timeSlot: string;
    assignedTableIds?: string[];
    specialRequests?: string;
    depositAmount?: number;
}
