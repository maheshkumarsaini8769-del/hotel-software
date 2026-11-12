import React, { useState, useEffect, useMemo } from 'react';
import { SeatBillingStore } from '@spicehub/ui';
import { SeatSubFolioDTO } from '@spicehub/ui';
import { SeatBillingHelper } from '@spicehub/ui';
import { SubFolioSplitCard } from './SubFolioSplitCard';
import {
  Receipt,
  Smartphone,
  Banknote,
  CreditCard,
  BedDouble,
  Printer,
  X,
} from 'lucide-react';

export interface SeatBillingAppProps {
  store?: SeatBillingStore;
  tableNumber: string;
  onSettleFolioSubmit?: (subFolioId: string, paymentMethod: string, transactionRef?: string) => Promise<void> | void;
}

export const SeatBillingApp: React.FC<SeatBillingAppProps> = ({
  store,
  tableNumber,
  onSettleFolioSubmit,
}) => {
  const effectiveStore = useMemo(() => store || new SeatBillingStore(), [store]);
  const [subFolios, setSubFolios] = useState<SeatSubFolioDTO[]>(effectiveStore.getSubFolios());
  const [selectedForSettle, setSelectedForSettle] = useState<SeatSubFolioDTO | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD' | 'POST_TO_ROOM'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = effectiveStore.subscribe(() => {
      setSubFolios([...effectiveStore.getSubFolios()]);
    });
    return () => unsubscribe();
  }, [effectiveStore]);

  const handleSettleSubmit = async () => {
    if (!selectedForSettle) return;
    if (onSettleFolioSubmit) {
      await onSettleFolioSubmit(selectedForSettle._id, paymentMethod, transactionRef.trim() || undefined);
    } else {
      effectiveStore.settleSubFolioLocally(selectedForSettle._id, {
        paymentMethod: paymentMethod as any,
        transactionRef: transactionRef.trim() || undefined,
      });
    }
    setSelectedForSettle(null);
    setTransactionRef('');
  };

  const handlePrintReceipt = (subFolio: SeatSubFolioDTO) => {
    const text = SeatBillingHelper.formatThermalReceiptText(subFolio, `Table ${tableNumber}`);
    setReceiptText(text);
    setIsReceiptModalOpen(true);
  };

  const totalOutstanding = effectiveStore.getTotalOutstandingAmount();

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Table {tableNumber} • Independent Seat Bills
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Settle individual seat sub-folios (Bill A vs Bill B) independently without affecting other diners.
          </p>
        </div>

        <div className="text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-200 w-full sm:w-auto shadow-xs sm:shadow-none">
          <div className="text-xs text-slate-500 font-semibold">Total Table Outstanding</div>
          <div className={`text-2xl font-black ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ₹{totalOutstanding}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Settle {SeatBillingHelper.formatSubFolioTitle(selectedForSettle)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedForSettle(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-800">Amount Due</span>
              <span className="text-xl font-black text-emerald-700">₹{selectedForSettle.grandTotal}</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Tender Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI', label: 'UPI QR', icon: Smartphone },
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'CARD', label: 'Card EDC', icon: CreditCard },
                  { id: 'POST_TO_ROOM', label: 'Room Folio', icon: BedDouble },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id as any)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      paymentMethod === id
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'UPI' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  UPI Ref / UTR Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423456789012"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForSettle(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                className="btn-glass-green flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Thermal Print Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="bg-slate-50 p-3.5 rounded-xl text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-72 overflow-y-auto border border-slate-200 leading-relaxed">
              {receiptText}
            </pre>
            <button
              type="button"
              onClick={() => setIsReceiptModalOpen(false)}
              className="btn-glass-green w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
