import React from 'react';
import {
  IFastCashierCartItem,
  IFastCashierFinancials,
  FastCashierHelper, NumericInput,
} from '@spicehub/ui';
import { ShoppingCart, Banknote, QrCode, CreditCard, Trash2, Printer } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">Current Cart</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Takeaway Counter</span>
        </div>

        {/* Cart Items List */}
        <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <ShoppingCart className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <span>Cart is empty. Select items or scan barcode to add.</span>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3 group hover:border-slate-300 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ₹{item.unitPrice} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.menuItemId, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.menuItemId, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900 w-16 text-right">
                    ₹{item.subtotal}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.menuItemId)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors text-xs"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Details & Cooking Notes Accordion */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => onSetCustomerName(e.target.value)}
            placeholder="Customer Name (optional)"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onSetCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />
          <input
            type="text"
            value={cookingInstructions}
            onChange={(e) => onSetCookingInstructions(e.target.value)}
            placeholder="Kitchen notes (e.g. extra spicy, packing)"
            className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Financials & Payment Section */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
        {/* Bill Breakdown */}
        <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono text-slate-800">₹{financials.subtotal}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>GST (5%)</span>
            <span className="font-mono text-slate-800">₹{financials.taxAmount}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
            <span className="text-slate-900 uppercase tracking-wide">Grand Total</span>
            <span className="font-mono text-lg font-black text-emerald-700">₹{financials.grandTotal}</span>
          </div>
        </div>

        {/* Payment Method Switcher */}
        <div className="grid grid-cols-3 gap-2">
          {(['CASH', 'UPI', 'CARD'] as const).map((method) => {
            const isSelected = paymentMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => onSetPaymentMethod(method)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'btn-glass-green text-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {method === 'CASH' && <Banknote className="w-3.5 h-3.5" />}
                {method === 'UPI' && <QrCode className="w-3.5 h-3.5" />}
                {method === 'CARD' && <CreditCard className="w-3.5 h-3.5" />}
                <span>{method === 'CASH' ? 'Cash' : method === 'UPI' ? 'UPI QR' : 'Card'}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Cash Tender Notes (Only if CASH selected) */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Tender Cash:</span>
              <div className="flex items-center gap-1 font-mono">
                <span>₹</span>
                <NumericInput
                  value={tenderAmount || ''}
                  onChange={(e) => onSetTenderAmount(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-emerald-800 font-bold text-xs text-right outline-none focus:border-emerald-500"
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
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                    tenderAmount === note
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ₹{note}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetTenderAmount(financials.grandTotal)}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-slate-200 hover:bg-emerald-50"
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
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-2xs'
            }`}
          >
            <span className="text-xs uppercase font-bold tracking-wider font-sans">
              {isUnderpaid ? 'Due Remaining:' : 'Change to Return:'}
            </span>
            <span className="text-lg font-black">
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
          className="btn-glass-green w-full py-3.5 text-sm font-bold tracking-wide"
        >
          {loading ? (
            <span>Punching Order...</span>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>PUNCH &amp; PRINT TOKEN</span>
              <span className="font-mono text-xs opacity-80">(Enter)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
