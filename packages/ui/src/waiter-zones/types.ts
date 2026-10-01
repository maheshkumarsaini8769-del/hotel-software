export interface WaiterZoneDTO {
  _id: string;
  zoneName: string;
  floorLevel: string;
  waiterId: string;
  waiterName: string;
  tableNumbers: string[];
  backupWaiterId?: string;
  backupWaiterName?: string;
  isActive: boolean;
  notes?: string;
}

export type AlertType =
  | 'CUSTOMER_CALL'
  | 'QR_ORDER_PLACED'
  | 'BILL_REQUEST'
  | 'CLEANING_REQUEST'
  | 'WATER_REFILL';

export type AlertRoutingType =
  | 'PRIMARY_TARGETED'
  | 'BACKUP_TARGETED'
  | 'ZONE_BROADCAST'
  | 'CAPTAIN_ESCALATION';

export type AlertPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type AlertStatus =
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'ON_MY_WAY'
  | 'RESOLVED'
  | 'ESCALATED';

export interface TargetedAlertDTO {
  _id: string;
  alertType: AlertType;
  tableId: string;
  tableNumber: string;
  targetWaiterId?: string;
  targetWaiterName?: string;
  routingType: AlertRoutingType;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  sentAt: string | Date;
  acknowledgedAt?: string | Date;
  resolvedAt?: string | Date;
  acknowledgedByName?: string;
}

export interface WaiterAssignedTablesDTO {
  assigned: boolean;
  zoneName?: string;
  floorLevel?: string;
  tableNumbers: string[];
  tables: Array<{
    _id: string;
    tableNumber: string;
    section: string;
    capacity: number;
    currentStatus: string;
    availableSeatsCount?: number;
    occupiedSeatsCount?: number;
  }>;
}
