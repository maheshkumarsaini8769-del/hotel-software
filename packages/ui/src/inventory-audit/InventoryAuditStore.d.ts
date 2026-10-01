import { IInventoryAuditSessionUI, IAuditMetricsUI } from './types';
export interface IInventoryAuditState {
    sessions: IInventoryAuditSessionUI[];
    metrics: IAuditMetricsUI;
    selectedSession: IInventoryAuditSessionUI | null;
    selectedTab: 'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE';
    filterStatus: string;
    filterLocation: string;
    isLoading: boolean;
    error: string | null;
}
export declare class InventoryAuditStore {
    private state;
    private listeners;
    getState(): IInventoryAuditState;
    subscribe(listener: (state: IInventoryAuditState) => void): () => void;
    private notify;
    setSessions(sessions: IInventoryAuditSessionUI[]): void;
    setMetrics(metrics: IAuditMetricsUI): void;
    setSelectedSession(session: IInventoryAuditSessionUI | null): void;
    setSelectedTab(tab: 'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE'): void;
    setFilterStatus(status: string): void;
    setFilterLocation(location: string): void;
    setLoading(isLoading: boolean): void;
    setError(error: string | null): void;
    addSession(session: IInventoryAuditSessionUI): void;
    updateSession(session: IInventoryAuditSessionUI): void;
}
