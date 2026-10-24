import React from 'react';
import { TableReservationDTO, ReservationHelper } from '@spicehub/ui';

interface DiningReservationCardProps {
  reservation: TableReservationDTO;
  onSeat: (reservationId: string) => void;
  onCancel: (reservationId: string, isNoShow: boolean) => void;
  isLoading: boolean;
}

export const DiningReservationCard: React.FC<DiningReservationCardProps> = ({
  reservation,
  onSeat,
  onCancel,
  isLoading,
}) => {
  const statusBadge = ReservationHelper.getTableStatusBadge(reservation.status);
  const depositBadge = ReservationHelper.getDepositBadge(reservation.depositStatus, reservation.depositAmount);
  const isUpcoming = ReservationHelper.isSlotUpcoming(reservation.timeSlot, reservation.reservationDate);

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50 group backdrop-blur-sm">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                {reservation.customerName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                👥 {reservation.partySize} Covers
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>📞 {reservation.customerPhone}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-mono text-[11px]">{reservation.reservationNumber}</span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${reservation.status === 'SEATED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Time Slot & Assigned Table Details */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Reserved Time</div>
            <div className="font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <span>🕒 {ReservationHelper.formatTimeSlot(reservation.timeSlot)}</span>
              {isUpcoming && reservation.status === 'CONFIRMED' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" title="Arrival window active"></span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Assigned Tables</div>
            <div className="font-bold text-white mt-0.5 truncate">
              {reservation.assignedTableIds && reservation.assignedTableIds.length > 0 ? (
                reservation.assignedTableIds.map((t) => `T${t.tableNumber}`).join(', ')
              ) : (
                <span className="text-amber-500/80 font-normal">Auto-Assign on Seat</span>
              )}
            </div>
          </div>
        </div>

        {/* Deposit Guarantee & Special Requests */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${depositBadge.bg} ${depositBadge.text} ${depositBadge.border}`}>
            💳 {depositBadge.label}
          </span>
          {reservation.specialRequests && (
            <span className="text-[11px] text-amber-300/90 truncate flex items-center gap-1 max-w-[200px]" title={reservation.specialRequests}>
              <span>✨</span>
              <span className="truncate">{reservation.specialRequests}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {reservation.status === 'CONFIRMED' && (
          <>
            <button
              onClick={() => onCancel(reservation._id, true)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/30 text-[11px] font-medium transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            >
              No-Show
            </button>
            <button
              onClick={() => onCancel(reservation._id, false)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSeat(reservation._id)}
              disabled={isLoading}
              className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              ✓ Seat Guests
            </button>
          </>
        )}

        {reservation.status === 'SEATED' && (
          <div className="w-full text-center py-1 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Table Session Active (Dine-in Order Live)
          </div>
        )}

        {reservation.status === 'CANCELLED' && (
          <div className="w-full text-center py-1 text-xs text-slate-500 font-medium">
            Cancelled by Guest / Staff
          </div>
        )}

        {reservation.status === 'NO_SHOW' && (
          <div className="w-full text-center py-1 text-xs text-rose-400 font-medium">
            Marked No-Show (Deposit Handled)
          </div>
        )}
      </div>
    </div>
  );
};
