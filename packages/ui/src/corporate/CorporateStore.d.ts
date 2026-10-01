import { IGroupBookingUI, IGroupSummaryUI } from './types';
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
export declare class CorporateStore {
    private state;
    private listeners;
    getState(): ICorporateState;
    subscribe(listener: CorporateStateListener): () => void;
    private notify;
    setGroupBookings(groupBookings: IGroupBookingUI[], summary?: Partial<IGroupSummaryUI>): void;
    selectGroup(group: IGroupBookingUI | null): void;
    setFilterStatus(status: string): void;
    setSearchQuery(query: string): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
    openModal(modalType: 'NEW_GROUP' | 'BULK_CHECKIN' | 'POST_INCIDENTAL' | 'SPLIT_FOLIO' | 'SETTLE_MASTER', group?: IGroupBookingUI): void;
    closeModal(): void;
    updateGroupInList(updatedGroup: IGroupBookingUI): void;
    getFilteredGroups(): IGroupBookingUI[];
}
