import React, { useState } from 'react';
import { IDiningReservationUI } from '@spicehub/ui';

interface SeatGuestModalProps {
  isOpen: boolean;
  reservation: IDiningReservationUI | null;
  onClose: () => void;
  onSeat: (reservationId: string, tableId?: string) => Promise<void>;
  loading: boolean;
}

export const SeatGuestModal: React.FC<SeatGuestModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onSeat,
  loading,
}) => {
  const [tableNumber, setTableNumber] = useState('T-04 (Window View)');

  if (!isOpen || !reservation) return null;

  const handleConfirmSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSeat(reservation._id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f131a] border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl text-zinc-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🪑</span>
            <h3 className="text-base font-bold text-white">Seat Dining Party</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirmSeat} className="my-4 space-y-4 text-xs">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-400">Guest Name:</span>
              <strong className="text-white text-sm">{reservation.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Party Size:</span>
              <strong className="text-emerald-400">{reservation.partySize} Guests</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Time Slot:</span>
              <strong className="font-mono text-zinc-300">{reservation.timeSlot}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Table Preference:</span>
              <span className="text-zinc-300 font-semibold">{reservation.tableTypePreference}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Assign Physical Table
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. Table T-04, Booth B-2"
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {loading ? 'Seating...' : 'Confirm Seating ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
