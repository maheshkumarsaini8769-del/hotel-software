import { IRevenueStrategyUI, IDynamicRateQuoteUI } from './types';
export declare class RevenueManagerStore {
    private strategies;
    private currentQuote;
    private isCalculating;
    private listeners;
    constructor(initialStrategies?: IRevenueStrategyUI[]);
    subscribe(listener: () => void): () => void;
    private notify;
    setStrategies(strategies: IRevenueStrategyUI[]): void;
    getStrategies(): IRevenueStrategyUI[];
    setCurrentQuote(quote: IDynamicRateQuoteUI | null): void;
    getCurrentQuote(): IDynamicRateQuoteUI | null;
    setIsCalculating(calculating: boolean): void;
    getIsCalculating(): boolean;
    updateStrategy(strategy: IRevenueStrategyUI): void;
}
