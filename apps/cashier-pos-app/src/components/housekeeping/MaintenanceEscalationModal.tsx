import React, { useState } from 'react';
import { HousekeepingBoardRoom, MaintenanceEscalationPayload } from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-rose-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-lg text-rose-400">
              🛠️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Escalate Maintenance - Room {room.roomNumber}</h3>
                <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full font-semibold">
                  Engineering Alert
                </span>
              </div>
              <p className="text-xs text-slate-400">Instantly marks room Out-of-Order & routes work order</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-200">
          {/* Warning Banner */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold text-rose-200">Room Status Lock: </span>
              Submitting this escalation will immediately lock Room {room.roomNumber} as{' '}
              <strong>OUT OF SERVICE</strong> on the PMS matrix until resolved by engineering.
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                        ? 'bg-rose-600 text-white font-bold border-rose-500 animate-pulse'
                        : 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pri}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Issue Summary
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onUpdateDraft({ title: e.target.value })}
              placeholder="e.g. Master bathroom shower mixer leaking, AC thermostat unresponsive..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Detailed Defect Notes
            </label>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => onUpdateDraft({ description: e.target.value })}
              placeholder="Describe exact location, leak severity, odor or safety hazard..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
            >
              {isLoading ? 'Dispatching...' : 'Dispatch Maintenance Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
