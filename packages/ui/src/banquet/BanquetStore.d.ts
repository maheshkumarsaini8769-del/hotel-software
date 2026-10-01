import { IBanquetBookingUI, IBanquetMetricsUI } from './types';
export interface IBanquetState {
    bookings: IBanquetBookingUI[];
    selectedBooking: IBanquetBookingUI | null;
    metrics: IBanquetMetricsUI;
    filterStatus: string;
    filterTimeSlot: string;
    searchQuery: string;
    loading: boolean;
    error: string | null;
    activeModal: 'NEW_BOOKING' | 'VIEW_FP' | 'POST_CHARGE' | 'SETTLE_FOLIO' | null;
}
export type BanquetStateListener = (state: IBanquetState) => void;
export declare class BanquetStore {
    private state;
    private listeners;
    getState(): IBanquetState;
    subscribe(listener: BanquetStateListener): () => void;
    private notify;
    setBookings(bookings: IBanquetBookingUI[], metrics?: Partial<IBanquetMetricsUI>): void;
    selectBooking(booking: IBanquetBookingUI | null): void;
    setFilterStatus(status: string): void;
    setFilterTimeSlot(slot: string): void;
    setSearchQuery(query: string): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    openModal(modalType: 'NEW_BOOKING' | 'VIEW_FP' | 'POST_CHARGE' | 'SETTLE_FOLIO', booking?: IBanquetBookingUI): void;
    closeModal(): void;
    getFilteredBookings(): IBanquetBookingUI[];
}
