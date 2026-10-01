import React from 'react';
import { ReallocatedTableDTO, LoadBalancerHelper } from '../../../../../packages/ui/src/load-balancer';

export interface SpilloverAlertBannerProps {
  lateStaffName: string;
  delayMinutes: number;
  tables: ReallocatedTableDTO[];
  onAcknowledge?: () => void;
}

export const SpilloverAlertBanner: React.FC<SpilloverAlertBannerProps> = ({
  lateStaffName,
  delayMinutes,
  tables,
  onAcknowledge,
}) => {
  if (!tables || tables.length === 0) return null;

  const tableListStr = tables.map((t) => t.tableNumber).join(', ');

  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        border: '2px solid #F59E0B',
        borderRadius: '16px',
        padding: '18px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#92400E' }}>
            Auto-Spillover: {lateStaffName} is {delayMinutes}m Late
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#78350F' }}>
            To prevent guest wait times, tables <strong>{tableListStr}</strong> have been temporarily assigned to you.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {tables.map((t) => (
          <span
            key={t.tableNumber}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              color: '#B45309',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            🍽️ {t.tableNumber} ({t.paxCapacity} Pax)
          </span>
        ))}
      </div>

      {onAcknowledge && (
        <button
          onClick={onAcknowledge}
          style={{
            marginTop: '14px',
            width: '100%',
            minHeight: '48px',
            backgroundColor: '#D97706',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          ✅ I Will Cover These Tables
        </button>
      )}
    </div>
  );
};
