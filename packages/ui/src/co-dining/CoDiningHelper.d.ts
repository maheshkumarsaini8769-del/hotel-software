import { SeatStatus, CommunityTableDTO } from './types';
export declare class CoDiningHelper {
    /**
     * Status styling for individual seat node
     */
    static getSeatStatusStyle(status: SeatStatus, isSelected?: boolean): {
        bg: string;
        border: string;
        textColor: string;
        label: string;
    };
    /**
     * Occupancy percentage and health color
     */
    static getOccupancyDetails(occupied: number, capacity: number): {
        percent: number;
        color: string;
        badgeText: string;
    };
    /**
     * Format human summary for community table card
     */
    static formatSeatingSummary(table: CommunityTableDTO): string;
    /**
     * Filter tables that have at least N seats open
     */
    static filterAvailableTables(tables: CommunityTableDTO[], minSeatsNeeded?: number): CommunityTableDTO[];
}
