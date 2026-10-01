import { NightAuditStatusUI } from './types';
export declare class NightAuditHelper {
    static formatCurrency(amount: number): string;
    static getStatusBadge(status: NightAuditStatusUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static computeKPIs(totalRoomRevenue: number, totalRooms: number, occupiedRooms: number): {
        occupancyRate: number;
        adr: number;
        revPAR: number;
    };
}
