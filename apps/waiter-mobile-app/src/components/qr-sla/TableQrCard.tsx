import React from 'react';
import { QrSessionDTO } from '../../../../../packages/ui/src/qr-locker/types';

export interface TableQrCardProps {
  tableNumber: string;
  permanentQrUrl: string;
  session?: QrSessionDTO | null;
  onReleaseSession?: (tableNumber: string) => void;
}

export const TableQrCard: React.FC<TableQrCardProps> = ({
  tableNumber,
  permanentQrUrl,
  session,
  onReleaseSession,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '18px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>
            🔲 Table {tableNumber} Permanent QR
          </h4>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Permanent Physical Sticker Lock
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '999px',
            fontWeight: 700,
            backgroundColor: session?.isLocked ? '#FEF2F2' : '#ECFDF5',
            color: session?.isLocked ? '#B91C1C' : '#047857',
            border: `1px solid ${session?.isLocked ? '#FCA5A5' : '#6EE7B7'}`,
          }}
        >
          {session?.isLocked ? '🔒 Session Active' : '🔓 Unlocked'}
        </span>
      </div>

      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#F9FAFB',
          border: '1px dashed #D1D5DB',
          fontSize: '12px',
          color: '#4B5563',
          wordBreak: 'break-all',
          marginBottom: '14px',
        }}
      >
        <span style={{ fontWeight: 600 }}>Sticker URL: </span>
        {permanentQrUrl}
      </div>

      {session?.isLocked && onReleaseSession && (
        <button
          type="button"
          onClick={() => onReleaseSession(tableNumber)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #EF4444',
            backgroundColor: '#FFFFFF',
            color: '#DC2626',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Clear & Unlock Table Session
        </button>
      )}
    </div>
  );
};
