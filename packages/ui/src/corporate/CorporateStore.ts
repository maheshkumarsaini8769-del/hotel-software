import {
  IGroupBookingUI,
  IGroupSummaryUI,
  GroupBookingStatus,
} from './types';

export interface ICorporateState {
  groupBookings: IGroupBookingUI[];
  selectedGroup: IGroupBookingUI | null;
  summary: IGroupSummaryUI;
  filterStatus: string;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  activeModal: 'NEW_GROUP' | 'BULK_CHECKIN' | 'POST_INCIDENTAL' | 'SPLIT_FOLIO' | 'SETTLE_MASTER' | null;
}

export type CorporateStateListener = (state: ICorporateState) => void;

export class CorporateStore {
  private state: ICorporateState = {
    groupBookings: [],
    selectedGroup: null,
    summary: {
      totalGroups: 0,
      totalRoomsBlocked: 0,
      totalRoomsCheckedIn: 0,
      totalCorporateDue: 0,
    },
    filterStatus: 'ALL',
    searchQuery: '',
    loading: false,
    error: null,
    activeModal: null,
  };

  private listeners: CorporateStateListener[] = [];

  getState(): ICorporateState {
    return { ...this.state };
  }

  subscribe(listener: CorporateStateListener): () => void {
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

  setGroupBookings(groupBookings: IGroupBookingUI[], summary?: Partial<IGroupSummaryUI>): void {
    this.state.groupBookings = groupBookings;
    if (summary) {
      this.state.summary = {
        ...this.state.summary,
        ...summary,
      };
    } else {
      let totalRoomsBlocked = 0;
      let totalRoomsCheckedIn = 0;
      let totalCorporateDue = 0;

      groupBookings.forEach((g) => {
        totalRoomsBlocked += g.rooms?.length || 0;
        totalRoomsCheckedIn += g.rooms?.filter((r) => r.status === 'CHECKED_IN').length || 0;
        if (g.masterFolioId && typeof g.masterFolioId === 'object') {
          totalCorporateDue += (g.masterFolioId as any).dueAmount || 0;
        }
      });

      this.state.summary = {
        totalGroups: groupBookings.length,
        totalRoomsBlocked,
        totalRoomsCheckedIn,
        totalCorporateDue,
      };
    }
    this.notify();
  }

  selectGroup(group: IGroupBookingUI | null): void {
    this.state.selectedGroup = group;
    this.notify();
  }

  setFilterStatus(status: string): void {
    this.state.filterStatus = status;
    this.notify();
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  openModal(
    modalType: 'NEW_GROUP' | 'BULK_CHECKIN' | 'POST_INCIDENTAL' | 'SPLIT_FOLIO' | 'SETTLE_MASTER',
    group?: IGroupBookingUI
  ): void {
    this.state.activeModal = modalType;
    if (group) {
      this.state.selectedGroup = group;
    }
    this.notify();
  }

  closeModal(): void {
    this.state.activeModal = null;
    this.notify();
  }

  updateGroupInList(updatedGroup: IGroupBookingUI): void {
    const idx = this.state.groupBookings.findIndex((g) => g._id === updatedGroup._id);
    if (idx !== -1) {
      this.state.groupBookings[idx] = updatedGroup;
    } else {
      this.state.groupBookings.unshift(updatedGroup);
    }
    if (this.state.selectedGroup?._id === updatedGroup._id) {
      this.state.selectedGroup = updatedGroup;
    }
    this.setGroupBookings([...this.state.groupBookings]);
  }

  getFilteredGroups(): IGroupBookingUI[] {
    return this.state.groupBookings.filter((group) => {
      const matchesStatus =
        this.state.filterStatus === 'ALL' || group.status === this.state.filterStatus;

      const q = this.state.searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        group.groupBookingCode?.toLowerCase().includes(q) ||
        group.groupName?.toLowerCase().includes(q) ||
        group.companyName?.toLowerCase().includes(q) ||
        group.organizerName?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }
}
