import { IMenuEngineeringReportUI, IMenuEngineeringItemUI, IPriceSimulationResultUI, MenuQuadrantUI } from './types';
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
export declare class MenuEngineeringStore {
    private state;
    private listeners;
    getState(): IMenuEngineeringState;
    subscribe(listener: (state: IMenuEngineeringState) => void): () => void;
    private notify;
    setReports(reports: IMenuEngineeringReportUI[]): void;
    setActiveReport(report: IMenuEngineeringReportUI | null): void;
    setSelectedItem(item: IMenuEngineeringItemUI | null): void;
    setSelectedQuadrantFilter(filter: MenuQuadrantUI | 'ALL'): void;
    setActiveTab(tab: 'MATRIX' | 'TABLE' | 'SIMULATOR'): void;
    setSimulationResult(res: IPriceSimulationResultUI | null): void;
    setLoading(isLoading: boolean): void;
    setError(error: string | null): void;
}
