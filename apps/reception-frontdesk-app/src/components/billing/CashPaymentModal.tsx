import React, { useState } from 'react';
import { formatCurrency } from '../../../../../packages/ui/src/index';
import { BillingCalculatorHelper } from '../../../../../packages/ui/src/billing/BillingCalculatorHelper';

export interface CashPaymentModalProps {
  billNumber: string;
  dueAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onProcessCashPayment: (cashTendered: number, changeDue: number, idempotencyKey: string) => Promise<void> | void;
}

export const CashPaymentModal: React.FC<CashPaymentModalProps> = ({
  billNumber,
  dueAmount,
  isOpen,
  onClose,
  onProcessCashPayment,
}) => {
  const [cashTendered, setCashTendered] = useState<number>(dueAmount);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const calculation = BillingCalculatorHelper.calculateCashChange(dueAmount, cashTendered);

  const handleQuickAdd = (amount: number) => {
    setCashTendered((prev) => prev + amount);
  };

  const handleExact = () => {
    setCashTendered(dueAmount);
  };

  const handlePay = async () => {
    if (!calculation.isSufficient || isProcessing) return;
    setIsProcessing(true);
    try {
      const idempotencyKey = `pay_cash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await onProcessCashPayment(cashTendered, calculation.changeDue, idempotencyKey);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cash Tender Settle</h2>
            <p className="text-xs text-slate-500">Bill {billNumber}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg">✕</button>
        </div>

        {/* Due Amount Highlight */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase">Bill Due Amount:</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(dueAmount)}</span>
        </div>

        {/* Cash Tendered Input */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">Cash Tendered by Guest:</label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-3 text-lg font-bold text-slate-400">₹</span>
            <input
              type="number"
              min={0}
              value={cashTendered}
              onChange={(e) => setCashTendered(Number(e.target.value))}
              className="w-full pl-9 pr-4 py-2.5 text-xl font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Quick Denomination Shortcuts */}
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={handleExact}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              Exact
            </button>
            <button
              onClick={() => handleQuickAdd(500)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              +₹500
            </button>
            <button
              onClick={() => handleQuickAdd(1000)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              +₹1,000
            </button>
            <button
              onClick={() => handleQuickAdd(2000)}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
            >
              +₹2,000
            </button>
          </div>
        </div>

        {/* Change Due Display */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          calculation.isSufficient
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
        }`}>
          <div>
            <div className="text-xs font-bold uppercase">Change Returned to Guest</div>
            {!calculation.isSufficient && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400">Insufficient cash tendered</div>
            )}
          </div>
          <div className="text-2xl font-black">
            {calculation.isSufficient ? formatCurrency(calculation.changeDue) : '₹0'}
          </div>
        </div>

        {/* Submit */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            disabled={!calculation.isSufficient || isProcessing}
            onClick={handlePay}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            {isProcessing ? 'Processing...' : 'Complete Payment & Settle'}
          </button>
        </div>
      </div>
    </div>
  );
};
