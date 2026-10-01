"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancerHelper = void 0;
class LoadBalancerHelper {
    /**
     * Returns high-contrast color styling for workload status
     */
    static getWorkloadStatus(score) {
        if (score < 10) {
            return { label: 'Optimal / Ready', color: '#166534', bg: '#DCFCE7' };
        }
        else if (score < 25) {
            return { label: 'Moderate Load', color: '#854D0E', bg: '#FEF9C3' };
        }
        else {
            return { label: 'Heavy Load / Critical', color: '#991B1B', bg: '#FEE2E2' };
        }
    }
    /**
     * Color badge for spillover tier
     */
    static getSpilloverTierBadge(tier) {
        switch (tier) {
            case 'TIER_1_TEMPORARY':
                return { label: '15m Late (Peer Balancing)', bg: '#FEF3C7', text: '#92400E' };
            case 'TIER_2_ABSENTEE_ESCALATION':
                return { label: '30m+ Late (Captain Escalation)', bg: '#FEE2E2', text: '#991B1B' };
            case 'RECLAIMED_ON_ARRIVAL':
                return { label: 'Arrived & Reclaimed', bg: '#D1FAE5', text: '#065F46' };
            default:
                return { label: tier, bg: '#F3F4F6', text: '#374151' };
        }
    }
    /**
     * Selects least loaded staff member from workload scores
     */
    static findBestHelperStaff(workloads) {
        if (!workloads || workloads.length === 0)
            return null;
        return workloads.slice().sort((a, b) => a.workloadScore - b.workloadScore)[0];
    }
}
exports.LoadBalancerHelper = LoadBalancerHelper;
