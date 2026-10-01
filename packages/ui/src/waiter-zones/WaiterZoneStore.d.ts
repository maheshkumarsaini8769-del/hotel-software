import { TargetedAlertDTO, WaiterAssignedTablesDTO } from './types';
export declare class WaiterZoneStore {
    private static assignedTables;
    private static alerts;
    static setAssignedTables(data: WaiterAssignedTablesDTO): void;
    static getAssignedTables(): WaiterAssignedTablesDTO | null;
    static setAlerts(alerts: TargetedAlertDTO[]): void;
    static getAlerts(): TargetedAlertDTO[];
    static addAlert(alert: TargetedAlertDTO): void;
    static updateAlertStatus(alertId: string, status: TargetedAlertDTO['status']): void;
    static clear(): void;
}
