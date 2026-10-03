import React, { useState, useEffect } from 'react';
import { MenuHeaderFilter } from './components/MenuHeaderFilter';
import { MenuItemCard } from './components/MenuItemCard';
import { CartDrawer } from './components/CartDrawer';
import { MenuCartStore } from '@spicehub/ui';
import { MenuItemDTO } from '@spicehub/shared-types';

export type CustomerRequestType = 'WATER' | 'CALL_WAITER' | 'BILL' | 'CUTLERY' | 'CLEANING';

export interface CustomerMenuAppProps {
  store: MenuCartStore;
  tableNumber?: string;
  section?: string;
  onPlaceOrder?: (idempotencyKey: string, cookingInstructions?: string) => Promise<void> | void;
  onRequestService?: (type: CustomerRequestType) => Promise<void> | void;
}

export const CustomerMenuApp: React.FC<CustomerMenuAppProps> = ({
  store,
  tableNumber = '4',
  section = 'Indoor Dining',
  onPlaceOrder,
  onRequestService,
}) => {
  const [items, setItems] = useState<MenuItemDTO[]>(store.getFilteredMenuItems());
  const [cartItems, setCartItems] = useState(store.getCartItems());
  const [filters, setFilters] = useState(store.getFilters());
  const [warnings, setWarnings] = useState<string[]>(store.getOutOfStockWarnings());
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Live Service Request State
  const [activeRequest, setActiveRequest] = useState<{
    type: CustomerRequestType;
    label: string;
    icon: string;
    requestedAt: Date;
    assignedWaiter: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setItems(store.getFilteredMenuItems());
      setCartItems(store.getCartItems());
      setFilters(store.getFilters());
      setWarnings(store.getOutOfStockWarnings());
    });
    return () => unsubscribe();
  }, [store]);

  const handleFilterChange = (updates: any) => {
    store.setFilters(updates);
    setFilters(store.getFilters());
  };

  const handleAddToCart = (dish: MenuItemDTO) => {
    store.addToCart(dish, 1);
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    store.updateCartQuantity(menuItemId, delta);
  };

  const handleSubmitOrder = async (idempotencyKey: string, cookingInstructions?: string) => {
    setIsSubmitting(true);
    try {
      if (onPlaceOrder) {
        await onPlaceOrder(idempotencyKey, cookingInstructions);
      }
      store.clearCart();
      setIsCartOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendServiceCall = async (type: CustomerRequestType, label: string, icon: string) => {
    setActiveRequest({
      type,
      label,
      icon,
      requestedAt: new Date(),
      assignedWaiter: 'Waiter Ramesh (Floor Duty)',
    });
    if (onRequestService) {
      await onRequestService(type);
    }
  };

  const pricing = store.getPricingSummary(0.05);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-36">
      {/* Top Welcome Bar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3.5 sticky top-0 z-20 shadow-xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg sm:text-xl shadow-lg shadow-amber-500/20">
              👑
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 font-serif">
                Hotel Taj Gateway
              </h1>
              <p className="text-[11px] text-amber-300/90 font-semibold tracking-wide">
                Table {tableNumber} • {section}
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Dining Tab</span>
          </div>
        </div>
      </header>

      {/* Realtime Request Feedback Banner */}
      {activeRequest && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3 shadow-lg border-b border-amber-400/40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-bounce">{activeRequest.icon}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-100">
                  {activeRequest.label} Requested
                </p>
                <p className="text-xs text-white/90">
                  {activeRequest.assignedWaiter} • <span className="font-semibold text-emerald-200">Arriving in &lt; 45s</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveRequest(null)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-xs font-bold rounded-lg transition min-h-[36px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Instant Guest Service Action Buttons (Water, Waiter, Cutlery, Bill) */}
      <section className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-3 shadow-inner">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-extrabold text-amber-400/90 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span>✨</span>
            <span>1-Tap Royal Table Assistance</span>
          </p>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => handleSendServiceCall('WATER', 'Water Bottle', '💧')}
              className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center transition min-h-[48px]"
            >
              <span className="text-lg">💧</span>
              <span className="text-[10px] font-semibold text-slate-200 mt-0.5">Water</span>
            </button>

            <button
              onClick={() => handleSendServiceCall('CALL_WAITER', 'Call Waiter', '🛎️')}
              className="py-2 px-1 bg-amber-950/40 hover:bg-amber-900/50 active:scale-95 border border-amber-700/60 rounded-xl flex flex-col items-center justify-center transition min-h-[48px]"
            >
              <span className="text-lg">🛎️</span>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5">Call Waiter</span>
            </button>

            <button
              onClick={() => handleSendServiceCall('CUTLERY', 'Extra Cutlery', '🍴')}
              className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center transition min-h-[48px]"
            >
              <span className="text-lg">🍴</span>
              <span className="text-[10px] font-semibold text-slate-200 mt-0.5">Cutlery</span>
            </button>

            <button
              onClick={() => handleSendServiceCall('CLEANING', 'Table Clean', '🧹')}
              className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl flex flex-col items-center justify-center transition min-h-[48px]"
            >
              <span className="text-lg">🧹</span>
              <span className="text-[10px] font-semibold text-slate-200 mt-0.5">Clean</span>
            </button>

            <button
              onClick={() => handleSendServiceCall('BILL', 'Bill / Payment', '💵')}
              className="py-2 px-1 bg-emerald-950/40 hover:bg-emerald-900/50 active:scale-95 border border-emerald-700/60 rounded-xl flex flex-col items-center justify-center transition min-h-[48px]"
            >
              <span className="text-lg">💵</span>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5">Get Bill</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <MenuHeaderFilter filter={filters} onFilterChange={handleFilterChange} />

      {/* Dishes Grid */}
      <main className="p-4 max-w-4xl mx-auto">
        {items.length === 0 ? (
          <div className="py-24 text-center text-slate-500">
            <span className="text-4xl block mb-2">🍽️</span>
            <p className="text-sm font-medium">No dishes match your selected filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((dish) => {
              const inCart = cartItems.find((c) => c.menuItemId === dish.id);
              return (
                <MenuItemCard
                  key={dish.id}
                  item={dish}
                  cartQuantity={inCart ? inCart.quantity : 0}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        items={cartItems}
        pricing={pricing}
        warnings={warnings}
        isOpen={isCartOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsCartOpen(false)}
        onOpen={() => setIsCartOpen(true)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={(id) => store.removeFromCart(id)}
        onSubmitOrder={handleSubmitOrder}
      />
    </div>
  );
};
