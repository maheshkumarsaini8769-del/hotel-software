import { SplitBillingPolicy, GroupBookingStatus, IGroupBookingUI, ICorporateMasterFolioUI } from './types';
export declare class CorporateHelper {
    static getSplitPolicyInfo(policy: SplitBillingPolicy): {
        label: string;
        description: string;
        badgeClass: string;
        chipColor: string;
    };
    static getStatusInfo(status: GroupBookingStatus): {
        label: string;
        badgeClass: string;
        dotColor: string;
    };
    static calculateNights(checkInDate: string | Date, checkOutDate: string | Date): number;
    static calculateEstimatedCost(roomTariffs: number[], nights: number): {
        totalTariff: number;
        taxRate: number;
        taxAmount: number;
        grandTotal: number;
    };
    static extractMasterFolio(group: IGroupBookingUI): ICorporateMasterFolioUI | null;
}
