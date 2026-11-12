import React from 'react';
import { SeatSubFolioDTO } from '@spicehub/ui';
import { SeatBillingHelper } from '@spicehub/ui';
import { Printer, CheckCircle2 } from 'lucide-react';

export interface SubFolioSplitCardProps {
  subFolio: SeatSubFolioDTO;
  onSettleClick?: (subFolio: SeatSubFolioDTO) => void;
  onPrintClick?: (subFolio: SeatSubFolioDTO) => void;
}

export const SubFolioSplitCard: React.FC<SubFolioSplitCardProps> = ({
  subFolio,
  onSettleClick,
  onPrintClick,
}) => {
  const badge = SeatBillingHelper.getSubFolioStatusBadge(subFolio.status);

  return (
    <div
      className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between min-h-[260px] transition ${
        subFolio.status === 'SETTLED' ? 'border-emerald-300 ring-1 ring-emerald-300/30' : 'border-slate-200'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {SeatBillingHelper.formatSubFolioTitle(subFolio)}
            </div>
            <div className="text-xs text-slate-500">
              Bill #{subFolio.subFolioNumber}
            </div>
          </div>

          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border"
            style={{
              backgroundColor: badge.bg,
              color: badge.text,
              borderColor: badge.border,
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Item List */}
        <div className="flex flex-col gap-1.5 mb-4">
          {subFolio.lineItems.map((item, index) => (
            <div
              key={index}
              className="flex justify-between text-xs text-slate-700"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold text-slate-900">₹{item.subtotal}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {/* Tax and Total Breakdown */}
        <div className="border-t border-dashed border-slate-200 pt-2.5 mb-3.5 text-xs text-slate-500">
          <div className="flex justify-between mb-0.5">
            <span>Subtotal:</span>
            <span>₹{subFolio.subTotal}</span>
          </div>
          <div className="flex justify-between mb-0.5">
            <span>GST (5%):</span>
            <span>₹{subFolio.totalTax}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 mt-1">
            <span>Total Payable:</span>
            <span className={subFolio.status === 'SETTLED' ? 'text-emerald-700' : 'text-rose-600'}>
              ₹{subFolio.grandTotal}
            </span>
          </div>
          {subFolio.status === 'SETTLED' && (
            <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paid via {subFolio.paymentMethod}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {subFolio.status !== 'SETTLED' && onSettleClick && (
            <button
              type="button"
              onClick={() => onSettleClick(subFolio)}
              className="btn-glass-green flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Settle Seat Bill
            </button>
          )}

          {onPrintClick && (
            <button
              type="button"
              onClick={() => onPrintClick(subFolio)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
