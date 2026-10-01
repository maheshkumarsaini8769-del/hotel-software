import { LiveTableCardModel, FloorPlanFilterOptions } from './types';
export declare class FloorLayoutHelper {
    /**
     * Format elapsed minutes from session start time
     */
    static calculateElapsedMinutes(sessionStartTime?: string | Date): number;
    /**
     * Format elapsed minutes to human readable string (e.g., '45m', '1h 20m')
     */
    static formatElapsedTime(minutes: number): string;
    /**
     * Filter tables by section, status, min capacity and search query
     */
    static filterTables(tables: LiveTableCardModel[], filters: FloorPlanFilterOptions): LiveTableCardModel[];
    /**
     * Calculate section summary stats for quick dashboard cards
     */
    static calculateSectionStats(tables: LiveTableCardModel[]): {
        total: number;
        available: number;
        occupied: number;
        billing: number;
        dirty: number;
        reserved: number;
        occupancyRate: number;
        activeRevenue: number;
    };
    /**
     * Group tables by section name
     */
    static groupBySection(tables: LiveTableCardModel[]): Record<string, LiveTableCardModel[]>;
}
