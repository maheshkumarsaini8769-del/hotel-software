"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRosterStore = void 0;
class StaffRosterStore {
    state = {
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
    listeners = [];
    getState() {
        return { ...this.state };
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    setSchedules(schedules) {
        this.state.schedules = schedules;
        this.state.metrics.totalScheduledShifts = schedules.length;
        this.notify();
    }
    setAttendanceLogs(logs) {
        this.state.attendanceLogs = logs;
        let active = 0;
        let late = 0;
        let hours = 0;
        logs.forEach((l) => {
            if (!l.clockOutTime)
                active++;
            if (l.lateMinutes > 0)
                late++;
            hours += l.totalHoursWorked || 0;
        });
        this.state.metrics.activeClockedInCount = active;
        this.state.metrics.lateArrivalsCount = late;
        this.state.metrics.totalHoursWorkedToday = Math.round(hours * 10) / 10;
        this.notify();
    }
    setTipSessions(sessions) {
        this.state.tipSessions = sessions;
        if (sessions.length > 0) {
            this.state.metrics.todayTipsPool = sessions[0].totalTipsCollected;
        }
        this.notify();
    }
    setSelectedDate(date) {
        this.state.selectedDate = date;
        this.notify();
    }
    setSelectedDepartment(dept) {
        this.state.selectedDepartment = dept;
        this.notify();
    }
    setActiveTab(tab) {
        this.state.activeTab = tab;
        this.notify();
    }
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
}
exports.StaffRosterStore = StaffRosterStore;
