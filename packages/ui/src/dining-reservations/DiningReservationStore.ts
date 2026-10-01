import {
  IDiningReservationUI,
  IDiningReservationMetricsUI,
  MealPeriodUI,
} from './types';

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

export class DiningReservationStore {
  private state: IDiningReservationState = {
    reservations: [],
    selectedReservation: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedMealPeriod: 'ALL',
    selectedVipFilter: 'ALL',
    metrics: {
      totalReservationsCount: 0,
      confirmedCount: 0,
      seatedCount: 0,
      vipCount: 0,
      allergenAlertsCount: 0,
    },
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: IDiningReservationState) => void> = [];

  public getState(): IDiningReservationState {
    return { ...this.state };
  }

  public subscribe(listener: (state: IDiningReservationState) => void): () => void {
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

  public setReservations(reservations: IDiningReservationUI[]): void {
    this.state.reservations = reservations;
    this.notify();
  }

  public setMetrics(metrics: IDiningReservationMetricsUI): void {
    this.state.metrics = metrics;
    this.notify();
  }

  public setSelectedReservation(res: IDiningReservationUI | null): void {
    this.state.selectedReservation = res;
    this.notify();
  }

  public setSelectedDate(date: string): void {
    this.state.selectedDate = date;
    this.notify();
  }

  public setSelectedMealPeriod(period: MealPeriodUI | 'ALL'): void {
    this.state.selectedMealPeriod = period;
    this.notify();
  }

  public setSelectedVipFilter(filter: string): void {
    this.state.selectedVipFilter = filter;
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

  public addReservation(res: IDiningReservationUI): void {
    this.state.reservations = [res, ...this.state.reservations];
    this.notify();
  }

  public updateReservation(res: IDiningReservationUI): void {
    this.state.reservations = this.state.reservations.map((r) =>
      r._id === res._id ? res : r
    );
    if (this.state.selectedReservation?._id === res._id) {
      this.state.selectedReservation = res;
    }
    this.notify();
  }
}
