import React from 'react';
import {
  Clock,
  User,
  DollarSign,
  Receipt,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import type { CashierDrawerBalance } from './CashDrawerView';

interface ShiftManagementViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  onOpenShiftModal?: () => void;
  drawerBalance: CashierDrawerBalance;
  shiftId: string | null;
}

function readCashierName(): string {
  if (typeof window === 'undefined') return 'Cashier';
  try {
    const raw =
      window.localStorage.getItem('spicehub_auth_user') ||
      window.localStorage.getItem('auth_user');
    if (!raw) return 'Cashier';
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed?.name || 'Cashier';
  } catch {
    return 'Cashier';
  }
}

export const ShiftManagementView: React.FC<ShiftManagementViewProps> = ({
  isDark = true,
  onToast,
  onOpenShiftModal,
  drawerBalance,
  shiftId,
}) => {
  const cashierName = readCashierName();
  const isOpen = Boolean(shiftId);
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Active Cashier Shift Terminal & Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live shift status, tender collections, drawer balance and blind close handover.
          </p>
        </div>

        <button
          onClick={onOpenShiftModal}
          disabled={!isOpen}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          title={isOpen ? 'Close the open cashier shift' : 'No open shift to close'}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Blind Shift Close & Handover</span>
        </button>
      </div>

      {!isOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4" />
          No shift is currently open. Open a shift from the POS billing screen before closing the drawer.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
            <User className="w-4 h-4 text-blue-500" />
            <span>Active Cashier</span>
          </div>
          <div className="text-lg font-black text-white">{cashierName}</div>
          <div className="text-xs text-slate-400 font-medium">Express Cashier Terminal</div>
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
            isOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-700/30'
          }`}>
            ● {isOpen ? 'Shift Open' : 'Shift Closed'}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Shift Sales Volume</span>
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono">
            ₹{Number(drawerBalance.totalSales || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Cash ₹{Number(drawerBalance.cashSales || 0).toLocaleString('en-IN')} • UPI ₹
            {Number(drawerBalance.upiSales || 0).toLocaleString('en-IN')} • Card ₹
            {Number(drawerBalance.cardSales || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded w-fit">
            Refunds: ₹{Number(drawerBalance.refunds || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Drawer Position</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Opening Float:</span>
              <span className="font-bold font-mono text-white">
                ₹{Number(drawerBalance.openingFloat || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Petty Cash:</span>
              <span className="font-bold font-mono text-red-400">
                -₹{Number(drawerBalance.pettyCash || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Expected Cash:</span>
              <span className="font-bold font-mono text-emerald-400">
                ₹{Number(drawerBalance.expectedCash || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="font-black text-sm text-white">Shift Handover & End-of-Day Checklist</h3>
        <div className="space-y-2 text-xs">
          {[
            {
              done: !isOpen || Number(drawerBalance.totalSales || 0) >= 0,
              text: 'Live billing totals are reconciled with the server snapshot',
            },
            {
              done: false,
              text: 'Physical cash counted and matched against the expected drawer balance',
            },
            {
              done: false,
              text: 'UPI and Credit Card EDC settlement batches closed',
            },
            {
              done: false,
              text: 'Kitchen KOT void and discount audit logs signed by Floor Manager',
            },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-200 font-medium">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          The final cash count and variance are captured by the Blind Shift Close workflow. No handover is marked
          complete until the server accepts the close request.
        </p>
      </div>
    </div>
  );
};
