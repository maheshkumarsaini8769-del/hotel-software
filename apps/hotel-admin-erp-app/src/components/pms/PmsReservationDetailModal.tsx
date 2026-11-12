import { ClipboardList, Key, DoorOpen } from 'lucide-react';
import React, { useState } from 'react';
import {
  MatrixReservationBlock,
  MatrixRoomCategory,
} from '@spicehub/ui';
import { MatrixHelper } from '@spicehub/ui';
import { formatCurrency } from '@spicehub/ui';

export interface PmsReservationDetailModalProps {
  booking: MatrixReservationBlock | null;
  roomTypes: MatrixRoomCategory[];
  isOpen: boolean;
  onClose: () => void;
  onCheckIn?: (bookingId: string, physicalRoomId: string) => Promise<void> | void;
  onReassignRoom?: (bookingId: string, targetRoomId: string) => Promise<void> | void;
  onCancelReservation?: (bookingId: string) => Promise<void> | void;
}

export const PmsReservationDetailModal: React.FC<PmsReservationDetailModalProps> = ({
  booking,
  roomTypes,
  isOpen,
  onClose,
  onCheckIn,
  onReassignRoom,
  onCancelReservation,
}) => {
  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const statusStyle = MatrixHelper.getReservationStatusStyle(booking.bookingStatus);
  const nights = MatrixHelper.calculateNights(booking.checkInDate, booking.checkOutDate);

  // Find physical room
  let assignedRoomName = 'Unassigned';
  let currentRoomCategoryId = booking.roomTypeId;
  for (const rt of roomTypes) {
    const found = rt.rooms.find((r) => r.id === booking.allocatedRoomId);
    if (found) {
      assignedRoomName = `Room ${found.roomNumber} (${rt.name})`;
      currentRoomCategoryId = rt.id;
      break;
    }
  }

  const handleCheckIn = async () => {
    if (!booking.allocatedRoomId) {
      setErrorMessage('Please assign a physical room before check-in');
      return;
    }
    if (!onCheckIn) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onCheckIn(booking.id, booking.allocatedRoomId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedTargetRoomId || !onReassignRoom) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onReassignRoom(booking.id, selectedTargetRoomId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Re-assignment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancelReservation) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onCancelReservation(booking.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Cancellation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-slate-900">
                  {booking.bookingNumber}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusStyle.badge}`}>
                  {booking.bookingStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{booking.guestName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Dates & Room Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Stay Duration</span>
              <div className="text-xs font-semibold text-slate-800">
                {MatrixHelper.formatDateShort(booking.checkInDate)} ➔ {MatrixHelper.formatDateShort(booking.checkOutDate)}
              </div>
              <span className="text-[11px] text-amber-400 font-bold">({nights} Nights)</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Allocated Room</span>
              <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <DoorOpen className="w-4 h-4 text-slate-500" />
                <span>{assignedRoomName}</span>
              </div>
            </div>
          </div>

          {/* Guest Contact */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Guest Profile</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Mobile Phone:</span>
              <span className="font-mono text-slate-800 font-semibold">{booking.guestPhone}</span>
            </div>
            {booking.guestEmail && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-slate-800 font-semibold">{booking.guestEmail}</span>
              </div>
            )}
          </div>

          {/* Financials Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Total Booking Amount</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(booking.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Advance Deposit Received</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {formatCurrency(booking.advancePaymentAmount)} ({booking.paymentStatus})
              </span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between text-xs font-bold text-slate-900">
              <span>Balance Due</span>
              <span className="font-mono text-emerald-700">
                {formatCurrency(Math.max(0, booking.grandTotal - booking.advancePaymentAmount))}
              </span>
            </div>
          </div>

          {/* Re-assignment Tool (if not checked in) */}
          {booking.bookingStatus === 'CONFIRMED' && onReassignRoom && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Re-assign Physical Room</span>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedTargetRoomId}
                  onChange={(e) => setSelectedTargetRoomId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Select target room...</option>
                  {roomTypes.flatMap((rt) =>
                    rt.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} - {rt.name} ({r.status})
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={handleReassign}
                  disabled={!selectedTargetRoomId || isProcessing}
                  className="btn-glass-green-subtle px-3.5 py-2 font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  Move
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between space-x-3">
          {booking.bookingStatus === 'CONFIRMED' && onCancelReservation && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="py-2 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel Booking
            </button>
          )}

          <div className="flex-1 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="py-2 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {booking.bookingStatus === 'CONFIRMED' && onCheckIn && (
              <button
                onClick={handleCheckIn}
                disabled={isProcessing || !booking.allocatedRoomId}
                className="btn-glass-green py-2 px-5 font-bold text-xs rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4 text-white" />
                <span>{isProcessing ? 'Checking In...' : 'Check-In Guest'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
