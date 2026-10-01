import React, { useState, useEffect } from 'react';
import { FoodPickupTicketDTO, FoodPickupHelper } from '../../../../../packages/ui/src/food-pickup-sla';

export interface FoodPickupCardProps {
  ticket: FoodPickupTicketDTO;
  onSnooze: (ticketId: string) => Promise<void> | void;
  onConfirmPickup: (ticketId: string) => Promise<void> | void;
}

export const FoodPickupCard: React.FC<FoodPickupCardProps> = ({
  ticket,
  onSnooze,
  onConfirmPickup,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    FoodPickupHelper.getRemainingSeconds(ticket)
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec(FoodPickupHelper.getRemainingSeconds(ticket));
    }, 1000);
    return () => clearInterval(timer);
  }, [ticket]);

  const urgency = FoodPickupHelper.getUrgencyLevel(remainingSec, ticket.slaMinutes);
  const badge = FoodPickupHelper.getStatusBadge(ticket.status);

  const getBorderColor = () => {
    if (ticket.status === 'SLA_BREACHED' || urgency === 'breached') return '#DC2626';
    if (urgency === 'urgent') return '#EA580C';
    if (urgency === 'warning') return '#D97706';
    return '#16A34A';
  };

  const handleSnooze = async () => {
    setLoading(true);
    try {
      await onSnooze(ticket._id);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmPickup(ticket._id);
    } finally {
      setLoading(false);
    }
  };

  const isEnRoute = ticket.status === 'WAITER_EN_ROUTE';
  const isPickedUp = ticket.status === 'PICKED_UP' || ticket.status === 'DELIVERED';
  const maxSnoozeHit = ticket.snoozeCount >= 1; // standard limit 1

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: `2px solid ${getBorderColor()}`,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#111827',
            }}
          >
            🍽️ Table {ticket.tableNumber}
          </span>
          <span style={{ fontSize: '13px', color: '#6B7280', marginLeft: '8px' }}>
            ({ticket.floorLevel})
          </span>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Order Info & Items */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
          Order #{ticket.orderNumber}
        </div>
        <div style={{ fontSize: '13px', color: '#4B5563', marginTop: '4px' }}>
          {ticket.itemsSummary}
        </div>
      </div>

      {/* Countdown SLA Timer */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          backgroundColor: urgency === 'breached' ? '#FEE2E2' : urgency === 'urgent' ? '#FFEDD5' : '#F0FDF4',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          {urgency === 'breached' ? '⚠️ SLA Breached (Food Cold)' : '⏳ Food Pickup SLA'}
        </span>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: urgency === 'breached' ? '#DC2626' : urgency === 'urgent' ? '#C2410C' : '#15803D',
          }}
        >
          {FoodPickupHelper.formatMmSs(remainingSec)}
        </span>
      </div>

      {/* Actions: Minimum 48px touch targets */}
      {!isPickedUp && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button
            onClick={handleSnooze}
            disabled={loading || maxSnoozeHit || isEnRoute}
            style={{
              flex: 1,
              minHeight: '48px',
              backgroundColor: maxSnoozeHit || isEnRoute ? '#E5E7EB' : '#2563EB',
              color: maxSnoozeHit || isEnRoute ? '#9CA3AF' : '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: maxSnoozeHit || isEnRoute ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {isEnRoute ? '🏃 En Route (+60s)' : maxSnoozeHit ? '⛔ Snooze Used' : '🏃 On My Way (+60s)'}
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1.2,
              minHeight: '48px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            ✅ Picked Up
          </button>
        </div>
      )}
    </div>
  );
};
