import { INightAuditSessionUI, IPreAuditDayStatusUI } from './types';
export declare class NightAuditStore {
    private auditHistory;
    private currentPreAuditStatus;
    private isAuditing;
    private listeners;
    constructor(initialHistory?: INightAuditSessionUI[]);
    subscribe(listener: () => void): () => void;
    private notify;
    setHistory(history: INightAuditSessionUI[]): void;
    getHistory(): INightAuditSessionUI[];
    setPreAuditStatus(status: IPreAuditDayStatusUI): void;
    getPreAuditStatus(): IPreAuditDayStatusUI | null;
    setIsAuditing(auditing: boolean): void;
    getIsAuditing(): boolean;
    addCompletedAudit(audit: INightAuditSessionUI): void;
}
