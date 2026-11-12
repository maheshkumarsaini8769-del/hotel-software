import React, { useState } from 'react';
import {
  IDiningReservationUI,
  DiningReservationHelper,
} from '@spicehub/ui';
import { Search, MapPin, Sparkles, AlertTriangle, Armchair, User } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'CONFIRMED', 'SEATED', 'NO_SHOW', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                statusFilter === st
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search guest, phone, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Grid of Reservation Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-xs">
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
                className="bg-white border border-slate-200/80 hover:border-slate-300 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Bar: Time Slot & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
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
                      <h4 className="text-sm font-bold text-slate-900">{res.customerName}</h4>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        Party of {res.partySize}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                      <span className="font-mono">{res.customerPhone}</span>
                      <span className="text-slate-400 font-mono">{res.reservationNumber}</span>
                    </div>
                  </div>

                  {/* Table & Occasion Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {res.tableTypePreference}
                    </span>
                    {res.specialOccasion && res.specialOccasion !== 'NONE' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        {res.specialOccasion}
                      </span>
                    )}
                  </div>

                  {/* Critical Allergen Pills */}
                  {res.allergens && res.allergens.length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Kitchen Allergen Warning:
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
                    <p className="text-[11px] text-slate-600 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      "{res.chefNotes}"
                    </p>
                  )}
                </div>

                {/* Actions Bottom Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {res.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenSeatModal(res)}
                        className="btn-glass-green flex-1 py-1.5 rounded-lg text-white font-semibold text-xs transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <Armchair className="w-3.5 h-3.5" />
                        <span>Seat Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onStatusChange(res._id, 'NO_SHOW')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-slate-200 transition-colors"
                        title="Mark No-Show"
                      >
                        No-Show
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenDietaryModal(res.customerPhone)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1"
                    title="View VIP Dietary Profile"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Profile</span>
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
