import { MultiTenderSettlementDTO, CashierShiftFloatDTO } from './types';
type Listener<T> = (data: T) => void;
export declare class MultiTenderStore {
    private static activeShift;
    private static settlements;
    private static shiftListeners;
    private static settlementListeners;
    static setActiveShift(shift: CashierShiftFloatDTO | null): void;
    static getActiveShift(): CashierShiftFloatDTO | null;
    static addSettlement(settlement: MultiTenderSettlementDTO): void;
    static getSettlements(): MultiTenderSettlementDTO[];
    static subscribeShift(listener: Listener<CashierShiftFloatDTO | null>): () => void;
    static subscribeSettlements(listener: Listener<MultiTenderSettlementDTO[]>): () => void;
}
export {};
