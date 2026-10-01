import { FloorOverviewSummaryDTO, FloorWaiterDutyDTO } from './types';
export declare class FloorDutyHelper {
    /**
     * Calculates capacity utilization percentage on a floor
     */
    static getFloorUtilization(summary: FloorOverviewSummaryDTO): number;
    /**
     * Evaluates if a waiter is overloaded relative to safety threshold
     */
    static isWaiterOverloaded(duty: FloorWaiterDutyDTO, maxCap?: number): boolean;
    /**
     * Color formatting for floor cards
     */
    static getFloorBadgeColor(floorCode: string): {
        bg: string;
        text: string;
        border: string;
    };
}
