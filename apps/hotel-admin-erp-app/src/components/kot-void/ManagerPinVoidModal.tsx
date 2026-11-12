import React, { useState } from 'react';
import {
  KotVoidReason,
  WasteDisposition,
  KotVoidHelper,
} from '@spicehub/ui';
import { ShieldAlert, Lock, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface IManagerPinVoidPayload {
  managerPin: string;
  voidReason: KotVoidReason;
  wasteDisposition: WasteDisposition;
  notes?: string;
}

interface ManagerPinVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  tableNumber: string;
  itemName: string;
  itemQuantity: number;
  onSubmitVoid: (payload: IManagerPinVoidPayload) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ManagerPinVoidModal: React.FC<ManagerPinVoidModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  tableNumber,
  itemName,
  itemQuantity,
  onSubmitVoid,
  isLoading = false,
  errorMessage = null,
}) => {
  const [managerPin, setManagerPin] = useState('');
  const [voidReason, setVoidReason] = useState<KotVoidReason>(KotVoidReason.CUSTOMER_CANCELLED);
  const [wasteDisposition, setWasteDisposition] = useState<WasteDisposition>(WasteDisposition.WASTED_SCRAPPED);
  const [notes, setNotes] = useState('');
  const [pinValidationErr, setPinValidationErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerPin || managerPin.length < 4) {
      setPinValidationErr('Manager authorization PIN must be 4 digits.');
      return;
    }
    setPinValidationErr(null);

    await onSubmitVoid({
      managerPin: managerPin.trim(),
      voidReason,
      wasteDisposition,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-wide flex items-center gap-2">
                Authorize KOT Item Void
              </h3>
              <p className="text-xs text-rose-600 font-medium">Manager Security PIN & Waste Attribution Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Details Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Target Order: </span>
            <span className="font-semibold text-slate-900">{orderNumber}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500">Table: </span>
            <span className="font-semibold text-emerald-700">{tableNumber}</span>
          </div>
          <div className="font-mono text-rose-700 font-bold">
            Voiding: {itemQuantity}x {itemName}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Void Reason Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Void / Cancellation Reason *
            </label>
            <select
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value as KotVoidReason)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white text-xs font-medium cursor-pointer"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Food Waste / Inventory Disposition *
            </label>
            <select
              value={wasteDisposition}
              onChange={(e) => setWasteDisposition(e.target.value as WasteDisposition)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white text-xs font-medium cursor-pointer"
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
            <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Manager Authorization PIN *
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Enter 4-Digit Manager PIN"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full bg-slate-50 border border-rose-200 rounded-xl px-4 py-3 text-slate-900 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:bg-white"
              autoFocus
            />
            {pinValidationErr && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> {pinValidationErr}
              </p>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Manager Audit Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Guest found hair in soup, offered complimentary dessert"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
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
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !managerPin}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
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
