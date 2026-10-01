import { IStaffShiftRosterUI, IStaffAttendanceLogUI, ITipPoolSessionUI, IRosterMetricsUI, StaffDepartmentUI } from './types';
export interface IStaffRosterState {
    schedules: IStaffShiftRosterUI[];
    attendanceLogs: IStaffAttendanceLogUI[];
    tipSessions: ITipPoolSessionUI[];
    selectedDate: string;
    selectedDepartment: StaffDepartmentUI | 'ALL';
    activeTab: 'ROSTER' | 'ATTENDANCE' | 'TIP_POOL';
    metrics: IRosterMetricsUI;
    isLoading: boolean;
    error: string | null;
}
export declare class StaffRosterStore {
    private state;
    private listeners;
    getState(): IStaffRosterState;
    subscribe(listener: (state: IStaffRosterState) => void): () => void;
    private notify;
    setSchedules(schedules: IStaffShiftRosterUI[]): void;
    setAttendanceLogs(logs: IStaffAttendanceLogUI[]): void;
    setTipSessions(sessions: ITipPoolSessionUI[]): void;
    setSelectedDate(date: string): void;
    setSelectedDepartment(dept: StaffDepartmentUI | 'ALL'): void;
    setActiveTab(tab: 'ROSTER' | 'ATTENDANCE' | 'TIP_POOL'): void;
    setLoading(isLoading: boolean): void;
    setError(error: string | null): void;
}
