import React from 'react';
import {
  IBanquetBookingUI,
  BanquetHelper,
  BanquetBookingStatus,
  SeatingLayoutType,
} from '@spicehub/ui';
import { FileText, Plus, CreditCard, Check, Building2 } from 'lucide-react';

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
  const fp = booking.functionProspectus;
  const layoutLabel = BanquetHelper.getSeatingLayoutLabel(
    fp?.seatingLayout ?? SeatingLayoutType.THEATER
  );
  const isFpReady = Boolean(fp?.chefSignOff && fp?.banquetManagerSignOff && fp?.electricianAvSignOff);

  const totalContract = booking.totalEstimatedAmount;
  const advancePaid = (booking.paidAmount || 0) + (booking.advanceDepositPaid || 0);
  const balanceDue = booking.dueAmount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">
                {booking.bookingCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                {statusInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
              {booking.eventName}
            </h3>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {booking.venueName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{typeInfo.label}</span>
            </div>
          </div>

          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${slotInfo.badgeClass}`}>
              {slotInfo.label}
            </span>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">{slotInfo.timing}</div>
          </div>
        </div>

        {/* Date, Pax & Organizer Strip */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs mb-3">
          <div>
            <div className="text-slate-400 font-medium">Event Date</div>
            <div className="text-slate-800 font-semibold mt-0.5">
              {new Date(booking.eventDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>

          <div>
            <div className="text-slate-400 font-medium">Headcount (Pax)</div>
            <div className="text-slate-800 font-semibold mt-0.5">
              {booking.guaranteedPax} <span className="text-slate-400 text-[11px] font-normal">(Exp: {booking.expectedPax})</span>
            </div>
          </div>

          <div>
            <div className="text-slate-400 font-medium">Organizer</div>
            <div className="text-slate-800 font-semibold mt-0.5 truncate" title={booking.organizerName}>
              {booking.organizerName}
            </div>
          </div>
        </div>

        {/* Function Prospectus (BEO) Readiness Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Function Prospectus (FP Checklist)
            </span>
            <span className={`text-[11px] font-bold ${isFpReady ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isFpReady ? 'All Departments Signed Off' : 'Pending Sign-Offs'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className={`p-1.5 rounded-lg border text-center font-medium ${fp?.chefSignOff ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
              Kitchen Chef
            </div>
            <div className={`p-1.5 rounded-lg border text-center font-medium ${fp?.banquetManagerSignOff ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
              Service Lead
            </div>
            <div className={`p-1.5 rounded-lg border text-center font-medium ${fp?.electricianAvSignOff ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
              AV & Stage
            </div>
          </div>

          <div className="text-[11px] text-slate-500 truncate">
            Layout: <span className="text-slate-700 font-medium">{layoutLabel}</span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 font-medium">Contract Value (with GST)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{totalContract.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Advance Paid: ₹{advancePaid.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="text-right">
            <div className="text-slate-500 font-medium">Balance Due</div>
            <div className={`text-base font-bold mt-0.5 ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ₹{balanceDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {booking.pricingType === 'PER_PLATE' ? `₹${booking.perPlateRate}/plate` : 'Venue Only'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onViewFP(booking)}
          className="btn-glass-green-subtle flex-1 py-1.5 px-3 rounded-xl text-emerald-800 font-semibold text-xs transition-all text-center flex items-center justify-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View FP (BEO)</span>
        </button>

        <button
          onClick={() => onPostCharge(booking)}
          className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-all text-center shadow-xs flex items-center gap-1"
          title="Post Extra Pax, Champagne, Live Counter"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Extra Pax / Item</span>
        </button>

        {balanceDue > 0 && (
          <button
            onClick={() => onSettleFolio(booking)}
            className="btn-glass-green py-1.5 px-3 rounded-xl text-white font-semibold text-xs transition-all shadow-xs text-center flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Settle Due</span>
          </button>
        )}

        {booking.status !== BanquetBookingStatus.COMPLETED && (
          <button
            onClick={() => onCompleteEvent(booking)}
            className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-all text-center flex items-center gap-1"
            title="Complete event and release venue"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Complete</span>
          </button>
        )}
      </div>
    </div>
  );
};
