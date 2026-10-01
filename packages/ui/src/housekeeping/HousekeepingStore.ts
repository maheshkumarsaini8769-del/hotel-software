import {
  HousekeepingBoardRoom,
  HousekeepingSummary,
  CheckpointItem,
  MinibarItemAudit,
  LinenTurnaroundAction,
  MaintenanceEscalationPayload,
} from './types';
import { HousekeepingHelper } from './HousekeepingHelper';
import { RoomStatus } from '@spicehub/shared-types';

export type HousekeepingStoreListener = () => void;

export class HousekeepingStore {
  private rooms: HousekeepingBoardRoom[] = [];
  private summary: HousekeepingSummary = {
    total: 0,
    clean: 0,
    dirty: 0,
    cleaning: 0,
    inspection: 0,
    outOfService: 0,
    occupied: 0,
  };
  private selectedFloor: number | 'ALL' = 'ALL';
  private statusFilter: RoomStatus | 'ALL' = 'ALL';
  private searchQuery: string = '';
  private selectedRoom: HousekeepingBoardRoom | null = null;

  // Modal Visibility
  private isAttendantModalOpen: boolean = false;
  private isInspectionModalOpen: boolean = false;
  private isMaintenanceModalOpen: boolean = false;

  // Working drafts
  private activeChecklist: CheckpointItem[] = [];
  private activeMinibarAudit: MinibarItemAudit[] = [];
  private activeLinenAction: LinenTurnaroundAction = 'FULL_WASH';
  private inspectionNotes: string = '';
  private maintenanceDraft: MaintenanceEscalationPayload = {
    category: 'GENERAL',
    title: '',
    description: '',
    priority: 'HIGH',
    blocksRoom: true,
  };

  private ecoTuckInCount: number = 0;
  private isLoading: boolean = false;
  private error: string | null = null;
  private listeners: Set<HousekeepingStoreListener> = new Set();

  constructor(initialRooms: HousekeepingBoardRoom[] = []) {
    this.rooms = [...initialRooms];
    this.recomputeSummary();
  }

