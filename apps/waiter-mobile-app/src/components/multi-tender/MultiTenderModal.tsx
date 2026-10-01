import React, { useState } from 'react';
import {
  TenderLineDTO,
  TenderMethod,
  MultiTenderHelper,
} from '../../../../../packages/ui/src/multi-tender';

export interface MultiTenderModalProps {
  billNumber: string;
  tableNumber?: string;
  grandTotal: number;
  isOpen: boolean;
  onClose: () => void;
  onSettle: (tenders: TenderLineDTO[]) => Promise<void> | void;
}

export const MultiTenderModal: React.FC<MultiTenderModalProps> = ({
  billNumber,
  tableNumber,
  grandTotal,
  isOpen,
  onClose,
  onSettle,
}) => {
  const [tenders, setTenders] = useState<TenderLineDTO[]>([
    { method: 'CASH', amount: 0, cashReceived: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalTendered = MultiTenderHelper.sumTenders(tenders);
  const remaining = MultiTenderHelper.getRemainingBalance(grandTotal, tenders);

  const addTenderMethod = (method: TenderMethod) => {
    const defaultAmount = remaining > 0 ? remaining : 0;
    setTenders([...tenders, { method, amount: defaultAmount, cashReceived: defaultAmount }]);
  };

  const removeTender = (idx: number) => {
    if (tenders.length <= 1) return;
    setTenders(tenders.filter((_, i) => i !== idx));
  };

  const updateAmount = (idx: number, amt: number) => {
    const updated = [...tenders];
    updated[idx].amount = amt;
    if (updated[idx].method === 'CASH') {
      updated[idx].cashReceived = amt;
    }
    setTenders(updated);
  };

  const updateCashReceived = (idx: number, received: number) => {
    const updated = [...tenders];
    updated[idx].cashReceived = received;
    if (received >= updated[idx].amount) {
      updated[idx].cashChangeReturned = MultiTenderHelper.calculateCashChange(
        updated[idx].amount,
        received
      );
    }
    setTenders(updated);
  };

  const updateRef = (idx: number, ref: string) => {
    const updated = [...tenders];
    updated[idx].referenceNumber = ref;
    setTenders(updated);
  };

  const handleSettle = async () => {
    setErrorMsg('');
    if (remaining !== 0) {
      setErrorMsg(`Tenders sum (${MultiTenderHelper.formatCurrency(totalTendered)}) must match bill total (${MultiTenderHelper.formatCurrency(grandTotal)})`);
      return;
    }

    setLoading(true);
    try {
      await onSettle(tenders);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Settlement failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
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
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              Split Tender Settlement: #{billNumber}
            </h3>
            {tableNumber && (
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                Table: {tableNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '22px',
              cursor: 'pointer',
              minWidth: '48px',
              minHeight: '48px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Bill Summary Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>BILL TOTAL</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>
                {MultiTenderHelper.formatCurrency(grandTotal)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>REMAINING TO SETTLE</div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: remaining === 0 ? '#16A34A' : remaining > 0 ? '#DC2626' : '#D97706',
                }}
              >
                {MultiTenderHelper.formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Tender Rows */}
          {tenders.map((line, idx) => {
            const badge = MultiTenderHelper.getTenderBadge(line.method);
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '12px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {badge.icon} {badge.label}
                  </span>
                  {tenders.length > 1 && (
                    <button
                      onClick={() => removeTender(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minHeight: '48px',
                        padding: '0 8px',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Amount (₹):
                    </label>
                    <input
                      type="number"
                      value={line.amount || ''}
                      onChange={(e) => updateAmount(idx, Number(e.target.value))}
                      style={{
                        width: '100%',
                        minHeight: '48px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        padding: '0 10px',
                        fontSize: '15px',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  {line.method === 'CASH' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        Cash Received (₹):
                      </label>
                      <input
                        type="number"
                        value={line.cashReceived || ''}
                        onChange={(e) => updateCashReceived(idx, Number(e.target.value))}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          padding: '0 10px',
                          fontSize: '15px',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  )}

                  {line.method !== 'CASH' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        Ref (UTR / Last 4 / Room):
                      </label>
                      <input
                        type="text"
                        value={line.referenceNumber || ''}
                        placeholder={line.method === 'UPI' ? 'UPI UTR Number' : line.method === 'ROOM_FOLIO' ? 'Room Number' : 'Auth Code'}
                        onChange={(e) => updateRef(idx, e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '48px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          padding: '0 10px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  )}
                </div>

                {line.method === 'CASH' && (line.cashChangeReturned || 0) > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#15803D',
                    }}
                  >
                    💵 Change to return: ₹{line.cashChangeReturned}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Add Tender Buttons */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              + Add Split Tender:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(['CASH', 'UPI', 'CARD', 'ROOM_FOLIO', 'CITY_LEDGER'] as TenderMethod[]).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => addTenderMethod(m)}
                    style={{
                      minHeight: '48px',
                      padding: '0 14px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1E293B',
                      cursor: 'pointer',
                    }}
                  >
                    +{m}
                  </button>
                )
              )}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px',
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: '48px',
              backgroundColor: '#E2E8F0',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSettle}
            disabled={loading || remaining !== 0}
            style={{
              flex: 2,
              minHeight: '48px',
              backgroundColor: remaining === 0 ? '#16A34A' : '#94A3B8',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 800,
              color: '#FFFFFF',
              cursor: remaining === 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Settling...' : '✅ Complete Split Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
};
