import React, { useState } from 'react';
import {
  MatrixReservationBlock,
  MatrixRoomCategory,
} from '../../../../../packages/ui/src/pms/types';
import { MatrixHelper } from '../../../../../packages/ui/src/pms/MatrixHelper';
import { formatCurrency } from '../../../../../packages/ui/src/index';

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
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📋</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-extrabold text-base text-amber-400">
                  {booking.bookingNumber}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusStyle.badge}`}>
                  {booking.bookingStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{booking.guestName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Dates & Room Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stay Duration</span>
              <div className="text-xs font-semibold text-slate-200">
                {MatrixHelper.formatDateShort(booking.checkInDate)} ➔ {MatrixHelper.formatDateShort(booking.checkOutDate)}
              </div>
              <span className="text-[11px] text-amber-400 font-bold">({nights} Nights)</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Allocated Room</span>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>🚪</span>
                <span>{assignedRoomName}</span>
              </div>
            </div>
          </div>

          {/* Guest Contact */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Guest Profile</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Mobile Phone:</span>
              <span className="font-mono text-slate-200 font-semibold">{booking.guestPhone}</span>
            </div>
            {booking.guestEmail && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Email Address:</span>
                <span className="text-slate-200 font-semibold">{booking.guestEmail}</span>
              </div>
            )}
          </div>

          {/* Financials Breakdown */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Total Booking Amount</span>
              <span className="font-mono font-bold text-white">{formatCurrency(booking.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Advance Deposit Received</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {formatCurrency(booking.advancePaymentAmount)} ({booking.paymentStatus})
              </span>
            </div>
            <div className="h-px bg-slate-800 my-1" />
            <div className="flex justify-between text-xs font-bold text-amber-300">
              <span>Balance Due</span>
              <span className="font-mono">
                {formatCurrency(Math.max(0, booking.grandTotal - booking.advancePaymentAmount))}
              </span>
            </div>
          </div>

          {/* Re-assignment Tool (if not checked in) */}
          {booking.bookingStatus === 'CONFIRMED' && onReassignRoom && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Re-assign Physical Room</span>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedTargetRoomId}
                  onChange={(e) => setSelectedTargetRoomId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-white outline-none focus:ring-1 focus:ring-amber-400"
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
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30 transition disabled:opacity-50"
                >
                  Move
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between space-x-3">
          {booking.bookingStatus === 'CONFIRMED' && onCancelReservation && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl transition active:scale-95 disabled:opacity-50"
            >
              Cancel Booking
            </button>
          )}

          <div className="flex-1 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Close
            </button>

            {booking.bookingStatus === 'CONFIRMED' && onCheckIn && (
              <button
                onClick={handleCheckIn}
                disabled={isProcessing || !booking.allocatedRoomId}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>🔑</span>
                <span>{isProcessing ? 'Checking In...' : 'Check-In Guest'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
