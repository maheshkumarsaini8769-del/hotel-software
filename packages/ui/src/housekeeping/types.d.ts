import { RoomStatus } from '@spicehub/shared-types';
export type LinenTurnaroundAction = 'FULL_WASH' | 'TUCK_IN';
export interface MinibarItemAudit {
    id: string;
    name: string;
    rate: number;
    quantity: number;
}
export interface CheckpointItem {
    taskName: string;
    isDone: boolean;
}
export interface ActiveHousekeepingTask {
    _id: string;
    taskType: 'CHECKOUT_CLEAN' | 'STAYOVER_CLEAN' | 'DEEP_CLEAN' | 'INSPECTION_ONLY';
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED_PASSED' | 'INSPECTED_FAILED';
    assignedAttendantId?: {
        _id: string;
        name: string;
        email?: string;
    };
    checklist: CheckpointItem[];
    startedAt?: string;
    completedAt?: string;
    inspectionNotes?: string;
    createdAt: string;
}
export interface HousekeepingSlaInfo {
    targetMinutes: number;
    elapsedMinutes: number;
    isBreached: boolean;
}
export interface HousekeepingGuestInfo {
    stayId: string;
    guestName: string;
    expectedCheckOut: string;
}
export interface HousekeepingBoardRoom {
    roomId: string;
    roomNumber: string;
    floorNumber: number;
    roomType?: {
        _id: string;
        name: string;
        code: string;
    };
    status: RoomStatus;
    activeTask: ActiveHousekeepingTask | null;
    guestInfo: HousekeepingGuestInfo | null;
    sla: HousekeepingSlaInfo;
}
export interface HousekeepingSummary {
    total: number;
    clean: number;
    dirty: number;
    cleaning: number;
    inspection: number;
    outOfService: number;
    occupied: number;
}
export interface MaintenanceEscalationPayload {
    category: 'ELECTRICAL' | 'PLUMBING' | 'HVAC' | 'CARPENTRY' | 'ELECTRONICS' | 'GENERAL';
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    blocksRoom?: boolean;
}
