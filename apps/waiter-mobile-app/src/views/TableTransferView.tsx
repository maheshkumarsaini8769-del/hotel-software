import React, { useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Radio,
  FileText
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { useTableBills } from '../utils/useTableBills';

interface TableTransferViewProps {
  isDark: boolean;
  tablesList: TableStatusItem[];
  onTransferSuccess: (sourceTable: string, destTable: string, reason: string) => void;
  triggerToast: (msg: string) => void;
  waiterName?: string;
}

export const TableTransferView: React.FC<TableTransferViewProps> = ({
  isDark,
  tablesList,
  onTransferSuccess,
  triggerToast,
  waiterName = 'Waiter',
}) => {
  const occupiedTables = tablesList.filter((t) => t.status === 'Occupied' || t.status === 'My Table');
  const availableTables = tablesList.filter((t) => t.status === 'Available');

  const [sourceTable, setSourceTable] = useState(occupiedTables[0]?.name ? `Table ${occupiedTables[0].name}` : '');
  const [destTable, setDestTable] = useState(availableTables[0]?.name ? `Table ${availableTables[0].name}` : '');
  // Live running bill of the source table (used in the transfer preview).
  const tableBills = useTableBills([sourceTable]);
  const [reason, setReason] = useState('Guest requested window / view seat');
  const [notifyKds, setNotifyKds] = useState(true);
  const [printToken, setPrintToken] = useState(true);

  // Only transfers performed on this terminal are listed.
  const [recentTransfers, setRecentTransfers] = useState<
    Array<{ from: string; to: string; time: string; reason: string; waiter: string }>
  >([]);

  const handleConfirmTransfer = () => {
    if (!sourceTable || !destTable) {
      triggerToast('Select both a source and a destination table.');
      return;
    }
    if (sourceTable === destTable) {
      triggerToast('Error: Source and Destination tables cannot be identical.');
      return;
    }

    onTransferSuccess(sourceTable, destTable, reason);
    setRecentTransfers((prev) => [
      {
        from: sourceTable,
        to: destTable,
        time: 'Just now',
        reason,
        waiter: waiterName,
      },
      ...prev,
    ]);

    triggerToast(`Transferred active bill from ${sourceTable} to ${destTable}!`);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Table Transfer & Consolidation Console
            </h2>
            <p className="text-xs text-slate-400">
              Move guests, open orders, and running KOT bills with automatic KDS routing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
            isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-300'
          }`}>
            Active Tables: {occupiedTables.length}
          </span>
          <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            Available: {availableTables.length}
          </span>
        </div>
      </div>

      {/* Main 2-column workstation */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 overflow-y-auto pr-1 custom-scrollbar pb-32 lg:pb-8">
        {/* Left Form (7 cols) */}
        <div className={`lg:col-span-7 p-4 sm:p-6 rounded-2xl border space-y-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Transfer Parameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Table */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>1. From Source Table (Occupied)</label>
              <select
                value={sourceTable}
                onChange={(e) => setSourceTable(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {occupiedTables.map((t) => (
                  <option key={t.id} value={`Table ${t.name}`}>
                    Table {t.name} (Running Bill ₹{(t.id * 320) + 450} • 4 Guests)
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Table */}
            <div className="space-y-1.5">
              <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>2. To Destination Table (Available)</label>
              <select
                value={destTable}
                onChange={(e) => setDestTable(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {availableTables.map((t) => (
                  <option key={t.id} value={`Table ${t.name}`}>
                    Table {t.name} (Capacity: {t.guests || 4} Guests • Available)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>3. Transfer Reason / Authorization</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="Guest requested window / view seat">Guest requested window / view seat</option>
              <option value="AC cooling too cold / warm">AC cooling too cold / warm</option>
              <option value="Combined with friends party">Combined with friends party</option>
              <option value="Outdoor patio seating request">Outdoor patio seating request</option>
              <option value="Smoking section request">Smoking section request</option>
              <option value="Table size upgrade (More guests arrived)">Table size upgrade (More guests arrived)</option>
            </select>
          </div>

          {/* Transfer Preview Box */}
          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-orange-50/80 border-orange-200'
          }`}>
            <div className="font-bold text-orange-600 flex items-center justify-between">
              <span>Transfer Preview</span>
              <span className={`text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Auto-routes to KDS Pass</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Transferred Order:</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {sourceTable
                  ? `${sourceTable} (${tableBills[sourceTable]?.items.length || 0} items, ₹${(
                      tableBills[sourceTable]?.grandTotal || 0
                    ).toLocaleString('en-IN')})`
                  : 'No source table selected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Assigned Waiter:</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{waiterName} (Unchanged)</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyKds}
                onChange={(e) => setNotifyKds(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              />
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                Notify Kitchen Display System (KDS) immediately of table change
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={printToken}
                onChange={(e) => setPrintToken(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              />
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                Print Table Transfer thermal slip for floor captain
              </span>
            </label>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmTransfer}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Confirm Table Transfer & Update KDS</span>
          </button>
        </div>

        {/* Right Info & Recent Transfers (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Transfers Log */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Recent Shift Transfers</span>
            </h3>

            <div className="space-y-2">
              {recentTransfers.map((rt, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-600">
                      {rt.from} ➔ {rt.to}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{rt.time}</span>
                  </div>
                  <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{rt.reason}</div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Authorized by: {rt.waiter}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Card */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Standard Operating Procedure (SOP)</span>
            </div>
            <p>
              1. Never transfer a table while kitchen hot food is actively in transit.
            </p>
            <p>
              2. Both tables must be visually confirmed by the floor captain before clearing the source table.
            </p>
            <p>
              3. The running billing token is automatically migrated to the new table with zero data loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
