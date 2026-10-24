import React from 'react';
import {
  IGroupBookingUI,
  CorporateHelper,
  GroupBookingStatus,
} from '@spicehub/ui';

interface GroupBookingCardProps {
  group: IGroupBookingUI;
  onBulkCheckIn: (group: IGroupBookingUI) => void;
  onPostIncidental: (group: IGroupBookingUI) => void;
  onViewSplitFolio: (group: IGroupBookingUI) => void;
  onSettleCorporate: (group: IGroupBookingUI) => void;
  onBulkCheckout: (group: IGroupBookingUI) => void;
}

export const GroupBookingCard: React.FC<GroupBookingCardProps> = ({
  group,
  onBulkCheckIn,
  onPostIncidental,
  onViewSplitFolio,
  onSettleCorporate,
  onBulkCheckout,
}) => {
  const statusInfo = CorporateHelper.getStatusInfo(group.status);
  const policyInfo = CorporateHelper.getSplitPolicyInfo(group.splitBillingPolicy);
  const nights = CorporateHelper.calculateNights(group.checkInDate, group.checkOutDate);

  const totalRooms = group.rooms?.length || 0;
  const checkedInRooms = group.rooms?.filter((r) => r.status === 'CHECKED_IN').length || 0;
  const checkedOutRooms = group.rooms?.filter((r) => r.status === 'CHECKED_OUT').length || 0;
  const occupancyPercent = totalRooms > 0 ? Math.round((checkedInRooms / totalRooms) * 100) : 0;

  const masterFolio = CorporateHelper.extractMasterFolio(group);
  const corporateDue = masterFolio?.dueAmount ?? 0;
  const corporatePaid = (masterFolio?.paidAmount ?? 0) + (masterFolio?.advancePaid ?? group.advanceDepositPaid ?? 0);
  const netPayable = masterFolio?.netAmountPayable ?? group.totalEstimatedAmount;

  const hasPendingCheckIn = group.rooms?.some((r) => r.status === 'CONFIRMED');
  const hasActiveStays = checkedInRooms > 0;

  return (
    <div className="bg-[#121721] rounded-2xl border border-zinc-800 hover:border-amber-500/40 p-5 transition-all shadow-lg flex flex-col justify-between">
      <div>
        {/* Top Header: Code, Policy, Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-amber-400">
                {group.groupBookingCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                {statusInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 leading-snug">
              {group.groupName}
            </h3>
            {group.companyName && (
              <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-zinc-300">{group.companyName}</span>
                {group.companyGst && (
                  <span className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-[11px] text-amber-300/90 border border-zinc-700/60">
                    GST: {group.companyGst}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${policyInfo.badgeClass}`}
              title={policyInfo.description}
            >
              {policyInfo.label}
            </span>
          </div>
        </div>

        {/* Date & Contact Strip */}
        <div className="grid grid-cols-2 gap-2 py-3 border-y border-zinc-800/70 text-xs mb-4">
          <div>
            <div className="text-zinc-500 font-medium">Dates ({nights} Nights)</div>
            <div className="text-zinc-200 font-semibold mt-0.5">
              {new Date(group.checkInDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              {' → '}
              {new Date(group.checkOutDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium">Organizer</div>
            <div className="text-zinc-200 font-semibold mt-0.5 truncate">
              {group.organizerName} ({group.organizerPhone})
            </div>
          </div>
        </div>

        {/* Room Block Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400 font-medium">
              Room Allocation Progress
            </span>
            <span className="text-zinc-200 font-bold">
              {checkedInRooms} / {totalRooms} In-House ({occupancyPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
            <span>Pending: {totalRooms - checkedInRooms - checkedOutRooms}</span>
            <span>Checked Out: {checkedOutRooms}</span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="bg-[#0b0e14] p-3 rounded-xl border border-zinc-800/80 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-zinc-500 font-medium">Total Contract Tariff</div>
            <div className="text-sm font-bold text-zinc-200">
              ₹{netPayable.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-0.5">
              Paid / Adv: ₹{corporatePaid.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500 font-medium">Corporate Due Balance</div>
            <div className={`text-base font-black ${corporateDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ₹{corporateDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {masterFolio?.folioNumber || 'Master Folio Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Zero Dead Buttons) */}
      <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-2">
        {hasPendingCheckIn && (
          <button
            onClick={() => onBulkCheckIn(group)}
            className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-md text-center"
          >
            ⚡ Bulk Check-In
          </button>
        )}

        <button
          onClick={() => onViewSplitFolio(group)}
          className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700/60 transition-all text-center"
        >
          📄 Split Folio & Tax Invoice
        </button>

        {hasActiveStays && (
          <button
            onClick={() => onPostIncidental(group)}
            className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-medium text-xs border border-amber-500/30 transition-all text-center"
            title="Post Room Service or Banquet Charge"
          >
            + Post Charge
          </button>
        )}

        {corporateDue > 0 && (
          <button
            onClick={() => onSettleCorporate(group)}
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md text-center"
          >
            💳 Settle Master
          </button>
        )}

        {hasActiveStays && (
          <button
            onClick={() => onBulkCheckout(group)}
            className="py-1.5 px-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-medium text-xs border border-rose-800/40 transition-all text-center"
            title="Checkout all in-house rooms"
          >
            🚪 Group Checkout
          </button>
        )}
      </div>
    </div>
  );
};
