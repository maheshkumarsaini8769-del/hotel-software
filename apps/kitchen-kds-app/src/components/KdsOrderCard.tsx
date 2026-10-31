import React, { useState } from 'react';
import { KdsOrderCardModel, KdsHelper } from '@spicehub/ui';
import { Printer, X } from 'lucide-react';

export interface KdsOrderCardProps {
  order: KdsOrderCardModel;
  onStartPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onMarkServed?: (orderId: string) => void;
  onToggleItemStatus?: (orderId: string, itemId: string) => void;
}

export const KdsOrderCard: React.FC<KdsOrderCardProps> = ({
  order,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
  onToggleItemStatus,
}) => {
  const urgencyStyle = KdsHelper.getUrgencyStyle(order.urgencyLevel);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Live second-by-second ticking timer for Kitchen Chefs
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(() => {
    const p = new Date(order.placedAt).getTime();
    return isNaN(p) ? 0 : Math.max(0, Math.floor((Date.now() - p) / 1000));
  });

  React.useEffect(() => {
    const p = new Date(order.placedAt).getTime();
    if (isNaN(p)) return;
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - p) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order.placedAt]);

  const formatLiveTimer = () => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins >= 20) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s (LATE)`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getLocationLabel = () => {
    if (order.roomNumber) {
      return `Room ${order.roomNumber} (In-Room Dining)`;
    }
    if (order.orderType === 'ROOM_SERVICE') {
      return `In-Room Dining`;
    }
    if (order.tableNumber) {
      const t = order.tableNumber.toLowerCase().startsWith('table') ? order.tableNumber : `Table ${order.tableNumber}`;
      return `${t}${order.section ? ` (${order.section})` : ''}`;
    }
    return order.orderType.replace('_', ' ');
  };

  const getOrderStatusBadge = () => {
    switch (order.orderStatus) {
      case 'PREPARING':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-bold">PREPARING</span>;
      case 'READY':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-bold animate-pulse">READY TO SERVE</span>;
      case 'SERVED':
        return <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold">SERVED</span>;
      case 'CANCELLED':
        return <span className="bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded text-[11px] font-semibold">CANCELLED</span>;
      case 'PLACED':
      default:
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-[11px] font-bold">NEW ORDER</span>;
    }
  };

  return (
    <div
      data-testid={`kds-order-card-${order.id}`}
      className={`rounded-xl border-2 flex flex-col bg-slate-900 transition shadow-lg overflow-hidden ${urgencyStyle.border}`}
    >
      {/* Top Header */}
      <div className={`p-3.5 border-b border-slate-800 flex items-start justify-between ${urgencyStyle.bg}`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-white text-base tracking-wide">
              {order.orderNumber}
            </span>
            {getOrderStatusBadge()}
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1 flex items-center space-x-1.5">
            <span>📍</span>
            <span>{getLocationLabel()}</span>
          </div>
        </div>

        {/* Live Urgency Timer with Seconds */}
        <div className="text-right">
          <div className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold inline-flex items-center gap-1.5 shadow-sm ${urgencyStyle.badge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
            <span>⏱️ {formatLiveTimer()}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Cooking Instructions Banner (if any) */}
      {order.cookingInstructions && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-3 py-1.5 text-xs text-amber-300 flex items-center space-x-1.5">
          <span>⚠️</span>
          <span className="font-medium italic">"{order.cookingInstructions}"</span>
        </div>
      )}

      {/* Items Production List */}
      <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto">
        {order.items.map((item, idx) => {
          const isItemReady = item.itemStatus === 'READY' || item.itemStatus === 'SERVED';
          const itemId = item.itemId || item.menuItemId;

          return (
            <div
              key={`${itemId}-${idx}`}
              onClick={() => onToggleItemStatus && onToggleItemStatus(order.id, itemId)}
              className={`p-2 rounded-lg border transition cursor-pointer select-none flex items-start justify-between ${
                isItemReady
                  ? 'bg-slate-800/40 border-slate-800 opacity-60 line-through'
                  : 'bg-slate-850 border-slate-750 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <span className="bg-primary-600/30 text-primary-300 border border-primary-500/40 text-xs font-black px-1.5 py-0.5 rounded min-w-[24px] text-center">
                  {item.quantity}x
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {item.name}
                    {item.variantName && (
                      <span className="text-xs font-normal text-slate-400 ml-1.5">({item.variantName})</span>
                    )}
                  </div>
                  {item.specialInstructions && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {/kam namak|less salt|salt/i.test(item.specialInstructions) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                          🧂 Kam Namak
                        </span>
                      )}
                      {/mirchi kam|less spicy|mild|spicy/i.test(item.specialInstructions) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold text-[10px]">
                          🌶️ Mirchi Kam
                        </span>
                      )}
                      {/jain|no onion|no garlic/i.test(item.specialInstructions) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                          🌿 Jain / No Onion-Garlic
                        </span>
                      )}
                      <span className="inline-block text-[11px] font-medium text-amber-200 bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded">
                        Note: {item.specialInstructions}
                      </span>
                    </div>
                  )}
                  {item.kitchenStationName && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      Station: {item.kitchenStationName}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Indicator check */}
              <div className="ml-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    isItemReady
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.itemStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Action Buttons (1-Tap Progression & KOT Print) */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          title="Print 80mm Thermal KOT"
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition active:scale-95 shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>

        {(order.orderStatus === 'PLACED' || order.orderStatus === 'ACCEPTED') && (
          <button
            data-testid={`kds-btn-start-preparing-${order.id}`}
            onClick={() => onStartPreparing && onStartPreparing(order.id)}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow transition active:scale-98 flex items-center justify-center space-x-1.5"
          >
            <span>👨‍🍳</span>
            <span>Start Preparing</span>
          </button>
        )}

        {order.orderStatus === 'PREPARING' && (
          <button
            data-testid={`kds-btn-mark-ready-${order.id}`}
            onClick={() => onMarkReady && onMarkReady(order.id)}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition active:scale-98 flex items-center justify-center space-x-1.5"
          >
            <span>🔔</span>
            <span>Mark All Ready</span>
          </button>
        )}

        {order.orderStatus === 'READY' && (
          <button
            data-testid={`kds-btn-serve-${order.id}`}
            onClick={() => onMarkServed && onMarkServed(order.id)}
            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg shadow transition active:scale-98 flex items-center justify-center space-x-1.5"
          >
            <span>🍽️</span>
            <span>Serve / Dispatch</span>
          </button>
        )}
      </div>

      {/* 80mm Thermal KOT Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white text-slate-900 rounded-2xl p-5 shadow-sm dark:shadow-none font-mono text-xs border border-slate-300 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-400">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-800">
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                Thermal KOT Ticket
              </span>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-500 hover:text-black font-bold text-xs p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Print Slip */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300 space-y-0.5">
              <div className="font-black text-sm uppercase tracking-wider">KITCHEN ORDER TICKET (KOT)</div>
              <div className="text-[10px] text-slate-600 font-bold">HOT PASS • MAIN KITCHEN</div>
              <div className="text-[11px] font-black text-slate-900 mt-1">KOT: {order.orderNumber}</div>
            </div>

            <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between font-bold">
                <span>Location:</span>
                <span>{getLocationLabel()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Server / Captain:</span>
                <span>{(order as any).waiterName || 'Floor Captain'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Placed:</span>
                <span>{new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ticket Type:</span>
                <span className="uppercase font-bold">{order.orderType}</span>
              </div>
            </div>

            {/* Special Instructions */}
            {order.cookingInstructions && (
              <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-bold">
                NOTE: {order.cookingInstructions}
              </div>
            )}

            {/* Items */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
              <div className="font-bold uppercase tracking-wider text-[9px] text-slate-500 flex justify-between">
                <span>QTY & ITEM</span>
                <span>STATUS</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{item.itemStatus}</span>
                  </div>
                  {item.specialInstructions && (
                    <div className="text-[10px] text-red-600 pl-4 font-semibold italic">
                      ↳ {item.specialInstructions}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center text-[9px] text-slate-500">
              *** END OF KOT TICKET ***
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-black font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print KOT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
