export interface StaffWorkloadDTO {
  staffId: string;
  staffName: string;
  assignedTablesCount: number;
  occupiedTablesCount: number;
  pendingOrdersCount: number;
  unresolvedAlertsCount: number;
  workloadScore: number;
}

export type SpilloverTierType =
  | 'TIER_1_TEMPORARY'
  | 'TIER_2_ABSENTEE_ESCALATION'
  | 'RECLAIMED_ON_ARRIVAL';

export interface ReallocatedTableDTO {
  tableNumber: string;
  tableId: string;
  originalWaiterId: string;
  assignedToWaiterId: string;
  assignedToWaiterName: string;
  paxCapacity: number;
  reassignedAt: string | Date;
  status: 'ACTIVE_SPILLOVER' | 'RECLAIMED' | 'SETTLED_BY_PEER';
}

export interface SpilloverLogDTO {
  _id: string;
  scheduledStaffId: string;
  scheduledStaffName: string;
  floorLevel: string;
  plannedStartTime: string;
  delayMinutes: number;
  spilloverTier: SpilloverTierType;
  reallocatedTables: ReallocatedTableDTO[];
  triggeredAt: string | Date;
  staffArrivedAt?: string | Date;
  resolvedAt?: string | Date;
  notes?: string;
}
