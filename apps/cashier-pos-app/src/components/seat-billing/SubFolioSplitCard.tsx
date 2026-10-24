import React from 'react';
import { SeatSubFolioDTO } from '../../../../../packages/ui/src/seat-billing/types';
import { SeatBillingHelper } from '../../../../../packages/ui/src/seat-billing/SeatBillingHelper';

export interface SubFolioSplitCardProps {
  subFolio: SeatSubFolioDTO;
  onSettleClick?: (subFolio: SeatSubFolioDTO) => void;
  onPrintClick?: (subFolio: SeatSubFolioDTO) => void;
}

export const SubFolioSplitCard: React.FC<SubFolioSplitCardProps> = ({
  subFolio,
  onSettleClick,
  onPrintClick,
}) => {
  const badge = SeatBillingHelper.getSubFolioStatusBadge(subFolio.status);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        padding: '16px',
        border: `1px solid ${subFolio.status === 'SETTLED' ? '#10B981' : '#E5E7EB'}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '260px',
      }}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
              {SeatBillingHelper.formatSubFolioTitle(subFolio)}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Bill #{subFolio.subFolioNumber}
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '999px',
              fontWeight: 700,
              backgroundColor: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Item List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {subFolio.lineItems.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span style={{ fontWeight: 600 }}>₹{item.subtotal}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {/* Tax and Total Breakdown */}
        <div
          style={{
            borderTop: '1px dashed #E5E7EB',
            paddingTop: '10px',
            marginBottom: '14px',
            fontSize: '12px',
            color: '#6B7280',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Subtotal:</span>
            <span>₹{subFolio.subTotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>GST (2.5% CGST + 2.5% SGST):</span>
            <span>₹{subFolio.totalTax}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '15px',
              fontWeight: 800,
              color: '#111827',
              marginTop: '4px',
            }}
          >
            <span>Total Payable:</span>
            <span style={{ color: subFolio.status === 'SETTLED' ? '#059669' : '#DC2626' }}>
              ₹{subFolio.grandTotal}
            </span>
          </div>
          {subFolio.status === 'SETTLED' && (
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
              ✓ Paid via {subFolio.paymentMethod}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {subFolio.status !== 'SETTLED' && onSettleClick && (
            <button
              type="button"
              onClick={() => onSettleClick(subFolio)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Settle Seat Bill
            </button>
          )}

          {onPrintClick && (
            <button
              type="button"
              onClick={() => onPrintClick(subFolio)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              🖨️ Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
