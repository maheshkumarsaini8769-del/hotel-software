import React, { useState } from 'react';
import {
  Users,
  BellRing,
  UtensilsCrossed,
  CheckCircle2,
  X,
  PhoneCall,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  QrCode,
  Banknote,
  CreditCard,
  Receipt
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { WaiterStaffProfile } from './WaiterLoginScreen';
import {
  getTableBill,
  fetchTableOrdersFromApi,
  calculateBill,
  BillItem,
} from '../utils/tableBillingService';

interface CrossTableAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  currentStaff: WaiterStaffProfile;
  tablesList: TableStatusItem[];
  onTakeOrderForTable: (table: string, isCourtesy: boolean, assignedTo: string) => void;
  onPageWaiterForTable: (table: string, assignedTo: string, reason: string) => void;
  onLogServiceForTable: (table: string, requestType: string) => void;
  onOpenUpiModalForTable?: (table: string, amount: number) => void;
  onSettleBillForTable?: (table: string, amount: number, mode: 'UPI' | 'CASH' | 'CARD') => void;
  onOpenTableBillingView?: (table: string) => void;
}

export const CrossTableAssistModal: React.FC<CrossTableAssistModalProps> = ({
  isOpen,
  onClose,
  isDark,
  currentStaff,
  tablesList,
  onTakeOrderForTable,
  onPageWaiterForTable,
  onLogServiceForTable,
  onOpenUpiModalForTable,
  onSettleBillForTable,
  onOpenTableBillingView,
}) => {
  if (!isOpen) return null;

  // Default to Table 4 or first non-assigned table
  const unassignedTables = tablesList.filter(
    (t) => t.id < currentStaff.assignedTableStart || t.id > currentStaff.assignedTableEnd
  );

  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(
    unassignedTables.find((t) => t.id === 5)?.id || unassignedTables[0]?.id || 5
  );

  const [assistReason, setAssistReason] = useState<string>(
    'Non-tech guest called verbally to take food order'
  );

  const [selectedQuickReason, setSelectedQuickReason] = useState<string>('Take Food Order');

  // Determine who is the assigned waiter for the selected table
  const getAssignedWaiterForTable = (tableId: number) => {
    if (tableId >= 1 && tableId <= 6) {
      return { name: 'Ravi Kumar', role: 'Captain', staffId: 'W-101', section: 'Indoor AC Dining' };
    } else if (tableId >= 7 && tableId <= 12) {
      return { name: 'Ramesh Kumar', role: 'Senior Waiter', staffId: 'W-102', section: 'AC Hall & Lounge' };
    } else {
      return { name: 'Amit Singh', role: 'Floor Steward', staffId: 'W-103', section: 'Rooftop Terrace' };
    }
  };

  // Dynamic Live Orders and Bill for Selected Table
  const [tableItems, setTableItems] = React.useState<BillItem[]>([]);
  const [isLoadingLiveBill, setIsLoadingLiveBill] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    setTableItems([]);
    setIsLoadingLiveBill(true);

    fetchTableOrdersFromApi(`Table ${selectedTableNumber}`)
      .then((items) => {
        if (isMounted) {
          setTableItems(items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingLiveBill(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTableNumber]);

  const billCalc = React.useMemo(() => {
    return calculateBill(`Table ${selectedTableNumber}`, tableItems, 0, 5);
  }, [selectedTableNumber, tableItems]);

  const assignedCaptain = getAssignedWaiterForTable(selectedTableNumber);
  const isMyTable = selectedTableNumber >= currentStaff.assignedTableStart && selectedTableNumber <= currentStaff.assignedTableEnd;
  const currentTableBill = billCalc.grandTotal;

  const handleTakeOrder = () => {
    onTakeOrderForTable(`Table ${selectedTableNumber}`, !isMyTable, assignedCaptain.name);
    onClose();
  };

  const handlePageWaiter = () => {
    onPageWaiterForTable(`Table ${selectedTableNumber}`, assignedCaptain.name, selectedQuickReason);
    onClose();
  };

  const handlePayUpi = () => {
    if (onOpenUpiModalForTable) {
      onOpenUpiModalForTable(`Table ${selectedTableNumber}`, currentTableBill);
    }
    onClose();
  };

  const handleSettleCash = () => {
    if (onSettleBillForTable) {
      onSettleBillForTable(`Table ${selectedTableNumber}`, currentTableBill, 'CASH');
    }
    onClose();
  };

  const handleOpenFullBilling = () => {
    if (onOpenTableBillingView) {
      onOpenTableBillingView(`Table ${selectedTableNumber}`);
    }
    onClose();
  };

  const handleQuickService = (service: string) => {
    onLogServiceForTable(`Table ${selectedTableNumber}`, service);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`max-w-lg w-full rounded-3xl border shadow-sm dark:shadow-none overflow-hidden flex flex-col transition-all ${
        isDark ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Cross-Table Guest Assist</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  Verbal / In-Person Call
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                Assist walk-in or non-smartphone guests sitting outside your assigned tables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Situation Explanation Banner */}
          <div className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1 ${
            isDark ? 'bg-amber-950/20 border-amber-700/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Hospitality Rule: Never Say "No" to a Guest!</span>
            </div>
            <p className="text-[11px] opacity-90">
              A guest at any table called you over verbally. Even if the table is assigned to another waiter, you can either <strong>punch their order immediately</strong> or <strong>instantly digital-page the assigned waiter</strong> to attend.
            </p>
          </div>

          {/* Table Selection Dropdown / Selector */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <span>Which Table Called You?</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-semibold'}`}>
                Your Assigned Zone: T-{String(currentStaff.assignedTableStart).padStart(2, '0')} to T-{String(currentStaff.assignedTableEnd).padStart(2, '0')}
              </span>
            </label>
            <select
              value={selectedTableNumber}
              onChange={(e) => setSelectedTableNumber(Number(e.target.value))}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none transition ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
              }`}
            >
              {tablesList.map((t) => {
                const assigned = getAssignedWaiterForTable(t.id);
                const isMine = t.id >= currentStaff.assignedTableStart && t.id <= currentStaff.assignedTableEnd;
                return (
                  <option key={t.id} value={t.id}>
                    Table {t.name} {isMine ? '★ (My Zone)' : `• (Assigned to ${assigned.name})`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Assigned Waiter Card for the Selected Table */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
            isMyTable
              ? isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-300'
              : isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Table {selectedTableNumber} Status & Allocation:
              </div>
              <div className={`font-black text-sm mt-0.5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Table {selectedTableNumber}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isMyTable
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                }`}>
                  {isMyTable ? 'Your Assigned Table' : `Assigned to: ${assignedCaptain.name} (${assignedCaptain.role})`}
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Section: {assignedCaptain.section}
              </p>
            </div>
          </div>

          {/* Action Choice 1: Take Order Directly in Person */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
            isDark ? 'bg-slate-900 border-slate-700/70 hover:border-blue-500/60' : 'bg-blue-50/70 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-black text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                <UtensilsCrossed className="w-4 h-4" />
                <span>OPTION 1: Take In-Person Food Order (KOT Punch)</span>
              </div>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                Direct Kitchen KOT
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Customer says: <em>"Bhaiya ek Dal Makhani aur do Butter Naan le aao."</em> Open the menu on your phone, punch the dishes, and fire directly to Kitchen KDS.
            </p>
            <button
              onClick={handleTakeOrder}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Punch Order for Table {selectedTableNumber} Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Choice 2: Page Assigned Waiter */}
          {!isMyTable && (
            <div className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
              isDark ? 'bg-slate-900 border-slate-700/70 hover:border-amber-500/60' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-black text-xs ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                  <BellRing className="w-4 h-4 animate-pulse" />
                  <span>OPTION 2: Digital-Page {assignedCaptain.name}</span>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                  isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  Instant Chime
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                If you are currently carrying food or busy with other guests, send a 1-tap urgent alert to {assignedCaptain.name}'s phone to attend Table {selectedTableNumber}.
              </p>

              {/* Quick Reasons Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[
                  'Take Food Order',
                  'Water Refill Needed',
                  'Guest Calling in Person',
                  'Bill & Payment',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedQuickReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                      selectedQuickReason === reason
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePageWaiter}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Page {assignedCaptain.name}: "Guest Calling for {selectedQuickReason}"</span>
              </button>
            </div>
          )}

          {/* Action Choice 3: Emergency / Courtesy Bill & Payment */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
            isDark ? 'bg-slate-900 border-slate-700/70 hover:border-emerald-500/60' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-black text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>OPTION 3: Settle Bill & Collect Payment</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black ${
                isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                Real Bill: ₹{currentTableBill}
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Assigned waiter ({assignedCaptain.name}) is absent or busy? Guest wants the bill immediately. You can collect payment directly via <strong>Dynamic UPI QR</strong> or <strong>Cash/Card</strong> without keeping the customer waiting!
            </p>

            {/* Live Table Item Summary */}
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  🍽️ Table {selectedTableNumber} Active Order ({billCalc.items.length} items):
                </span>
                <span className="font-mono text-slate-500">
                  Subtotal: ₹{billCalc.subtotal} + Taxes: ₹{billCalc.gstAmount + billCalc.serviceChargeAmount}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {billCalc.items.map((it) => `${it.qty}x ${it.name}`).join(' • ')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePayUpi}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Dynamic UPI QR (₹{currentTableBill})</span>
              </button>
              <button
                type="button"
                onClick={handleSettleCash}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
              >
                <Banknote className="w-4 h-4" />
                <span>Settle Cash / Card (₹{currentTableBill})</span>
              </button>
            </div>
            <div className="pt-0.5 text-center">
              <button
                type="button"
                onClick={handleOpenFullBilling}
                className={`text-[11px] font-bold hover:underline inline-flex items-center gap-1.5 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Open Full Invoice & Discount Settle Screen →</span>
              </button>
            </div>
          </div>

          {/* Quick Service Log */}
          <div className="space-y-1.5 pt-1">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Quick 1-Tap Service for Table {selectedTableNumber}:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickService('Extra Water Refill')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs'
                }`}
              >
                <span>💧 Water Refill</span>
              </button>
              <button
                onClick={() => handleQuickService('Fresh Spoons & Cutlery')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs'
                }`}
              >
                <span>🍴 Spoons / Cutlery</span>
              </button>
              <button
                onClick={handlePayUpi}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isDark ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                }`}
              >
                <span>🧾 Settle Bill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
