import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface PaymentHistoryViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

type PaymentMode = 'UPI' | 'CASH' | 'CARD' | 'ROOM_FOLIO' | 'OTHER';

interface SettledInvoice {
  id: string;
  receiptNumber: string;
  billNo: string;
  paymentMode: PaymentMode;
  amount: number;
  timestamp: string;
  status: string;
}

interface SnapshotPayment {
  id: string;
  time: string;
  billNo: string;
  type: string;
  amount: number;
  method: string;
  mode: string;
  status: string;
}

function mapMode(mode: string): PaymentMode {
  const normalized = String(mode || '').toUpperCase();
  if (normalized === 'UPI') return 'UPI';
  if (normalized === 'CASH') return 'CASH';
  if (normalized === 'CARD') return 'CARD';
  if (normalized === 'CHARGE_TO_ROOM' || normalized === 'ROOM_FOLIO') return 'ROOM_FOLIO';
  return 'OTHER';
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({ isDark = true, onToast }) => {
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<SettledInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: { recentPayments: SnapshotPayment[] };
      }>('GET', '/api/v1/fast-cashier/snapshot');
      const rows = response.data?.recentPayments || [];
      setInvoices(
        rows.map((payment) => ({
          id: payment.id,
          receiptNumber: payment.billNo || 'POS settlement',
          billNo: payment.billNo || '—',
          paymentMode: mapMode(payment.mode || payment.method),
          amount: Number(payment.amount || 0),
          timestamp: formatTimestamp(payment.time),
          status: payment.status || 'Paid',
        }))
      );
    } catch (err: any) {
      setInvoices([]);
      setError(err?.message || 'Payment history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
    const timer = window.setInterval(() => void loadPayments(), 30000);
    return () => window.clearInterval(timer);
  }, [loadPayments]);

  const filtered = invoices.filter((inv) => {
    if (filterMode !== 'ALL' && inv.paymentMode !== filterMode) return false;
    if (
      search &&
      !inv.receiptNumber.toLowerCase().includes(search.toLowerCase()) &&
      !inv.billNo.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalCollected = filtered.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5 text-emerald-500" />
            <span>Settled Payment History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live successful POS and folio payments for this hotel. Refreshes every 30 seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
            <span>Filtered Total: </span>
            <strong className="text-white font-mono text-sm">
              ₹{totalCollected.toLocaleString('en-IN')}
            </strong>
          </div>
          <button
            onClick={() => void loadPayments()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh payment history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {['ALL', 'UPI', 'CASH', 'CARD', 'ROOM_FOLIO', 'OTHER'].map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterMode === mode
                  ? 'bg-amber-600 text-white shadow-md'
                  : isDark
                    ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {mode.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bill or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadPayments()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-black uppercase tracking-wider ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <tr>
                <th className="py-3 px-4">Receipt / Bill</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    Loading live payments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No settled payments in this category yet.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {inv.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          inv.paymentMode === 'UPI'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            : inv.paymentMode === 'CASH'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                              : inv.paymentMode === 'CARD'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {inv.paymentMode.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{inv.timestamp}</td>
                    <td className="py-3 px-4 text-slate-300">{inv.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
