import React, { useEffect, useState } from 'react';
import { PendingQrOrderDTO } from '../../../../../packages/ui/src/qr-locker/types';
import { QrLockerHelper } from '../../../../../packages/ui/src/qr-locker/QrLockerHelper';

export interface Waiter10sSlaBannerProps {
  order: PendingQrOrderDTO;
  onApprove: (orderId: string) => void;
  onReject: (orderId: string, reason?: string) => void;
  onAutoApproved?: (orderId: string) => void;
}

export const Waiter10sSlaBanner: React.FC<Waiter10sSlaBannerProps> = ({
  order,
  onApprove,
  onReject,
  onAutoApproved,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    QrLockerHelper.calculateSlaSecondsRemaining(order.approvalDeadline)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = QrLockerHelper.calculateSlaSecondsRemaining(order.approvalDeadline);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        if (onAutoApproved) {
          onAutoApproved(order.orderId);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [order.approvalDeadline, order.orderId, onAutoApproved]);

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 10) * 100));

  return (
    <div
      style={{
        backgroundColor: '#1E1B4B', // Deep indigo
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        marginBottom: '14px',
        border: '1px solid #4338CA',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚡</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>
              Table {order.tableNumber} • New QR Order
            </div>
            <div style={{ fontSize: '12px', color: '#A5B4FC' }}>
              Order #{order.orderNumber} • {order.itemsCount} items • ₹{order.subTotal}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: secondsRemaining <= 3 ? '#EF4444' : '#FBBF24',
            }}
          >
            {secondsRemaining}s
          </div>
          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>Auto-KDS</div>
        </div>
      </div>

      {/* SLA Countdown Progress Bar */}
      <div
        style={{
          height: '6px',
          borderRadius: '999px',
          backgroundColor: '#312E81',
          overflow: 'hidden',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: secondsRemaining <= 3 ? '#EF4444' : '#6366F1',
            transition: 'width 0.5s linear',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => onReject(order.orderId)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #EF4444',
            backgroundColor: 'transparent',
            color: '#F87171',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          ✕ Reject
        </button>

        <button
          type="button"
          onClick={() => onApprove(order.orderId)}
          style={{
            flex: 2,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
          }}
        >
          ✓ Tap to Approve (KDS)
        </button>
      </div>
    </div>
  );
};
