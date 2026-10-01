import {
  ReservationTabMode,
  TableReservationDTO,
  TableReservationSummary,
  RoomArrivalBookingDTO,
  RoomArrivalsSummary,
  CleanRoomOption,
  TableReservationStatus,
} from './types';

export type ReservationStoreListener = () => void;

export class ReservationStore {
  private tabMode: ReservationTabMode = 'DINING';
  private selectedDate: string;

  // Dining Table Reservations State
  private tableReservations: TableReservationDTO[] = [];
  private tableSummary: TableReservationSummary = {
    totalReservations: 0,
    totalCovers: 0,
    confirmed: 0,
    seated: 0,
    cancelled: 0,
    noShow: 0,
  };
  private diningStatusFilter: TableReservationStatus | 'ALL' = 'ALL';

  // Room Arrivals State
  private roomArrivals: RoomArrivalBookingDTO[] = [];
  private arrivalsSummary: RoomArrivalsSummary = {
    totalArrivals: 0,
    pendingArrivals: 0,
    totalDepartures: 0,
    inHouseCount: 0,
    unassignedCount: 0,
  };
  private availableCleanRooms: CleanRoomOption[] = [];
  private roomFilter: 'ALL' | 'ARRIVALS' | 'DEPARTURES' | 'UNASSIGNED' | 'IN_HOUSE' = 'ALL';

  // General Filter & Modal State
  private searchQuery: string = '';
  private isNewDiningModalOpen: boolean = false;
  private isAssignRoomModalOpen: boolean = false;
  private selectedBookingForAssign: RoomArrivalBookingDTO | null = null;
  private selectedReservationForAction: TableReservationDTO | null = null;

  private isLoading: boolean = false;
  private error: string | null = null;
  private listeners: Set<ReservationStoreListener> = new Set();

  constructor() {
    this.selectedDate = new Date().toISOString().slice(0, 10);
  }

  public subscribe(listener: ReservationStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in ReservationStore listener:', err);
      }
    });
  }

  public getTabMode(): ReservationTabMode {
    return this.tabMode;
  }

  public setTabMode(mode: ReservationTabMode): void {
    this.tabMode = mode;
    this.notify();
  }

  public getSelectedDate(): string {
    return this.selectedDate;
  }

  public setSelectedDate(date: string): void {
    this.selectedDate = date;
    this.notify();
  }

  // Dining Table Data Handlers
  public setTableData(reservations: TableReservationDTO[], summary?: TableReservationSummary): void {
    this.tableReservations = [...reservations];
    if (summary) {
      this.tableSummary = summary;
    } else {
      this.recomputeTableSummary();
    }
    this.notify();
  }

  private recomputeTableSummary(): void {
    let totalCovers = 0;
    let confirmed = 0;
    let seated = 0;
    let cancelled = 0;
    let noShow = 0;

    this.tableReservations.forEach((r) => {
      totalCovers += r.partySize || 0;
      if (r.status === 'CONFIRMED') confirmed++;
      else if (r.status === 'SEATED') seated++;
      else if (r.status === 'CANCELLED') cancelled++;
      else if (r.status === 'NO_SHOW') noShow++;
    });

    this.tableSummary = {
      totalReservations: this.tableReservations.length,
      totalCovers,
      confirmed,
      seated,
      cancelled,
      noShow,
    };
  }

  public getTableSummary(): TableReservationSummary {
    return this.tableSummary;
  }

  public getDiningStatusFilter(): TableReservationStatus | 'ALL' {
    return this.diningStatusFilter;
  }

  public setDiningStatusFilter(status: TableReservationStatus | 'ALL'): void {
    this.diningStatusFilter = status;
    this.notify();
  }

  public getFilteredDiningReservations(): TableReservationDTO[] {
    return this.tableReservations.filter((r) => {
      if (this.diningStatusFilter !== 'ALL' && r.status !== this.diningStatusFilter) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchName = r.customerName.toLowerCase().includes(q);
        const matchPhone = r.customerPhone.includes(q);
        const matchRes = r.reservationNumber.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRes) return false;
      }
      return true;
    });
  }

  // Room Arrivals Data Handlers
  public setArrivalsData(
    bookings: RoomArrivalBookingDTO[],
    summary?: RoomArrivalsSummary,
    cleanRooms: CleanRoomOption[] = []
  ): void {
    this.roomArrivals = [...bookings];
    if (summary) {
      this.arrivalsSummary = summary;
    }
    this.availableCleanRooms = [...cleanRooms];
    this.notify();
  }

  public getArrivalsSummary(): RoomArrivalsSummary {
    return this.arrivalsSummary;
  }

  public getAvailableCleanRooms(): CleanRoomOption[] {
    return this.availableCleanRooms;
  }

  public getRoomFilter(): 'ALL' | 'ARRIVALS' | 'DEPARTURES' | 'UNASSIGNED' | 'IN_HOUSE' {
    return this.roomFilter;
  }

  public setRoomFilter(filter: 'ALL' | 'ARRIVALS' | 'DEPARTURES' | 'UNASSIGNED' | 'IN_HOUSE'): void {
    this.roomFilter = filter;
    this.notify();
  }

  public getFilteredRoomArrivals(): RoomArrivalBookingDTO[] {
    return this.roomArrivals.filter((b) => {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchName = b.guestName.toLowerCase().includes(q);
        const matchPhone = b.guestPhone.includes(q);
        const matchNum = b.bookingNumber.toLowerCase().includes(q);
        const matchRoom = b.allocatedRoomId?.roomNumber.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNum && !matchRoom) return false;
      }
      return true;
    });
  }

  // Search
  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(q: string): void {
    this.searchQuery = q;
    this.notify();
  }

  // Modals
  public openNewDiningModal(): void {
    this.isNewDiningModalOpen = true;
    this.notify();
  }

  public closeNewDiningModal(): void {
    this.isNewDiningModalOpen = false;
    this.notify();
  }

  public isNewDiningModalActive(): boolean {
    return this.isNewDiningModalOpen;
  }

  public openAssignRoomModal(booking: RoomArrivalBookingDTO): void {
    this.selectedBookingForAssign = booking;
    this.isAssignRoomModalOpen = true;
    this.notify();
  }

  public closeAssignRoomModal(): void {
    this.selectedBookingForAssign = null;
    this.isAssignRoomModalOpen = false;
    this.notify();
  }

  public isAssignRoomModalActive(): boolean {
    return this.isAssignRoomModalOpen;
  }

  public getSelectedBookingForAssign(): RoomArrivalBookingDTO | null {
    return this.selectedBookingForAssign;
  }

  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public getLoading(): boolean {
    return this.isLoading;
  }

  public setError(error: string | null): void {
    this.error = error;
    this.notify();
  }

  public getError(): string | null {
    return this.error;
  }
}
