import { TargetedAlertDTO, WaiterAssignedTablesDTO } from './types';

export class WaiterZoneStore {
  private static assignedTables: WaiterAssignedTablesDTO | null = null;
  private static alerts: TargetedAlertDTO[] = [];

  static setAssignedTables(data: WaiterAssignedTablesDTO): void {
    this.assignedTables = data;
  }

  static getAssignedTables(): WaiterAssignedTablesDTO | null {
    return this.assignedTables;
  }

  static setAlerts(alerts: TargetedAlertDTO[]): void {
    this.alerts = alerts;
  }

  static getAlerts(): TargetedAlertDTO[] {
    return this.alerts;
  }

  static addAlert(alert: TargetedAlertDTO): void {
    const existingIndex = this.alerts.findIndex((a) => a._id === alert._id);
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = alert;
    } else {
      this.alerts.unshift(alert);
    }
  }

  static updateAlertStatus(alertId: string, status: TargetedAlertDTO['status']): void {
    const target = this.alerts.find((a) => a._id === alertId);
    if (target) {
      target.status = status;
    }
  }

  static clear(): void {
    this.assignedTables = null;
    this.alerts = [];
  }
}
