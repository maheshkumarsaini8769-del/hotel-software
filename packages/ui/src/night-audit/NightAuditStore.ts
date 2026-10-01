import { INightAuditSessionUI, IPreAuditDayStatusUI } from './types';

export class NightAuditStore {
  private auditHistory: INightAuditSessionUI[] = [];
  private currentPreAuditStatus: IPreAuditDayStatusUI | null = null;
  private isAuditing: boolean = false;
  private listeners: Array<() => void> = [];

  constructor(initialHistory: INightAuditSessionUI[] = []) {
    this.auditHistory = initialHistory;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public setHistory(history: INightAuditSessionUI[]): void {
    this.auditHistory = history;
    this.notify();
  }

  public getHistory(): INightAuditSessionUI[] {
    return this.auditHistory;
  }

  public setPreAuditStatus(status: IPreAuditDayStatusUI): void {
    this.currentPreAuditStatus = status;
    this.notify();
  }

  public getPreAuditStatus(): IPreAuditDayStatusUI | null {
    return this.currentPreAuditStatus;
  }

  public setIsAuditing(auditing: boolean): void {
    this.isAuditing = auditing;
    this.notify();
  }

  public getIsAuditing(): boolean {
    return this.isAuditing;
  }

  public addCompletedAudit(audit: INightAuditSessionUI): void {
    this.auditHistory = [audit, ...this.auditHistory.filter((a) => a._id !== audit._id)];
    if (this.currentPreAuditStatus) {
      this.currentPreAuditStatus = {
        ...this.currentPreAuditStatus,
        currentBusinessDate: audit.nextBusinessDate,
        lastCompletedAuditDate: audit.auditDate,
      };
    }
    this.isAuditing = false;
    this.notify();
  }
}
