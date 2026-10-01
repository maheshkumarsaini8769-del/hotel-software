import React from 'react';
import {
  HousekeepingBoardRoom,
  CheckpointItem,
  MinibarItemAudit,
  LinenTurnaroundAction,
  HousekeepingHelper,
} from '@spicehub/ui';

interface AttendantCleaningModalProps {
  room: HousekeepingBoardRoom | null;
  isOpen: boolean;
  checklist: CheckpointItem[];
  minibarItems: MinibarItemAudit[];
  linenAction: LinenTurnaroundAction;
  notes: string;
  onToggleChecklist: (index: number) => void;
  onUpdateMinibar: (id: string, delta: number) => void;
  onSetLinenAction: (action: LinenTurnaroundAction) => void;
  onNotesChange: (notes: string) => void;
  onComplete: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export const AttendantCleaningModal: React.FC<AttendantCleaningModalProps> = ({
  room,
  isOpen,
  checklist,
  minibarItems,
  linenAction,
  notes,
  onToggleChecklist,
  onUpdateMinibar,
  onSetLinenAction,
  onNotesChange,
  onComplete,
  onClose,
  isLoading,
}) => {
  if (!isOpen || !room) return null;

  const minibarTotal = HousekeepingHelper.calculateMinibarTotal(minibarItems);
  const allChecklistDone = checklist.length > 0 && checklist.every((c) => c.isDone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg text-amber-400">
              🧹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Room {room.roomNumber} Turnaround</h3>
                <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-semibold">
                  Cleaning Audit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Floor {room.floorNumber} • {room.roomType?.name || 'Luxury Suite'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Guest Occupancy Notice */}
          {room.guestInfo && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-amber-200 font-medium">Occupant: {room.guestInfo.guestName}</span>
              <span className="text-amber-400/80">Active Stay linked to Folio</span>
            </div>
          )}

          {/* Section 1: Standard Operating Procedure (SOP) Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                1. Sanitation Checklist
              </h4>
              <span className="text-[11px] text-slate-400">
                {checklist.filter((c) => c.isDone).length}/{checklist.length} Completed
              </span>
            </div>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onToggleChecklist(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    item.isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      item.isDone
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold text-xs'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {item.isDone && '✓'}
                  </div>
                  <span className="text-xs font-medium select-none">{item.taskName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Eco-Linen Sustainable Turnaround Choice */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                2. Linen & Bedding Standard
              </h4>
              <span className="text-[10px] text-emerald-300/80 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                Green Hotel Program
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onSetLinenAction('FULL_WASH')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  linenAction === 'FULL_WASH'
                    ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-sm shadow-amber-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-amber-300">Complete Linen Change</div>
                <div className="text-[11px] text-slate-400 mt-1">Full replacement of all sheets, duvets & pillowcases.</div>
              </div>

              <div
                onClick={() => onSetLinenAction('TUCK_IN')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  linenAction === 'TUCK_IN'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                  <span>🌿 Tuck-in (Eco Choice)</span>
                </div>
                <div className="text-[11px] text-emerald-400/80 mt-1">Stayover tidy bed. Saves ~35L fresh water!</div>
              </div>
            </div>
          </div>

          {/* Section 3: Minibar Consumption Audit */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  3. Minibar Replenishment & Audit
                </h4>
                <p className="text-[11px] text-slate-400">Record items consumed by guest during stay</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400">Auto-Debit: </span>
                <span className="text-sm font-extrabold text-amber-300">₹{minibarTotal}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
              {minibarItems.map((item) => (
                <div key={item.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-400">₹{item.rate} each</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onUpdateMinibar(item.id, -1)}
                      disabled={item.quantity <= 0}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-amber-300 text-xs">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateMinibar(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {minibarTotal > 0 && room.guestInfo && (
              <p className="text-[10px] text-amber-400/90 mt-2 bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                ⚡ ₹{minibarTotal} will be automatically charged to {room.guestInfo.guestName}&apos;s Master Folio.
              </p>
            )}
          </div>

          {/* Section 4: Attendant Notes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              4. Attendant Handover Notes (Optional)
            </h4>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="E.g., Extra towels placed on rack, left fresh fruit basket..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            disabled={isLoading || !allChecklistDone}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          >
            {isLoading ? 'Processing Turnaround...' : 'Submit & Ready for Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
};
