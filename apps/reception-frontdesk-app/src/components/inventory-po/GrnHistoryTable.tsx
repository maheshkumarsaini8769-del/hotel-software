import React from 'react';
import { IGoodsReceivedNoteUI, InventoryPoHelper } from '@spicehub/ui';
import { GrnStatusBadge } from './PoStatusBadge';

interface GrnHistoryTableProps {
  grns: IGoodsReceivedNoteUI[];
  loading: boolean;
}

export const GrnHistoryTable: React.FC<GrnHistoryTableProps> = ({ grns, loading }) => {
  return (
    <div className="bg-[#0f131a] rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Dock Goods Received Register (GRN)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Physical receipt audit trail, invoice matching and accepted value verification
          </p>
        </div>
        <span className="text-xs text-zinc-400 font-mono">
          {grns.length} Receiving Records
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-[#121620] text-zinc-400 uppercase font-semibold text-[11px] border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3">GRN #</th>
              <th className="px-4 py-3">Ref PO #</th>
              <th className="px-4 py-3">Supplier Name</th>
              <th className="px-4 py-3">Vendor Invoice #</th>
              <th className="px-4 py-3 text-right">Accepted Value</th>
              <th className="px-4 py-3">Inspection Status</th>
              <th className="px-4 py-3">Dock Notes</th>
              <th className="px-4 py-3">Receiving Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 bg-zinc-950/40">
            {grns.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  No dock receiving notes generated yet
                </td>
              </tr>
            ) : (
              grns.map((grn) => {
                const vendorName = typeof grn.vendorId === 'object' ? grn.vendorId?.name : 'Vendor';
                const poNumber = typeof grn.poId === 'object' ? grn.poId?.poNumber : 'PO';

                return (
                  <tr key={grn._id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {grn.grnNumber}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                      {poNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[170px] truncate">
                      {vendorName}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {grn.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-white">
                      {InventoryPoHelper.formatCurrency(grn.finalInvoiceAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <GrnStatusBadge status={grn.status} />
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-zinc-400" title={grn.dockNotes}>
                      {grn.dockNotes || 'No issues reported'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
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
