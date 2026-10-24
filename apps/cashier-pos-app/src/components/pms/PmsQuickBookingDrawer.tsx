import React, { useState, useEffect } from 'react';
import { QuickReserveTarget, MatrixRoomCategory } from '../../../../../packages/ui/src/pms/types';
import { MatrixHelper } from '../../../../../packages/ui/src/pms/MatrixHelper';
import { formatCurrency } from '../../../../../packages/ui/src/index';

export interface PmsQuickBookingDrawerProps {
  target: QuickReserveTarget | null;
  roomTypes: MatrixRoomCategory[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmBooking: (data: {
    roomTypeId: string;
    roomId?: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    advancePaymentAmount: number;
    specialRequests?: string;
  }) => Promise<void> | void;
}

export const PmsQuickBookingDrawer: React.FC<PmsQuickBookingDrawerProps> = ({
  target,
  roomTypes,
  isOpen,
  onClose,
  onConfirmBooking,
}) => {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [adults, setAdults] = useState<number>(2);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setSelectedRoomTypeId(target.roomTypeId);
      setSelectedRoomId(target.roomId || '');
      setCheckInDate(target.checkInDate);

      // Default check-out is next day
      const nextDay = new Date(target.checkInDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      setCheckOutDate(target.checkOutDate || nextDay.toISOString().slice(0, 10));
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setAdults(2);
      setAdvanceAmount(0);
      setSpecialRequests('');
      setValidationError(null);
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const currentCategory = roomTypes.find((rt) => rt.id === selectedRoomTypeId);
  const basePrice = currentCategory ? currentCategory.basePrice : 3000;
  const tariffDetails = MatrixHelper.calculateEstimatedTariff(basePrice, checkInDate, checkOutDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!guestName.trim()) {
      setValidationError('Please enter guest full name');
      return;
    }
    if (!guestPhone.trim() || guestPhone.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (checkOutDate <= checkInDate) {
      setValidationError('Check-out date must be strictly after check-in date');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmBooking({
        roomTypeId: selectedRoomTypeId,
        roomId: selectedRoomId || undefined,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        checkInDate,
        checkOutDate,
        adults,
        advancePaymentAmount: advanceAmount,
        specialRequests: specialRequests.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-white animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🛎️</span>
            <div>
              <h2 className="text-base font-extrabold text-white">Quick Reservation</h2>
              <p className="text-xs text-amber-400 font-medium">Front-Desk Instant Room Allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Room & Category Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Room Category</label>
              <select
                value={selectedRoomTypeId}
                onChange={(e) => {
                  setSelectedRoomTypeId(e.target.value);
                  setSelectedRoomId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:ring-1 focus:ring-amber-400 outline-none"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({formatCurrency(rt.basePrice)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Room Number</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:ring-1 focus:ring-amber-400 outline-none"
              >
                <option value="">Unassigned (Auto Pool)</option>
                {currentCategory?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Check-In Date</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Check-Out Date</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Guest Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Guest Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Vikram Malhotra"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Adults</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-white focus:ring-1 focus:ring-amber-400 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Guest Email (Optional)</label>
              <input
                type="email"
                placeholder="vikram@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Advance Deposit & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Advance Deposit (₹)</label>
              <input
                type="number"
                min="0"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-amber-300 font-mono focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Special Notes</label>
              <input
                type="text"
                placeholder="High floor, quiet room"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Real-time Authoritative Tariff Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 shadow-inner">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Duration ({tariffDetails.nights} Night{tariffDetails.nights > 1 ? 's' : ''})</span>
              <span className="font-mono text-slate-200">{formatCurrency(tariffDetails.baseTariff)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>GST ({tariffDetails.gstRate}%)</span>
              <span className="font-mono text-slate-200">{formatCurrency(tariffDetails.taxAmount)}</span>
            </div>
            <div className="h-px bg-slate-800 my-1" />
            <div className="flex justify-between text-sm font-extrabold text-white">
              <span>Grand Total</span>
              <span className="font-mono text-amber-400">{formatCurrency(tariffDetails.grandTotal)}</span>
            </div>
            {advanceAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold pt-1">
                <span>Balance Due at Check-In</span>
                <span className="font-mono">{formatCurrency(Math.max(0, tariffDetails.grandTotal - advanceAmount))}</span>
              </div>
            )}
          </div>

          {/* Drawer Actions */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : '✨ Confirm & Block Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
