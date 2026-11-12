import React from 'react';
import { CommunityTableDTO } from '@spicehub/ui';
import { CoDiningHelper } from '@spicehub/ui';
import { UtensilsCrossed, Armchair, User } from 'lucide-react';

export interface SeatMapGridProps {
  table: CommunityTableDTO;
  selectedSeatNumbers: number[];
  onToggleSeat: (seatNumber: number) => void;
  onAllocateSeats?: () => void;
  onReleaseSeat?: (seatNumber: number, sessionId?: string) => void;
}

export const SeatMapGrid: React.FC<SeatMapGridProps> = ({
  table,
  selectedSeatNumbers,
  onToggleSeat,
  onAllocateSeats,
  onReleaseSeat,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Table {table.tableNumber} ({table.section})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {CoDiningHelper.formatSeatingSummary(table)}
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full font-bold border ${
            table.availableSeatsCount > 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {table.availableSeatsCount > 0 ? `${table.availableSeatsCount} Open Seats` : 'Full Table'}
        </span>
      </div>

      {/* Visual Table & Chairs Blueprint */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div className="text-center text-xs font-medium text-slate-400 mb-4">
          Tap an Open Seat to Select for Solo/Pair Booking
        </div>

        {/* Seat Grid */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(4, table.capacity)}, 1fr)`,
          }}
        >
          {table.seats.map((seat) => {
            const isSelected = selectedSeatNumbers.includes(seat.seatNumber);
            const style = CoDiningHelper.getSeatStatusStyle(seat.status, isSelected);

            return (
              <div key={seat.seatNumber} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onToggleSeat(seat.seatNumber)}
                  disabled={seat.status !== 'AVAILABLE'}
                  className={`w-full min-h-[72px] p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-800'
                      : seat.status === 'AVAILABLE'
                      ? 'border border-slate-200 bg-white hover:border-slate-300 text-slate-700 shadow-xs'
                      : 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  <Armchair className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">
                    {seat.seatLabel || `Seat ${seat.seatNumber}`}
                  </span>
                  <span className="text-[10px] font-semibold opacity-75">
                    {style.label}
                  </span>
                </button>

                {seat.status === 'OCCUPIED' && seat.guestName && (
                  <div className="text-[11px] text-slate-600 mt-1.5 text-center max-w-[100px] truncate flex items-center justify-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{seat.guestName}</span>
                  </div>
                )}

                {seat.status === 'OCCUPIED' && onReleaseSeat && (
                  <button
                    type="button"
                    onClick={() => onReleaseSeat(seat.seatNumber, seat.currentSessionId)}
                    className="mt-1 px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold transition"
                  >
                    Release
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedSeatNumbers.length > 0 && onAllocateSeats && (
        <div className="flex justify-between items-center p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div>
            <span className="text-xs font-bold text-emerald-900">
              {selectedSeatNumbers.length} Seat{selectedSeatNumbers.length > 1 ? 's' : ''} Selected
            </span>
            <div className="text-xs text-emerald-700">
              Seats: {selectedSeatNumbers.join(', ')}
            </div>
          </div>

          <button
            type="button"
            onClick={onAllocateSeats}
            className="btn-glass-green px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs"
          >
            Confirm Co-Dining Seating
          </button>
        </div>
      )}
    </div>
  );
};
