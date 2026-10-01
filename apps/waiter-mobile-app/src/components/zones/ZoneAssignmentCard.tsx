import React from 'react';
import { WaiterAssignedTablesDTO, WaiterZoneHelper } from '../../../../../packages/ui/src/waiter-zones';

export interface ZoneAssignmentCardProps {
  assignedData: WaiterAssignedTablesDTO;
  waiterName: string;
  onRefresh?: () => void;
}

export const ZoneAssignmentCard: React.FC<ZoneAssignmentCardProps> = ({
  assignedData,
  waiterName,
  onRefresh,
}) => {
  if (!assignedData.assigned) {
    return (
      <div
        style={{
          backgroundColor: '#FFFBEB',
          border: '1px dashed #F59E0B',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'center',
          color: '#92400E',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: '18px' }}>No Active Zone Assigned</div>
        <div style={{ fontSize: '14px', marginTop: '4px' }}>
          Hello {waiterName}, please ask your Floor Captain to assign your duty tables.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {assignedData.floorLevel || 'Floor Duty'}
          </span>
          <h2 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: 800, color: '#111827' }}>
            {assignedData.zoneName}
          </h2>
          <div style={{ color: '#6B7280', fontSize: '14px' }}>
            {WaiterZoneHelper.formatTableList(assignedData.tableNumbers)}
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              minHeight: '48px',
              minWidth: '48px',
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '18px',
            }}
            title="Refresh Zone"
          >
            🔄
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
        {assignedData.tables.map((table) => {
          const isOccupied = table.currentStatus === 'OCCUPIED';
          return (
            <div
              key={table._id || table.tableNumber}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: isOccupied ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${isOccupied ? '#FCA5A5' : '#86EFAC'}`,
                color: isOccupied ? '#991B1B' : '#166534',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{isOccupied ? '🔴' : '🟢'}</span>
              <span>{table.tableNumber}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
