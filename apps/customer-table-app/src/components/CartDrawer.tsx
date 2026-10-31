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
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-bounce-once">
          <div
            data-testid="floating-cart-bar"
            onClick={onOpen}
            className="bg-blue-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer active:scale-98 transition transform border border-blue-500"
          >
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 bg-slate-950 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                {pricing.itemCount}
              </span>
              <div>
                <div className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">Your Dining Tab</div>
                <div className="font-bold text-base sm:text-lg text-white leading-tight">
                  {formatCurrency(pricing.totalAmount)}
                </div>
              </div>
            </div>
            <div className="font-bold text-xs uppercase tracking-wider bg-slate-950 text-white hover:text-white px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition">
              <span>View Order</span>
              <span>➔</span>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Up Cart Sheet (When Open) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col shadow-sm dark:shadow-none overflow-hidden">
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
              <div className="bg-red-500 text-white text-xs p-3 font-semibold flex items-center justify-between">
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
                        ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                        {isItemWarned && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-bold">
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
                {Boolean(pricing.discountAmount && pricing.discountAmount > 0) && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Coupon Discount {pricing.promoCode ? `(${pricing.promoCode})` : ''}</span>
                    <span>-{formatCurrency(pricing.discountAmount!)}</span>
                  </div>
                )}
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
            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <button
                data-testid="confirm-order-button"
                disabled={items.length === 0 || isSubmitting || hasOutOfStockWarnings}
                onClick={handleSubmit}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl shadow-sm transition active:scale-98 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Sending to Kitchen...</span>
                  </span>
                ) : hasOutOfStockWarnings ? (
                  <span>Remove Unavailable Dishes</span>
                ) : (
                  <>
                    <span>👑 Confirm Order & Send to Kitchen</span>
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
