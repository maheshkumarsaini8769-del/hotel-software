import { MultiTenderSettlementDTO, CashierShiftFloatDTO } from './types';

type Listener<T> = (data: T) => void;

export class MultiTenderStore {
  private static activeShift: CashierShiftFloatDTO | null = null;
  private static settlements: MultiTenderSettlementDTO[] = [];
  private static shiftListeners: Listener<CashierShiftFloatDTO | null>[] = [];
  private static settlementListeners: Listener<MultiTenderSettlementDTO[]>[] = [];

  static setActiveShift(shift: CashierShiftFloatDTO | null): void {
    this.activeShift = shift;
    this.shiftListeners.forEach((fn) => fn(shift));
  }

  static getActiveShift(): CashierShiftFloatDTO | null {
    return this.activeShift;
  }

  static addSettlement(settlement: MultiTenderSettlementDTO): void {
    this.settlements.unshift(settlement);
    this.settlementListeners.forEach((fn) => fn(this.settlements));
  }

  static getSettlements(): MultiTenderSettlementDTO[] {
    return this.settlements;
  }

  static subscribeShift(listener: Listener<CashierShiftFloatDTO | null>): () => void {
    this.shiftListeners.push(listener);
    return () => {
      this.shiftListeners = this.shiftListeners.filter((fn) => fn !== listener);
    };
  }

  static subscribeSettlements(listener: Listener<MultiTenderSettlementDTO[]>): () => void {
    this.settlementListeners.push(listener);
    return () => {
      this.settlementListeners = this.settlementListeners.filter((fn) => fn !== listener);
    };
  }
}
