import {
  CheckoutPreviewData,
  PaymentTenderItem,
  KeycardVoidAuditDTO,
} from './types';

export type PmsCheckoutListener = () => void;

export class PmsCheckoutStore {
  private static instance: PmsCheckoutStore | null = null;

  private currentPreview: CheckoutPreviewData | null = null;
  private selectedPayments: PaymentTenderItem[] = [];
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private lastCheckoutResult: any | null = null;
  private lastSweepResult: any | null = null;
  private isFolioLocked: boolean = false;
  private folioLockReason: string | null = null;
  private folioLockedAt: string | null = null;
  private keycardAudits: KeycardVoidAuditDTO[] = [];
  private listeners: Set<PmsCheckoutListener> = new Set();

  public static getInstance(): PmsCheckoutStore {
    if (!PmsCheckoutStore.instance) {
      PmsCheckoutStore.instance = new PmsCheckoutStore();
    }
    return PmsCheckoutStore.instance;
  }

  public subscribe(listener: PmsCheckoutListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getCurrentPreview(): CheckoutPreviewData | null {
    return this.currentPreview;
  }

  public getSelectedPayments(): PaymentTenderItem[] {
    return [...this.selectedPayments];
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getLastCheckoutResult(): any | null {
    return this.lastCheckoutResult;
  }

  public getKeycardAudits(): KeycardVoidAuditDTO[] {
    return [...this.keycardAudits];
  }

  public getIsFolioLocked(): boolean {
    return this.isFolioLocked;
  }

  public getFolioLockReason(): string | null {
    return this.folioLockReason;
  }

  public getFolioLockedAt(): string | null {
    return this.folioLockedAt;
  }

  public getLastSweepResult(): any | null {
    return this.lastSweepResult;
  }

  // Setters & Actions
  public setPreview(preview: CheckoutPreviewData | null): void {
    this.currentPreview = preview;
    this.selectedPayments = [];
    this.errorMessage = null;
    this.isFolioLocked = preview?.folio?.folioStatus === 'LOCKED' || Boolean(preview?.folio?.isLocked);
    this.folioLockReason = preview?.folio?.lockReason || null;
    this.folioLockedAt = preview?.folio?.lockedAt ? String(preview.folio.lockedAt) : null;
    this.notify();
  }

  public setFolioLocked(locked: boolean, reason?: string, lockedAt?: Date | string): void {
    this.isFolioLocked = locked;
    this.folioLockReason = reason || null;
    this.folioLockedAt = lockedAt ? String(lockedAt) : (locked ? new Date().toISOString() : null);
    if (this.currentPreview?.folio) {
      this.currentPreview.folio.folioStatus = locked ? 'LOCKED' : 'OPEN';
      this.currentPreview.folio.isLocked = locked;
      this.currentPreview.folio.lockReason = this.folioLockReason || undefined;
      this.currentPreview.folio.lockedAt = this.folioLockedAt || undefined;
    }
    this.notify();
  }

  public setLastSweepResult(result: any): void {
    this.lastSweepResult = result;
    this.notify();
  }

  public applySweptCharges(sweptAmount: number, sweptTax: number, sweptCount: number): void {
    if (this.currentPreview?.folio) {
      this.currentPreview.folio.totalFoodAndBeverage += (sweptAmount - sweptTax);
      this.currentPreview.folio.totalTaxes += sweptTax;
      this.currentPreview.folio.netAmountPayable += sweptAmount;
      this.currentPreview.folio.dueAmount += sweptAmount;
      this.currentPreview.folio.grossCharges += sweptAmount;
      this.currentPreview.folio.isZeroBalance = this.currentPreview.folio.dueAmount <= 0;
      this.currentPreview.pendingOrdersCount = Math.max(0, this.currentPreview.pendingOrdersCount - sweptCount);
      this.currentPreview.hasPendingOrders = this.currentPreview.pendingOrdersCount > 0;
    }
    this.notify();
  }

  public addPayment(payment: PaymentTenderItem): void {
    this.selectedPayments = [...this.selectedPayments, payment];
    this.notify();
  }

  public removePayment(index: number): void {
    this.selectedPayments = this.selectedPayments.filter((_, i) => i !== index);
    this.notify();
  }

  public clearPayments(): void {
    this.selectedPayments = [];
    this.notify();
  }

  public setLastCheckoutResult(result: any): void {
    this.lastCheckoutResult = result;
    this.notify();
  }

  public setKeycardAudits(audits: KeycardVoidAuditDTO[]): void {
    this.keycardAudits = [...audits];
    this.notify();
  }

  public addKeycardAudit(audit: KeycardVoidAuditDTO): void {
    this.keycardAudits = [audit, ...this.keycardAudits];
    this.notify();
  }

  public setIsLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public setErrorMessage(msg: string | null): void {
    this.errorMessage = msg;
    this.notify();
  }

  public reset(): void {
    this.currentPreview = null;
    this.selectedPayments = [];
    this.isLoading = false;
    this.errorMessage = null;
    this.lastCheckoutResult = null;
    this.lastSweepResult = null;
    this.isFolioLocked = false;
    this.folioLockReason = null;
    this.folioLockedAt = null;
    this.notify();
  }
}
