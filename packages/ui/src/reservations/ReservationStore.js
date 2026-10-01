"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationStore = void 0;
class ReservationStore {
    tabMode = 'DINING';
    selectedDate;
    // Dining Table Reservations State
    tableReservations = [];
    tableSummary = {
        totalReservations: 0,
        totalCovers: 0,
        confirmed: 0,
        seated: 0,
        cancelled: 0,
        noShow: 0,
    };
    diningStatusFilter = 'ALL';
    // Room Arrivals State
    roomArrivals = [];
    arrivalsSummary = {
        totalArrivals: 0,
        pendingArrivals: 0,
        totalDepartures: 0,
        inHouseCount: 0,
        unassignedCount: 0,
    };
    availableCleanRooms = [];
    roomFilter = 'ALL';
    // General Filter & Modal State
    searchQuery = '';
    isNewDiningModalOpen = false;
    isAssignRoomModalOpen = false;
    selectedBookingForAssign = null;
    selectedReservationForAction = null;
    isLoading = false;
    error = null;
    listeners = new Set();
    constructor() {
        this.selectedDate = new Date().toISOString().slice(0, 10);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    notify() {
        this.listeners.forEach((listener) => {
            try {
                listener();
            }
            catch (err) {
                console.error('Error in ReservationStore listener:', err);
            }
        });
    }
    getTabMode() {
        return this.tabMode;
    }
    setTabMode(mode) {
        this.tabMode = mode;
        this.notify();
    }
    getSelectedDate() {
        return this.selectedDate;
    }
    setSelectedDate(date) {
        this.selectedDate = date;
        this.notify();
    }
    // Dining Table Data Handlers
    setTableData(reservations, summary) {
        this.tableReservations = [...reservations];
        if (summary) {
            this.tableSummary = summary;
        }
        else {
            this.recomputeTableSummary();
        }
        this.notify();
    }
    recomputeTableSummary() {
        let totalCovers = 0;
        let confirmed = 0;
        let seated = 0;
        let cancelled = 0;
        let noShow = 0;
        this.tableReservations.forEach((r) => {
            totalCovers += r.partySize || 0;
            if (r.status === 'CONFIRMED')
                confirmed++;
            else if (r.status === 'SEATED')
                seated++;
            else if (r.status === 'CANCELLED')
                cancelled++;
            else if (r.status === 'NO_SHOW')
                noShow++;
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
    getTableSummary() {
        return this.tableSummary;
    }
    getDiningStatusFilter() {
        return this.diningStatusFilter;
    }
    setDiningStatusFilter(status) {
        this.diningStatusFilter = status;
        this.notify();
    }
    getFilteredDiningReservations() {
        return this.tableReservations.filter((r) => {
            if (this.diningStatusFilter !== 'ALL' && r.status !== this.diningStatusFilter) {
                return false;
            }
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase();
                const matchName = r.customerName.toLowerCase().includes(q);
                const matchPhone = r.customerPhone.includes(q);
                const matchRes = r.reservationNumber.toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchRes)
                    return false;
            }
            return true;
        });
    }
    // Room Arrivals Data Handlers
    setArrivalsData(bookings, summary, cleanRooms = []) {
        this.roomArrivals = [...bookings];
        if (summary) {
            this.arrivalsSummary = summary;
        }
        this.availableCleanRooms = [...cleanRooms];
        this.notify();
    }
    getArrivalsSummary() {
        return this.arrivalsSummary;
    }
    getAvailableCleanRooms() {
        return this.availableCleanRooms;
    }
    getRoomFilter() {
        return this.roomFilter;
    }
    setRoomFilter(filter) {
        this.roomFilter = filter;
        this.notify();
    }
    getFilteredRoomArrivals() {
        return this.roomArrivals.filter((b) => {
            if (this.searchQuery.trim()) {
                const q = this.searchQuery.toLowerCase();
                const matchName = b.guestName.toLowerCase().includes(q);
                const matchPhone = b.guestPhone.includes(q);
                const matchNum = b.bookingNumber.toLowerCase().includes(q);
                const matchRoom = b.allocatedRoomId?.roomNumber.toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchNum && !matchRoom)
                    return false;
            }
            return true;
        });
    }
    // Search
    getSearchQuery() {
        return this.searchQuery;
    }
    setSearchQuery(q) {
        this.searchQuery = q;
        this.notify();
    }
    // Modals
    openNewDiningModal() {
        this.isNewDiningModalOpen = true;
        this.notify();
    }
    closeNewDiningModal() {
        this.isNewDiningModalOpen = false;
        this.notify();
    }
    isNewDiningModalActive() {
        return this.isNewDiningModalOpen;
    }
    openAssignRoomModal(booking) {
        this.selectedBookingForAssign = booking;
        this.isAssignRoomModalOpen = true;
        this.notify();
    }
    closeAssignRoomModal() {
        this.selectedBookingForAssign = null;
        this.isAssignRoomModalOpen = false;
        this.notify();
    }
    isAssignRoomModalActive() {
        return this.isAssignRoomModalOpen;
    }
    getSelectedBookingForAssign() {
        return this.selectedBookingForAssign;
    }
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    getLoading() {
        return this.isLoading;
    }
    setError(error) {
        this.error = error;
        this.notify();
    }
    getError() {
        return this.error;
    }
}
exports.ReservationStore = ReservationStore;
