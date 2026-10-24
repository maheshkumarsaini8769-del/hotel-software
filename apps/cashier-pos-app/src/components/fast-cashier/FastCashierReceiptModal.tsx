import React from 'react';
import { FastCashierHelper, IFastCashierCartItem, IFastCashierFinancials } from '@spicehub/ui';

interface FastCashierReceiptModalProps {
  isOpen: boolean;
  order: any;
  tokenNumber: number;
  items: IFastCashierCartItem[];
  financials: IFastCashierFinancials;
  paymentMethod: string;
  customerName?: string;
  onClose: () => void;
  onNextCustomer: () => void;
}

export const FastCashierReceiptModal: React.FC<FastCashierReceiptModalProps> = ({
  isOpen,
  order,
  tokenNumber,
  items,
  financials,
  paymentMethod,
  customerName,
  onClose,
  onNextCustomer,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptText = FastCashierHelper.generate80mmReceiptText(
    tokenNumber,
    order?.orderNumber || 'TKW-00000',
    items,
    financials,
    paymentMethod,
    customerName
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[#121620] border-2 border-amber-500/40 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#0b0e14] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <span className="text-sm font-bold text-white">80mm Thermal Receipt</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>

        {/* Realistic Thermal Receipt Slip */}
        <div className="p-6 bg-zinc-950 flex flex-col items-center">
          <div className="bg-white text-black font-mono p-5 rounded-lg shadow-xl w-full max-w-sm text-xs leading-relaxed border-2 border-dashed border-zinc-400">
            {/* Header */}
            <div className="text-center font-bold pb-2 border-b border-dashed border-zinc-400">
              <div className="text-sm font-black">SPICEHUB EXPRESS POS</div>
              <div className="text-[10px] text-zinc-600">FAST TAKEAWAY COUNTER</div>
              <div className="my-2 py-1 bg-black text-white text-lg font-black tracking-widest rounded">
                TOKEN #{String(tokenNumber).padStart(3, '0')}
              </div>
              <div className="text-[10px] font-normal">
                Order: {order?.orderNumber || 'TKW-AUTO'}
              </div>
              <div className="text-[10px] font-normal">
                {new Date().toLocaleString('en-IN')}
              </div>
              {customerName && (
                <div className="text-[10px] font-bold text-zinc-800">
                  Customer: {customerName}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 space-y-1 border-b border-dashed border-zinc-400">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="truncate max-w-[170px]">
                    {it.name} <span className="font-bold">x{it.quantity}</span>
                  </div>
                  <div className="font-bold">₹{it.subtotal}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 space-y-0.5 border-b border-dashed border-zinc-400">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal:</span>
                <span>₹{financials.subtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>GST (5%):</span>
                <span>₹{financials.taxAmount}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 text-black">
                <span>GRAND TOTAL:</span>
                <span>₹{financials.grandTotal}</span>
              </div>
            </div>

            {/* Payment & Change */}
            <div className="py-2 space-y-0.5 border-b border-dashed border-zinc-400 text-[11px]">
              <div className="flex justify-between">
                <span>Method:</span>
                <span className="font-bold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Tender Received:</span>
                <span className="font-bold">₹{financials.tenderAmount}</span>
              </div>
              <div className="flex justify-between font-black text-xs text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                <span>CHANGE RETURNED:</span>
                <span>₹{financials.changeAmount}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[10px] text-zinc-500 font-semibold">
              Please collect food when token called!
              <br />
              Thank You! Visit Again!
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-[#0b0e14] px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <span>🖨️ Print Slip</span>
          </button>
          <button
            type="button"
            onClick={onNextCustomer}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-1"
          >
            <span>⚡ Next Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
