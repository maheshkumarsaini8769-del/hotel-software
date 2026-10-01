export interface FloorWaiterDutyDTO {
    waiterId: string;
    waiterName: string;
    assignedTables: string[];
    tableCount: number;
    paxCapacity: number;
    isRovingWaiter: boolean;
    assignedAt: string | Date;
}
export interface FloorDutyMatrixDTO {
    _id: string;
    floorName: string;
    floorCode: string;
    supervisorName?: string;
    totalTables: number;
    totalCapacity: number;
    dutyRoster: FloorWaiterDutyDTO[];
    unassignedTables: string[];
    maxPaxPerWaiterCap: number;
    shift: string;
    date: string;
    isActive: boolean;
}
export interface FloorOverviewSummaryDTO {
    floorName: string;
    floorCode: string;
    supervisorName: string;
    shift: string;
    totalTables: number;
    totalCapacity: number;
    totalAssignedTables: number;
    totalAssignedPax: number;
    unassignedTablesCount: number;
    unassignedTables: string[];
    activeWaitersCount: number;
    overloadedWaitersCount: number;
    overloadedWaiters: Array<{
        waiterName: string;
        paxCapacity: number;
        cap: number;
    }>;
}
