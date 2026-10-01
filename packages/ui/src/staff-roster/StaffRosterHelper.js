"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRosterHelper = void 0;
class StaffRosterHelper {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    }
    static getShiftTypeBadge(type) {
        switch (type) {
            case 'MORNING_OPENING':
                return {
                    label: 'Morning Opening',
                    bg: 'rgba(234, 179, 8, 0.15)',
                    text: '#facc15',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                };
            case 'EVENING_DINNER':
                return {
                    label: 'Evening Dinner',
                    bg: 'rgba(59, 130, 246, 0.15)',
                    text: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                };
            case 'NIGHT_AUDIT':
                return {
                    label: 'Night Audit',
                    bg: 'rgba(168, 85, 247, 0.15)',
                    text: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                };
            case 'FULL_DAY_SPLIT':
                return {
                    label: 'Split Shift',
                    bg: 'rgba(249, 115, 22, 0.15)',
                    text: '#fb923c',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                };
            default:
                return {
                    label: 'Custom Shift',
                    bg: 'rgba(107, 114, 128, 0.15)',
                    text: '#9ca3af',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                };
        }
    }
    static getDepartmentBadge(dept) {
        switch (dept) {
            case 'FRONT_OF_HOUSE_SERVICE':
                return { label: 'FOH Service', color: '#60a5fa', isFoh: true };
            case 'BAR_BEVERAGE':
                return { label: 'Bar & Lounge', color: '#c084fc', isFoh: true };
            case 'KITCHEN_CULINARY':
                return { label: 'Kitchen Brigade (BOH)', color: '#f59e0b', isFoh: false };
            case 'HOUSEKEEPING':
                return { label: 'Housekeeping', color: '#10b981', isFoh: false };
            case 'FRONT_OFFICE':
                return { label: 'Front Office', color: '#06b6d4', isFoh: true };
            case 'MAINTENANCE_SECURITY':
                return { label: 'Maintenance & Security', color: '#9ca3af', isFoh: false };
            default:
                return { label: dept, color: '#9ca3af', isFoh: false };
        }
    }
    static getAttendanceStatusBadge(status) {
        switch (status) {
            case 'ON_TIME':
                return {
                    label: 'ON TIME',
                    bg: 'rgba(16, 185, 129, 0.15)',
                    text: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                };
            case 'LATE':
                return {
                    label: 'LATE ARRIVAL',
                    bg: 'rgba(239, 68, 68, 0.15)',
                    text: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                };
            case 'OVERTIME':
                return {
                    label: 'OVERTIME',
                    bg: 'rgba(234, 179, 8, 0.15)',
                    text: '#facc15',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                };
            case 'EARLY_EXIT':
                return {
                    label: 'EARLY EXIT',
                    bg: 'rgba(249, 115, 22, 0.15)',
                    text: '#fb923c',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                };
            case 'HALF_DAY':
                return {
                    label: 'HALF DAY',
                    bg: 'rgba(168, 85, 247, 0.15)',
                    text: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                };
            default:
                return {
                    label: status,
                    bg: 'rgba(107, 114, 128, 0.15)',
                    text: '#9ca3af',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                };
        }
    }
}
exports.StaffRosterHelper = StaffRosterHelper;
