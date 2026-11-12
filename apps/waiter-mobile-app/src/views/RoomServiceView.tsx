import React, { useState } from 'react';
import {
  Coffee,
  CheckCircle2,
  Clock,
  Printer,
  Phone,
  Hotel,
  LoaderCircle,
} from 'lucide-react';

export interface RoomServiceOrder {
  id: string;
  room: string;
  guestName: string;
  timeAgo: string;
  status: 'PREPARING' | 'READY_FOR_TRAY' | 'IN_TRANSIT' | 'DELIVERED';
  items: string[];
  totalAmount?: number;
}

interface RoomServiceViewProps {
  orders: RoomServiceOrder[];
  loadState: 'loading' | 'ready' | 'error';
  triggerToast: (msg: string) => void;
  onRetry: () => void;
  onStatusChange: (id: string, nextStatus: RoomServiceOrder['status']) => Promise<boolean>;
}

export const RoomServiceView: React.FC<RoomServiceViewProps> = ({
  orders,
  loadState,
  triggerToast,
  onRetry,
  onStatusChange,
}) => {
  const [filter, setFilter] = useState('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleUpdateStatus = async (order: RoomServiceOrder, nextStatus: RoomServiceOrder['status']) => {
    setUpdatingOrderId(order.id);
    try {
      if (await onStatusChange(order.id, nextStatus)) {
        triggerToast(`Order for ${order.room} updated to ${nextStatus.replace(/_/g, ' ')}.`);
      }
    } catch (error) {
      console.error('Room-service status update failed:', error);
      triggerToast(`Could not update delivery status for ${order.room}. Please retry.`);
    } finally {
      setUpdatingOrderId(null);
    }
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
 'bg-white border-slate-200'
 }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${'text-slate-900'}`}>
                In-Room Dining (IRD) Service Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                {orders.filter((o) => o.status !== 'DELIVERED').length} Active Trays
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Follow in-room orders from Kitchen preparation through guest delivery
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
 ? 'bg-emerald-600 text-white shadow-sm'
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
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            {loadState === 'loading' ? (
              <>
                <LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-[#2E6B4C]" aria-hidden="true" />
                <h3 className="font-bold text-slate-900">Loading live room orders</h3>
                <p className="mt-1 text-sm text-slate-500">Connecting to this hotel&apos;s active service queue.</p>
              </>
            ) : loadState === 'error' ? (
              <>
                <Hotel className="mx-auto mb-3 h-8 w-8 text-emerald-700" aria-hidden="true" />
                <h3 className="font-bold text-slate-900">Room orders could not be loaded</h3>
                <p className="mt-1 text-sm text-slate-500">Check the connection and retry to load the live queue.</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 rounded-xl bg-[#123C2B] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1B5138]"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <Hotel className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                <h3 className="font-bold text-slate-900">
                  {filter === 'Delivered' ? 'No delivered room orders yet' : 'No room-service orders yet'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Orders placed by in-house guests will appear here and route to Kitchen automatically.
                </p>
              </>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((o) => {
            const isReady = o.status === 'READY_FOR_TRAY';
            const isTransit = o.status === 'IN_TRANSIT';
            const isDelivered = o.status === 'DELIVERED';
            const isUpdating = updatingOrderId === o.id;

            return (
              <div
                key={o.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
 isDelivered
 ? 'bg-slate-50 border-slate-200 opacity-75'
 : 'bg-white border-slate-200'
 }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
                    <div>
                      <span className={`text-base font-black ${'text-slate-900'}`}>
                        {o.room}
                      </span>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {o.guestName}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
 isDelivered
 ? 'bg-slate-700 text-slate-300'
 : isTransit
 ? 'bg-[#123C2B] text-white animate-pulse'
 : isReady
 ? 'bg-blue-500 text-white'
 : 'bg-emerald-600/20 text-amber-400'
 }`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 py-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Ordered {o.timeAgo}
                    </span>
                    {typeof o.totalAmount === 'number' && (
                      <span className="font-black text-emerald-500">
                        ₹{o.totalAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div className={`p-3 rounded-xl border space-y-1 my-1 text-xs ${
 'bg-slate-50 border-slate-200 text-slate-800'
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
                      disabled={isUpdating}
                      onClick={() => void handleUpdateStatus(o, 'IN_TRANSIT')}
                      className="w-full py-2.5 rounded-xl bg-[#123C2B] hover:bg-[#1B5138] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Coffee className="w-4 h-4" />
                      <span>{isUpdating ? 'Updating…' : 'Pick Up Tray & Start Delivery'}</span>
                    </button>
                  )}

                  {isTransit && (
                    <button
                      disabled={isUpdating}
                      onClick={() => void handleUpdateStatus(o, 'DELIVERED')}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isUpdating ? 'Saving delivery…' : 'Mark Delivered'}</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerToast(`Thermal Room Token printed for ${o.room}`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-[#2E6B4C]" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      onClick={() => triggerToast(`Buzzing guest room intercom at ${o.room}...`)}
                      className={`py-1.5 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      <span>Intercom</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
