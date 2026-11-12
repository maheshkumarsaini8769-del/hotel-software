import React from 'react';
import {
  IGroupBookingUI,
  CorporateHelper,
  GroupBookingStatus,
} from '@spicehub/ui';
import { UserCheck, FileText, Plus, CreditCard, LogOut } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between">
      <div>
        {/* Top Header: Code, Policy, Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">
                {group.groupBookingCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass} flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                {statusInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
              {group.groupName}
            </h3>
            {group.companyName && (
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700">{group.companyName}</span>
                {group.companyGst && (
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600 border border-slate-200">
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
        <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 text-xs mb-4">
          <div>
            <div className="text-slate-400 font-medium">Dates ({nights} Nights)</div>
            <div className="text-slate-800 font-semibold mt-0.5">
              {new Date(group.checkInDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              {' → '}
              {new Date(group.checkOutDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Organizer</div>
            <div className="text-slate-800 font-semibold mt-0.5 truncate">
              {group.organizerName} ({group.organizerPhone})
            </div>
          </div>
        </div>

        {/* Room Block Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">
              Room Allocation Progress
            </span>
            <span className="text-slate-800 font-bold">
              {checkedInRooms} / {totalRooms} In-House ({occupancyPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Pending: {totalRooms - checkedInRooms - checkedOutRooms}</span>
            <span>Checked Out: {checkedOutRooms}</span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 font-medium">Total Contract Tariff</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              ₹{netPayable.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Paid / Adv: ₹{corporatePaid.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 font-medium">Corporate Due Balance</div>
            <div className={`text-base font-bold mt-0.5 ${corporateDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ₹{corporateDue.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {masterFolio?.folioNumber || 'Master Folio Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        {hasPendingCheckIn && (
          <button
            onClick={() => onBulkCheckIn(group)}
            className="btn-glass-green flex-1 py-1.5 px-3 rounded-xl text-white font-semibold text-xs transition-all shadow-xs text-center flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Bulk Check-In</span>
          </button>
        )}

        <button
          onClick={() => onViewSplitFolio(group)}
          className="btn-glass-green-subtle flex-1 py-1.5 px-3 rounded-xl text-emerald-800 font-semibold text-xs border border-emerald-200 transition-all text-center flex items-center justify-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Split Folio & Tax Invoice</span>
        </button>

        {hasActiveStays && (
          <button
            onClick={() => onPostIncidental(group)}
            className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-all text-center shadow-xs flex items-center gap-1"
            title="Post Room Service or Banquet Charge"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Post Charge</span>
          </button>
        )}

        {corporateDue > 0 && (
          <button
            onClick={() => onSettleCorporate(group)}
            className="btn-glass-green py-1.5 px-3 rounded-xl text-white font-semibold text-xs transition-all shadow-xs text-center flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Settle Master</span>
          </button>
        )}

        {hasActiveStays && (
          <button
            onClick={() => onBulkCheckout(group)}
            className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs border border-rose-200 transition-all text-center flex items-center gap-1"
            title="Checkout all in-house rooms"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Group Checkout</span>
          </button>
        )}
      </div>
    </div>
  );
};
