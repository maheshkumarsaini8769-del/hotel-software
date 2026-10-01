import { KotVoidAuditDTO, VoidSummaryStats } from './types';

export type KotVoidListener = () => void;

export class KotVoidStore {
  private static instance: KotVoidStore | null = null;

  private auditLogs: KotVoidAuditDTO[] = [];
  private summaryStats: VoidSummaryStats | null = null;
  private isProcessing: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Set<KotVoidListener> = new Set();

  public static getInstance(): KotVoidStore {
    if (!KotVoidStore.instance) {
      KotVoidStore.instance = new KotVoidStore();
    }
    return KotVoidStore.instance;
  }

  public subscribe(listener: KotVoidListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getAuditLogs(): KotVoidAuditDTO[] {
    return [...this.auditLogs];
  }

  public getSummaryStats(): VoidSummaryStats | null {
    return this.summaryStats;
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // Setters & Actions
  public setAuditLogs(logs: KotVoidAuditDTO[]): void {
    this.auditLogs = [...logs];
    this.notify();
  }

  public addAuditLog(log: KotVoidAuditDTO): void {
    this.auditLogs = [log, ...this.auditLogs];
    this.notify();
  }

  public setSummaryStats(stats: VoidSummaryStats): void {
    this.summaryStats = stats;
    this.notify();
  }

  public setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.notify();
  }

  public setError(error: string | null): void {
    this.errorMessage = error;
    this.notify();
  }

  public clear(): void {
    this.auditLogs = [];
    this.summaryStats = null;
    this.isProcessing = false;
    this.errorMessage = null;
    this.notify();
  }
}
