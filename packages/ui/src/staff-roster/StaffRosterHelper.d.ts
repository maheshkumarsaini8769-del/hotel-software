import { ShiftTypeUI, StaffDepartmentUI, AttendanceStatusUI } from './types';
export declare class StaffRosterHelper {
    static formatCurrency(amount: number): string;
    static getShiftTypeBadge(type: ShiftTypeUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
    static getDepartmentBadge(dept: StaffDepartmentUI): {
        label: string;
        color: string;
        isFoh: boolean;
    };
    static getAttendanceStatusBadge(status: AttendanceStatusUI): {
        label: string;
        bg: string;
        text: string;
        border: string;
    };
}
