import { HotelTelemetryData, UserNotificationPreference, AdminAlert, SubscriptionItem } from './types';

export class AdminControlStore {
  private telemetry: HotelTelemetryData | null = null;
  private preferences: UserNotificationPreference | null = null;
  private alerts: AdminAlert[] = [];
  private listeners: Array<() => void> = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public setTelemetry(data: HotelTelemetryData): void {
    this.telemetry = data;
    this.notify();
  }

  public getTelemetry(): HotelTelemetryData | null {
    return this.telemetry;
  }

  public setPreferences(pref: UserNotificationPreference): void {
    this.preferences = pref;
    this.notify();
  }

  public getPreferences(): UserNotificationPreference | null {
    return this.preferences;
  }

  public updateSubscriptionToggle(category: string, updates: Partial<SubscriptionItem>): void {
    if (!this.preferences) return;
    this.preferences.subscriptions = this.preferences.subscriptions.map((sub) => {
      if (sub.category === category) {
        return { ...sub, ...updates };
      }
      return sub;
    });
    this.notify();
  }

  public setAlerts(alerts: AdminAlert[]): void {
    this.alerts = alerts;
    this.notify();
  }

  public getAlerts(): AdminAlert[] {
    return [...this.alerts];
  }

  public addAlert(alert: AdminAlert): void {
    this.alerts = [alert, ...this.alerts];
    this.notify();
  }

  public markAlertAcknowledged(alertId: string, acknowledgedByName: string): void {
    this.alerts = this.alerts.map((a) => {
      if (a._id === alertId) {
        return {
          ...a,
          status: 'ACKNOWLEDGED',
          acknowledgedByName,
          acknowledgedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    this.notify();
  }

  public getActiveAlertsCount(): number {
    return this.alerts.filter((a) => a.status === 'ACTIVE').length;
  }

  public getCriticalAlerts(): AdminAlert[] {
    return this.alerts.filter(
      (a) => a.status === 'ACTIVE' && (a.severity === 'CRITICAL' || a.severity === 'EMERGENCY')
    );
  }
}
