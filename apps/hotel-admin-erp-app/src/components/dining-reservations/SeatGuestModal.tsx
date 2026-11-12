import React, { useState } from 'react';
import { IDiningReservationUI } from '@spicehub/ui';
import { Armchair, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl text-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Seat Dining Party</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirmSeat} className="my-4 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Guest Name:</span>
              <strong className="text-slate-900 text-sm">{reservation.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Party Size:</span>
              <strong className="text-emerald-700">{reservation.partySize} Guests</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time Slot:</span>
              <strong className="font-mono text-slate-800">{reservation.timeSlot}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Table Preference:</span>
              <span className="text-slate-800 font-semibold">{reservation.tableTypePreference}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assign Physical Table
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. Table T-04, Booth B-2"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-bold"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-green px-5 py-2 rounded-xl text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
            >
              {loading ? 'Seating...' : 'Confirm Seating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
