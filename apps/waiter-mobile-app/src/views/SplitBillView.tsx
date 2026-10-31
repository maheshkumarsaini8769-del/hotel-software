import React, { useState, useEffect, useMemo } from 'react';
import { waiterFetch } from '../lib/waiterApi';
import { API_BASE_URL } from '../config/api';
import {
  Scissors,
  QrCode,
  Banknote,
  Users,
  CheckCircle2,
  DollarSign,
  Receipt
} from 'lucide-react';
import {
  getTableBill,
  fetchTableOrdersFromApi,
  calculateBill,
  BillItem,
} from '../utils/tableBillingService';

interface SplitBillViewProps {
  isDark: boolean;
  onOpenUpiModal: (tableNumber: string, amount: number) => void;
  triggerToast: (msg: string) => void;
}

export const SplitBillView: React.FC<SplitBillViewProps> = ({
  isDark,
  onOpenUpiModal,
  triggerToast,
}) => {
  const [selectedTable, setSelectedTable] = useState('Table 4');
  const [splitMode, setSplitMode] = useState<'Equal' | 'Itemized'>('Equal');
  const [guestsCount, setGuestsCount] = useState<number>(2);

  const [tableItems, setTableItems] = useState<BillItem[]>([]);
  const [billableTables, setBillableTables] = useState<
    Array<{ tableNumber: string; label: string; orderTotal: number }>
  >([]);

  // Live list of tables that currently have a running order.
  useEffect(() => {
    let isMounted = true;
    const loadTables = async () => {
      try {
        const response = await waiterFetch(`${API_BASE_URL}/pos/tables`);
        if (!response.ok) return;
        const body = await response.json();
        if (!body.success || !Array.isArray(body.data)) return;
        const rows = body.data
          .filter((table: any) => Number(table.activeOrderTotal || 0) > 0)
          .map((table: any) => ({
            tableNumber: `Table ${table.tableNumber}`,
            label: `Table ${table.tableNumber} (Running ₹${Number(table.activeOrderTotal || 0).toLocaleString('en-IN')})`,
            orderTotal: Number(table.activeOrderTotal || 0),
          }));
        if (isMounted) {
          setBillableTables(rows);
          if (rows.length > 0) {
            setSelectedTable((current) =>
              rows.some((row: any) => row.tableNumber === current) ? current : rows[0].tableNumber
            );
          }
        }
      } catch (_) {
        // Leave the empty state visible when the POS is unreachable.
      }
    };
    void loadTables();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setTableItems([]);

    fetchTableOrdersFromApi(selectedTable).then((items) => {
      if (isMounted) {
        setTableItems(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTable]);

  const billCalc = useMemo(() => {
    return calculateBill(selectedTable, tableItems, 0, 5);
  }, [selectedTable, tableItems]);

  const baseBill = billCalc.subtotal;
  const gstAmount = billCalc.gstAmount;
  const totalAmount = billCalc.grandTotal;
  const sharePerGuest = Math.round(totalAmount / guestsCount);

  const [paidGuests, setPaidGuests] = useState<number[]>([]);

  const handleMarkPaid = (guestIndex: number) => {
    if (!paidGuests.includes(guestIndex)) {
      setPaidGuests([...paidGuests, guestIndex]);
      triggerToast(`Guest ${guestIndex + 1} share of ₹${sharePerGuest} marked PAID!`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Interactive Bill Splitting Workstation
            </h2>
            <p className="text-xs text-slate-400">
              Split table bills equally or per guest and generate individual dynamic UPI QR codes
            </p>
          </div>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Select Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setPaidGuests([]);
            }}
            className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {billableTables.length === 0 ? (
              <option value={selectedTable}>No table has a running order right now</option>
            ) : (
              billableTables.map((table) => (
                <option key={table.tableNumber} value={table.tableNumber}>
                  {table.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-6">
        {/* Left Column: Split Controls & Calculation (5 cols) */}
        <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          {/* Split Mode Selector */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Split Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Equal', 'Itemized'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSplitMode(m)}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    splitMode === m
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  {m === 'Equal' ? 'Equal Split (Per Person)' : 'Itemized (Custom Items)'}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Persons */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Number of Guests</label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setGuestsCount(num);
                    setPaidGuests([]);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    guestsCount === num
                      ? 'bg-orange-500 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  {num} Guests
                </button>
              ))}
            </div>
          </div>

          {/* Bill Calculation Summary */}
          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Food Subtotal:</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>₹{baseBill.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>GST (5%):</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className={`flex items-center justify-between border-t pt-2 ${isDark ? 'border-slate-700/40' : 'border-slate-200'}`}>
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>Total Bill Payable:</span>
              <span className={`font-black text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className={`flex items-center justify-between border-t pt-2 font-bold ${
              isDark ? 'border-slate-700/40 text-slate-700 dark:text-slate-300' : 'border-slate-200 text-slate-700 dark:text-slate-300'
            }`}>
              <span>Each Guest Pays ({guestsCount} way split):</span>
              <span className="text-base font-black">₹{sharePerGuest}</span>
            </div>
          </div>

          {/* Progress tracker */}
          <div className={`space-y-1.5 pt-2 border-t text-xs ${isDark ? 'border-slate-700/20' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between font-bold">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Settlement Progress:</span>
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{paidGuests.length} / {guestsCount} Paid</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(paidGuests.length / guestsCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Guest Shares List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Individual Guest Settlement Shares
            </h3>
            <span className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              {selectedTable}
            </span>
          </div>

          <div className="space-y-3">
            {Array.from({ length: guestsCount }).map((_, idx) => {
              const isPaid = paidGuests.includes(idx);

              return (
                <div
                  key={idx}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
                    isPaid
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-500/40 opacity-80'
                        : 'bg-emerald-50/70 border-emerald-300 opacity-90'
                      : isDark
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isPaid
                        ? 'bg-emerald-500 text-white'
                        : isDark ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isPaid ? '✓' : `G${idx + 1}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Guest {idx + 1}
                        </span>
                        {isPaid && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
                            PAID
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Share: <span className={`font-bold ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>₹{sharePerGuest}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this guest */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    {!isPaid ? (
                      <>
                        <button
                          onClick={() => onOpenUpiModal(selectedTable, sharePerGuest)}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Dynamic UPI QR</span>
                        </button>
                        <button
                          onClick={() => handleMarkPaid(idx)}
                          className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cash Paid</span>
                        </button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
