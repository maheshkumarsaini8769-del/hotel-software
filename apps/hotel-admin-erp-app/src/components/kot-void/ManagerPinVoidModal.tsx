import React, { useState } from 'react';
import { ShieldAlert, Lock, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import {
  KotVoidReason,
  WasteDisposition,
  KotVoidHelper,
  formatCurrency,
} from '@spicehub/ui';

export interface ManagerPinVoidModalProps {
  isOpen: boolean;
  orderNumber: string;
  tableNumber: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  onClose: () => void;
  onSubmit: (payload: {
    managerPin: string;
    voidReason: KotVoidReason;
    wasteDisposition: WasteDisposition;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ManagerPinVoidModal: React.FC<ManagerPinVoidModalProps> = ({
  isOpen,
  orderNumber,
  tableNumber,
  itemName,
  itemPrice,
  quantity,
  onClose,
  onSubmit,
  isLoading = false,
  errorMessage = null,
}) => {
  const [managerPin, setManagerPin] = useState('');
  const [voidReason, setVoidReason] = useState<KotVoidReason>(KotVoidReason.CUSTOMER_CANCELLED);
  const [wasteDisposition, setWasteDisposition] = useState<WasteDisposition>(WasteDisposition.WASTED_SCRAPPED);
  const [notes, setNotes] = useState('');
  const [pinValidationErr, setPinValidationErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalItemAmount = itemPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinCheck = KotVoidHelper.validateManagerPinFormat(managerPin);
    if (!pinCheck.isValid) {
      setPinValidationErr(pinCheck.error || 'Invalid PIN');
      return;
    }
    setPinValidationErr(null);

    await onSubmit({
      managerPin: managerPin.trim(),
      voidReason,
      wasteDisposition,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-b border-rose-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Authorize KOT Item Void
              </h3>
              <p className="text-xs text-rose-300/80">Manager Security PIN & Waste Attribution Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Details Banner */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Target Order: </span>
            <span className="font-semibold text-white">{orderNumber}</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-slate-400">Table: </span>
            <span className="font-semibold text-amber-400">{tableNumber}</span>
          </div>
          <div className="text-right">
            <div className="text-rose-400 font-bold text-sm">
              {formatCurrency(totalItemAmount)}
            </div>
            <div className="text-slate-500 text-[10px]">
              {quantity}x @ {formatCurrency(itemPrice)}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* Item Name highlight */}
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="font-medium text-slate-200">{itemName}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              Qty: {quantity}
            </span>
          </div>

          {/* Void Reason Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Void / Cancellation Reason *
            </label>
            <select
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value as KotVoidReason)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-rose-500"
            >
              {Object.values(KotVoidReason).map((reason) => (
                <option key={reason} value={reason}>
                  {KotVoidHelper.formatVoidReasonLabel(reason)}
                </option>
              ))}
            </select>
          </div>

          {/* Waste Attribution Disposition */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Food Waste / Inventory Disposition *
            </label>
            <select
              value={wasteDisposition}
              onChange={(e) => setWasteDisposition(e.target.value as WasteDisposition)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-rose-500"
            >
              {Object.values(WasteDisposition).map((disp) => (
                <option key={disp} value={disp}>
                  {KotVoidHelper.formatWasteDispositionLabel(disp)}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Security PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Manager Authorization PIN *
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 4-6 Digit Manager PIN"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-4 py-3 text-white text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              autoFocus
            />
            {pinValidationErr && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {pinValidationErr}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Manager Audit Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Guest found hair in soup, offered complimentary dessert"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-slate-500 text-xs"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !managerPin}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50"
            >
              {isLoading ? (
                <>Verifying PIN...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Authorize & Void Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
