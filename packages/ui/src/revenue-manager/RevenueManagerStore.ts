import { IRevenueStrategyUI, IDynamicRateQuoteUI } from './types';

export class RevenueManagerStore {
  private strategies: IRevenueStrategyUI[] = [];
  private currentQuote: IDynamicRateQuoteUI | null = null;
  private isCalculating: boolean = false;
  private listeners: Array<() => void> = [];

  constructor(initialStrategies: IRevenueStrategyUI[] = []) {
    this.strategies = initialStrategies;
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

  public setStrategies(strategies: IRevenueStrategyUI[]): void {
    this.strategies = strategies;
    this.notify();
  }

  public getStrategies(): IRevenueStrategyUI[] {
    return this.strategies;
  }

  public setCurrentQuote(quote: IDynamicRateQuoteUI | null): void {
    this.currentQuote = quote;
    this.notify();
  }

  public getCurrentQuote(): IDynamicRateQuoteUI | null {
    return this.currentQuote;
  }

  public setIsCalculating(calculating: boolean): void {
    this.isCalculating = calculating;
    this.notify();
  }

  public getIsCalculating(): boolean {
    return this.isCalculating;
  }

  public updateStrategy(strategy: IRevenueStrategyUI): void {
    this.strategies = [strategy, ...this.strategies.filter((s) => s._id !== strategy._id)];
    this.notify();
  }
}
