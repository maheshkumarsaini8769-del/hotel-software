import { HotelTelemetryData, UserNotificationPreference, AdminAlert, SubscriptionItem } from './types';
export declare class AdminControlStore {
    private telemetry;
    private preferences;
    private alerts;
    private listeners;
    subscribe(listener: () => void): () => void;
    private notify;
    setTelemetry(data: HotelTelemetryData): void;
    getTelemetry(): HotelTelemetryData | null;
    setPreferences(pref: UserNotificationPreference): void;
    getPreferences(): UserNotificationPreference | null;
    updateSubscriptionToggle(category: string, updates: Partial<SubscriptionItem>): void;
    setAlerts(alerts: AdminAlert[]): void;
    getAlerts(): AdminAlert[];
    addAlert(alert: AdminAlert): void;
    markAlertAcknowledged(alertId: string, acknowledgedByName: string): void;
    getActiveAlertsCount(): number;
    getCriticalAlerts(): AdminAlert[];
}
