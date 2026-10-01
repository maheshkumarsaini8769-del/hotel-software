import React, { useState } from 'react';
import { CartItem, CartPricingSummary, formatCurrency } from '@spicehub/ui';

export interface CartDrawerProps {
  items: CartItem[];
  pricing: CartPricingSummary;
  warnings: string[];
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onOpen: () => void;
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onSubmitOrder: (idempotencyKey: string, cookingInstructions?: string) => Promise<void> | void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  pricing,
  warnings,
  isOpen,
  isSubmitting = false,
  onClose,
  onOpen,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
}) => {
  const [cookingNotes, setCookingNotes] = useState<string>('');

  if (items.length === 0 && !isOpen) {
    return null;
  }

  const hasOutOfStockWarnings = warnings.length > 0;

  const handleSubmit = () => {
    if (isSubmitting || hasOutOfStockWarnings) return;
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    onSubmitOrder(idempotencyKey, cookingNotes);
  };

  return (
    <>
      {/* Floating Bottom Cart Bar (When Closed) */}
      {!isOpen && items.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <div
            onClick={onOpen}
            className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition transform"
          >
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center font-bold text-xs">
                {pricing.itemCount}
              </span>
              <div>
                <div className="text-xs text-slate-400">Total</div>
                <div className="font-bold text-sm text-emerald-400">
                  {formatCurrency(pricing.totalAmount)}
                </div>
              </div>
            </div>
            <span className="font-semibold text-xs text-primary-400 flex items-center space-x-1">
              <span>View Cart</span>
              <span>➔</span>
            </span>
          </div>
        </div>
      )}

      {/* Slide-Up Cart Sheet (When Open) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-800 dark:text-white">Your Dining Cart</h2>
                <p className="text-xs text-slate-400">{pricing.itemCount} Items</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Out of Stock Alert Banner */}
            {hasOutOfStockWarnings && (
              <div className="bg-rose-500 text-white text-xs p-3 font-semibold flex items-center justify-between">
                <span>⚠️ Some items in your cart became unavailable (Item 86). Please remove them before ordering.</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => {
                const isItemWarned = warnings.includes(item.menuItemId);
                return (
                  <div
                    key={item.menuItemId}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isItemWarned
                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                        {isItemWarned && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-600 text-white rounded font-bold">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatCurrency(item.unitPrice)} each
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onUpdateQuantity(item.menuItemId, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.menuItemId, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-20 text-right font-bold text-xs text-slate-800 dark:text-slate-100 pl-2">
                      {formatCurrency(item.itemTotal)}
                    </div>
                  </div>
                );
              })}

              {/* Special Instructions */}
              <div className="pt-2">
                <label className="text-xs text-slate-500 font-medium">Special Chef Instructions:</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, serve water first"
                  value={cookingNotes}
                  onChange={(e) => setCookingNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(pricing.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>5% GST Snapshot</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(pricing.taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(pricing.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Submit Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                disabled={items.length === 0 || isSubmitting || hasOutOfStockWarnings}
                onClick={handleSubmit}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Placing Order...</span>
                ) : hasOutOfStockWarnings ? (
                  <span>Resolve Out of Stock Items</span>
                ) : (
                  <>
                    <span>Confirm & Send to Kitchen KDS</span>
                    <span>•</span>
                    <span>{formatCurrency(pricing.totalAmount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
