import React from 'react';
import { KdsOrderCardModel, KdsHelper } from '@spicehub/ui';

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
  const formattedTimer = KdsHelper.formatElapsedTimer(order.elapsedMinutes);

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
        return <span className="bg-rose-900/50 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[11px] font-semibold">CANCELLED</span>;
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

        {/* Live Urgency Timer */}
        <div className="text-right">
          <div className={`text-xs px-2 py-0.5 rounded border inline-block ${urgencyStyle.badge}`}>
            ⏱️ {formattedTimer}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <div className="text-xs text-amber-400 mt-0.5">
                      Note: {item.specialInstructions}
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

      {/* Card Action Buttons (1-Tap Progression) */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center space-x-2">
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
    </div>
  );
};
