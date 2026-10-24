import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getApiClient } from '../lib/apiClient';

export interface CashierDrawerBalance {
  openingFloat: number;
  totalSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  refunds: number;
  pettyCash: number;
  pettyCashCount: number;
  expectedCash: number;
}

interface CashDrawerViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  drawerBalance: CashierDrawerBalance;
  shiftId: string | null;
  onRefresh?: () => Promise<void> | void;
}

const DENOMINATIONS = [500, 200, 100, 50, 20, 10];

export const CashDrawerView: React.FC<CashDrawerViewProps> = ({
  isDark = true,
  onToast,
  drawerBalance,
  shiftId,
  onRefresh,
}) => {
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({});
  const [dropAmount, setDropAmount] = useState('');
  const [isDropping, setIsDropping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalCalculatedFromNotes = useMemo(
    () =>
      Object.entries(denominations).reduce(
        (acc, [value, count]) => acc + Number(value) * Number(count || 0),
        0
      ),
    [denominations]
  );

  const expectedCashInHand =
    Number(drawerBalance.expectedCash || 0) ||
    Math.max(
      0,
      Number(drawerBalance.openingFloat || 0) +
        Number(drawerBalance.cashSales || 0) -
        Number(drawerBalance.pettyCash || 0)
    );
  const variance = totalCalculatedFromNotes - expectedCashInHand;
  const hasCountedNotes = totalCalculatedFromNotes > 0;

  const updateCount = (value: number, count: number) => {
    setDenominations((prev) => ({ ...prev, [value]: Math.max(0, count) }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCashDrop = async () => {
    const amount = Number(dropAmount);
    if (!amount || amount <= 0) {
      if (onToast) onToast('Enter a valid cash drop amount.');
      return;
    }
    if (!shiftId) {
      if (onToast) onToast('Open a cashier shift before recording a cash drop.');
      return;
    }

    setIsDropping(true);
    try {
      await getApiClient().request('POST', '/api/v1/fast-cashier/cash-drop', { amount });
      setDropAmount('');
      if (onToast) onToast(`Cash drop of ₹${amount.toLocaleString('en-IN')} recorded in the safe.`);
      await onRefresh?.();
    } catch (error: any) {
      if (onToast) onToast(error?.message || 'Cash drop could not be recorded.');
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <DollarSign className="w-5 h-5 text-amber-500" />
            <span>Cash Drawer Terminal & Currency Denomination Counter</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit the live shift float, count physical notes and reconcile expected cash against the drawer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={dropAmount}
            onChange={(event) => setDropAmount(event.target.value)}
            placeholder="Drop amount"
            className="w-32 px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono focus:outline-none"
          />
          <button
            onClick={() => void handleCashDrop()}
            disabled={isDropping || !shiftId}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Banknote className="w-4 h-4" />
            <span>{isDropping ? 'Recording…' : 'Record Cash Drop'}</span>
          </button>
          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-50"
            title="Refresh live drawer data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {!shiftId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          No cashier shift is open. Drawer figures will remain at zero until a shift is opened.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-slate-400 font-bold block">Opening Cash Float</span>
          <span className="text-xl font-black text-white font-mono mt-1 block">
            ₹{Number(drawerBalance.openingFloat || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">Live shift opening float</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-emerald-400 font-bold block">+ Cash Collected</span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">
            ₹{Number(drawerBalance.cashSales || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-500">Live cash tender collections</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 bg-[#141620]">
          <span className="text-[11px] text-rose-400 font-bold block">- Petty Cash Paid</span>
          <span className="text-xl font-black text-rose-400 font-mono mt-1 block">
            ₹{Number(drawerBalance.pettyCash || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-500">
            {Number(drawerBalance.pettyCashCount || 0)} voucher{Number(drawerBalance.pettyCashCount || 0) === 1 ? '' : 's'} today
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10">
          <span className="text-[11px] text-amber-300 font-bold block">= Expected in Drawer</span>
          <span className="text-xl font-black text-amber-400 font-mono mt-1 block">
            ₹{expectedCashInHand.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-300/80">Live system calculation</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className={`col-span-12 lg:col-span-8 p-4 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-xs text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-500" />
              <span>Physical Currency Notes Counter</span>
            </span>
            <span className="text-slate-400 font-normal">Count physical notes in the drawer</span>
          </h3>

          <div className="space-y-2">
            {DENOMINATIONS.map((value) => {
              const count = denominations[value] || 0;
              const subtotal = value * count;
              return (
                <div key={value} className="p-2.5 rounded-xl border border-slate-800/80 bg-[#191c2b] flex items-center justify-between gap-4">
                  <div className="w-24 font-black text-sm text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700">
                      ₹{value}
                    </span>
                    <span>Note</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCount(value, count - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(event) => updateCount(value, parseInt(event.target.value, 10) || 0)}
                      className="w-20 px-2 py-1 text-center font-mono font-bold text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                    <button
                      onClick={() => updateCount(value, count + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-28 text-right font-mono font-black text-sm text-emerald-400">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`col-span-12 lg:col-span-4 p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-4">
            <h3 className="font-black text-xs text-white">Drawer Balance Verification</h3>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#191c2b] space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Counted:</span>
                <span className="font-bold text-white font-mono">₹{totalCalculatedFromNotes.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>System Expected:</span>
                <span className="font-bold text-white font-mono">₹{expectedCashInHand.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold">
                <span>Variance:</span>
                <span className={`font-mono font-black ${!hasCountedNotes ? 'text-slate-400' : variance === 0 ? 'text-emerald-400' : variance > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {!hasCountedNotes ? 'Not counted yet' : variance === 0 ? '₹0 (PERFECT MATCH)' : `${variance > 0 ? '+' : ''}₹${variance.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            {!hasCountedNotes ? (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Enter the physical note count to compare against the live system balance.</span>
              </div>
            ) : variance === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Drawer tally matches the system balance perfectly.</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Variance of ₹{Math.abs(variance).toLocaleString('en-IN')} detected. Re-verify the cash count.</span>
              </div>
            )}
          </div>

          <button
            onClick={() =>
              onToast?.(
                'Use Shift Management → Blind Shift Close to lock the drawer and record the final reconciliation.'
              )
            }
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition"
          >
            Continue to Shift Close
          </button>
        </div>
      </div>
    </div>
  );
};
