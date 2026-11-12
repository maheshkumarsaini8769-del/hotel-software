import React from 'react';
import { IFastCashierFinancials, IFastCashierCartItem, FastCashierHelper } from '@spicehub/ui';
import { Receipt, Printer, ArrowRight, X } from 'lucide-react';

interface FastCashierReceiptModalProps {
  order: any;
  items: Array<{ name: string; quantity: number; subtotal: number; menuItemId?: string; unitPrice?: number }>;
  financials: IFastCashierFinancials;
  tokenNumber: number;
  paymentMethod: string;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onNextCustomer: () => void;
}

export const FastCashierReceiptModal: React.FC<FastCashierReceiptModalProps> = ({
  order,
  items,
  financials,
  tokenNumber,
  paymentMethod,
  customerName,
  isOpen,
  onClose,
  onNextCustomer,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const cartItems: IFastCashierCartItem[] = items.map((it) => ({
    menuItemId: it.menuItemId || '',
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice || Math.round(it.subtotal / (it.quantity || 1)),
    subtotal: it.subtotal,
  }));

  const receiptText = FastCashierHelper.generate80mmReceiptText(
    tokenNumber,
    order?.orderNumber || 'TKW-00000',
    cartItems,
    financials,
    paymentMethod,
    customerName
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">80mm Thermal Receipt</span>
              <span className="text-[11px] text-slate-500">Fast Cashier Counter Slip</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic Thermal Receipt Slip */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          <div className="bg-white text-slate-900 font-mono p-5 rounded-xl shadow-md w-full max-w-sm text-xs leading-relaxed border-2 border-dashed border-slate-300">
            {/* Header */}
            <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
              <div className="text-sm font-black tracking-wide">SPICEHUB EXPRESS POS</div>
              <div className="text-[10px] text-slate-500 uppercase">Fast Takeaway Counter</div>
              <div className="my-2 py-1 bg-slate-900 text-white text-lg font-black tracking-widest rounded-lg">
                TOKEN #{String(tokenNumber).padStart(3, '0')}
              </div>
              <div className="text-[10px] font-normal text-slate-600">
                Order: {order?.orderNumber || 'TKW-AUTO'}
              </div>
              <div className="text-[10px] font-normal text-slate-500">
                {new Date().toLocaleString('en-IN')}
              </div>
              {customerName && (
                <div className="text-[10px] font-bold text-slate-800 mt-1">
                  Customer: {customerName}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="truncate max-w-[170px] text-slate-700">
                    {it.name} <span className="font-bold text-slate-900">x{it.quantity}</span>
                  </div>
                  <div className="font-bold text-slate-900">₹{it.subtotal}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{financials.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5%):</span>
                <span>₹{financials.taxAmount}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 text-slate-900">
                <span>GRAND TOTAL:</span>
                <span>₹{financials.grandTotal}</span>
              </div>
            </div>

            {/* Payment & Change */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Method:</span>
                <span className="font-bold text-slate-900">{paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tender Received:</span>
                <span className="font-bold text-slate-900">₹{financials.tenderAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-xs text-emerald-800 bg-emerald-50 px-1.5 py-1 rounded-md border border-emerald-200/60">
                <span>CHANGE RETURNED:</span>
                <span>₹{financials.changeAmount}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2.5 text-[10px] text-slate-500 font-semibold leading-normal">
              Please collect food when token called!
              <br />
              Thank You! Visit Again!
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Slip</span>
          </button>
          <button
            type="button"
            onClick={onNextCustomer}
            className="btn-glass-green flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
          >
            <span>Next Customer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
