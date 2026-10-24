import React from 'react';
import {
  IFastCashierCartItem,
  IFastCashierFinancials,
  FastCashierHelper,
} from '@spicehub/ui';

interface FastCashierCartProps {
  cart: IFastCashierCartItem[];
  financials: IFastCashierFinancials;
  tenderAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  customerName: string;
  customerPhone: string;
  cookingInstructions: string;
  onUpdateQty: (menuItemId: string, qty: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onSetTenderAmount: (amount: number) => void;
  onSetPaymentMethod: (method: 'CASH' | 'UPI' | 'CARD') => void;
  onSetCustomerName: (name: string) => void;
  onSetCustomerPhone: (phone: string) => void;
  onSetCookingInstructions: (notes: string) => void;
  onSubmitOrder: () => void;
  loading: boolean;
}

export const FastCashierCart: React.FC<FastCashierCartProps> = ({
  cart,
  financials,
  tenderAmount,
  paymentMethod,
  customerName,
  customerPhone,
  cookingInstructions,
  onUpdateQty,
  onRemoveItem,
  onSetTenderAmount,
  onSetPaymentMethod,
  onSetCustomerName,
  onSetCustomerPhone,
  onSetCookingInstructions,
  onSubmitOrder,
  loading,
}) => {
  const quickSuggestions = FastCashierHelper.getQuickTenderSuggestions(financials.grandTotal);
  const changeDue = FastCashierHelper.calculateChange(tenderAmount, financials.grandTotal);
  const isUnderpaid = paymentMethod === 'CASH' && tenderAmount < financials.grandTotal && tenderAmount > 0;

  return (
    <div className="bg-[#0f131a] rounded-2xl border border-zinc-800 p-5 flex flex-col justify-between shadow-2xl h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">Current Cart</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Takeaway Counter</span>
        </div>

        {/* Cart Items List */}
        <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
              <span className="text-2xl">🛒</span>
              <span>Cart is empty. Scan barcode or punch item code.</span>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 group hover:border-zinc-700 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 truncate">{item.name}</div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    ₹{item.unitPrice} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.menuItemId, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-mono font-bold text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.menuItemId, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 w-16 text-right">
                    ₹{item.subtotal}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.menuItemId)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors text-xs"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Details & Cooking Notes Accordion */}
        <div className="mt-4 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => onSetCustomerName(e.target.value)}
            placeholder="Customer Name (optional)"
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onSetCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
          />
          <input
            type="text"
            value={cookingInstructions}
            onChange={(e) => onSetCookingInstructions(e.target.value)}
            placeholder="Kitchen notes (e.g. extra spicy, packing)"
            className="col-span-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Financials & Payment Section */}
      <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-col gap-3">
        {/* Bill Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span className="font-mono text-zinc-300">₹{financials.subtotal}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>GST (5%)</span>
            <span className="font-mono text-zinc-300">₹{financials.taxAmount}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-black text-white pt-1 border-t border-zinc-800/80">
            <span className="text-amber-400">GRAND TOTAL</span>
            <span className="font-mono text-xl text-amber-400">₹{financials.grandTotal}</span>
          </div>
        </div>

        {/* Payment Method Switcher */}
        <div className="grid grid-cols-3 gap-2">
          {(['CASH', 'UPI', 'CARD'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => onSetPaymentMethod(method)}
              className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                paymentMethod === method
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {method === 'CASH' && '💵 Cash'}
              {method === 'UPI' && '📱 UPI QR'}
              {method === 'CARD' && '💳 Card'}
            </button>
          ))}
        </div>

        {/* Quick Cash Tender Notes (Only if CASH selected) */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Tender Cash:</span>
              <div className="flex items-center gap-1 font-mono">
                <span>₹</span>
                <input
                  type="number"
                  value={tenderAmount || ''}
                  onChange={(e) => onSetTenderAmount(Number(e.target.value))}
                  className="w-20 px-2 py-0.5 bg-black border border-zinc-700 rounded text-amber-400 font-bold text-xs text-right outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Note Suggestion Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickSuggestions.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => onSetTenderAmount(note)}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all border ${
                    tenderAmount === note
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-amber-500/50'
                  }`}
                >
                  ₹{note}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetTenderAmount(financials.grandTotal)}
                className="px-2 py-1 rounded text-[11px] font-bold bg-zinc-800 text-amber-300 border border-zinc-700 hover:border-amber-400"
              >
                Exact
              </button>
            </div>
          </div>
        )}

        {/* Change Due Display Banner */}
        {paymentMethod === 'CASH' && financials.grandTotal > 0 && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between font-mono ${
              isUnderpaid
                ? 'bg-red-950/40 border-red-500/50 text-red-300'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider font-sans">
              {isUnderpaid ? 'Due Remaining:' : 'Change to Return:'}
            </span>
            <span className="text-xl font-black">
              {isUnderpaid
                ? `₹${financials.grandTotal - tenderAmount}`
                : `₹${changeDue}`}
            </span>
          </div>
        )}

        {/* Submit Order Button */}
        <button
          type="button"
          onClick={onSubmitOrder}
          disabled={cart.length === 0 || loading || (paymentMethod === 'CASH' && tenderAmount < financials.grandTotal)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-600 font-black text-base uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.35)] disabled:shadow-none flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {loading ? (
            <span>Punching Order...</span>
          ) : (
            <>
              <span>⚡ PUNCH & PRINT TOKEN</span>
              <span className="font-mono text-sm">(F12 / ENTER)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
