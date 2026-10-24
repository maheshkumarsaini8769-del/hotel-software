import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  DollarSign,
  Receipt,
  FileText
} from 'lucide-react';

interface OrderHistoryViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  isDark,
  triggerToast,
}) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');

  const history = [
    { id: '#D1024', table: 'Table 6', guests: 3, items: '1x Paneer Tikka, 2x Naan, 1x Dal', amount: 820, method: 'UPI QR', time: '01:50 PM', status: 'Settled' },
    { id: '#T1030', table: 'Table 4', guests: 4, items: '2x Veg Thali, 2x Sweet Lassi', amount: 1240, method: 'Cash', time: '01:47 PM', status: 'Settled' },
    { id: '#RB5616', table: 'Room 105', guests: 1, items: '1x Club Sandwich, 1x Fresh Lime', amount: 560, method: 'Room Folio', time: '01:45 PM', status: 'Settled' },
    { id: '#D1023', table: 'Table 9', guests: 2, items: '1x Dal Makhani, 2x Butter Roti', amount: 680, method: 'Credit Card', time: '01:38 PM', status: 'Settled' },
    { id: '#RB5615', table: 'Room 402', guests: 2, items: '2x Mutton Biryani, 2x Cold Coffee', amount: 2140, method: 'Room Folio', time: '01:30 PM', status: 'Settled' },
    { id: '#D1020', table: 'Table 11', guests: 4, items: '2x Chicken Biryani, 1x Salad, 2x Soda', amount: 1550, method: 'UPI QR', time: '01:15 PM', status: 'Settled' },
    { id: '#T1028', table: 'Table 2', guests: 2, items: '1x Veg Fried Rice, 1x Manchurian', amount: 940, method: 'Cash', time: '01:05 PM', status: 'Settled' },
  ];

  const totalSales = history.reduce((acc, curr) => acc + curr.amount, 0);

  const filteredHistory = history.filter((h) => {
    if (methodFilter !== 'All' && h.method !== methodFilter) return false;
    if (search && !h.id.toLowerCase().includes(search.toLowerCase()) && !h.table.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Order History & Shift Sales
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-500/20 text-blue-500">
                Today's Shift
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit log of completed, billed, and settled dining orders
            </p>
          </div>
        </div>

        {/* Total Summary */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border text-right ${
            isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Total Shift Revenue</div>
            <div className="text-lg font-black text-emerald-500">₹{totalSales.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['All', 'UPI QR', 'Cash', 'Credit Card', 'Room Folio'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                methodFilter === m
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-[#181c2b] text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order #, table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className={`sticky top-0 text-[11px] font-bold uppercase tracking-wider border-b ${
              isDark ? 'bg-[#181c2b] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Items Summary</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {filteredHistory.map((row) => (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <td className="p-3.5 font-bold font-mono text-orange-500">{row.id}</td>
                  <td className="p-3.5 font-bold">{row.table}</td>
                  <td className="p-3.5 max-w-xs truncate text-slate-400">{row.items}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      row.method === 'UPI QR'
                        ? 'bg-purple-500/20 text-purple-400'
                        : row.method === 'Cash'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : row.method === 'Credit Card'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {row.method}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">{row.time}</td>
                  <td className="p-3.5 text-right font-black text-emerald-500 text-sm">₹{row.amount}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => triggerToast(`Reprinted thermal invoice for ${row.id}`)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Printer className="w-3 h-3 text-blue-500" />
                      <span>Reprint</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
