import { CommunityTableDTO, SeatItemDTO, SeatStatus } from './types';

type Listener = () => void;

export class CoDiningStore {
  private tables: CommunityTableDTO[] = [];
  private selectedTable: CommunityTableDTO | null = null;
  private selectedSeatNumbers: number[] = [];
  private filterSection: string = 'ALL';
  private filterMinSeats: number = 1;
  private isLoading: boolean = false;
  private errorMessage: string | null = null;
  private listeners: Listener[] = [];

  constructor(initialTables?: CommunityTableDTO[]) {
    if (initialTables) {
      this.tables = initialTables;
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
  public getTables(): CommunityTableDTO[] {
    return this.tables;
  }

  public getFilteredTables(): CommunityTableDTO[] {
    return this.tables.filter((t) => {
      const matchesSection = this.filterSection === 'ALL' || t.section === this.filterSection;
      const matchesSeats = t.availableSeatsCount >= this.filterMinSeats;
      return matchesSection && matchesSeats;
    });
  }

  public getSelectedTable(): CommunityTableDTO | null {
    return this.selectedTable;
  }

  public getSelectedSeatNumbers(): number[] {
    return this.selectedSeatNumbers;
  }

  public getFilterSection(): string {
    return this.filterSection;
  }

  public getFilterMinSeats(): number {
    return this.filterMinSeats;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // Setters & Actions
  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public setError(error: string | null): void {
    this.errorMessage = error;
    this.notify();
  }

  public setTables(tables: CommunityTableDTO[]): void {
    this.tables = tables;
    if (this.selectedTable) {
      const refreshed = tables.find((t) => t.tableId === this.selectedTable?.tableId);
      this.selectedTable = refreshed || null;
    }
    this.errorMessage = null;
    this.notify();
  }

  public selectTable(table: CommunityTableDTO | null): void {
    this.selectedTable = table;
    this.selectedSeatNumbers = [];
    this.notify();
  }

  public toggleSeatSelection(seatNumber: number): void {
    if (!this.selectedTable) return;
    const targetSeat = this.selectedTable.seats.find((s) => s.seatNumber === seatNumber);
    if (!targetSeat || targetSeat.status !== 'AVAILABLE') return;

    if (this.selectedSeatNumbers.includes(seatNumber)) {
      this.selectedSeatNumbers = this.selectedSeatNumbers.filter((n) => n !== seatNumber);
    } else {
      this.selectedSeatNumbers.push(seatNumber);
    }
    this.notify();
  }

  public clearSeatSelection(): void {
    this.selectedSeatNumbers = [];
    this.notify();
  }

  public setFilterSection(section: string): void {
    this.filterSection = section;
    this.notify();
  }

  public setFilterMinSeats(count: number): void {
    this.filterMinSeats = count;
    this.notify();
  }

  public updateSeatStatus(
    tableId: string,
    seatNumber: number,
    status: SeatStatus,
    guestName?: string
  ): void {
    const table = this.tables.find((t) => t.tableId === tableId);
    if (table) {
      const seat = table.seats.find((s) => s.seatNumber === seatNumber);
      if (seat) {
        seat.status = status;
        seat.guestName = guestName;
      }
      table.occupiedSeatsCount = table.seats.filter((s) => s.status === 'OCCUPIED').length;
      table.availableSeatsCount = table.capacity - table.occupiedSeatsCount;
      table.hasOpenSeats = table.availableSeatsCount > 0;
      this.notify();
    }
  }
}
