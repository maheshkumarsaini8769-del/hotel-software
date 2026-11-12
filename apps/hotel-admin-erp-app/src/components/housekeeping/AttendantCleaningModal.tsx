import React from 'react';
import {
  HousekeepingBoardRoom,
  CheckpointItem,
  MinibarItemAudit,
  LinenTurnaroundAction,
  HousekeepingHelper,
} from '@spicehub/ui';
import { Brush, Check, Droplets } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Brush className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Room {room.roomNumber} Turnaround</h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  Cleaning Audit
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Floor {room.floorNumber} • {room.roomType?.name || 'Luxury Suite'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Guest Occupancy Notice */}
          {room.guestInfo && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-800 font-semibold">Occupant: {room.guestInfo.guestName}</span>
              <span className="text-slate-500">Active Stay linked to Folio</span>
            </div>
          )}

          {/* Section 1: Standard Operating Procedure (SOP) Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Sanitation Checklist
              </h4>
              <span className="text-[11px] text-slate-500">
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
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      item.isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white font-bold text-xs'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {item.isDone && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-medium select-none">{item.taskName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Eco-Linen Sustainable Turnaround Choice */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Linen & Bedding Standard
              </h4>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Green Hotel Program
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onSetLinenAction('FULL_WASH')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  linenAction === 'FULL_WASH'
                    ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-xs ring-1 ring-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Complete Linen Change</div>
                <div className="text-[11px] text-slate-500 mt-1">Full replacement of all sheets, duvets & pillowcases.</div>
              </div>

              <div
                onClick={() => onSetLinenAction('TUCK_IN')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  linenAction === 'TUCK_IN'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Tuck-in (Eco Choice)</span>
                </div>
                <div className="text-[11px] text-emerald-700/90 mt-1">Stayover tidy bed. Saves ~35L fresh water!</div>
              </div>
            </div>
          </div>

          {/* Section 3: Minibar Consumption Audit */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Minibar Replenishment & Audit
                </h4>
                <p className="text-[11px] text-slate-500">Record items consumed by guest during stay</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Auto-Debit: </span>
                <span className="text-sm font-extrabold text-emerald-700">₹{minibarTotal}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
              {minibarItems.map((item) => (
                <div key={item.id} className="p-2.5 px-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-500">₹{item.rate} each</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onUpdateMinibar(item.id, -1)}
                      disabled={item.quantity <= 0}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-800 font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateMinibar(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {minibarTotal > 0 && room.guestInfo && (
              <p className="text-[10px] text-emerald-800 mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-medium">
                ₹{minibarTotal} will be automatically charged to {room.guestInfo.guestName}&apos;s Master Folio.
              </p>
            )}
          </div>

          {/* Section 4: Attendant Notes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              4. Attendant Handover Notes (Optional)
            </h4>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="E.g., Extra towels placed on rack, left fresh fruit basket..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            disabled={isLoading || !allChecklistDone}
            className="btn-glass-green px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          >
            {isLoading ? 'Processing Turnaround...' : 'Submit & Ready for Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
};
