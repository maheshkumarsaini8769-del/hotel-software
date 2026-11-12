import React from 'react';
import { IGoodsReceivedNoteUI, InventoryPoHelper } from '@spicehub/ui';
import { GrnStatusBadge } from './PoStatusBadge';
import { Truck, FileCheck, Calendar, DollarSign, Package } from 'lucide-react';

interface GrnHistoryTableProps {
  grns: IGoodsReceivedNoteUI[];
  loading: boolean;
}

export const GrnHistoryTable: React.FC<GrnHistoryTableProps> = ({ grns, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Dock Goods Received Register (GRN)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical receipt audit trail, invoice 3-way matching, and accepted dock stock verification.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {grns.length} Received Logs
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5">GRN #</th>
              <th className="px-4 py-3.5">Ref PO #</th>
              <th className="px-4 py-3.5">Supplier Name</th>
              <th className="px-4 py-3.5">Supplier Invoice #</th>
              <th className="px-4 py-3.5 text-right">Accepted Value</th>
              <th className="px-4 py-3.5">Quality Inspection</th>
              <th className="px-4 py-3.5">Dock Notes</th>
              <th className="px-4 py-3.5">Receiving Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {grns.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700">No Dock Receiving Notes Recorded</p>
                    <p className="text-xs text-slate-400">
                      When vendors deliver stock against an approved PO, generate GRN at the dock.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              grns.map((grn) => {
                const vendorName = typeof grn.vendorId === 'object' ? grn.vendorId?.name : 'Vendor';
                const poNumber = typeof grn.poId === 'object' ? grn.poId?.poNumber : 'PO';

                return (
                  <tr key={grn._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                      {grn.grnNumber}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                      {poNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[180px] truncate">
                      {vendorName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {grn.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {InventoryPoHelper.formatCurrency(grn.finalInvoiceAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <GrnStatusBadge status={grn.status} />
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-500" title={grn.dockNotes}>
                      {grn.dockNotes || 'All items verified'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                      {new Date(grn.createdAt || grn.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
