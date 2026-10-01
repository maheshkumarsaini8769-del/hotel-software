import React from 'react';
import { RoomArrivalBookingDTO, ReservationHelper } from '@spicehub/ui';

interface RoomArrivalCardProps {
  booking: RoomArrivalBookingDTO;
  onOpenAssignModal: (booking: RoomArrivalBookingDTO) => void;
  onCheckIn: (booking: RoomArrivalBookingDTO) => void;
  isLoading: boolean;
}

export const RoomArrivalCard: React.FC<RoomArrivalCardProps> = ({
  booking,
  onOpenAssignModal,
  onCheckIn,
  isLoading,
}) => {
  const badge = ReservationHelper.getRoomArrivalBadge(booking);
  const isAssigned = !!booking.allocatedRoomId;
  const isCheckedIn = booking.bookingStatus === 'CHECKED_IN';
  const balanceDue = Math.max(0, booking.grandTotal - booking.advancePaymentAmount);

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50 group backdrop-blur-sm">
      <div>
        {/* Header: Guest Name & Booking # */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                {booking.guestName}
              </span>
              <span className="text-[11px] font-mono text-slate-500">{booking.bookingNumber}</span>
            </div>
            <div className="text-xs text-amber-500/90 font-medium mt-0.5">
              {booking.roomTypeId?.name || 'Luxury Category'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              📞 {booking.guestPhone}
            </div>
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text} border ${badge.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-400' : isAssigned ? 'bg-amber-400' : 'bg-rose-400 animate-pulse'}`}></span>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Stay Dates & Financial Breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Arrival & Departure</div>
            <div className="font-semibold text-slate-200 mt-0.5 text-[11px]">
              {new Date(booking.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ➔{' '}
              {new Date(booking.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Billing Tariff</div>
            <div className="font-bold text-white mt-0.5">
              ₹{booking.grandTotal}{' '}
              {balanceDue > 0 ? (
                <span className="text-amber-400 text-[10px] font-normal">(Due: ₹{balanceDue})</span>
              ) : (
                <span className="text-emerald-400 text-[10px] font-normal">(Paid)</span>
              )}
            </div>
          </div>
        </div>

        {/* Room Assignment Banner */}
        <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">🚪 Room:</span>
            {isAssigned ? (
              <span className="font-bold text-amber-300">
                Room {booking.allocatedRoomId?.roomNumber} (Floor {booking.allocatedRoomId?.floorNumber})
              </span>
            ) : (
              <span className="text-rose-400 font-semibold text-[11px]">Not Yet Assigned</span>
            )}
          </div>

          {!isCheckedIn && (
            <button
              onClick={() => onOpenAssignModal(booking)}
              disabled={isLoading}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
            >
              {isAssigned ? 'Change Room' : 'Assign Clean Room'}
            </button>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
        {!isCheckedIn && booking.bookingStatus === 'CONFIRMED' && (
          <button
            onClick={() => onCheckIn(booking)}
            disabled={isLoading || !isAssigned}
            className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center ${
              isAssigned
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-950/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            {isAssigned ? '✓ Express Check-In & Issue Keycard' : 'Assign Room First'}
          </button>
        )}

        {isCheckedIn && (
          <div className="w-full text-center py-1 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Guest Checked In (Active Stay & Folio Open)
          </div>
        )}
      </div>
    </div>
  );
};
