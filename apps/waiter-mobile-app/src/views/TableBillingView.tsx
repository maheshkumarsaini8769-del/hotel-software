import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  CheckCircle2,
  Percent,
  Receipt,
  Hotel,
  Scissors,
  X,
  ArrowRight,
  Smartphone,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { WaiterStaffProfile } from '../components/WaiterLoginScreen';

import {
  BillItem,
  fetchTableOrdersFromApi,
} from '../utils/tableBillingService';

export type { BillItem };

export interface TableBillingViewProps {
  isDark: boolean;
  assignedTables?: TableStatusItem[];
  allTables?: TableStatusItem[];
  waiterSession?: WaiterStaffProfile | null;
  initialSelectedTable?: string;
  onOpenUpiModal: (tableNumber: string, amount: number) => void;
  onOpenCashFloatModal: () => void;
  onSettleTable: (tableName: string, paymentMode: string, amount: number) => void;
  onSplitBill?: () => void;
  onOpenOtherTablesPage?: () => void;
  triggerToast: (msg: string) => void;
}

export const TableBillingView: React.FC<TableBillingViewProps> = ({
  isDark,
  assignedTables,
  allTables,
  waiterSession,
  initialSelectedTable,
  onOpenUpiModal,
  onOpenCashFloatModal,
  onSettleTable,
  onSplitBill,
  onOpenOtherTablesPage,
  triggerToast,
}) => {
  const availableAssignedOptions = useMemo(() => {
    const myTables = (assignedTables && assignedTables.length > 0)
      ? assignedTables
      : [];

    const allList = allTables && allTables.length > 0 ? allTables : [];
    const otherTables = allList.filter(
      (t) => !myTables.some((mt) => mt.id === t.id) && `Table ${t.name}` === initialSelectedTable
    );

    return {
      myTables: myTables.map((t) => ({
        id: `Table ${t.name}`,
        tableNum: t.id,
        label: `Table ${t.name} (${t.guests || 4} Guests • ${t.status})`,
        isMine: true,
      })),
      otherTables: otherTables.map((t) => ({
        id: `Table ${t.name}`,
        tableNum: t.id,
        label: `Table ${t.name} (Selected from Other Tables Page)`,
        isMine: false,
      })),
    };
  }, [assignedTables, allTables, initialSelectedTable]);

  const defaultFirstTable = initialSelectedTable || availableAssignedOptions.myTables[0]?.id || 'Table 4';
  const [selectedTable, setSelectedTable] = useState(defaultFirstTable);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(5);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'UPI' | 'CASH' | 'CARD' | 'ROOM'>('UPI');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [mobileBillingTab, setMobileBillingTab] = useState<'invoice' | 'payment'>('invoice');

  // Check if currently selected table is assigned to this waiter
  const isTableMine = useMemo(() => {
    if (!waiterSession) return true;
    const numOnly = parseInt(selectedTable.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numOnly)) return true;
    return numOnly >= waiterSession.assignedTableStart && numOnly <= waiterSession.assignedTableEnd;
  }, [selectedTable, waiterSession]);

  // Dynamic Cash Tender Calculation State
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Room Folio State
  const [guestRoomNumber, setGuestRoomNumber] = useState('Room 304');
  const [guestRoomName, setGuestRoomName] = useState('Rahul Sharma');

  // Dynamic table items state
  const [items, setItems] = useState<BillItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Fetch real orders for selected table from backend API
  useEffect(() => {
    let isMounted = true;
    setItems([]);
    setIsLoadingOrders(true);

    fetchTableOrdersFromApi(selectedTable)
      .then((liveItems) => {
        if (isMounted && liveItems && liveItems.length > 0) {
          setItems(liveItems);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTable]);

  // Financial calculations
  const subtotal = items.reduce((acc, it) => acc + it.total, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const serviceChargeAmount = Math.round((discountedSubtotal * serviceChargePercent) / 100);
  const cgst = Math.round(discountedSubtotal * 0.025);
  const sgst = Math.round(discountedSubtotal * 0.025);
  const grandTotal = discountedSubtotal + serviceChargeAmount + cgst + sgst;

  // Set default cash tendered to grandTotal when grandTotal changes
  useEffect(() => {
    setCashTendered(grandTotal);
  }, [grandTotal]);

  const cashChangeToReturn = Math.max(0, cashTendered - grandTotal);

  const handleSettle = () => {
    onSettleTable(selectedTable, selectedPaymentMode, grandTotal);
    triggerToast(`Bill for ${selectedTable} settled (₹${grandTotal}) via ${selectedPaymentMode}! Table marked for Cleaning.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div
        className={`p-4 rounded-2xl border flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 transition-colors ${
          isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Table Checkout & Bill Settlement
            </h2>
            <p className="text-xs text-slate-400">
              Tax invoice computation, multi-tender payment processing, and table release
            </p>
          </div>
        </div>

        {/* Table Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Billing Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {availableAssignedOptions.myTables.length > 0 && (
              <optgroup label="⭐ My Assigned Tables">
                {availableAssignedOptions.myTables.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            )}
            {availableAssignedOptions.otherTables.length > 0 && (
              <optgroup label="🤝 Selected from Other Tables Page">
                {availableAssignedOptions.otherTables.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {onOpenOtherTablesPage && (
            <button
              type="button"
              onClick={onOpenOtherTablesPage}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
            >
              <span>Other Tables Page (दूसरी टेबल)</span>
            </button>
          )}
        </div>
      </div>

      {/* Emergency / Courtesy Cross-Table Billing Banner */}
      {!isTableMine && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <strong>🤝 Emergency / Courtesy Cross-Table Billing:</strong> {selectedTable} is assigned to a colleague waiter. Since they are absent or busy, you can collect payment (Dynamic UPI QR, Cash, Card) directly without customer delay!
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shrink-0 ml-2 shadow-xs">
            Courtesy Assist Active
          </span>
        </div>
      )}

      {/* Mobile View Tab Switcher */}
      <div className="flex md:hidden border rounded-xl p-1 bg-slate-100 dark:bg-slate-800 shrink-0">
        <button
          onClick={() => setMobileBillingTab('invoice')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
            mobileBillingTab === 'invoice'
              ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-xs'
              : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          📄 Invoice Items
        </button>
        <button
          onClick={() => setMobileBillingTab('payment')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            mobileBillingTab === 'payment'
              ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-xs'
              : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <span>💳 Pay & Settle</span>
          <span className="font-mono text-emerald-600 font-black">• ₹{grandTotal.toFixed(0)}</span>
        </button>
      </div>

      {/* Main 2-column workstation */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-6">
        {/* Left Column: Invoice Sheet (7 cols) */}
        <div
          className={`md:col-span-6 lg:col-span-7 p-4 sm:p-6 rounded-2xl border space-y-4 ${
            mobileBillingTab === 'invoice' ? 'block' : 'hidden md:block'
          } ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-700/40' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="font-black text-base text-orange-500">SpiceHub Luxury Hotel & Dine</div>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                GSTIN: 07AAAAA0000A1Z5 • Server: {waiterSession?.name || 'Ravi Kumar (Captain)'}
              </div>
            </div>
            <div className="text-right">
              <span className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{selectedTable}</span>
              <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Invoice #INV-{selectedTable.replace(/[^0-9]/g, '')}0921
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className={`font-bold border-b text-left ${
                    isDark ? 'text-slate-400 border-slate-700/40' : 'text-slate-600 border-slate-200'
                  }`}
                >
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700/20' : 'divide-slate-200'}`}>
                {items.map((it, idx) => (
                  <tr key={idx} className={isDark ? 'text-slate-300' : 'text-slate-800'}>
                    <td className="py-2.5 font-medium">{it.name}</td>
                    <td className="py-2.5 text-center font-bold">{it.qty}</td>
                    <td className="py-2.5 text-right text-slate-400">₹{it.rate}</td>
                    <td className={`py-2.5 text-right font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      ₹{it.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill calculations */}
          <div
            className={`p-4 rounded-xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Subtotal:</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Discount:</span>
                <div className="flex gap-1">
                  {[0, 5, 10, 15].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDiscountPercent(d)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        discountPercent === d
                          ? 'bg-blue-600 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>
              <span className={`font-semibold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                -₹{discountAmount.toFixed(2)}
              </span>
            </div>

            {/* Service charge selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Service Charge:</span>
                <div className="flex gap-1">
                  {[0, 5, 10].map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setServiceChargePercent(sc)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        serviceChargePercent === sc
                          ? 'bg-purple-600 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {sc}%
                    </button>
                  ))}
                </div>
              </div>
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                ₹{serviceChargeAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>CGST (2.5%):</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-800 font-semibold'}>₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>SGST (2.5%):</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-800 font-semibold'}>₹{sgst.toFixed(2)}</span>
            </div>

            <div
              className={`flex items-center justify-between border-t pt-2.5 text-sm font-black ${
                isDark ? 'border-slate-700/40' : 'border-slate-200'
              }`}
            >
              <span className={isDark ? 'text-slate-200' : 'text-slate-900'}>Total Payable:</span>
              <span className={`text-xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Mobile Proceed to Payment Button */}
          <div className="md:hidden pt-2">
            <button
              onClick={() => setMobileBillingTab('payment')}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Proceed to Payment (₹{grandTotal.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Payment Tender & Settlement (5 cols) */}
        <div className={`md:col-span-6 lg:col-span-5 space-y-4 ${
          mobileBillingTab === 'payment' ? 'block' : 'hidden md:block'
        }`}>
          {/* Mobile Back to Invoice link */}
          <div className="md:hidden pb-1">
            <button
              onClick={() => setMobileBillingTab('invoice')}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"
            >
              ← Back to Invoice Details
            </button>
          </div>
          <div
            className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Select Payment Mode
            </h3>

            {/* 4 Multi-Tender Payment Methods */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'UPI', label: 'Dynamic UPI QR', icon: QrCode, color: 'text-purple-500' },
                { id: 'CASH', label: 'Cash Tender', icon: Banknote, color: 'text-emerald-600' },
                { id: 'CARD', label: 'Card POS Swipe', icon: CreditCard, color: 'text-blue-600' },
                { id: 'ROOM', label: 'Charge Room Folio', icon: Hotel, color: 'text-amber-600' },
              ].map((m) => {
                const Icon = m.icon;
                const isSel = selectedPaymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedPaymentMode(m.id as any);
                      if (m.id === 'UPI') onOpenUpiModal(selectedTable, grandTotal);
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition ${
                      isSel
                        ? 'bg-orange-500/20 border-orange-500 shadow-sm ring-1 ring-orange-500'
                        : isDark
                        ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${m.color}`} />
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Payment Method Details Panel */}
            {selectedPaymentMode === 'CASH' && (
              <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-900/80 border-emerald-900/50' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className={isDark ? 'text-emerald-400' : 'text-emerald-800'}>Cash Tendered by Guest:</span>
                  <span className="font-mono text-sm text-emerald-500">₹{cashTendered}</span>
                </div>

                <div className="flex gap-1.5 pt-1">
                  {[grandTotal, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashTendered(amt)}
                      className={`flex-1 py-1 rounded text-[10px] font-black border transition ${
                        cashTendered === amt
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : isDark
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/30 font-bold">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Change to Return:</span>
                  <span className={`text-sm font-black font-mono ${cashChangeToReturn > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                    ₹{cashChangeToReturn.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {selectedPaymentMode === 'UPI' && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                isDark ? 'bg-purple-950/30 border-purple-900/50 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}>
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="font-bold">Dynamic NPCI QR Generated</div>
                    <div className="text-[10px] opacity-80">GPay • PhonePe • Paytm Soundbox Sync</div>
                  </div>
                </div>
                <button
                  onClick={() => onOpenUpiModal(selectedTable, grandTotal)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-500 transition shadow-xs"
                >
                  Show QR
                </button>
              </div>
            )}

            {selectedPaymentMode === 'CARD' && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                isDark ? 'bg-blue-950/30 border-blue-900/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Handheld EDC POS Terminal</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Swipe/Insert card on terminal POS-TERM-01. Authorization code: AUTH-9821.
                </p>
              </div>
            )}

            {selectedPaymentMode === 'ROOM' && (
              <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span>Charge to Room Folio:</span>
                  <span className="font-bold">{guestRoomNumber}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={guestRoomNumber}
                    onChange={(e) => setGuestRoomNumber(e.target.value)}
                    placeholder="Enter Room Number"
                    className={`flex-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    value={guestRoomName}
                    onChange={(e) => setGuestRoomName(e.target.value)}
                    placeholder="Guest Name"
                    className={`flex-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-slate-700/20' : 'border-slate-200'}`}>
              {onSplitBill && (
                <button
                  onClick={onSplitBill}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                    isDark
                      ? 'bg-purple-950/30 border-purple-800/60 text-purple-300 hover:bg-purple-900/50'
                      : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <Scissors className="w-4 h-4 text-purple-400" />
                  <span>Split Bill Between Guests (Equal / By Item)</span>
                </button>
              )}

              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Printer className="w-4 h-4 text-blue-500" />
                <span>Print Guest Check Thermal Slip</span>
              </button>

              <button
                onClick={handleSettle}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Settle Bill & Release {selectedTable}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Thermal Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white text-slate-900 w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-4 sm:p-6 font-mono text-xs space-y-3 border border-slate-300 custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Thermal Guest Check</span>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Header */}
            <div className="text-center space-y-0.5">
              <h3 className="font-black text-sm tracking-tight text-slate-900 font-sans">
                SPICEHUB LUXURY HOTEL & RESTAURANT
              </h3>
              <p className="text-[11px] text-slate-600">Plot 14, Ring Road, Connaught Place</p>
              <p className="text-[10px] text-slate-500">GSTIN: 07AAAAA0000A1Z5 • FSSAI: 10019011000123</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-1.5 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Date: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-bold">{selectedTable}</span>
              </div>
              <div className="flex justify-between">
                <span>Server: {waiterSession?.name || 'Ravi Kumar'}</span>
                <span>Bill: #INV-{selectedTable.replace(/[^0-9]/g, '')}0921</span>
              </div>
            </div>

            {/* Itemized List */}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-dashed border-slate-300 text-slate-600 text-left">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Rate</th>
                  <th className="pb-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{it.name}</td>
                    <td className="py-1 text-center">{it.qty}</td>
                    <td className="py-1 text-right">₹{it.rate}</td>
                    <td className="py-1 text-right font-bold">₹{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Taxes and Totals */}
            <div className="border-t border-dashed border-slate-300 pt-1.5 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {serviceChargePercent > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Service Charge ({serviceChargePercent}%):</span>
                  <span>₹{serviceChargeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>CGST (2.5%):</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (2.5%):</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              <div className="border-t border-dashed border-slate-400 pt-1 flex justify-between font-black text-sm">
                <span>GRAND TOTAL:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
              <p>Tender: {selectedPaymentMode}</p>
              <p className="mt-1 font-bold text-slate-700">*** THANK YOU FOR DINING WITH US ***</p>
              <p>Please Visit Again!</p>
            </div>

            {/* Print and Close buttons */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