  public subscribe(listener: HousekeepingStoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in HousekeepingStore listener:', err);
      }
    });
  }

  public setBoardData(rooms: HousekeepingBoardRoom[], summary?: HousekeepingSummary): void {
    this.rooms = [...rooms];
    if (summary) {
      this.summary = summary;
    } else {
      this.recomputeSummary();
    }
    this.notify();
  }

  private recomputeSummary(): void {
    let clean = 0;
    let dirty = 0;
    let cleaning = 0;
    let inspection = 0;
    let outOfService = 0;
    let occupied = 0;

    this.rooms.forEach((r) => {
      if (r.status === RoomStatus.AVAILABLE) clean++;
      else if (r.status === RoomStatus.DIRTY) dirty++;
      else if (r.status === RoomStatus.CLEANING) cleaning++;
      else if (r.status === RoomStatus.INSPECTION) inspection++;
      else if (r.status === RoomStatus.OUT_OF_SERVICE) outOfService++;
      else if (r.status === RoomStatus.OCCUPIED) occupied++;
    });

    this.summary = {
      total: this.rooms.length,
      clean,
      dirty,
      cleaning,
      inspection,
      outOfService,
      occupied,
    };
  }

  public getSummary(): HousekeepingSummary {
    return this.summary;
  }

  public getFloors(): number[] {
    const floorSet = new Set<number>();
    this.rooms.forEach((r) => floorSet.add(r.floorNumber));
    return Array.from(floorSet).sort((a, b) => a - b);
  }

  public getSelectedFloor(): number | 'ALL' {
    return this.selectedFloor;
  }

  public filterByFloor(floor: number | 'ALL'): void {
    this.selectedFloor = floor;
    this.notify();
  }

  public getStatusFilter(): RoomStatus | 'ALL' {
    return this.statusFilter;
  }

  public filterByStatus(status: RoomStatus | 'ALL'): void {
    this.statusFilter = status;
    this.notify();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(q: string): void {
    this.searchQuery = q;
    this.notify();
  }

  public getFilteredRooms(): HousekeepingBoardRoom[] {
    return this.rooms.filter((room) => {
      if (this.selectedFloor !== 'ALL' && room.floorNumber !== this.selectedFloor) {
        return false;
      }
      if (this.statusFilter !== 'ALL' && room.status !== this.statusFilter) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchesRoom = room.roomNumber.toLowerCase().includes(q);
        const matchesGuest = room.guestInfo?.guestName.toLowerCase().includes(q) || false;
        const matchesType = room.roomType?.name.toLowerCase().includes(q) || false;
        if (!matchesRoom && !matchesGuest && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }

  public getSelectedRoom(): HousekeepingBoardRoom | null {
    return this.selectedRoom;
  }

  public openAttendantModal(room: HousekeepingBoardRoom): void {
    this.selectedRoom = room;
    this.isAttendantModalOpen = true;

    // Initialize checklist from active task or default
    if (room.activeTask && room.activeTask.checklist && room.activeTask.checklist.length > 0) {
      this.activeChecklist = room.activeTask.checklist.map((c) => ({ ...c }));
    } else {
      this.activeChecklist = [
        { taskName: 'Strip bedding and replace linens', isDone: false },
        { taskName: 'Disinfect bathroom and replenish towels', isDone: false },
        { taskName: 'Dust surfaces and vacuum carpet', isDone: false },
        { taskName: 'Restock guest amenities and mini bar', isDone: false },
        { taskName: 'Sanitize high-touch door handles & switches', isDone: false },
      ];
    }

    // Reset minibar items clone
    this.activeMinibarAudit = HousekeepingHelper.DEFAULT_MINIBAR_ITEMS.map((item) => ({ ...item }));
    this.activeLinenAction = 'FULL_WASH';
    this.notify();
  }

  public closeAttendantModal(): void {
    this.isAttendantModalOpen = false;
    this.notify();
  }

  public isAttendantModalActive(): boolean {
    return this.isAttendantModalOpen;
  }

  public getActiveChecklist(): CheckpointItem[] {
    return this.activeChecklist;
  }

  public toggleChecklistItem(index: number): void {
    if (this.activeChecklist[index]) {
      this.activeChecklist[index].isDone = !this.activeChecklist[index].isDone;
      this.notify();
    }
  }

  public getActiveMinibarAudit(): MinibarItemAudit[] {
    return this.activeMinibarAudit;
  }

  public updateMinibarQuantity(id: string, delta: number): void {
    const item = this.activeMinibarAudit.find((it) => it.id === id);
    if (item) {
      item.quantity = Math.max(0, (item.quantity || 0) + delta);
      this.notify();
    }
  }

  public getActiveLinenAction(): LinenTurnaroundAction {
    return this.activeLinenAction;
  }

  public setLinenAction(action: LinenTurnaroundAction): void {
    this.activeLinenAction = action;
    if (action === 'TUCK_IN') {
      this.ecoTuckInCount++;
    }
    this.notify();
  }

  // Supervisor Inspection
  public openInspectionModal(room: HousekeepingBoardRoom): void {
    this.selectedRoom = room;
    this.isInspectionModalOpen = true;
    this.inspectionNotes = '';
    this.notify();
  }

  public closeInspectionModal(): void {
    this.isInspectionModalOpen = false;
    this.notify();
  }

  public isInspectionModalActive(): boolean {
    return this.isInspectionModalOpen;
  }

  public getInspectionNotes(): string {
    return this.inspectionNotes;
  }

  public setInspectionNotes(notes: string): void {
    this.inspectionNotes = notes;
    this.notify();
  }

  // Maintenance Escalation
  public openMaintenanceModal(room: HousekeepingBoardRoom): void {
    this.selectedRoom = room;
    this.isMaintenanceModalOpen = true;
    this.maintenanceDraft = {
      category: 'GENERAL',
      title: '',
      description: '',
      priority: 'HIGH',
      blocksRoom: true,
    };
    this.notify();
  }

  public closeMaintenanceModal(): void {
    this.isMaintenanceModalOpen = false;
    this.notify();
  }

  public isMaintenanceModalActive(): boolean {
    return this.isMaintenanceModalOpen;
  }

  public getMaintenanceDraft(): MaintenanceEscalationPayload {
    return this.maintenanceDraft;
  }

  public updateMaintenanceDraft(patch: Partial<MaintenanceEscalationPayload>): void {
    this.maintenanceDraft = { ...this.maintenanceDraft, ...patch };
    this.notify();
  }

  // Eco Stats
  public getEcoWaterSavings(): { liters: number; kwhSaved: number } {
    return HousekeepingHelper.calculateEcoWaterSaved(this.ecoTuckInCount);
  }

  public getMinibarAuditTotal(): number {
    return HousekeepingHelper.calculateMinibarTotal(this.activeMinibarAudit);
  }

  public setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notify();
  }

  public getLoading(): boolean {
    return this.isLoading;
  }

  public setError(error: string | null): void {
    this.error = error;
    this.notify();
  }

  public getError(): string | null {
    return this.error;
  }
}
