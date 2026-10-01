import { SeatSubFolioDTO, SubFolioLineItemDTO, SettleSubFolioPayload } from './types';
import { SeatBillingHelper } from './SeatBillingHelper';

type Listener = () => void;

export class SeatBillingStore {
  private subFolios: SeatSubFolioDTO[] = [];
  private selectedSubFolio: SeatSubFolioDTO | null = null;
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Listener[] = [];

  constructor(initialSubFolios?: SeatSubFolioDTO[]) {
    if (initialSubFolios) {
      this.subFolios = initialSubFolios;
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getSubFolios(): SeatSubFolioDTO[] {
    return this.subFolios;
  }

  public getActiveSubFolios(): SeatSubFolioDTO[] {
    return this.subFolios.filter((s) => s.status === 'OPEN' || s.status === 'BILL_REQUESTED');
  }

  public getSettledSubFolios(): SeatSubFolioDTO[] {
    return this.subFolios.filter((s) => s.status === 'SETTLED');
  }

  public getSelectedSubFolio(): SeatSubFolioDTO | null {
    return this.selectedSubFolio;
  }

  public getTotalOutstandingAmount(): number {
    return this.getActiveSubFolios().reduce((acc, s) => acc + s.dueAmount, 0);
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // Actions
  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.errorMessage = error;
    this.notify();
  }

  public setSubFolios(subFolios: SeatSubFolioDTO[]): void {
    this.subFolios = subFolios;
    if (this.selectedSubFolio) {
      const refreshed = subFolios.find((s) => s._id === this.selectedSubFolio?._id);
      this.selectedSubFolio = refreshed || null;
    }
    this.errorMessage = null;
    this.notify();
  }

  public selectSubFolio(subFolio: SeatSubFolioDTO | null): void {
    this.selectedSubFolio = subFolio;
    this.notify();
  }

  public addLineItemsToSubFolio(subFolioId: string, items: SubFolioLineItemDTO[]): void {
    const subFolio = this.subFolios.find((s) => s._id === subFolioId);
    if (subFolio) {
      subFolio.lineItems.push(...items);
      const subTotal = subFolio.lineItems.reduce((acc, it) => acc + it.subtotal, 0);
      const tax = SeatBillingHelper.calculateGst5Percent(subTotal, subFolio.discountAmount);

      subFolio.subTotal = subTotal;
      subFolio.cgstAmount = tax.cgstAmount;
      subFolio.sgstAmount = tax.sgstAmount;
      subFolio.totalTax = tax.totalTax;
      subFolio.grandTotal = tax.grandTotal;
      subFolio.dueAmount = Math.max(0, tax.grandTotal - subFolio.paidAmount);

      this.notify();
    }
  }

  public settleSubFolioLocally(subFolioId: string, payload: SettleSubFolioPayload): void {
    const subFolio = this.subFolios.find((s) => s._id === subFolioId);
    if (subFolio) {
      subFolio.status = 'SETTLED';
      subFolio.paymentMethod = payload.paymentMethod;
      subFolio.transactionRef = payload.transactionRef;
      subFolio.paidAmount = payload.paidAmount !== undefined ? payload.paidAmount : subFolio.grandTotal;
      subFolio.dueAmount = 0;
      subFolio.settledAt = new Date().toISOString();
      subFolio.settledByStaffName = payload.settledByStaffName || 'Cashier';
      this.notify();
    }
  }
}
