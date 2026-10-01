export type NightAuditStatusUI = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export interface INightAuditSessionUI {
    _id: string;
    hotelId: string;
    auditDate: string;
    nextBusinessDate: string;
    status: NightAuditStatusUI;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    totalRoomRevenue: number;
    totalFoodAndBeverageRevenue: number;
    totalLaundryRevenue: number;
    totalPaidServicesRevenue: number;
    totalTaxesCollected: number;
    totalGrossRevenue: number;
    totalPaymentsCollected: number;
    averageDailyRate: number;
    revPAR: number;
    roomsAutoPostedCount: number;
    unpostedChargesCleanedCount: number;
    activeLateDinersQuarantinedCount: number;
    performedByUserName?: string;
    notes?: string;
    isDayClosed: boolean;
    completedAt?: string;
    createdAt: string;
}
export interface IPreAuditDayStatusUI {
    currentBusinessDate: string;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    unpostedOrdersCount: number;
    readyForAudit: boolean;
    lastCompletedAuditDate?: string | null;
}
