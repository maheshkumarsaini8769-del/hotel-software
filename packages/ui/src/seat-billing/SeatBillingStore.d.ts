import { SeatSubFolioDTO, SubFolioLineItemDTO, SettleSubFolioPayload } from './types';
type Listener = () => void;
export declare class SeatBillingStore {
    private subFolios;
    private selectedSubFolio;
    private isLoading;
    private errorMessage;
    private listeners;
    constructor(initialSubFolios?: SeatSubFolioDTO[]);
    subscribe(listener: Listener): () => void;
    private notify;
    getSubFolios(): SeatSubFolioDTO[];
    getActiveSubFolios(): SeatSubFolioDTO[];
    getSettledSubFolios(): SeatSubFolioDTO[];
    getSelectedSubFolio(): SeatSubFolioDTO | null;
    getTotalOutstandingAmount(): number;
    getIsLoading(): boolean;
    getErrorMessage(): string | null;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    setSubFolios(subFolios: SeatSubFolioDTO[]): void;
    selectSubFolio(subFolio: SeatSubFolioDTO | null): void;
    addLineItemsToSubFolio(subFolioId: string, items: SubFolioLineItemDTO[]): void;
    settleSubFolioLocally(subFolioId: string, payload: SettleSubFolioPayload): void;
}
export {};
