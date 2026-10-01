import {
  IStaffShiftRosterUI,
  IStaffAttendanceLogUI,
  ITipPoolSessionUI,
  IRosterMetricsUI,
  StaffDepartmentUI,
} from './types';

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

export class StaffRosterStore {
  private state: IStaffRosterState = {
    schedules: [],
    attendanceLogs: [],
    tipSessions: [],
    selectedDate: new Date().toISOString().split('T')[0],
    selectedDepartment: 'ALL',
    activeTab: 'ROSTER',
    metrics: {
      totalScheduledShifts: 0,
      activeClockedInCount: 0,
      lateArrivalsCount: 0,
      totalHoursWorkedToday: 0,
      todayTipsPool: 0,
    },
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: IStaffRosterState) => void> = [];

  public getState(): IStaffRosterState {
    return { ...this.state };
  }

  public subscribe(listener: (state: IStaffRosterState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public setSchedules(schedules: IStaffShiftRosterUI[]): void {
    this.state.schedules = schedules;
    this.state.metrics.totalScheduledShifts = schedules.length;
    this.notify();
  }

  public setAttendanceLogs(logs: IStaffAttendanceLogUI[]): void {
    this.state.attendanceLogs = logs;
    let active = 0;
    let late = 0;
    let hours = 0;
    logs.forEach((l) => {
      if (!l.clockOutTime) active++;
      if (l.lateMinutes > 0) late++;
      hours += l.totalHoursWorked || 0;
    });
    this.state.metrics.activeClockedInCount = active;
    this.state.metrics.lateArrivalsCount = late;
    this.state.metrics.totalHoursWorkedToday = Math.round(hours * 10) / 10;
    this.notify();
  }

  public setTipSessions(sessions: ITipPoolSessionUI[]): void {
    this.state.tipSessions = sessions;
    if (sessions.length > 0) {
      this.state.metrics.todayTipsPool = sessions[0].totalTipsCollected;
    }
    this.notify();
  }

  public setSelectedDate(date: string): void {
    this.state.selectedDate = date;
    this.notify();
  }

  public setSelectedDepartment(dept: StaffDepartmentUI | 'ALL'): void {
    this.state.selectedDepartment = dept;
    this.notify();
  }

  public setActiveTab(tab: 'ROSTER' | 'ATTENDANCE' | 'TIP_POOL'): void {
    this.state.activeTab = tab;
    this.notify();
  }

  public setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }
}
