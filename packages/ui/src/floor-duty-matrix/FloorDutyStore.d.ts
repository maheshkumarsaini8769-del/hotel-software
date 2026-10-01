import { FloorOverviewSummaryDTO } from './types';
export declare class FloorDutyStore {
    private static summaries;
    static setSummaries(data: FloorOverviewSummaryDTO[]): void;
    static getSummaries(): FloorOverviewSummaryDTO[];
    static getFloorByCode(floorCode: string): FloorOverviewSummaryDTO | undefined;
    static clear(): void;
}
