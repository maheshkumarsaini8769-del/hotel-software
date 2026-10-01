import {
  IMenuEngineeringReportUI,
  IMenuEngineeringItemUI,
  IPriceSimulationResultUI,
  MenuQuadrantUI,
} from './types';

export interface IMenuEngineeringState {
  reports: IMenuEngineeringReportUI[];
  activeReport: IMenuEngineeringReportUI | null;
  selectedItem: IMenuEngineeringItemUI | null;
  selectedQuadrantFilter: MenuQuadrantUI | 'ALL';
  activeTab: 'MATRIX' | 'TABLE' | 'SIMULATOR';
  simulationResult: IPriceSimulationResultUI | null;
  isLoading: boolean;
  error: string | null;
}

export class MenuEngineeringStore {
  private state: IMenuEngineeringState = {
    reports: [],
    activeReport: null,
    selectedItem: null,
    selectedQuadrantFilter: 'ALL',
    activeTab: 'MATRIX',
    simulationResult: null,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: IMenuEngineeringState) => void> = [];

  public getState(): IMenuEngineeringState {
    return { ...this.state };
  }

  public subscribe(listener: (state: IMenuEngineeringState) => void): () => void {
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

  public setReports(reports: IMenuEngineeringReportUI[]): void {
    this.state.reports = reports;
    if (!this.state.activeReport && reports.length > 0) {
      this.state.activeReport = reports[0];
    }
    this.notify();
  }

  public setActiveReport(report: IMenuEngineeringReportUI | null): void {
    this.state.activeReport = report;
    this.notify();
  }

  public setSelectedItem(item: IMenuEngineeringItemUI | null): void {
    this.state.selectedItem = item;
    this.notify();
  }

  public setSelectedQuadrantFilter(filter: MenuQuadrantUI | 'ALL'): void {
    this.state.selectedQuadrantFilter = filter;
    this.notify();
  }

  public setActiveTab(tab: 'MATRIX' | 'TABLE' | 'SIMULATOR'): void {
    this.state.activeTab = tab;
    this.notify();
  }

  public setSimulationResult(res: IPriceSimulationResultUI | null): void {
    this.state.simulationResult = res;
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
}
