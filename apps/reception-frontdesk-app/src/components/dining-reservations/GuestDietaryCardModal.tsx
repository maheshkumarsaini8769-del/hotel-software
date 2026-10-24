import React from 'react';
import { DiningReservationHelper } from '@spicehub/ui';

interface GuestDietaryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestProfile: any;
  pastReservations: any[];
}

export const GuestDietaryCardModal: React.FC<GuestDietaryCardModalProps> = ({
  isOpen,
  onClose,
  guestProfile,
  pastReservations,
}) => {
  if (!isOpen || !guestProfile) return null;

  const vipBadge = DiningReservationHelper.getVipBadge(guestProfile.vipTier || 'REGULAR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f131a] border border-rose-500/30 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">{guestProfile.name}</h2>
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
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">{guestProfile.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div>
              <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Total Dining Visits</span>
              <span className="text-xl font-black text-white font-mono">{guestProfile.totalVisits || 1}</span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase font-semibold block">Lifetime Spend</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {DiningReservationHelper.formatCurrency(guestProfile.totalLifetimeSpend || 0)}
              </span>
            </div>
          </div>

          {/* Critical Allergies Banner */}
          {guestProfile.allergies && guestProfile.allergies.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-500/40 p-3.5 rounded-xl space-y-2">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
                🚨 Registered Medical Allergens:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {guestProfile.allergies.map((a: string, idx: number) => {
                  const tag = DiningReservationHelper.getAllergenTag(a);
                  return (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: tag.bg, color: tag.text }}
                    >
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Dining History */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block mb-2">
              Recent Table Visits ({pastReservations.length})
            </span>
            <div className="space-y-2">
              {pastReservations.map((r, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-white">{r.reservationNumber}</span>
                    <span className="text-zinc-500 ml-2">({r.timeSlot} • {r.mealPeriod})</span>
                  </div>
                  <span className="text-zinc-400 font-medium">Party of {r.partySize}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
