import React from 'react';
import { TableReservationDTO, ReservationHelper } from '@spicehub/ui';
import { Users, Phone, Clock, CreditCard, Check, Sparkles } from 'lucide-react';

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
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {reservation.customerName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                <span>{reservation.partySize} Covers</span>
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{reservation.customerPhone}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[11px] text-slate-400">{reservation.reservationNumber}</span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${reservation.status === 'SEATED' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`}></span>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Time Slot & Assigned Table Details */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Reserved Time</div>
            <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{ReservationHelper.formatTimeSlot(reservation.timeSlot)}</span>
              {isUpcoming && reservation.status === 'CONFIRMED' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Arrival window active"></span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Assigned Tables</div>
            <div className="font-bold text-slate-900 mt-0.5 truncate">
              {reservation.assignedTableIds && reservation.assignedTableIds.length > 0 ? (
                reservation.assignedTableIds.map((t) => `T${t.tableNumber}`).join(', ')
              ) : (
                <span className="text-amber-600 font-normal">Auto-Assign on Seat</span>
              )}
            </div>
          </div>
        </div>

        {/* Deposit Guarantee & Special Requests */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold border flex items-center gap-1 ${depositBadge.bg} ${depositBadge.text} ${depositBadge.border}`}>
            <CreditCard className="w-3 h-3" />
            <span>{depositBadge.label}</span>
          </span>
          {reservation.specialRequests && (
            <span className="text-[11px] text-slate-600 truncate flex items-center gap-1 max-w-[200px]" title={reservation.specialRequests}>
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{reservation.specialRequests}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {reservation.status === 'CONFIRMED' && (
          <>
            <button
              onClick={() => onCancel(reservation._id, true)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              No-Show
            </button>
            <button
              onClick={() => onCancel(reservation._id, false)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSeat(reservation._id)}
              disabled={isLoading}
              className="btn-glass-green flex-1 py-1.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Seat Guests</span>
            </button>
          </>
        )}

        {reservation.status === 'SEATED' && (
          <div className="w-full text-center py-1 text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Table Session Active (Dine-in Order Live)
          </div>
        )}

        {reservation.status === 'CANCELLED' && (
          <div className="w-full text-center py-1 text-xs text-slate-400 font-medium bg-slate-50 rounded-xl">
            Cancelled by Guest / Staff
          </div>
        )}

        {reservation.status === 'NO_SHOW' && (
          <div className="w-full text-center py-1 text-xs text-rose-600 font-medium bg-rose-50 rounded-xl border border-rose-200/60">
            Marked No-Show (Deposit Handled)
          </div>
        )}
      </div>
    </div>
  );
};
