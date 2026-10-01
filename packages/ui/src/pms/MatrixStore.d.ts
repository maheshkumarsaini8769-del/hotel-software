import { MatrixCalendarData, MatrixReservationBlock, MatrixRoomCategory, QuickReserveTarget } from './types';
export type MatrixStoreListener = () => void;
export declare class MatrixStore {
    private static instance;
    static getInstance(initialData?: MatrixCalendarData | null, initialDays?: number): MatrixStore;
    private data;
    private startDate;
    private days;
    private selectedRoomTypeId;
    private selectedBooking;
    private quickReserveTarget;
    private isLoading;
    private listeners;
    constructor(initialData?: MatrixCalendarData | null, initialDays?: number);
    getData(): MatrixCalendarData | null;
    setData(data: MatrixCalendarData): void;
    getStartDate(): string;
    setStartDate(dateStr: string): void;
    getDays(): number;
    setDays(days: number): void;
    navigateDays(deltaDays: number): void;
    jumpToToday(): void;
    getSelectedRoomTypeId(): string | 'ALL';
    selectCategory(categoryId: string | 'ALL'): void;
    getFilteredRoomTypes(): MatrixRoomCategory[];
    getBookingsForRoom(roomId: string): MatrixReservationBlock[];
    getUnassignedBookings(): MatrixReservationBlock[];
    getQuickReserveTarget(): QuickReserveTarget | null;
    openQuickReserve(target: QuickReserveTarget): void;
    closeQuickReserve(): void;
    getSelectedBooking(): MatrixReservationBlock | null;
    openBookingPeek(booking: MatrixReservationBlock): void;
    closeBookingPeek(): void;
    setIsLoading(loading: boolean): void;
    getIsLoading(): boolean;
    /**
     * Handle real-time Socket event 'reservation:created'
     */
    handleReservationCreated(reservation: any): void;
    /**
     * Handle real-time Socket event 'reservation:room_assigned'
     */
    handleRoomAssigned(payload: {
        bookingId: string;
        allocatedRoomId?: string;
    }): void;
    /**
     * Handle real-time Socket event 'booking:status_changed'
     */
    handleStatusChanged(payload: {
        bookingId: string;
        status: string;
    }): void;
    /**
     * Recomputes column offsets and spans for each booking against current dates
     */
    private recomputeLayouts;
    subscribe(listener: MatrixStoreListener): () => void;
    private notify;
}
