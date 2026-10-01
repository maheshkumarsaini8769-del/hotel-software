import React, { useState, useEffect } from 'react';
import {
  DynamicUpiQrDto,
  UpiQrStatus,
  DynamicUpiHelper,
  DynamicUpiStore,
} from '@spicehub/ui';

interface DynamicUpiQrModalProps {
  qr: DynamicUpiQrDto;
  isOpen: boolean;
  onClose: () => void;
  onCancelQr: (transactionRef: string) => Promise<void>;
  onCheckStatus: (transactionRef: string) => Promise<void>;
}

export const DynamicUpiQrModal: React.FC<DynamicUpiQrModalProps> = ({
  qr,
  isOpen,
  onClose,
  onCancelQr,
  onCheckStatus,
}) => {
  const store = DynamicUpiStore.getInstance();
  const [storeState, setStoreState] = useState(store.getState());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && qr) {
      store.setDynamicQr(qr);
    }
    const unsubscribe = store.subscribe((newState) => {
      setStoreState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [isOpen, qr]);

  if (!isOpen || !qr) return null;

  const currentQr = storeState.activeQr || qr;
  const badge = DynamicUpiHelper.getStatusBadge(currentQr.status);
  const isPaid = currentQr.status === UpiQrStatus.PAID;
  const isExpired = currentQr.status === UpiQrStatus.EXPIRED;
  const isCancelled = currentQr.status === UpiQrStatus.CANCELLED;

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await onCancelQr(currentQr.transactionRef);
      store.updateStatus(UpiQrStatus.CANCELLED);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCheck = async () => {
    setIsProcessing(true);
    try {
      await onCheckStatus(currentQr.transactionRef);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Dynamic UPI QR
            </h2>
            <p className="text-xs text-zinc-400">
              Table {currentQr.tableNumber} • Bill #{String(currentQr.billId).slice(-6)}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.bg} ${badge.text} ${badge.border} flex items-center gap-1.5`}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Amount Display (Locked) */}
        <div className="my-4 text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-400 font-medium">
            Locked Payable Amount
          </p>
          <div className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">
            ₹{currentQr.amount.toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Non-editable amount locked for diner
          </p>
        </div>

        {/* QR Code Container */}
        <div className="relative w-52 h-52 bg-white rounded-xl p-3 flex flex-col items-center justify-center shadow-inner">
          {isPaid ? (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-5xl mb-2 animate-bounce">🎉</span>
              <p className="text-emerald-700 font-bold text-base">Payment Verified!</p>
              <p className="text-zinc-600 text-xs mt-1">Soundbox broadcast complete</p>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl text-rose-500 mb-2">⏰</span>
              <p className="text-rose-600 font-bold text-sm">QR Code Expired</p>
              <p className="text-zinc-500 text-xs mt-1">Please regenerate fresh QR</p>
            </div>
          ) : isCancelled ? (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl text-zinc-400 mb-2">🚫</span>
              <p className="text-zinc-700 font-bold text-sm">Cancelled</p>
              <p className="text-zinc-500 text-xs mt-1">Switched to alternate tender</p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg p-2">
              {/* NPCI UPI QR Placeholder box */}
              <div className="text-center font-mono text-[10px] text-zinc-700 break-all line-clamp-3">
                {currentQr.upiUri}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-1 rounded">
                <span>⚡</span> Scan & Pay ₹{currentQr.amount}
              </div>
            </div>
          )}
        </div>

        {/* Timer & Supported Providers */}
        {!isPaid && !isExpired && !isCancelled && (
          <div className="w-full mt-3 flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="flex items-center gap-1">
              <span>⏳</span> Expires in:{' '}
              <strong className="text-amber-400 font-mono">
                {DynamicUpiHelper.formatRemainingTime(storeState.timeRemaining)}
              </strong>
            </span>
            <span className="text-[11px] text-zinc-500">GPay • PhonePe • Paytm</span>
          </div>
        )}

        {/* Soundbox Broadcast Banner */}
        {storeState.soundboxNotificationReceived && (
          <div className="w-full mt-3 rounded-lg bg-emerald-950/60 border border-emerald-600/40 p-2.5 flex items-center gap-2">
            <span className="text-lg">📢</span>
            <div className="flex-1 text-[11px] text-emerald-300">
              <p className="font-semibold">Soundbox Voice Broadcast</p>
              <p className="text-emerald-400/80 leading-tight">
                {storeState.lastAnnouncement || `Received ₹${currentQr.amount} on UPI`}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons (Min 48px Touch Target) */}
        <div className="w-full mt-5 flex flex-col gap-2.5">
          {isPaid ? (
            <button
              onClick={onClose}
              className="w-full h-12 min-h-[48px] rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/50"
            >
              Done & Close
            </button>
          ) : (
            <>
              <button
                disabled={isProcessing || isExpired || isCancelled}
                onClick={handleManualCheck}
                className="w-full h-12 min-h-[48px] rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>{isProcessing ? 'Verifying...' : 'Check Payment Status'}</span>
              </button>

              <button
                disabled={isProcessing || isCancelled}
                onClick={handleCancel}
                className="w-full h-12 min-h-[48px] rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
              >
                Cancel & Choose Alternate Tender
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
