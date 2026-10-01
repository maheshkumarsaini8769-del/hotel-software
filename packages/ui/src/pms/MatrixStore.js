"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixStore = void 0;
const MatrixHelper_1 = require("./MatrixHelper");
class MatrixStore {
    static instance = null;
    static getInstance(initialData = null, initialDays = 14) {
        if (!MatrixStore.instance) {
            MatrixStore.instance = new MatrixStore(initialData, initialDays);
        }
        return MatrixStore.instance;
    }
    data = null;
    startDate;
    days = 14;
    selectedRoomTypeId = 'ALL';
    selectedBooking = null;
    quickReserveTarget = null;
    isLoading = false;
    listeners = new Set();
    constructor(initialData = null, initialDays = 14) {
        this.data = initialData;
        this.days = initialDays;
        this.startDate = new Date().toISOString().slice(0, 10);
        if (initialData) {
            this.recomputeLayouts();
        }
    }
    getData() {
        return this.data;
    }
    setData(data) {
        this.data = { ...data };
        this.recomputeLayouts();
        this.notify();
    }
    getStartDate() {
        return this.startDate;
    }
    setStartDate(dateStr) {
        this.startDate = dateStr;
        this.notify();
    }
    getDays() {
        return this.days;
    }
    setDays(days) {
        this.days = days;
        this.notify();
    }
    navigateDays(deltaDays) {
        const cur = new Date(this.startDate);
        cur.setUTCDate(cur.getUTCDate() + deltaDays);
        this.startDate = cur.toISOString().slice(0, 10);
        this.notify();
    }
    jumpToToday() {
        this.startDate = new Date().toISOString().slice(0, 10);
        this.notify();
    }
    getSelectedRoomTypeId() {
        return this.selectedRoomTypeId;
    }
    selectCategory(categoryId) {
        this.selectedRoomTypeId = categoryId;
        this.notify();
    }
    getFilteredRoomTypes() {
        if (!this.data)
            return [];
        if (this.selectedRoomTypeId === 'ALL') {
            return this.data.roomTypes;
        }
        return this.data.roomTypes.filter((rt) => rt.id === this.selectedRoomTypeId);
    }
    getBookingsForRoom(roomId) {
        if (!this.data)
            return [];
        return this.data.bookings.filter((b) => b.allocatedRoomId === roomId);
    }
    getUnassignedBookings() {
        if (!this.data)
            return [];
        return this.data.bookings.filter((b) => !b.allocatedRoomId);
    }
    getQuickReserveTarget() {
        return this.quickReserveTarget;
    }
    openQuickReserve(target) {
        this.quickReserveTarget = { ...target };
        this.notify();
    }
    closeQuickReserve() {
        this.quickReserveTarget = null;
        this.notify();
    }
    getSelectedBooking() {
        return this.selectedBooking;
    }
    openBookingPeek(booking) {
        this.selectedBooking = { ...booking };
        this.notify();
    }
    closeBookingPeek() {
        this.selectedBooking = null;
        this.notify();
    }
    setIsLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    getIsLoading() {
        return this.isLoading;
    }
    /**
     * Handle real-time Socket event 'reservation:created'
     */
    handleReservationCreated(reservation) {
        if (!this.data)
            return;
        const newBlock = {
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
    handleRoomAssigned(payload) {
        if (!this.data)
            return;
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
    handleStatusChanged(payload) {
        if (!this.data)
            return;
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
    recomputeLayouts() {
        if (!this.data || !this.data.dates || this.data.dates.length === 0)
            return;
        for (const b of this.data.bookings) {
            const layout = MatrixHelper_1.MatrixHelper.calculateBlockLayout(b.checkInDate, b.checkOutDate, this.data.dates);
            b.startColIndex = layout.startColIndex;
            b.spanCols = layout.spanCols;
            b.isContinuationLeft = layout.isContinuationLeft;
            b.isContinuationRight = layout.isContinuationRight;
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
exports.MatrixStore = MatrixStore;
