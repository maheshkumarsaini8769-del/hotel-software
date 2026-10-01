"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanquetStore = void 0;
const types_1 = require("./types");
class BanquetStore {
    state = {
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
    listeners = [];
    getState() {
        return { ...this.state };
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    setBookings(bookings, metrics) {
        this.state.bookings = bookings;
        if (metrics) {
            this.state.metrics = {
                ...this.state.metrics,
                ...metrics,
            };
        }
        else {
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
                if (bDate >= today && b.status !== types_1.BanquetBookingStatus.CANCELLED) {
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
    selectBooking(booking) {
        this.state.selectedBooking = booking;
        this.notify();
    }
    setFilterStatus(status) {
        this.state.filterStatus = status;
        this.notify();
    }
    setFilterTimeSlot(slot) {
        this.state.filterTimeSlot = slot;
        this.notify();
    }
    setSearchQuery(query) {
        this.state.searchQuery = query;
        this.notify();
    }
    setLoading(loading) {
        this.state.loading = loading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
    openModal(modalType, booking) {
        this.state.activeModal = modalType;
        if (booking) {
            this.state.selectedBooking = booking;
        }
        this.notify();
    }
    closeModal() {
        this.state.activeModal = null;
        this.notify();
    }
    getFilteredBookings() {
        return this.state.bookings.filter((b) => {
            const matchStatus = this.state.filterStatus === 'ALL' || b.status === this.state.filterStatus;
            const matchSlot = this.state.filterTimeSlot === 'ALL' || b.timeSlot === this.state.filterTimeSlot;
            const q = this.state.searchQuery.toLowerCase().trim();
            const matchSearch = !q ||
                b.bookingCode.toLowerCase().includes(q) ||
                b.eventName.toLowerCase().includes(q) ||
                b.organizerName.toLowerCase().includes(q) ||
                b.venueName.toLowerCase().includes(q) ||
                b.companyName?.toLowerCase().includes(q);
            return matchStatus && matchSlot && matchSearch;
        });
    }
}
exports.BanquetStore = BanquetStore;
