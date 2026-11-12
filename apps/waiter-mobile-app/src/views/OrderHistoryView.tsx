import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  DollarSign,
  Receipt,
  FileText,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { waiterFetch } from '../lib/waiterApi';

export interface OrderHistoryItem {
  id: string;
  table: string;
  guests: number;
  items: string;
  amount: number;
  method: string;
  time: string;
  status: string;
}

interface OrderHistoryViewProps {
  isDark?: boolean;
  triggerToast: (msg: string) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  triggerToast,
}) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const hotelId = localStorage.getItem('spicehub_hotel_id') || '';
        const res = await waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=SERVED${hotelId ? `&hotelId=${encodeURIComponent(hotelId)}` : ''}`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const mapped: OrderHistoryItem[] = body.data.map((ord: any) => {
              const table = ord.tableId?.tableNumber || ord.tableNumber
                ? `Table ${ord.tableId?.tableNumber || ord.tableNumber}`
                : ord.roomId?.roomNumber
                ? `Room ${ord.roomId.roomNumber}`
                : 'Dine-In';
              const itemsStr = Array.isArray(ord.items) && ord.items.length > 0
                ? ord.items.map((i: any) => `${i.quantity || 1}x ${i.name || 'Dish'}`).join(', ')
                : 'Dining items';
              const servedDate = ord.servedAt || ord.updatedAt || ord.placedAt || ord.createdAt;
              const timeStr = servedDate
                ? new Date(servedDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : 'Just now';
              return {
                id: ord.orderNumber || String(ord._id || ord.id).slice(-6).toUpperCase(),
                table,
                guests: Number(ord.pax || ord.items?.length || 2),
                items: itemsStr,
                amount: Number(ord.totalAmount || ord.total || 0),
                method: ord.paymentMethod || (ord.orderType === 'ROOM_SERVICE' ? 'Room Folio' : 'UPI QR'),
                time: timeStr,
                status: 'Settled',
              };
            });
            if (!cancelled) setHistory(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to load order history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchHistory();
    return () => { cancelled = true; };
  }, []);

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
 'bg-white border-slate-200'
 }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#123C2B]/10 text-[#2E6B4C] flex items-center justify-center font-bold">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${'text-slate-900'}`}>
                Order History & Shift Sales
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#123C2B]/10 text-[#2E6B4C]">
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
 'bg-slate-50 border-slate-200'
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
 ? 'bg-[#123C2B] text-white shadow-sm'
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
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-[#2E6B4C] ${
 'bg-white border-slate-200 text-slate-800'
 }`}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${
 'bg-white border-slate-200'
 }`}>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className={`sticky top-0 text-[11px] font-bold uppercase tracking-wider border-b ${
 'bg-slate-50 border-slate-200 text-slate-600'
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E6B4C]" />
                    <p className="text-xs">Loading settled order records...</p>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">No settled order history found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Orders marked as SERVED/Settled will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50 text-slate-700"
                  >
                    <td className="p-3.5 font-bold font-mono text-emerald-700">{row.id}</td>
                    <td className="p-3.5 font-bold">{row.table}</td>
                    <td className="p-3.5 max-w-xs truncate text-slate-500">{row.items}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        row.method === 'UPI QR'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : row.method === 'Cash'
                          ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
                          : row.method === 'Credit Card'
                          ? 'bg-[#123C2B]/10 text-[#2E6B4C] border border-[#2E6B4C]/20'
                          : 'bg-amber-500/10 text-amber-700 border border-amber-200'
                      }`}>
                        {row.method}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{row.time}</td>
                    <td className="p-3.5 text-right font-black text-emerald-700 text-sm">₹{row.amount}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => triggerToast(`Reprinted thermal invoice for ${row.id}`)}
                        className="px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      >
                        <Printer className="w-3 h-3 text-[#2E6B4C]" />
                        <span>Reprint</span>
                      </button>
                    </td>
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
