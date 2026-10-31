import React from 'react';
import {
  TrendingUp,
  Download,
  Receipt,
  Wallet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { CashierDrawerBalance } from './CashDrawerView';

interface ReportsOpenBill {
  id: string;
  billNo: string;
  table: string;
  amount: number;
  status: string;
  type: string;
}

interface ReportsPayment {
  id: string;
  time: string;
  billNo: string;
  amount: number;
  method: string;
  status: string;
}

interface CashierReportsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
  drawerBalance: CashierDrawerBalance;
  openBills: ReportsOpenBill[];
  recentPayments: ReportsPayment[];
}

function downloadCsv(rows: ReportsPayment[]): void {
  const header = ['Time', 'Bill No', 'Method', 'Amount', 'Status'];
  const body = rows.map((row) => [
    row.time,
    row.billNo,
    row.method,
    String(row.amount),
    row.status,
  ]);
  const csv = [header, ...body]
    .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spicehub-cashier-settlements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CashierReportsView: React.FC<CashierReportsViewProps> = ({
  isDark = true,
  onToast,
  drawerBalance,
  openBills,
  recentPayments,
}) => {
  const totalOpenValue = openBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const tenderTotal =
    Number(drawerBalance.cashSales || 0) +
    Number(drawerBalance.upiSales || 0) +
    Number(drawerBalance.cardSales || 0);

  const handleExport = () => {
    if (recentPayments.length === 0) {
      onToast?.('No settled payments are available to export yet.');
      return;
    }
    downloadCsv(recentPayments);
    onToast?.(`Exported ${recentPayments.length} recent settlements as CSV.`);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span>Cashier Sales Analytics & Live Settlement Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live shift revenue, tender mix, open-bill exposure and recent settlements from this terminal.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Recent Settlements CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 font-bold">Shift Revenue</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            ₹{Number(drawerBalance.totalSales || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">All tender types today</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 font-bold">Tender Collections</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            ₹{tenderTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Cash ₹{Number(drawerBalance.cashSales || 0).toLocaleString('en-IN')} • UPI ₹
            {Number(drawerBalance.upiSales || 0).toLocaleString('en-IN')} • Card ₹
            {Number(drawerBalance.cardSales || 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 font-bold">Open Bill Exposure</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            ₹{totalOpenValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {openBills.length} unpaid or partially paid bill{openBills.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 font-bold">Petty Cash Paid</span>
          <div className="text-2xl font-black text-red-400 font-mono mt-1">
            ₹{Number(drawerBalance.pettyCash || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {Number(drawerBalance.pettyCashCount || 0)} voucher{Number(drawerBalance.pettyCashCount || 0) === 1 ? '' : 's'} today
          </span>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="font-black text-xs text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-500" />
          <span>Recent Settlements ({recentPayments.length})</span>
        </h3>

        {recentPayments.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl">
            No settled payments have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">Time</th>
                  <th className="py-2 px-2">Bill No</th>
                  <th className="py-2 px-2">Method</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="text-slate-300">
                    <td className="py-2 px-2">{payment.time}</td>
                    <td className="py-2 px-2 font-bold text-white">{payment.billNo}</td>
                    <td className="py-2 px-2">{payment.method}</td>
                    <td className="py-2 px-2 text-right font-mono font-black text-emerald-400">
                      ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <p className="font-bold text-white">Item-level dish velocity report is not connected yet.</p>
          <p className="mt-1">
            This page only shows live shift, tender, open-bill and settlement data. No sample top-dish numbers are
            displayed.
          </p>
        </div>
      </div>
    </div>
  );
};
