import React, { useState, useEffect, useMemo } from 'react';
import { SeatBillingStore } from '../../../../../packages/ui/src/seat-billing/SeatBillingStore';
import { SeatSubFolioDTO, SettleSubFolioPayload } from '../../../../../packages/ui/src/seat-billing/types';
import { SeatBillingHelper } from '../../../../../packages/ui/src/seat-billing/SeatBillingHelper';
import { SubFolioSplitCard } from './SubFolioSplitCard';

export interface SeatBillingAppProps {
  store?: SeatBillingStore;
  tableNumber?: string;
  onSettleSubFolioSubmit?: (subFolioId: string, payload: SettleSubFolioPayload) => Promise<void> | void;
  onMergeSubFoliosSubmit?: (targetSubFolioId: string, sourceSubFolioIds: string[]) => Promise<void> | void;
}

export const SeatBillingApp: React.FC<SeatBillingAppProps> = ({
  store,
  tableNumber = 'T-1',
  onSettleSubFolioSubmit,
  onMergeSubFoliosSubmit,
}) => {
  const effectiveStore = useMemo(() => store || new SeatBillingStore(), [store]);
  const [subFolios, setSubFolios] = useState<SeatSubFolioDTO[]>(effectiveStore.getSubFolios());
  const [selectedForSettle, setSelectedForSettle] = useState<SeatSubFolioDTO | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'POST_TO_ROOM'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptText, setReceiptText] = useState('');

  useEffect(() => {
    const unsubscribe = effectiveStore.subscribe(() => {
      setSubFolios(effectiveStore.getSubFolios());
    });
    return () => unsubscribe();
  }, [effectiveStore]);

  const handleSettleSubmit = async () => {
    if (selectedForSettle && onSettleSubFolioSubmit) {
      await onSettleSubFolioSubmit(selectedForSettle._id, {
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        paidAmount: selectedForSettle.grandTotal,
        settledByStaffName: 'Fast Cashier Counter',
      });
      effectiveStore.settleSubFolioLocally(selectedForSettle._id, {
        paymentMethod,
        transactionRef,
        paidAmount: selectedForSettle.grandTotal,
      });
      setSelectedForSettle(null);
    }
  };

  const handlePrintReceipt = (subFolio: SeatSubFolioDTO) => {
    const text = SeatBillingHelper.formatThermalReceiptText(subFolio);
    setReceiptText(text);
    setIsReceiptModalOpen(true);
  };

  const totalOutstanding = effectiveStore.getTotalOutstandingAmount();

  return (
    <div style={{ padding: '24px', backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111827' }}>
            🧾 Table {tableNumber} • Independent Seat Bills
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6B7280' }}>
            Settle individual seat sub-folios (Bill A vs Bill B) independently without affecting other diners.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>Total Table Outstanding</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: totalOutstanding > 0 ? '#DC2626' : '#059669' }}>
            ₹{totalOutstanding}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {subFolios.map((folio) => (
          <SubFolioSplitCard
            key={folio._id}
            subFolio={folio}
            onSettleClick={(f) => setSelectedForSettle(f)}
            onPrintClick={handlePrintReceipt}
          />
        ))}
      </div>

      {/* Settle Modal */}
      {selectedForSettle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Settle {SeatBillingHelper.formatSubFolioTitle(selectedForSettle)}
            </h3>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginBottom: '16px' }}>
              Amount Due: ₹{selectedForSettle.grandTotal}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Payment Tender Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['UPI', 'CASH', 'CARD', 'POST_TO_ROOM'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: paymentMethod === method ? '2px solid #059669' : '1px solid #D1D5DB',
                      backgroundColor: paymentMethod === method ? '#ECFDF5' : '#FFFFFF',
                      color: paymentMethod === method ? '#059669' : '#374151',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    {method === 'UPI' && '📱 UPI QR'}
                    {method === 'CASH' && '💵 Cash'}
                    {method === 'CARD' && '💳 Card EDC'}
                    {method === 'POST_TO_ROOM' && '🛏️ Room Folio'}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'UPI' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  UPI Ref / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423456789012"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedForSettle(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              🖨️ Thermal Print Receipt
            </h3>
            <pre
              style={{
                backgroundColor: '#F9FAFB',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid #E5E7EB',
              }}
            >
              {receiptText}
            </pre>
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
