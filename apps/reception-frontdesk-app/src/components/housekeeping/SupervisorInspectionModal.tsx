import React, { useState } from 'react';
import { HousekeepingBoardRoom } from '@spicehub/ui';

interface SupervisorInspectionModalProps {
  room: HousekeepingBoardRoom | null;
  isOpen: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  onInspect: (isApproved: boolean, notes: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const SupervisorInspectionModal: React.FC<SupervisorInspectionModalProps> = ({
  room,
  isOpen,
  notes,
  onNotesChange,
  onInspect,
  onClose,
  isLoading,
}) => {
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !room) return null;

  const handleAction = (isApproved: boolean) => {
    if (!isApproved && !notes.trim()) {
      setErrorMsg('Please specify rejection reason or areas requiring re-cleaning.');
      return;
    }
    setErrorMsg('');
    onInspect(isApproved, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg text-amber-400">
              🔍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Quality Inspection - Room {room.roomNumber}</h3>
                <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full font-semibold">
                  Supervisor Level
                </span>
              </div>
              <p className="text-xs text-slate-400">Floor {room.floorNumber} • {room.roomType?.name || 'Luxury Room'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-200">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-400">Cleaned By:</div>
              <div className="font-semibold text-white mt-0.5">
                {room.activeTask?.assignedAttendantId?.name || 'Staff Attendant'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-400">Task Type:</div>
              <div className="font-semibold text-amber-300 mt-0.5">
                {room.activeTask?.taskType || 'CHECKOUT_CLEAN'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Supervisor Notes & Audit Observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                onNotesChange(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Linens pristine, fragrance replenished, mirror spotless, approved for VIP arrival..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
            {errorMsg && (
              <p className="text-xs text-rose-400 mt-1 font-medium">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => handleAction(false)}
            disabled={isLoading}
            className="flex-1 py-2 px-3 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
          >
            ✕ Reject (Rework Needed)
          </button>
          <button
            onClick={() => handleAction(true)}
            disabled={isLoading}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            ✓ Pass & Make Available
          </button>
        </div>
      </div>
    </div>
  );
};
