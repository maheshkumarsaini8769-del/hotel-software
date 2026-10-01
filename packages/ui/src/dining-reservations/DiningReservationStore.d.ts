import { IDiningReservationUI, IDiningReservationMetricsUI, MealPeriodUI } from './types';
export interface IDiningReservationState {
    reservations: IDiningReservationUI[];
    selectedReservation: IDiningReservationUI | null;
    selectedDate: string;
    selectedMealPeriod: MealPeriodUI | 'ALL';
    selectedVipFilter: string;
    metrics: IDiningReservationMetricsUI;
    isLoading: boolean;
    error: string | null;
}
export declare class DiningReservationStore {
    private state;
    private listeners;
    getState(): IDiningReservationState;
    subscribe(listener: (state: IDiningReservationState) => void): () => void;
    private notify;
    setReservations(reservations: IDiningReservationUI[]): void;
    setMetrics(metrics: IDiningReservationMetricsUI): void;
    setSelectedReservation(res: IDiningReservationUI | null): void;
    setSelectedDate(date: string): void;
    setSelectedMealPeriod(period: MealPeriodUI | 'ALL'): void;
    setSelectedVipFilter(filter: string): void;
    setLoading(isLoading: boolean): void;
    setError(error: string | null): void;
    addReservation(res: IDiningReservationUI): void;
    updateReservation(res: IDiningReservationUI): void;
}
