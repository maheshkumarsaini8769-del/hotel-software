import React, { useCallback, useEffect, useState } from 'react';
import {
  Grid,
  Users,
  UtensilsCrossed,
  Receipt,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface CashierTableManagementViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  onSelectTableForBilling?: (tableNumber: string) => void;
}

interface LiveTable {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  currentStatus: string;
  activeSessionId?: string;
  assignedWaiterId?: string;
  activeOrderTotal: number;
  activeItemsCount: number;
  sessionStartTime?: string;
}

function formatStatus(status: string): string {
  return String(status || 'AVAILABLE').replace(/_/g, ' ');
}

export const CashierTableManagementView: React.FC<CashierTableManagementViewProps> = ({
  isDark = true,
  onToast,
  onSelectTableForBilling,
}) => {
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: LiveTable[];
      }>('GET', '/api/v1/pos/tables');
      const rows = (response.data || []).map((table) => ({
        ...table,
        activeOrderTotal: Number(table.activeOrderTotal || 0),
        activeItemsCount: Number(table.activeItemsCount || 0),
        capacity: Number(table.capacity || 0),
      }));
      setTables(rows);
      setSelectedFloor((current) => {
        if (current !== 'ALL' && rows.some((table) => table.section === current)) {
          return current;
        }
        return 'ALL';
      });
    } catch (err: any) {
      setTables([]);
      setError(err?.message || 'Dining tables could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  const floors = Array.from(new Set(tables.map((table) => table.section).filter(Boolean)));
  const visibleTables =
    selectedFloor === 'ALL'
      ? tables
      : tables.filter((table) => table.section === selectedFloor);

  const occupiedCount = tables.filter((table) =>
    ['OCCUPIED', 'PARTIALLY_OCCUPIED', 'BILLING'].includes(table.currentStatus)
  ).length;
  const runningTotal = tables.reduce((sum, table) => sum + table.activeOrderTotal, 0);

  const handleTableClick = (table: LiveTable) => {
    if (table.activeSessionId && onSelectTableForBilling) {
      onSelectTableForBilling(table.tableNumber);
      onToast?.(`Opened billing terminal for Table ${table.tableNumber}.`);
      return;
    }
    if (table.currentStatus === 'AVAILABLE') {
      onToast?.(`Table ${table.tableNumber} is vacant. Start a new bill from POS Billing.`);
      return;
    }
    onToast?.(
      `Table ${table.tableNumber} is ${formatStatus(table.currentStatus).toLowerCase()} and has no active running order.`
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Grid className="w-5 h-5 text-amber-500" />
            <span>Dining Tables & Quick Cashier Billing Switcher</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live floor status from the POS. Click an occupied table with a running order to open its bill.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold">
            <button
              onClick={() => setSelectedFloor('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedFloor === 'ALL' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Floors
            </button>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedFloor === floor ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {floor}
              </button>
            ))}
          </div>
          <button
            onClick={() => void loadTables()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh live tables"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-slate-400 font-bold">Total Tables</span>
          <div className="text-xl font-black text-white font-mono">{tables.length}</div>
        </div>
        <div className="p-3 rounded-xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-slate-400 font-bold">Occupied / Billing</span>
          <div className="text-xl font-black text-amber-400 font-mono">{occupiedCount}</div>
        </div>
        <div className="p-3 rounded-xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-slate-400 font-bold">Running Order Value</span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            ₹{runningTotal.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-slate-400 font-bold">Vacant Tables</span>
          <div className="text-xl font-black text-blue-400 font-mono">
            {tables.filter((table) => table.currentStatus === 'AVAILABLE').length}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadTables()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading live dining tables…</div>
      ) : visibleTables.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-2xl">
          No dining tables are configured for this floor.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visibleTables.map((table) => {
            const status = String(table.currentStatus || 'AVAILABLE').toUpperCase();
            const isBilling = status === 'BILLING' || status === 'PAYMENT_SETTLED';
            const isOccupied = ['OCCUPIED', 'PARTIALLY_OCCUPIED'].includes(status);
            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition hover:scale-102 flex flex-col justify-between gap-2.5 ${
                  isBilling
                    ? 'border-blue-500/50 bg-blue-950/30 hover:border-blue-500'
                    : isOccupied
                    ? 'border-amber-500/50 bg-amber-950/30 hover:border-amber-500'
                    : isDark
                    ? 'border-slate-800 bg-[#141620] hover:border-slate-700'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-white">Table {table.tableNumber}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isBilling
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : isOccupied
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {formatStatus(status)}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Pax: {table.capacity || '—'}</span>
                  </div>
                  {table.activeSessionId && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <UtensilsCrossed className="w-3 h-3" />
                      <span>{table.activeItemsCount} item{table.activeItemsCount === 1 ? '' : 's'} running</span>
                    </div>
                  )}
                  {!table.activeSessionId && <div>No active session</div>}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-white">
                    {table.activeOrderTotal > 0
                      ? `₹${table.activeOrderTotal.toLocaleString('en-IN')}`
                      : 'Vacant'}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                    <Receipt className="w-3 h-3" />
                    <span>{table.activeSessionId ? 'Bill' : 'View'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        Floor status and running order totals are read live from the POS tables API.
      </div>
    </div>
  );
};
