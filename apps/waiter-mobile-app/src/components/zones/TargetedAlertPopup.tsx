import React from 'react';
import { TargetedAlertDTO, WaiterZoneHelper } from '../../../../../packages/ui/src/waiter-zones';

export interface TargetedAlertPopupProps {
  alert: TargetedAlertDTO;
  onOnMyWay: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

export const TargetedAlertPopup: React.FC<TargetedAlertPopupProps> = ({
  alert,
  onOnMyWay,
  onResolve,
}) => {
  const priorityStyle = WaiterZoneHelper.getPriorityColor(alert.priority);
  const isPending = alert.status === 'SENT' || alert.status === 'DELIVERED';
  const isOnMyWay = alert.status === 'ON_MY_WAY';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        border: `2px solid ${priorityStyle.border}`,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        marginBottom: '16px',
        animation: isPending ? 'pulse 2s infinite' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: priorityStyle.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            {alert.alertType === 'CUSTOMER_CALL'
              ? '🔔'
              : alert.alertType === 'BILL_REQUEST'
              ? '🧾'
              : alert.alertType === 'WATER_REFILL'
              ? '💧'
              : '🍽️'}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
              Table {alert.tableNumber}
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>{alert.title}</div>
          </div>
        </div>

        <span
          style={{
            backgroundColor: priorityStyle.bg,
            color: priorityStyle.text,
            border: `1px solid ${priorityStyle.border}`,
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '12px',
            textTransform: 'uppercase',
          }}
        >
          {alert.priority}
        </span>
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#F9FAFB',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#374151',
          lineHeight: '1.4',
        }}
      >
        {alert.message}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        {!isOnMyWay && (
          <button
            onClick={() => onOnMyWay(alert._id)}
            style={{
              flex: 1,
              minHeight: '48px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>🏃</span>
            <span>On My Way</span>
          </button>
        )}

        <button
          onClick={() => onResolve(alert._id)}
          style={{
            flex: isOnMyWay ? 1 : 0.8,
            minHeight: '48px',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>✅</span>
          <span>Resolve</span>
        </button>
      </div>
    </div>
  );
};
