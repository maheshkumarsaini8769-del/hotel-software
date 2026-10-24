import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  Printer,
  Clock,
  Plus,
  Filter,
  Search,
  Receipt
} from 'lucide-react';

interface NewOrderTicket {
  id: string;
  orderNumber: string;
  destination: string;
  timeAgo: string;
  items: string[];
}

interface NewOrdersViewProps {
  isDark: boolean;
  orders: NewOrderTicket[];
  onAcceptOrder: (id: string, orderNumber: string) => void;
  onPunchKot: (destination: string) => void;
  triggerToast: (msg: string) => void;
}

export const NewOrdersView: React.FC<NewOrdersViewProps> = ({
  isDark,
  orders,
  onAcceptOrder,
  onPunchKot,
  triggerToast,
}) => {
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (filterType === 'Dine-In' && !o.destination.startsWith('Table')) return false;
    if (filterType === 'Room Service' && !o.destination.startsWith('Room')) return false;
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.destination.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Incoming Orders Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white">
                {orders.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live orders submitted via Customer Table QR and Room Service Portal
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          {['All', 'Dine-In', 'Room Service'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === f
                  ? 'bg-rose-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className={`h-64 flex flex-col items-center justify-center rounded-2xl border text-center p-6 ${
            isDark ? 'bg-[#121520] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Flame className="w-12 h-12 text-slate-600 mb-2 opacity-50" />
            <h3 className="font-bold text-sm">No Pending Orders in Queue</h3>
            <p className="text-xs mt-1">All incoming customer orders have been accepted and dispatched to KDS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                  isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {order.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-500">
                        NEW ORDER
                      </span>
                    </div>
                    <span className="text-xs font-bold text-orange-500">
                      {order.destination}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 py-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Placed {order.timeAgo}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {order.items.length} Items Total
                    </span>
                  </div>

                  {/* Items list */}
                  <div className={`p-3 rounded-xl border space-y-1.5 my-1 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-medium">
                        <span>{it}</span>
                        <span className="text-slate-400 text-[11px]">Qty: 1</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 italic">
                    Special note: "Serve with green chutney and mint dips"
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-700/20">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onAcceptOrder(order.id, order.orderNumber)}
                      className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept to KDS</span>
                    </button>
                    <button
                      onClick={() => onPunchKot(order.destination)}
                      className="py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Edit & Add</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerToast(`Thermal Kitchen Token printed for ${order.orderNumber}`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-500" />
                      <span>Print Token</span>
                    </button>
                    <button
                      onClick={() => triggerToast(`Order ${order.orderNumber} declined (Out of stock)`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                        isDark ? 'bg-rose-950/30 border-rose-800 text-rose-300 hover:bg-rose-900/50' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
