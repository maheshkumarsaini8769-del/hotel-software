import React from 'react';
import { RoomArrivalBookingDTO, ReservationHelper } from '@spicehub/ui';
import { Phone, DoorOpen, Key, Check } from 'lucide-react';

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
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group">
      <div>
        {/* Header: Guest Name & Booking # */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {booking.guestName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">{booking.bookingNumber}</span>
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-0.5">
              {booking.roomTypeId?.name || 'Luxury Category'}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{booking.guestPhone}</span>
            </div>
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text} border ${badge.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-600' : isAssigned ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}></span>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Stay Dates & Financial Breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Arrival & Departure</div>
            <div className="font-semibold text-slate-800 mt-0.5 text-[11px]">
              {new Date(booking.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ➔{' '}
              {new Date(booking.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Billing Tariff</div>
            <div className="font-bold text-slate-900 mt-0.5">
              ₹{booking.grandTotal}{' '}
              {balanceDue > 0 ? (
                <span className="text-amber-600 text-[10px] font-normal">(Due: ₹{balanceDue})</span>
              ) : (
                <span className="text-emerald-700 text-[10px] font-semibold">(Paid)</span>
              )}
            </div>
          </div>
        </div>

        {/* Room Assignment Banner */}
        <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <DoorOpen className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Room:</span>
            {isAssigned ? (
              <span className="font-bold text-slate-900">
                Room {booking.allocatedRoomId?.roomNumber} (Floor {booking.allocatedRoomId?.floorNumber})
              </span>
            ) : (
              <span className="text-rose-600 font-semibold text-[11px]">Not Yet Assigned</span>
            )}
          </div>

          {!isCheckedIn && (
            <button
              onClick={() => onOpenAssignModal(booking)}
              disabled={isLoading}
              className="btn-glass-green-subtle text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {isAssigned ? 'Change Room' : 'Assign Clean Room'}
            </button>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
        {!isCheckedIn && booking.bookingStatus === 'CONFIRMED' && (
          <button
            onClick={() => onCheckIn(booking)}
            disabled={isLoading || !isAssigned}
            className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              isAssigned
                ? 'btn-glass-green shadow-xs'
                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isAssigned ? 'Express Check-In & Issue Keycard' : 'Assign Room First'}</span>
          </button>
        )}

        {isCheckedIn && (
          <div className="w-full text-center py-1.5 text-xs text-emerald-800 font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-200/60">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guest Checked In (Active Stay & Folio Open)</span>
          </div>
        )}
      </div>
    </div>
  );
};
