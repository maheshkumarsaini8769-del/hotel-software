import React from 'react';

export interface LateArrivalReclaimModalProps {
  delayMinutes: number;
  openTablesCount: number;
  occupiedTablesCount: number;
  onReclaimOpenTables: () => void;
  onKeepWithHelper: () => void;
}

export const LateArrivalReclaimModal: React.FC<LateArrivalReclaimModalProps> = ({
  delayMinutes,
  openTablesCount,
  occupiedTablesCount,
  onReclaimOpenTables,
  onKeepWithHelper,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '36px' }}>⏰</div>
        <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: 800, color: '#111827' }}>
          Welcome! Clock-In Recorded
        </h3>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
          You arrived <strong>{delayMinutes} minutes late</strong>. Your tables were covered by peers to prevent guest delays.
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#F3F4F6',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{openTablesCount}</div>
          <div style={{ fontSize: '12px', color: '#4B5563' }}>Open Tables</div>
        </div>
        <div style={{ borderLeft: '1px solid #D1D5DB' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>{occupiedTablesCount}</div>
          <div style={{ fontSize: '12px', color: '#4B5563' }}>Dining In Progress</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={onReclaimOpenTables}
          style={{
            minHeight: '48px',
            backgroundColor: '#1E40AF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          🔄 Reclaim {openTablesCount} Open Tables
        </button>

        <button
          onClick={onKeepWithHelper}
          style={{
            minHeight: '48px',
            backgroundColor: '#F3F4F6',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Leave with Helper Peers Until Shift End
        </button>
      </div>
    </div>
  );
};
