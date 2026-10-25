import React, { useState, useEffect, useRef } from 'react';
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

interface ActiveUpiInfo {
  transactionRef: string;
  upiUri: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt?: string;
  soundboxAnnouncement?: string;
}

export const MultiTenderModal: React.FC<MultiTenderModalProps> = ({
  billNumber,
  tableNumber = '1',
  grandTotal,
  isOpen,
  onClose,
  onSettle,
}) => {
  const [tenders, setTenders] = useState<TenderLineDTO[]>([
    { method: 'CASH', amount: Math.max(0, grandTotal - 500), cashReceived: Math.max(0, grandTotal - 500) },
    { method: 'UPI', amount: Math.min(500, grandTotal), referenceNumber: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [upiData, setUpiData] = useState<Record<number, ActiveUpiInfo>>({});
  const [generatingUpiIndex, setGeneratingUpiIndex] = useState<number | null>(null);
  const [verifiedUpiMap, setVerifiedUpiMap] = useState<Record<string, boolean>>({});
  const [simulatingRef, setSimulatingRef] = useState<string | null>(null);

  // Poll status for any pending UPI QRs
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      for (const [idxStr, upi] of Object.entries(upiData)) {
        const idx = Number(idxStr);
        if (upi && upi.status === 'PENDING') {
          try {
            const res = await fetch(`/api/v1/dynamic-upi/status/${upi.transactionRef}`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.qr) {
                if (data.qr.status === 'PAID') {
                  setUpiData((prev) => ({
                    ...prev,
                    [idx]: {
                      ...prev[idx],
                      status: 'PAID',
                      soundboxAnnouncement: data.qr.soundboxAnnouncement,
                    },
                  }));
                  setVerifiedUpiMap((prev) => ({ ...prev, [upi.transactionRef]: true }));
                  // Auto-update tender line referenceNumber
                  setTenders((prevTenders) => {
                    const next = [...prevTenders];
                    if (next[idx]) {
                      next[idx].referenceNumber = upi.transactionRef;
                    }
                    return next;
                  });
                }
              }
            }
          } catch (e) {
            // Ignore polling errors
          }
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, upiData]);

  if (!isOpen) return null;

  const totalTendered = MultiTenderHelper.sumTenders(tenders);
  const remaining = MultiTenderHelper.getRemainingBalance(grandTotal, tenders);

  const applyPreset = (cashAmt: number, upiAmt: number) => {
    setTenders([
      { method: 'CASH', amount: cashAmt, cashReceived: cashAmt },
      { method: 'UPI', amount: upiAmt, referenceNumber: '' },
    ]);
  };

  const addTenderMethod = (method: TenderMethod) => {
    const defaultAmount = remaining > 0 ? remaining : 0;
    setTenders([...tenders, { method, amount: defaultAmount, cashReceived: defaultAmount }]);
  };

  const removeTender = (idx: number) => {
    if (tenders.length <= 1) return;
    setTenders(tenders.filter((_, i) => i !== idx));
    setUpiData((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
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

  // Generate dynamic NPCI UPI QR for specific line amount
  const handleGenerateDynamicUpi = async (idx: number, amount: number) => {
    if (amount <= 0) {
      setErrorMsg('UPI amount must be greater than zero');
      return;
    }
    setGeneratingUpiIndex(idx);
    setErrorMsg('');
    try {
      const cleanTable = tableNumber.replace(/[^0-9]/g, '') || '1';
      const res = await fetch('/api/v1/dynamic-upi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: cleanTable,
          amount: amount,
          billId: billNumber || `BILL-${Date.now()}`,
          waiterId: 'W-CURRENT',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate dynamic UPI QR');
      }

      setUpiData((prev) => ({
        ...prev,
        [idx]: {
          transactionRef: data.qr.transactionRef,
          upiUri: data.qr.upiUri,
          amount: data.qr.amount,
          status: 'PENDING',
          expiresAt: data.qr.expiresAt,
        },
      }));

      // Bind referenceNumber immediately
      updateRef(idx, data.qr.transactionRef);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate UPI QR');
    } finally {
      setGeneratingUpiIndex(null);
    }
  };

  // Simulate payment approval from webhook / soundbox for testing
  const handleSimulatePayment = async (idx: number, ref: string) => {
    setSimulatingRef(ref);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/v1/dynamic-upi/simulate-paid/${ref}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment simulation failed');
      }
      setUpiData((prev) => ({
        ...prev,
        [idx]: {
          ...prev[idx],
          status: 'PAID',
          soundboxAnnouncement: data.qr.soundboxAnnouncement,
        },
      }));
      setVerifiedUpiMap((prev) => ({ ...prev, [ref]: true }));
      updateRef(idx, ref);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation failed');
    } finally {
      setSimulatingRef(null);
    }
  };

  // Anti-Fraud check: Any UPI line must be verified by payment gateway before settlement!
  const unverifiedUpiLine = tenders.find(
    (t) => t.method === 'UPI' && t.amount > 0 && (!t.referenceNumber || !verifiedUpiMap[t.referenceNumber])
  );

  const cashCollectedTotal = tenders
    .filter((t) => t.method === 'CASH')
    .reduce((sum, t) => sum + t.amount, 0);

  const upiCollectedTotal = tenders
    .filter((t) => t.method === 'UPI')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSettle = async () => {
    setErrorMsg('');
    if (remaining !== 0) {
      setErrorMsg(
        `Tenders sum (${MultiTenderHelper.formatCurrency(totalTendered)}) must match bill total (${MultiTenderHelper.formatCurrency(grandTotal)})`
      );
      return;
    }

    if (unverifiedUpiLine) {
      setErrorMsg(
        `🛡️ Anti-Fraud Lock: Online UPI portion (₹${unverifiedUpiLine.amount}) has not been verified by gateway/soundbox. Waiter cannot manually mark UPI as paid!`
      );
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
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em' }}>
                Dual-Tender Split Settlement
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              {tableNumber} • Bill #{billNumber} • Anti-Fraud Gateway Protected
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1E293B',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '18px',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Bill Summary Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '16px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                TOTAL PAYABLE
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                {MultiTenderHelper.formatCurrency(grandTotal)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                REMAINING BALANCE
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: remaining === 0 ? '#16A34A' : remaining > 0 ? '#DC2626' : '#D97706',
                }}
              >
                {MultiTenderHelper.formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Quick Split Presets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              ⚡ Quick Split Presets:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {grandTotal >= 1000 && (
                <button
                  type="button"
                  onClick={() => applyPreset(1000, grandTotal - 1000)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4338CA',
                    cursor: 'pointer',
                  }}
                >
                  💵 ₹1,000 Cash + 📱 ₹{grandTotal - 1000} UPI
                </button>
              )}
              <button
                type="button"
                onClick={() => applyPreset(Math.round(grandTotal / 2), grandTotal - Math.round(grandTotal / 2))}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#15803D',
                  cursor: 'pointer',
                }}
              >
                ⚖️ 50% Cash + 50% UPI
              </button>
              <button
                type="button"
                onClick={() => applyPreset(grandTotal, 0)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                💵 100% Cash
              </button>
            </div>
          </div>

          {/* Tender Rows */}
          {tenders.map((line, idx) => {
            const badge = MultiTenderHelper.getTenderBadge(line.method);
            const lineUpi = upiData[idx];
            const isUpiVerified = Boolean(line.referenceNumber && verifiedUpiMap[line.referenceNumber]);

            return (
              <div
                key={idx}
                style={{
                  border: line.method === 'UPI' && isUpiVerified ? '2px solid #22C55E' : '1px solid #CBD5E1',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '14px',
                  backgroundColor: line.method === 'UPI' ? '#FAF5FF' : '#FFFFFF',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      {badge.label}
                    </span>
                    {line.method === 'UPI' && isUpiVerified && (
                      <span
                        style={{
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        ✅ Gateway Verified
                      </span>
                    )}
                  </div>
                  {tenders.length > 1 && (
                    <button
                      onClick={() => removeTender(idx)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                {/* Amount Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Settled Amount (₹):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={line.amount || ''}
                      onChange={(e) => updateAmount(idx, Number(e.target.value))}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        padding: '0 12px',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {line.method === 'CASH' && (
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                        Cash Received in Hand (₹):
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={line.cashReceived || ''}
                        onChange={(e) => updateCashReceived(idx, Number(e.target.value))}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          padding: '0 12px',
                          fontSize: '16px',
                          fontWeight: 800,
                          color: '#0F172A',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  {line.method !== 'CASH' && line.method !== 'UPI' && (
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                        Ref (UTR / Room / Card):
                      </label>
                      <input
                        type="text"
                        value={line.referenceNumber || ''}
                        placeholder={line.method === 'ROOM_FOLIO' ? 'Room 304' : 'Auth Ref'}
                        onChange={(e) => updateRef(idx, e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          padding: '0 12px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Cash Change Notice */}
                {line.method === 'CASH' && (line.cashChangeReturned || 0) > 0 && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#F0FDF4',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#15803D',
                    }}
                  >
                    💵 Return Change: ₹{line.cashChangeReturned} to Guest
                  </div>
                )}

                {/* UPI Inline Generator & Anti-Fraud Scanner View */}
                {line.method === 'UPI' && (
                  <div style={{ marginTop: '14px', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
                    {!lineUpi ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateDynamicUpi(idx, line.amount)}
                        disabled={generatingUpiIndex === idx || line.amount <= 0}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          backgroundColor: '#7C3AED',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        {generatingUpiIndex === idx ? (
                          '⏳ Generating Secure Dynamic UPI QR...'
                        ) : (
                          <>
                            <span>⚡</span> Generate Dynamic UPI QR (₹{line.amount})
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '14px',
                          border: '1px solid #DDD6FE',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9' }}>
                            NPCI Dynamic UPI QR Code
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: lineUpi.status === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                              color: lineUpi.status === 'PAID' ? '#15803D' : '#B45309',
                            }}
                          >
                            {lineUpi.status === 'PAID' ? '✅ PAID' : '⏳ AWAITING PAYMENT'}
                          </span>
                        </div>

                        {/* QR Code Image */}
                        <div
                          style={{
                            width: '160px',
                            height: '160px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                              lineUpi.upiUri
                            )}`}
                            alt="Dynamic UPI QR"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', textAlign: 'center' }}>
                          Ref: {lineUpi.transactionRef}
                        </div>

                        {lineUpi.soundboxAnnouncement && (
                          <div
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: '#DCFCE7',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: '#15803D',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>📢</span>
                            <span>{lineUpi.soundboxAnnouncement}</span>
                          </div>
                        )}

                        {lineUpi.status !== 'PAID' && (
                          <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleSimulatePayment(idx, lineUpi.transactionRef)}
                              disabled={simulatingRef === lineUpi.transactionRef}
                              style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#059669',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              {simulatingRef === lineUpi.transactionRef
                                ? '⏳ Simulating Soundbox...'
                                : '⚡ Simulate Soundbox Payment (Demo)'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateDynamicUpi(idx, line.amount)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '8px',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ↻ Refresh
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Add Tender Buttons */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              + Add Split Method:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(['CASH', 'UPI', 'CARD', 'ROOM_FOLIO'] as TenderMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => addTenderMethod(m)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1E293B',
                    cursor: 'pointer',
                  }}
                >
                  +{m}
                </button>
              ))}
            </div>
          </div>

          {/* Realtime Reconciliation & Float Preview */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#166534',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span>💵 Cash in Hand (Added to Waiter Float):</span>
              <span style={{ fontWeight: 900 }}>₹{cashCollectedTotal}</span>
            </div>
            <div style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span>📱 Online Payment (Bank Gateway UPI):</span>
              <span style={{ fontWeight: 900 }}>₹{upiCollectedTotal}</span>
            </div>
          </div>

          {/* Anti-Fraud Lock Alert Banner */}
          {unverifiedUpiLine && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <div>
                <strong>Anti-Fraud Security Lock:</strong> Online UPI portion (₹{unverifiedUpiLine.amount}) requires
                gateway or soundbox verification before settlement can complete. Waiters cannot manually mark UPI as paid.
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                borderRadius: '10px',
                fontSize: '12px',
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
            padding: '16px 24px',
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
            disabled={loading || remaining !== 0 || Boolean(unverifiedUpiLine)}
            style={{
              flex: 2,
              minHeight: '48px',
              backgroundColor: remaining === 0 && !unverifiedUpiLine ? '#16A34A' : '#94A3B8',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#FFFFFF',
              cursor: remaining === 0 && !unverifiedUpiLine ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {loading ? (
              'Settling...'
            ) : unverifiedUpiLine ? (
              '🔒 Locked (Awaiting Gateway UPI)'
            ) : (
              '✅ Complete Split Settlement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
