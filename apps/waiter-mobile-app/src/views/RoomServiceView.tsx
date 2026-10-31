import React, { useState } from 'react';
import {
  Coffee,
  CheckCircle2,
  Clock,
  Printer,
  Radio,
  Phone,
  Hotel
} from 'lucide-react';

interface RoomServiceOrder {
  id: string;
  room: string;
  guestName: string;
  roomType: string;
  timeAgo: string;
  status: 'PREPARING' | 'READY_FOR_TRAY' | 'IN_TRANSIT' | 'DELIVERED';
  items: string[];
  totalAmount: number;
}

const SAMPLE_ROOM_ORDERS: RoomServiceOrder[] = [
  {
    id: 'rs-1',
    room: 'Room 304',
    guestName: 'Rajesh Sharma',
    roomType: 'Deluxe Suite',
    timeAgo: '14 min ago',
    status: 'READY_FOR_TRAY',
    items: ['1x Chicken Biryani', '1x Raita', '1x Cold Coffee'],
    totalAmount: 580,
  },
  {
    id: 'rs-2',
    room: 'Room 201',
    guestName: 'Anita Verma',
    roomType: 'Executive Room',
    timeAgo: '8 min ago',
    status: 'PREPARING',
    items: ['1x Veg Biryani', '1x Paneer Tikka', '1x Masala Papad'],
    totalAmount: 740,
  },
  {
    id: 'rs-3',
    room: 'Room 105',
    guestName: 'David Miller',
    roomType: 'Standard King',
    timeAgo: '28 min ago',
    status: 'DELIVERED',
    items: ['1x Club Sandwich', '1x French Fries', '1x Fresh Lime Soda'],
    totalAmount: 560,
  },
];

interface RoomServiceViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
}

export const RoomServiceView: React.FC<RoomServiceViewProps> = ({
  isDark,
  triggerToast,
}) => {
  const [orders, setOrders] = useState<RoomServiceOrder[]>(SAMPLE_ROOM_ORDERS);
  const [filter, setFilter] = useState('All');

  const handleUpdateStatus = (id: string, nextStatus: RoomServiceOrder['status'], room: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o))
    );
    triggerToast(`Order for ${room} updated to ${nextStatus.replace(/_/g, ' ')}!`);
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'Active' && o.status === 'DELIVERED') return false;
    if (filter === 'Delivered' && o.status !== 'DELIVERED') return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                In-Room Dining (IRD) Service Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                {orders.filter((o) => o.status !== 'DELIVERED').length} Active Trays
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Guest room tray delivery tracking, floor dispatch, and room folio billing
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {['All', 'Active', 'Delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === f
                  ? 'bg-amber-500 text-white shadow-sm'
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

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((o) => {
            const isReady = o.status === 'READY_FOR_TRAY';
            const isTransit = o.status === 'IN_TRANSIT';
            const isDelivered = o.status === 'DELIVERED';

            return (
              <div
                key={o.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                  isDelivered
                    ? isDark
                      ? 'bg-slate-900/40 border-slate-800 opacity-75'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                    : isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                    <div>
                      <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {o.room}
                      </span>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {o.guestName} • {o.roomType}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isDelivered
                        ? 'bg-slate-700 text-slate-300'
                        : isTransit
                        ? 'bg-blue-500 text-white animate-pulse'
                        : isReady
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 py-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Ordered {o.timeAgo}
                    </span>
                    <span className="font-black text-emerald-500">
                      ₹{o.totalAmount}
                    </span>
                  </div>

                  {/* Items */}
                  <div className={`p-3 rounded-xl border space-y-1 my-1 text-xs ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    {o.items.map((it, idx) => (
                      <div key={idx} className="font-medium">• {it}</div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-700/20">
                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'IN_TRANSIT', o.room)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <Coffee className="w-4 h-4" />
                      <span>Pick Up Tray & Start Delivery</span>
                    </button>
                  )}

                  {isTransit && (
                    <button
                      onClick={() => handleUpdateStatus(o.id, 'DELIVERED', o.room)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Delivered & Bill Room Folio</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerToast(`Thermal Room Token printed for ${o.room}`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-500" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      onClick={() => triggerToast(`Buzzing guest room intercom at ${o.room}...`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>Intercom</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
