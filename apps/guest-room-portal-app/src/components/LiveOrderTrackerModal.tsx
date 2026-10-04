import React from 'react';
import { LiveRoomOrder } from '../../../../packages/ui/src/guest-portal/types';
import { GuestPortalHelper } from '../../../../packages/ui/src/guest-portal/GuestPortalHelper';
import { formatCurrency } from '../../../../packages/ui/src/index';

export interface LiveOrderTrackerModalProps {
  orders: LiveRoomOrder[];
  selectedOrder: LiveRoomOrder | null;
  onSelectOrder: (order: LiveRoomOrder | null) => void;
}

export const LiveOrderTrackerModal: React.FC<LiveOrderTrackerModalProps> = ({
  orders,
  selectedOrder,
  onSelectOrder,
}) => {
  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">
        <span className="text-5xl block mb-3">🍷</span>
        <h3 className="text-base font-bold text-slate-300">No Active In-Room Orders</h3>
        <p className="text-xs text-slate-500 mt-1">Browse our in-room dining menu to place your order.</p>
      </div>
    );
  }

  // Active or selected order
  const currentOrder = selectedOrder || orders[0];
  const progress = GuestPortalHelper.getOrderStatusProgress(currentOrder.orderStatus);

  const steps = [
    { num: 1, label: 'Order Placed', icon: '📝' },
    { num: 2, label: 'Kitchen Preparing', icon: '👨‍🍳' },
    { num: 3, label: 'On The Way', icon: '🛎️' },
    { num: 4, label: 'Delivered', icon: '🍽️' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-6">
      <div>
        <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
          <span>⏱️</span>
          <span>Live In-Room Order Tracker</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time updates directly from our executive culinary team.
        </p>
      </div>

      {/* Main Order Status Card */}
      <div data-testid="live-order-tracker" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
              In-Room Dining
            </span>
            <span className="text-lg font-mono font-extrabold text-white">
              {currentOrder.orderNumber}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">
              Placed at: {new Date(currentOrder.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span
              data-testid="order-progress-label"
              className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-extrabold uppercase animate-pulse"
            >
              {progress.label}
            </span>
          </div>
        </div>

        {/* 4-Step Visual Stepper Bar */}
        <div>
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${((progress.step - 1) / 3) * 100}%` }}
            />

            {steps.map((st) => {
              const isPassed = progress.step >= st.num;
              const isCurrent = progress.step === st.num;

              return (
                <div key={st.num} data-testid={`stepper-step-${st.num}`} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition shadow-md ${
                      isPassed
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <span>{st.icon}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-2 text-center max-w-[70px] ${
                      isCurrent ? 'text-amber-300' : isPassed ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items Summary in this Order */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Dishes in Preparation
          </span>
          {currentOrder.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                  {it.quantity}x
                </span>
                <span className="text-white font-semibold">{it.name}</span>
                {it.specialInstructions && (
                  <span className="text-[10px] text-amber-400/80 italic">({it.specialInstructions})</span>
                )}
              </div>
              <span className="font-mono text-slate-300">{formatCurrency(it.subtotal)}</span>
            </div>
          ))}

          {currentOrder.cookingInstructions && (
            <div className="pt-2 border-t border-slate-900 text-xs text-amber-300 italic">
              Note to Chef: "{currentOrder.cookingInstructions}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
