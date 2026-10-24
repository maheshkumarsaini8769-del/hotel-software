import React, { useState } from 'react';
import {
  KotVoidAuditDTO,
  KotVoidReason,
  WasteDisposition,
  KotVoidHelper,
  formatCurrency,
} from '@spicehub/ui';
import { ShieldCheck, Filter, Search, Calendar, UserCheck, AlertOctagon } from 'lucide-react';

export interface VoidAuditLogTableProps {
  logs: KotVoidAuditDTO[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const VoidAuditLogTable: React.FC<VoidAuditLogTableProps> = ({
  logs,
  isLoading = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [selectedDisposition, setSelectedDisposition] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.managerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesReason = selectedReason === 'ALL' || log.voidReason === selectedReason;
    const matchesDisposition =
      selectedDisposition === 'ALL' || log.wasteDisposition === selectedDisposition;

    return matchesSearch && matchesReason && matchesDisposition;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Table Filter Toolbar */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Item, Order #, Table, or Manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reason Filter */}
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
          >
            <option value="ALL">All Void Reasons</option>
            {Object.values(KotVoidReason).map((r) => (
              <option key={r} value={r}>
                {KotVoidHelper.formatVoidReasonLabel(r)}
              </option>
            ))}
          </select>

          {/* Disposition Filter */}
          <select
            value={selectedDisposition}
            onChange={(e) => setSelectedDisposition(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
          >
            <option value="ALL">All Waste Dispositions</option>
            {Object.values(WasteDisposition).map((d) => (
              <option key={d} value={d}>
                {KotVoidHelper.formatWasteDispositionLabel(d)}
              </option>
            ))}
          </select>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold">Timestamp</th>
              <th className="px-4 py-3 font-semibold">Order / Table</th>
              <th className="px-4 py-3 font-semibold">Voided Item</th>
              <th className="px-4 py-3 font-semibold">Void Value</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Waste Attribution</th>
              <th className="px-4 py-3 font-semibold">Authorized By</th>
              <th className="px-4 py-3 font-semibold">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-medium">No KOT Void Records Found</p>
                    <p className="text-xs text-slate-600">Zero unauthorized item deletions or waste reported.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const badge = KotVoidHelper.getWasteDispositionBadge(log.wasteDisposition);
                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <div className="text-[10px] text-slate-600">{new Date(log.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.orderNumber}</div>
                      <div className="text-[11px] text-amber-400 font-mono">{log.tableNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{log.itemName}</div>
                      <div className="text-[11px] text-slate-500">Qty: {log.quantity}x @ {formatCurrency(log.unitPrice)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-rose-400 font-mono">
                        {formatCurrency(log.totalVoidAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {KotVoidHelper.formatVoidReasonLabel(log.voidReason)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{log.managerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] max-w-[200px] truncate" title={log.notes}>
                      {log.notes || '—'}
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
