import React from 'react';
import { FloorOverviewSummaryDTO, FloorDutyHelper } from '../../../../../packages/ui/src/floor-duty-matrix';

export interface FloorDutyMatrixViewProps {
  floors: FloorOverviewSummaryDTO[];
  onAssignRange?: (floorCode: string) => void;
  onRefresh?: () => void;
}

export const FloorDutyMatrixView: React.FC<FloorDutyMatrixViewProps> = ({
  floors,
  onAssignRange,
  onRefresh,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
            🏢 Multi-Floor Waiter Duty Matrix
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
            Live floor workloads, table range assignments, and overload safety alerts
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: '10px 18px',
              minHeight: '48px',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔄</span> Refresh Floors
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {floors.map((floor) => {
          const colors = FloorDutyHelper.getFloorBadgeColor(floor.floorCode);
          const utilization = FloorDutyHelper.getFloorUtilization(floor);
          const hasOverload = floor.overloadedWaitersCount > 0;

          return (
            <div
              key={floor.floorCode}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    fontWeight: 800,
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                  }}
                >
                  {floor.floorCode}
                </span>

                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
                  Captain: {floor.supervisorName}
                </span>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  {floor.floorName}
                </h3>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                  {floor.totalTables} Tables ({floor.totalCapacity} Pax Capacity)
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Coverage</span>
                  <span style={{ fontWeight: 700, color: '#1E40AF' }}>{utilization}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px' }}>
                  <div
                    style={{
                      width: `${utilization}%`,
                      height: '100%',
                      backgroundColor: utilization >= 80 ? '#10B981' : '#F59E0B',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              {/* Overload Warning Alert */}
              {hasOverload && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #F87171',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#991B1B',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Overload Alert: {floor.overloadedWaiters[0].waiterName} assigned{' '}
                  {floor.overloadedWaiters[0].paxCapacity} pax (Cap: {floor.overloadedWaiters[0].cap})!
                </div>
              )}

              {/* Unassigned Tables Notice */}
              {floor.unassignedTablesCount > 0 ? (
                <div style={{ fontSize: '13px', color: '#D97706', fontWeight: 600 }}>
                  ⚠️ {floor.unassignedTablesCount} Unassigned Tables ({floor.unassignedTables.slice(0, 4).join(', ')}...)
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                  ✅ All Tables Fully Covered
                </div>
              )}

              {onAssignRange && (
                <button
                  onClick={() => onAssignRange(floor.floorCode)}
                  style={{
                    marginTop: 'auto',
                    minHeight: '48px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '10px',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ⚙️ Dynamic Range Assigner
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
