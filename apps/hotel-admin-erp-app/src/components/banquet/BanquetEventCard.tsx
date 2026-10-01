import React from 'react';
import {
  IBanquetBookingUI,
  BanquetHelper,
  BanquetBookingStatus,
} from '@spicehub/ui';

interface BanquetEventCardProps {
  booking: IBanquetBookingUI;
  onViewFP: (booking: IBanquetBookingUI) => void;
  onPostCharge: (booking: IBanquetBookingUI) => void;
  onSettleFolio: (booking: IBanquetBookingUI) => void;
  onCompleteEvent: (booking: IBanquetBookingUI) => void;
}

export const BanquetEventCard: React.FC<BanquetEventCardProps> = ({
  booking,
  onViewFP,
  onPostCharge,
  onSettleFolio,
  onCompleteEvent,
}) => {
  const typeInfo = BanquetHelper.getEventTypeInfo(booking.eventType);
  const slotInfo = BanquetHelper.getTimeSlotInfo(booking.timeSlot);
  const statusInfo = BanquetHelper.getStatusInfo(booking.status);
  const layoutLabel = BanquetHelper.getSeatingLayoutLabel(booking.functionProspectus.seatingLayout);

  const fp = booking.functionProspectus;
  const isFpReady = fp.chefSignOff && fp.banquetManagerSignOff && fp.electricianAvSignOff;

  const totalContract = booking.totalEstimatedAmount;
  const advancePaid = (booking.paidAmount || 0) + (booking.advanceDepositPaid || 0);
  const balanceDue = booking.dueAmount;

  return (
    <div className="bg-[#121721] rounded-2xl border border-zinc-800 hover:border-amber-500/40 p-5 transition-all shadow-lg flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-amber-400">
                {booking.bookingCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                {statusInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 leading-snug">
              {booking.eventName}
            </h3>
            <div className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5 mt-0.5">
              <span>🏛️ {booking.venueName}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{typeInfo.icon} {typeInfo.label}</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${slotInfo.badgeClass}`}>
              {slotInfo.label}
            </span>
            <div className="text-[10px] text-zinc-500 mt-1">{slotInfo.timing}</div>
          </div>
        </div>

        {/* Date, Pax & Organizer Strip */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-800/70 text-xs mb-3">
          <div>
            <div className="text-zinc-500 font-medium">Event Date</div>
            <div className="text-zinc-200 font-bold mt-0.5">
              {new Date(booking.eventDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          <div>
            <div className="text-zinc-500 font-medium">Headcount (Pax)</div>
            <div className="text-zinc-200 font-bold mt-0.5">
              {booking.guaranteedPax} <span className="text-zinc-500 text-[11px] font-normal">(Exp: {booking.expectedPax})</span>
            </div>
          </div>

          <div>
            <div className="text-zinc-500 font-medium">Organizer</div>
            <div className="text-zinc-200 font-bold mt-0.5 truncate" title={booking.organizerName}>
              {booking.organizerName}
            </div>
          </div>
        </div>

        {/* Function Prospectus (BEO) Readiness Bar */}
        <div className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800/80 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">
              Function Prospectus (FP Checklist)
            </span>
            <span className={`text-[11px] font-bold ${isFpReady ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isFpReady ? '✓ All Departments Signed Off' : '⚠️ Pending Sign-Offs'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className={`p-1.5 rounded-lg border text-center ${fp.chefSignOff ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              👨‍🍳 Kitchen Chef
            </div>
            <div className={`p-1.5 rounded-lg border text-center ${fp.banquetManagerSignOff ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              🧑‍💼 Service Lead
            </div>
            <div className={`p-1.5 rounded-lg border text-center ${fp.electricianAvSignOff ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
              🔊 AV & Stage
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 truncate">
            Layout: <span className="text-zinc-300">{layoutLabel}</span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800/80 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-zinc-500 font-medium">Contract Value (with GST)</div>
            <div className="text-sm font-bold text-zinc-200 mt-0.5">
              ₹{totalContract.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              Advance Paid: ₹{advancePaid.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="text-right">
            <div className="text-zinc-500 font-medium">Balance Due</div>
            <div className={`text-base font-black mt-0.5 ${balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ₹{balanceDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
              {booking.pricingType === 'PER_PLATE' ? `₹${booking.perPlateRate}/plate` : 'Venue Only'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Zero Dead Buttons) */}
      <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onViewFP(booking)}
          className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all text-center"
        >
          📋 View FP (BEO)
        </button>

        <button
          onClick={() => onPostCharge(booking)}
          className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs border border-zinc-700 transition-all text-center"
          title="Post Extra Pax, Champagne, Live Counter"
        >
          + Extra Pax / Item
        </button>

        {balanceDue > 0 && (
          <button
            onClick={() => onSettleFolio(booking)}
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md text-center"
          >
            💳 Settle Due
          </button>
        )}

        {booking.status !== BanquetBookingStatus.COMPLETED && (
          <button
            onClick={() => onCompleteEvent(booking)}
            className="py-1.5 px-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-purple-300 font-medium text-xs border border-purple-800/40 transition-all text-center"
            title="Complete event and release venue"
          >
            ✓ Complete
          </button>
        )}
      </div>
    </div>
  );
};
