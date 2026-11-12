import React, { useState } from 'react';
import { HousekeepingBoardRoom, MaintenanceEscalationPayload } from '@spicehub/ui';
import { Wrench, AlertTriangle } from 'lucide-react';

interface MaintenanceEscalationModalProps {
  room: HousekeepingBoardRoom | null;
  isOpen: boolean;
  draft: MaintenanceEscalationPayload;
  onUpdateDraft: (patch: Partial<MaintenanceEscalationPayload>) => void;
  onEscalate: (payload: MaintenanceEscalationPayload) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const MaintenanceEscalationModal: React.FC<MaintenanceEscalationModalProps> = ({
  room,
  isOpen,
  draft,
  onUpdateDraft,
  onEscalate,
  onClose,
  isLoading,
}) => {
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !room) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.description.trim()) {
      setErrorMsg('Please enter both issue title and detailed defect description.');
      return;
    }
    setErrorMsg('');
    onEscalate(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Escalate Maintenance - Room {room.roomNumber}</h3>
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
                  Engineering Alert
                </span>
              </div>
              <p className="text-xs text-slate-500">Instantly marks room Out-of-Order & routes work order</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-700">
          {/* Warning Banner */}
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900">Room Status Lock: </span>
              Submitting this escalation will immediately lock Room {room.roomNumber} as{' '}
              <strong>OUT OF SERVICE</strong> on the PMS matrix until resolved by engineering.
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Defect Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['HVAC', 'PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'ELECTRONICS', 'GENERAL'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => onUpdateDraft({ category: cat })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    draft.category === cat
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Urgency Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const).map((pri) => (
                <button
                  type="button"
                  key={pri}
                  onClick={() => onUpdateDraft({ priority: pri })}
                  className={`py-1 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    draft.priority === pri
                      ? pri === 'EMERGENCY'
                        ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-xs'
                        : 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {pri}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Issue Summary
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onUpdateDraft({ title: e.target.value })}
              placeholder="e.g. Master bathroom shower mixer leaking, AC thermostat unresponsive..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Defect Notes
            </label>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => onUpdateDraft({ description: e.target.value })}
              placeholder="Describe exact location, leak severity, odor or safety hazard..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-glass-green px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
            >
              {isLoading ? 'Dispatching...' : 'Dispatch Maintenance Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
