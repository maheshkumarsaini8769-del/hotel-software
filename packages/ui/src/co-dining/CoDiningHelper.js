"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoDiningHelper = void 0;
class CoDiningHelper {
    /**
     * Status styling for individual seat node
     */
    static getSeatStatusStyle(status, isSelected = false) {
        if (isSelected) {
            return {
                bg: '#EEF2FF',
                border: '#4F46E5',
                textColor: '#4F46E5',
                label: 'Selected',
            };
        }
        switch (status) {
            case 'AVAILABLE':
                return {
                    bg: '#ECFDF5',
                    border: '#10B981',
                    textColor: '#047857',
                    label: 'Open',
                };
            case 'OCCUPIED':
                return {
                    bg: '#FEF2F2',
                    border: '#EF4444',
                    textColor: '#B91C1C',
                    label: 'Occupied',
                };
            case 'RESERVED':
                return {
                    bg: '#FEF3C7',
                    border: '#F59E0B',
                    textColor: '#B45309',
                    label: 'Reserved',
                };
            case 'DIRTY':
                return {
                    bg: '#F3F4F6',
                    border: '#9CA3AF',
                    textColor: '#4B5563',
                    label: 'Needs Bus',
                };
            default:
                return {
                    bg: '#FFFFFF',
                    border: '#D1D5DB',
                    textColor: '#374151',
                    label: status,
                };
        }
    }
    /**
     * Occupancy percentage and health color
     */
    static getOccupancyDetails(occupied, capacity) {
        const percent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
        if (percent === 100) {
            return { percent: 100, color: '#DC2626', badgeText: 'Full Table' };
        }
        if (percent === 0) {
            return { percent: 0, color: '#10B981', badgeText: 'Entire Table Open' };
        }
        return {
            percent,
            color: '#F59E0B',
            badgeText: `${capacity - occupied} Seats Open`,
        };
    }
    /**
     * Format human summary for community table card
     */
    static formatSeatingSummary(table) {
        const { occupiedSeatsCount, capacity, availableSeatsCount } = table;
        if (availableSeatsCount === 0) {
            return `Table Full (${occupiedSeatsCount}/${capacity} seated)`;
        }
        if (occupiedSeatsCount === 0) {
            return `All ${capacity} seats open`;
        }
        return `${occupiedSeatsCount} of ${capacity} seats filled (${availableSeatsCount} open seat${availableSeatsCount > 1 ? 's' : ''})`;
    }
    /**
     * Filter tables that have at least N seats open
     */
    static filterAvailableTables(tables, minSeatsNeeded = 1) {
        return tables.filter((t) => t.availableSeatsCount >= minSeatsNeeded);
    }
}
exports.CoDiningHelper = CoDiningHelper;
