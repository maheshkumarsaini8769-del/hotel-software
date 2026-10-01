import { SpilloverTierType, StaffWorkloadDTO } from './types';
export declare class LoadBalancerHelper {
    /**
     * Returns high-contrast color styling for workload status
     */
    static getWorkloadStatus(score: number): {
        label: string;
        color: string;
        bg: string;
    };
    /**
     * Color badge for spillover tier
     */
    static getSpilloverTierBadge(tier: SpilloverTierType): {
        label: string;
        bg: string;
        text: string;
    };
    /**
     * Selects least loaded staff member from workload scores
     */
    static findBestHelperStaff(workloads: StaffWorkloadDTO[]): StaffWorkloadDTO | null;
}
