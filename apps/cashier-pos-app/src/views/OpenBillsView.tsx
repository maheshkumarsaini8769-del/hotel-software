import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface OpenBillsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  onSettleBill?: (billId: string, table: string, amount: number, mode: string) => void;
  onSelectBillForPos?: (table: string, items: any[]) => void;
}

type BillType = 'DINE_IN' | 'TAKEAWAY' | 'ROOM_SERVICE';

interface OpenBillItem {
  id: string;
  orderNumber: string;
  table: string;
  type: BillType;
  itemsCount: number;
  elapsedTime: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'RUNNING' | 'BILLED' | 'READY_TO_SETTLE';
}

interface SnapshotBill {
  id: string;
  billNo: string;
  table: string;
  itemCount: number;
  amount: number;
  dueAmount: number;
  time: string;
  status: 'Open' | 'Pending';
  type: 'dine-in' | 'takeaway' | 'room';
}

function elapsedLabel(value: string): string {
  const started = new Date(value).getTime();
  if (!Number.isFinite(started)) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function toBillType(type: SnapshotBill['type']): BillType {
  if (type === 'takeaway') return 'TAKEAWAY';
  if (type === 'room') return 'ROOM_SERVICE';
  return 'DINE_IN';
}

export const OpenBillsView: React.FC<OpenBillsViewProps> = ({
  isDark = true,
  onToast,
  onSettleBill,
  onSelectBillForPos,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [openBills, setOpenBills] = useState<OpenBillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: { openBills: SnapshotBill[] };
      }>('GET', '/api/v1/fast-cashier/snapshot');
      const rows = response.data?.openBills || [];
      setOpenBills(
        rows.map((bill) => ({
          id: bill.id,
          orderNumber: bill.billNo,
          table: bill.table,
          type: toBillType(bill.type),
          itemsCount: Number(bill.itemCount || 0),
          elapsedTime: elapsedLabel(bill.time),
          subtotal: Number(bill.amount || 0),
          tax: 0,
          total: Number(bill.dueAmount || bill.amount || 0),
          status: bill.status === 'Pending' ? 'READY_TO_SETTLE' : 'BILLED',
        }))
      );
    } catch (err: any) {
      setOpenBills([]);
      setError(err?.message || 'Open bills could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBills();
    const timer = window.setInterval(() => void loadBills(), 30000);
    return () => window.clearInterval(timer);
  }, [loadBills]);

  const handleSettle = (bill: OpenBillItem, mode: string) => {
    // This screen does not hold the authoritative bill/session. Open the bill in
    // the POS billing workspace, where payment is recorded by the backend.
    if (onSettleBill) onSettleBill(bill.id, bill.table, bill.total, mode);
    if (onToast) {
      onToast(`${bill.table} opened in POS for ${mode} settlement. Complete payment there.`);
    }
  };

  const filtered = openBills.filter((b) => {
    if (filterType !== 'ALL' && b.type !== filterType) return false;
    if (
      search &&
      !b.table.toLowerCase().includes(search.toLowerCase()) &&
      !b.orderNumber.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalRunningSum = openBills.reduce((acc, b) => acc + b.total, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Open & Running Bills Terminal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live unpaid and partially-paid bills for this hotel. Refreshes every 30 seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold">
            <span>Total Active Outstanding: </span>
            <strong className="text-white font-mono text-sm">
              ₹{totalRunningSum.toLocaleString('en-IN')}
            </strong>
          </div>
          <button
            onClick={() => void loadBills()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh open bills"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { label: 'All Open Bills', type: 'ALL', count: openBills.length },
            {
              label: 'Dine-In Tables',
              type: 'DINE_IN',
              count: openBills.filter((b) => b.type === 'DINE_IN').length,
            },
            {
              label: 'Takeaway Orders',
              type: 'TAKEAWAY',
              count: openBills.filter((b) => b.type === 'TAKEAWAY').length,
            },
            {
              label: 'Room Service',
              type: 'ROOM_SERVICE',
              count: openBills.filter((b) => b.type === 'ROOM_SERVICE').length,
            },
          ].map((f) => (
            <button
              key={f.type}
              onClick={() => setFilterType(f.type)}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
                filterType === f.type
                  ? 'bg-amber-600 text-white shadow-md'
                  : isDark
                    ? 'bg-[#141620] border border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{f.label}</span>
              <span className="text-[10px] opacity-80 font-mono">({f.count})</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search table or bill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadBills()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {loading && openBills.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading live open bills…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={`rounded-2xl border px-6 py-14 text-center ${
            isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <UtensilsCrossed className="w-9 h-9 text-slate-500 mx-auto mb-3" />
          <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            No open bills in this category.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Bills appear here as soon as the POS generates them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                isDark
                  ? 'bg-[#141620] border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white">{b.table}</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      {b.orderNumber}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      b.status === 'READY_TO_SETTLE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                  <span>{b.itemsCount} items ordered</span>
                  <span>⏱️ {b.elapsedTime}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Bill total</span>
                  <span className="font-black text-emerald-400 text-base font-mono">
                    ₹{b.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleSettle(b, 'UPI')}
                    className="py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>UPI</span>
                  </button>
                  <button
                    onClick={() => handleSettle(b, 'CASH')}
                    className="py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Banknote className="w-3 h-3" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => handleSettle(b, 'CARD')}
                    className="py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Card</span>
                  </button>
                </div>

                <div className="flex items-center justify-end text-[11px] pt-1">
                  <button
                    onClick={() => {
                      if (onSelectBillForPos) onSelectBillForPos(b.table, []);
                      if (onToast) onToast(`Opened ${b.table} in POS billing`);
                    }}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    Open in POS →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
