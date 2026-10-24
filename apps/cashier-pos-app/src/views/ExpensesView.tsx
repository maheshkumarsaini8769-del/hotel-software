import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Plus,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

interface ExpensesViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  onExpenseRecorded?: () => Promise<void> | void;
}

type ExpenseCategory =
  | 'KITCHEN_SUPPLIES'
  | 'GAS_FUEL'
  | 'MAINTENANCE'
  | 'STAFF_REFRESHMENTS'
  | 'MISCELLANEOUS';

interface ExpenseVoucher {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidTo: string;
  time: string;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  KITCHEN_SUPPLIES: 'Kitchen Supplies',
  GAS_FUEL: 'Gas / Fuel',
  MAINTENANCE: 'Maintenance',
  STAFF_REFRESHMENTS: 'Staff Tea / Coffee',
  MISCELLANEOUS: 'Miscellaneous',
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  isDark = true,
  onToast,
  onExpenseRecorded,
}) => {
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<ExpenseCategory>('KITCHEN_SUPPLIES');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiClient().request<{
        success: boolean;
        data: Array<{
          id: string;
          category: ExpenseCategory;
          description: string;
          amount: number;
          paidTo: string;
          time: string;
        }>;
        totalToday: number;
      }>('GET', '/api/v1/fast-cashier/expenses');

      setVouchers(
        (response.data || []).map((voucher) => ({
          ...voucher,
          amount: Number(voucher.amount || 0),
        }))
      );
      setTotalToday(Number(response.totalToday || 0));
    } catch (err: any) {
      setVouchers([]);
      setTotalToday(0);
      setError(err?.message || 'Petty cash vouchers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const handleAddExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !desc.trim() || !paidTo.trim()) {
      if (onToast) onToast('Enter a valid description, amount and paid-to vendor.');
      return;
    }

    setSubmitting(true);
    try {
      await getApiClient().request('POST', '/api/v1/fast-cashier/expenses', {
        category,
        description: desc.trim(),
        amount: numericAmount,
        paidTo: paidTo.trim(),
      });
      setDesc('');
      setAmount('');
      setPaidTo('');
      if (onToast) onToast(`Petty cash voucher of ₹${numericAmount.toLocaleString('en-IN')} recorded.`);
      await loadVouchers();
      await onExpenseRecorded?.();
    } catch (err: any) {
      if (onToast) onToast(err?.message || 'Petty cash voucher could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Banknote className="w-5 h-5 text-amber-500" />
            <span>Petty Cash Vouchers & Daily Floor Expenses</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record petty cash paid from the live cashier drawer. Vouchers reduce the expected drawer balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-300 text-xs font-bold">
            <span>Today's Cash Payouts: </span>
            <strong className="text-white font-mono text-sm">₹{totalToday.toLocaleString('en-IN')}</strong>
          </div>
          <button
            onClick={() => void loadVouchers()}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh petty cash vouchers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
          <button onClick={() => void loadVouchers()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <form onSubmit={handleAddExpense} className={`col-span-12 lg:col-span-4 p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-xs text-white">Record Petty Cash Payment</h3>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
            >
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Description / Reason</label>
            <input
              type="text"
              placeholder="e.g. 5kg Ice bags for bar"
              value={desc}
              onChange={(event) => setDesc(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Amount Paid (₹)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="₹ Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Paid To (Vendor / Person)</label>
            <input
              type="text"
              placeholder="Vendor Name"
              value={paidTo}
              onChange={(event) => setPaidTo(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Recording…' : 'Record Cash Voucher'}</span>
          </button>
        </form>

        <div className={`col-span-12 lg:col-span-8 p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-xs text-white">Today's Petty Cash Outflows ({vouchers.length})</h3>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading live vouchers…
            </div>
          ) : vouchers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl">
              No petty cash vouchers recorded today.
            </div>
          ) : (
            <div className="space-y-2">
              {vouchers.map((voucher) => (
                <div key={voucher.id} className="p-3 rounded-xl border border-slate-800/80 bg-[#191c2b] flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{voucher.description}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {CATEGORY_LABELS[voucher.category] || voucher.category}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Paid to: <strong className="text-slate-300">{voucher.paidTo}</strong> • {formatTime(voucher.time)}
                    </div>
                  </div>

                  <div className="font-mono font-black text-sm text-rose-400">
                    -₹{voucher.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
