import { KotVoidAuditDTO, VoidSummaryStats } from './types';
export type KotVoidListener = () => void;
export declare class KotVoidStore {
    private static instance;
    private auditLogs;
    private summaryStats;
    private isProcessing;
    private errorMessage;
    private listeners;
    static getInstance(): KotVoidStore;
    subscribe(listener: KotVoidListener): () => void;
    private notify;
    getAuditLogs(): KotVoidAuditDTO[];
    getSummaryStats(): VoidSummaryStats | null;
    getIsProcessing(): boolean;
    getErrorMessage(): string | null;
    setAuditLogs(logs: KotVoidAuditDTO[]): void;
    addAuditLog(log: KotVoidAuditDTO): void;
    setSummaryStats(stats: VoidSummaryStats): void;
    setProcessing(processing: boolean): void;
    setError(error: string | null): void;
    clear(): void;
}
