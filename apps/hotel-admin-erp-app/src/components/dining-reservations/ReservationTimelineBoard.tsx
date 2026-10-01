import React, { useState } from 'react';
import {
  IDiningReservationUI,
  DiningReservationHelper,
} from '@spicehub/ui';

interface ReservationTimelineBoardProps {
  reservations: IDiningReservationUI[];
  onOpenSeatModal: (reservation: IDiningReservationUI) => void;
  onOpenDietaryModal: (phone: string) => void;
  onStatusChange: (reservationId: string, status: string, reason?: string) => Promise<void>;
}

export const ReservationTimelineBoard: React.FC<ReservationTimelineBoardProps> = ({
  reservations,
  onOpenSeatModal,
  onOpenDietaryModal,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = reservations.filter((r) => {
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerPhone.includes(searchTerm) ||
      r.reservationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'CONFIRMED', 'SEATED', 'NO_SHOW', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950/40'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search guest or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Grid of Reservation Cards */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 text-xs">
          No dining reservations match current filter criteria. Click "New VIP Dining Booking" above to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => {
            const statusBadge = DiningReservationHelper.getReservationStatusBadge(res.status);
            const vipBadge = DiningReservationHelper.getVipBadge(res.vipTier);

            return (
              <div
                key={res._id}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar: Time Slot & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-white bg-zinc-800 px-2.5 py-1 rounded-xl border border-zinc-700">
                        {res.timeSlot}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: vipBadge.bg,
                          color: vipBadge.text,
                          border: vipBadge.border,
                        }}
                      >
                        {vipBadge.label}
                      </span>
                    </div>

                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.text,
                        border: statusBadge.border,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Guest Info */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{res.customerName}</h4>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Party of {res.partySize}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center justify-between">
                      <span className="font-mono">{res.customerPhone}</span>
                      <span className="text-zinc-500 font-mono">{res.reservationNumber}</span>
                    </div>
                  </div>

                  {/* Table & Occasion Tags */}
                  <div className="flex flex-wrap items-center gap-1 mt-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      📍 {res.tableTypePreference}
                    </span>
                    {res.specialOccasion && res.specialOccasion !== 'NONE' && (
                      <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/40">
                        ✨ {res.specialOccasion}
                      </span>
                    )}
                  </div>

                  {/* Critical Allergen Pills */}
                  {res.allergens && res.allergens.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                        <span>⚠️</span> Kitchen Allergen Warning:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {res.allergens.map((alg, idx) => {
                          const tag = DiningReservationHelper.getAllergenTag(alg);
                          return (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ backgroundColor: tag.bg, color: tag.text }}
                            >
                              {tag.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {res.chefNotes && (
                    <p className="text-[11px] text-zinc-400 italic mt-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      "{res.chefNotes}"
                    </p>
                  )}
                </div>

                {/* Actions Bottom Bar */}
                <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                  {res.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenSeatModal(res)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all text-center"
                      >
                        🪑 Seat Table
                      </button>
                      <button
                        type="button"
                        onClick={() => onStatusChange(res._id, 'NO_SHOW')}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-zinc-700"
                        title="Mark No-Show"
                      >
                        No-Show
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenDietaryModal(res.customerPhone)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700"
                    title="View VIP Dietary Profile"
                  >
                    👤 Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
