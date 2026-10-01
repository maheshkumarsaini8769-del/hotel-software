import {
  MatrixCalendarData,
  MatrixReservationBlock,
  MatrixRoomCategory,
  QuickReserveTarget,
} from './types';
import { MatrixHelper } from './MatrixHelper';

export type MatrixStoreListener = () => void;

export class MatrixStore {
  private static instance: MatrixStore | null = null;

  public static getInstance(initialData: MatrixCalendarData | null = null, initialDays = 14): MatrixStore {
    if (!MatrixStore.instance) {
      MatrixStore.instance = new MatrixStore(initialData, initialDays);
    }
    return MatrixStore.instance;
  }

  private data: MatrixCalendarData | null = null;
  private startDate: string;
  private days: number = 14;
  private selectedRoomTypeId: string | 'ALL' = 'ALL';
  private selectedBooking: MatrixReservationBlock | null = null;
  private quickReserveTarget: QuickReserveTarget | null = null;
  private isLoading: boolean = false;
  private listeners: Set<MatrixStoreListener> = new Set();

  constructor(initialData: MatrixCalendarData | null = null, initialDays = 14) {
    this.data = initialData;
    this.days = initialDays;
    this.startDate = new Date().toISOString().slice(0, 10);
    if (initialData) {
      this.recomputeLayouts();
    }
  }

  public getData(): MatrixCalendarData | null {
    return this.data;
  }

  public setData(data: MatrixCalendarData): void {
    this.data = { ...data };
    this.recomputeLayouts();
    this.notify();
  }

  public getStartDate(): string {
    return this.startDate;
  }

  public setStartDate(dateStr: string): void {
    this.startDate = dateStr;
    this.notify();
  }

  public getDays(): number {
    return this.days;
  }

  public setDays(days: number): void {
    this.days = days;
    this.notify();
  }

  public navigateDays(deltaDays: number): void {
    const cur = new Date(this.startDate);
    cur.setUTCDate(cur.getUTCDate() + deltaDays);
    this.startDate = cur.toISOString().slice(0, 10);
    this.notify();
  }

  public jumpToToday(): void {
    this.startDate = new Date().toISOString().slice(0, 10);
    this.notify();
  }

  public getSelectedRoomTypeId(): string | 'ALL' {
    return this.selectedRoomTypeId;
  }

  public selectCategory(categoryId: string | 'ALL'): void {
    this.selectedRoomTypeId = categoryId;
    this.notify();
  }

  public getFilteredRoomTypes(): MatrixRoomCategory[] {
    if (!this.data) return [];
    if (this.selectedRoomTypeId === 'ALL') {
      return this.data.roomTypes;
    }
    return this.data.roomTypes.filter((rt) => rt.id === this.selectedRoomTypeId);
  }

  public getBookingsForRoom(roomId: string): MatrixReservationBlock[] {
    if (!this.data) return [];
    return this.data.bookings.filter((b) => b.allocatedRoomId === roomId);
  }

  public getUnassignedBookings(): MatrixReservationBlock[] {
    if (!this.data) return [];
    return this.data.bookings.filter((b) => !b.allocatedRoomId);
  }

  public getQuickReserveTarget(): QuickReserveTarget | null {
    return this.quickReserveTarget;
  }

  public openQuickReserve(target: QuickReserveTarget): void {
    this.quickReserveTarget = { ...target };
    this.notify();
  }

  public closeQuickReserve(): void {
    this.quickReserveTarget = null;
    this.notify();
  }

  public getSelectedBooking(): MatrixReservationBlock | null {
    return this.selectedBooking;
  }

  public openBookingPeek(booking: MatrixReservationBlock): void {
    this.selectedBooking = { ...booking };
    this.notify();
  }

  public closeBookingPeek(): void {
    this.selectedBooking = null;
    this.notify();
  }

  public setIsLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Handle real-time Socket event 'reservation:created'
   */
  public handleReservationCreated(reservation: any): void {
    if (!this.data) return;

    const newBlock: MatrixReservationBlock = {
      id: reservation.bookingId || reservation.id || reservation._id,
      bookingNumber: reservation.bookingNumber,
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone || '',
      guestEmail: reservation.guestEmail,
      checkInDate: (reservation.checkInDate || '').slice(0, 10),
      checkOutDate: (reservation.checkOutDate || '').slice(0, 10),
      bookingStatus: reservation.bookingStatus || 'CONFIRMED',
      allocatedRoomId: reservation.allocatedRoomId ? String(reservation.allocatedRoomId) : null,
      roomTypeId: String(reservation.roomTypeId),
      roomTypeName: reservation.roomTypeName || 'Room',
      grandTotal: reservation.grandTotal || 0,
      advancePaymentAmount: reservation.advancePaymentAmount || 0,
      paymentStatus: reservation.paymentStatus || 'UNPAID',
    };

    // Remove existing if duplicate
    this.data.bookings = this.data.bookings.filter((b) => b.id !== newBlock.id);
    this.data.bookings.push(newBlock);
    this.recomputeLayouts();
    this.notify();
  }

  /**
   * Handle real-time Socket event 'reservation:room_assigned'
   */
  public handleRoomAssigned(payload: { bookingId: string; allocatedRoomId?: string }): void {
    if (!this.data) return;
    const b = this.data.bookings.find((item) => item.id === payload.bookingId);
    if (b) {
      b.allocatedRoomId = payload.allocatedRoomId ? String(payload.allocatedRoomId) : null;
      this.recomputeLayouts();
      this.notify();
    }
  }

  /**
   * Handle real-time Socket event 'booking:status_changed'
   */
  public handleStatusChanged(payload: { bookingId: string; status: string }): void {
    if (!this.data) return;
    const b = this.data.bookings.find((item) => item.id === payload.bookingId);
    if (b) {
      b.bookingStatus = payload.status;
      if (payload.status === 'CANCELLED' || payload.status === 'NO_SHOW') {
        b.allocatedRoomId = null;
      }
      this.recomputeLayouts();
      this.notify();
    }
  }

  /**
   * Recomputes column offsets and spans for each booking against current dates
   */
  private recomputeLayouts(): void {
    if (!this.data || !this.data.dates || this.data.dates.length === 0) return;

    for (const b of this.data.bookings) {
      const layout = MatrixHelper.calculateBlockLayout(b.checkInDate, b.checkOutDate, this.data.dates);
      b.startColIndex = layout.startColIndex;
      b.spanCols = layout.spanCols;
      b.isContinuationLeft = layout.isContinuationLeft;
      b.isContinuationRight = layout.isContinuationRight;
    }
  }

  public subscribe(listener: MatrixStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
