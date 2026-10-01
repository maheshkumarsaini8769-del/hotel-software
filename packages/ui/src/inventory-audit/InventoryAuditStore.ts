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

export class InventoryAuditStore {
  private state: IInventoryAuditState = {
    sessions: [],
    metrics: {
      totalAuditsCount: 0,
      openAuditsCount: 0,
      totalNetShortageLoss: 0,
      reconciledCount: 0,
    },
    selectedSession: null,
    selectedTab: 'SESSIONS',
    filterStatus: 'ALL',
    filterLocation: 'ALL',
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: IInventoryAuditState) => void> = [];

  public getState(): IInventoryAuditState {
    return { ...this.state };
  }

  public subscribe(listener: (state: IInventoryAuditState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public setSessions(sessions: IInventoryAuditSessionUI[]): void {
    this.state.sessions = sessions;
    this.notify();
  }

  public setMetrics(metrics: IAuditMetricsUI): void {
    this.state.metrics = metrics;
    this.notify();
  }

  public setSelectedSession(session: IInventoryAuditSessionUI | null): void {
    this.state.selectedSession = session;
    this.notify();
  }

  public setSelectedTab(tab: 'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE'): void {
    this.state.selectedTab = tab;
    this.notify();
  }

  public setFilterStatus(status: string): void {
    this.state.filterStatus = status;
    this.notify();
  }

  public setFilterLocation(location: string): void {
    this.state.filterLocation = location;
    this.notify();
  }

  public setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  public addSession(session: IInventoryAuditSessionUI): void {
    this.state.sessions = [session, ...this.state.sessions];
    this.notify();
  }

  public updateSession(session: IInventoryAuditSessionUI): void {
    this.state.sessions = this.state.sessions.map((s) => (s._id === session._id ? session : s));
    if (this.state.selectedSession?._id === session._id) {
      this.state.selectedSession = session;
    }
    this.notify();
  }
}
