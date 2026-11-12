import React, { useState } from 'react';
import { HousekeepingBoardRoom } from '@spicehub/ui';
import { CheckCircle2, XCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Quality Inspection - Room {room.roomNumber}</h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  Supervisor Level
                </span>
              </div>
              <p className="text-xs text-slate-500">Floor {room.floorNumber} • {room.roomType?.name || 'Luxury Room'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-500">Cleaned By:</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {room.activeTask?.assignedAttendantId?.name || 'Staff Attendant'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">Task Type:</div>
              <div className="font-semibold text-blue-700 mt-0.5">
                {room.activeTask?.taskType || 'CHECKOUT_CLEAN'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {errorMsg && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => handleAction(false)}
            disabled={isLoading}
            className="flex-1 py-2 px-3 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject (Rework Needed)</span>
          </button>
          <button
            onClick={() => handleAction(true)}
            disabled={isLoading}
            className="btn-glass-green flex-1 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pass & Make Available</span>
          </button>
        </div>
      </div>
    </div>
  );
};
