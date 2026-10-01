import {
  IBanquetBookingUI,
  IBanquetMetricsUI,
  BanquetBookingStatus,
} from './types';

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

export class BanquetStore {
  private state: IBanquetState = {
    bookings: [],
    selectedBooking: null,
    metrics: {
      totalEvents: 0,
      upcomingEventsCount: 0,
      totalPaxExpected: 0,
      totalRevenueContracted: 0,
      totalBalanceDue: 0,
    },
    filterStatus: 'ALL',
    filterTimeSlot: 'ALL',
    searchQuery: '',
    loading: false,
    error: null,
    activeModal: null,
  };

  private listeners: BanquetStateListener[] = [];

  getState(): IBanquetState {
    return { ...this.state };
  }

  subscribe(listener: BanquetStateListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  setBookings(bookings: IBanquetBookingUI[], metrics?: Partial<IBanquetMetricsUI>): void {
    this.state.bookings = bookings;
    if (metrics) {
      this.state.metrics = {
        ...this.state.metrics,
        ...metrics,
      };
    } else {
      let totalPaxExpected = 0;
      let totalRevenueContracted = 0;
      let totalBalanceDue = 0;
      let upcomingEventsCount = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      bookings.forEach((b) => {
        totalRevenueContracted += b.totalEstimatedAmount || 0;
        totalBalanceDue += b.dueAmount || 0;
        const bDate = new Date(b.eventDate);
        if (bDate >= today && b.status !== BanquetBookingStatus.CANCELLED) {
          upcomingEventsCount += 1;
          totalPaxExpected += b.guaranteedPax || 0;
        }
      });

      this.state.metrics = {
        totalEvents: bookings.length,
        upcomingEventsCount,
        totalPaxExpected,
        totalRevenueContracted,
        totalBalanceDue,
      };
    }
    this.notify();
  }

  selectBooking(booking: IBanquetBookingUI | null): void {
    this.state.selectedBooking = booking;
    this.notify();
  }

  setFilterStatus(status: string): void {
    this.state.filterStatus = status;
    this.notify();
  }

  setFilterTimeSlot(slot: string): void {
    this.state.filterTimeSlot = slot;
    this.notify();
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  openModal(modalType: 'NEW_BOOKING' | 'VIEW_FP' | 'POST_CHARGE' | 'SETTLE_FOLIO', booking?: IBanquetBookingUI): void {
    this.state.activeModal = modalType;
    if (booking) {
      this.state.selectedBooking = booking;
    }
    this.notify();
  }

  closeModal(): void {
    this.state.activeModal = null;
    this.notify();
  }

  getFilteredBookings(): IBanquetBookingUI[] {
    return this.state.bookings.filter((b) => {
      const matchStatus = this.state.filterStatus === 'ALL' || b.status === this.state.filterStatus;
      const matchSlot = this.state.filterTimeSlot === 'ALL' || b.timeSlot === this.state.filterTimeSlot;

      const q = this.state.searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.bookingCode.toLowerCase().includes(q) ||
        b.eventName.toLowerCase().includes(q) ||
        b.organizerName.toLowerCase().includes(q) ||
        b.venueName.toLowerCase().includes(q) ||
        b.companyName?.toLowerCase().includes(q);

      return matchStatus && matchSlot && matchSearch;
    });
  }
}
