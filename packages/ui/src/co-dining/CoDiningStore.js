"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoDiningStore = void 0;
class CoDiningStore {
    tables = [];
    selectedTable = null;
    selectedSeatNumbers = [];
    filterSection = 'ALL';
    filterMinSeats = 1;
    isLoading = false;
    errorMessage = null;
    listeners = [];
    constructor(initialTables) {
        if (initialTables) {
            this.tables = initialTables;
        }
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        this.listeners.forEach((l) => l());
    }
    // Getters
    getTables() {
        return this.tables;
    }
    getFilteredTables() {
        return this.tables.filter((t) => {
            const matchesSection = this.filterSection === 'ALL' || t.section === this.filterSection;
            const matchesSeats = t.availableSeatsCount >= this.filterMinSeats;
            return matchesSection && matchesSeats;
        });
    }
    getSelectedTable() {
        return this.selectedTable;
    }
    getSelectedSeatNumbers() {
        return this.selectedSeatNumbers;
    }
    getFilterSection() {
        return this.filterSection;
    }
    getFilterMinSeats() {
        return this.filterMinSeats;
    }
    getIsLoading() {
        return this.isLoading;
    }
    getErrorMessage() {
        return this.errorMessage;
    }
    // Setters & Actions
    setLoading(loading) {
        this.isLoading = loading;
        this.notify();
    }
    setError(error) {
        this.errorMessage = error;
        this.notify();
    }
    setTables(tables) {
        this.tables = tables;
        if (this.selectedTable) {
            const refreshed = tables.find((t) => t.tableId === this.selectedTable?.tableId);
            this.selectedTable = refreshed || null;
        }
        this.errorMessage = null;
        this.notify();
    }
    selectTable(table) {
        this.selectedTable = table;
        this.selectedSeatNumbers = [];
        this.notify();
    }
    toggleSeatSelection(seatNumber) {
        if (!this.selectedTable)
            return;
        const targetSeat = this.selectedTable.seats.find((s) => s.seatNumber === seatNumber);
        if (!targetSeat || targetSeat.status !== 'AVAILABLE')
            return;
        if (this.selectedSeatNumbers.includes(seatNumber)) {
            this.selectedSeatNumbers = this.selectedSeatNumbers.filter((n) => n !== seatNumber);
        }
        else {
            this.selectedSeatNumbers.push(seatNumber);
        }
        this.notify();
    }
    clearSeatSelection() {
        this.selectedSeatNumbers = [];
        this.notify();
    }
    setFilterSection(section) {
        this.filterSection = section;
        this.notify();
    }
    setFilterMinSeats(count) {
        this.filterMinSeats = count;
        this.notify();
    }
    updateSeatStatus(tableId, seatNumber, status, guestName) {
        const table = this.tables.find((t) => t.tableId === tableId);
        if (table) {
            const seat = table.seats.find((s) => s.seatNumber === seatNumber);
            if (seat) {
                seat.status = status;
                seat.guestName = guestName;
            }
            table.occupiedSeatsCount = table.seats.filter((s) => s.status === 'OCCUPIED').length;
            table.availableSeatsCount = table.capacity - table.occupiedSeatsCount;
            table.hasOpenSeats = table.availableSeatsCount > 0;
            this.notify();
        }
    }
}
exports.CoDiningStore = CoDiningStore;
