import React, { useState, useMemo } from 'react';
import {
  Grid,
  Users,
  Plus,
  CreditCard,
  Bell,
  Search,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  UtensilsCrossed,
  QrCode,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { WaiterStaffProfile } from '../components/WaiterLoginScreen';
import { useTableBills } from '../utils/useTableBills';

interface OtherTablesViewProps {
  isDark?: boolean;
  tablesList: TableStatusItem[];
  waiterSession?: WaiterStaffProfile;
  onSelectOtherTableForOrder: (tableName: string, assignedColleague: string) => void;
  onSelectOtherTableForBilling: (tableName: string, assignedColleague: string) => void;
  onOpenUpiForOtherTable: (tableName: string, amount: number) => void;
  onNotifyAssignedWaiter: (tableName: string, colleagueName: string) => void;
  onBackToMyTables: () => void;
  triggerToast: (msg: string) => void;
}

export const OtherTablesView: React.FC<OtherTablesViewProps> = ({
  tablesList,
  waiterSession,
  onSelectOtherTableForOrder,
  onSelectOtherTableForBilling,
  onOpenUpiForOtherTable,
  onNotifyAssignedWaiter,
  onBackToMyTables,
  triggerToast,
}) => {
  // Live running bills for every table on the floor.
  const tableBills = useTableBills(
    tablesList.map((table) => `Table ${table.name}`)
  );
  const [filter, setFilter] = useState<'All' | 'Available' | 'Occupied' | 'Cleaning'>('All');
  const [search, setSearch] = useState('');

  const assignedStart = waiterSession?.assignedTableStart ?? 0;
  const assignedEnd = waiterSession?.assignedTableEnd ?? 0;
  const hasAssignment = assignedStart > 0 && assignedEnd >= assignedStart;
  const staffName = waiterSession?.name || 'Waiter';

  // Filter strictly to OTHER tables (outside this waiter's assigned zone)
  const otherTables = useMemo(() => {
    if (!hasAssignment) return [];
    return tablesList.filter((t) => t.id < assignedStart || t.id > assignedEnd);
  }, [tablesList, assignedStart, assignedEnd, hasAssignment]);

  const filteredOtherTables = useMemo(() => {
    return otherTables.filter((t) => {
      const isOccupied = t.status === 'Occupied' || t.status === 'My Table';
      const isAvailable = t.status === 'Available';
      const isCleaning = t.status === 'Cleaning';

      const matchFilter =
        filter === 'All' ||
        (filter === 'Available' && isAvailable) ||
        (filter === 'Occupied' && isOccupied) ||
        (filter === 'Cleaning' && isCleaning);

      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        `table ${t.name}`.toLowerCase().includes(search.toLowerCase());

      return matchFilter && matchSearch;
    });
  }, [otherTables, filter, search]);

  const availableCount = otherTables.filter((t) => t.status === 'Available').length;
  const occupiedCount = otherTables.filter((t) => t.status === 'Occupied' || t.status === 'My Table').length;
  const cleaningCount = otherTables.filter((t) => t.status === 'Cleaning').length;

  const getAssignedColleagueInfo = (table: TableStatusItem) => {
    return {
      name: table.assignedWaiterName || (table.assignedWaiterId ? 'Assigned waiter' : 'No waiter assigned'),
      id: table.assignedWaiterId || '—',
      section: table.section || 'Section not configured',
      isAssigned: Boolean(table.assignedWaiterId || table.assignedWaiterName),
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
 'bg-white border-slate-200'
 }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`font-black text-base ${'text-slate-900'}`}>
                Other Floor Tables — Select Another Table
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Cross-Zone Assist Page
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select any table outside your assigned zone (T-{String(assignedStart).padStart(2, '0')} to T-{String(assignedEnd).padStart(2, '0')}) to take an order or generate bill
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            onClick={onBackToMyTables}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
 }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
            <span>Back to My Tables</span>
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Available: {availableCount}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Occupied: {occupiedCount}
          </span>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div
        className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
  'bg-amber-50 border-amber-200'
  }`}
      >
        <div className="flex items-center gap-2.5 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span className={'text-slate-700'}>
            Your primary duty is <strong>{assignedStart > 0 && assignedEnd >= assignedStart ? `Tables T-${String(assignedStart).padStart(2, '0')} to T-${String(assignedEnd).padStart(2, '0')}` : 'All Floor Tables'}</strong>. Use this page when assisting other tables on the floor.
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-700 shrink-0">
          Showing {otherTables.length} Other Tables
        </span>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'All', label: 'All Other Tables', count: otherTables.length, dot: '' },
            { id: 'Available', label: 'Available (Vacant)', count: availableCount, dot: 'bg-emerald-500' },
            { id: 'Occupied', label: 'Occupied', count: occupiedCount, dot: 'bg-rose-500' },
            { id: 'Cleaning', label: 'Cleaning', count: cleaningCount, dot: 'bg-amber-500' },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-[#2E6B4C] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-64 ${
 'bg-white border-slate-200'
 }`}
        >
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search other table #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs focus:outline-none w-full"
          />
        </div>
      </div>

      {/* Other Tables Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-1 custom-scrollbar pb-32 lg:pb-8">
        {filteredOtherTables.map((t) => {
          const isOccupied = t.status === 'Occupied' || t.status === 'My Table';
          const isAvailable = t.status === 'Available';
          const isCleaning = t.status === 'Cleaning';
          const colleague = getAssignedColleagueInfo(t);
          const tableName = `Table ${t.name}`;

          const tableBill = isOccupied ? tableBills[tableName] : null;
          const liveAmount = tableBill ? tableBill.grandTotal : 0;
          const liveItemCount = tableBill ? tableBill.items.reduce((s, i) => s + i.qty, 0) : 0;
          const actualPax = isOccupied ? (t.actualGuests ?? t.customerClaimedGuests) : 0;
          const capacityPax = t.guests;

          return (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:scale-[1.01] ${
 isOccupied
 ? 'bg-amber-50/40 border-amber-300 shadow-xs'
 : isAvailable
 ? 'bg-white border-emerald-200 shadow-2xs'
 : 'bg-slate-50 border-slate-200'
 }`}
            >
              {/* Top Row */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-black ${'text-slate-900'}`}>
                      {tableName}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
 isOccupied
 ? 'bg-red-600 text-white'
 : isAvailable
 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
 : 'bg-emerald-600/20 text-amber-400 border border-emerald-600/30'
 }`}
                    >
                      {isAvailable ? 'Available' : isOccupied ? 'Occupied' : 'Cleaning'}
                    </span>
                  </div>
                </div>

                {/* Assigned Waiter Badge */}
                <div
                  className={`mt-2 px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between ${
 'bg-slate-100 border-slate-200 text-slate-700'
 }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Assigned: <strong>{colleague.name}</strong></span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{colleague.id}</span>
                </div>
              </div>

              {/* Middle Details Box */}
              {isOccupied ? (
                <div
                  className={`p-3 rounded-xl border space-y-1.5 text-xs ${
 'bg-white/90 border-slate-200'
 }`}
                >
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seated Guests:</span>
                    <span className={`font-black ${'text-slate-900'} flex items-center gap-1`}>
                      <Users className="w-3.5 h-3.5 text-slate-500 inline" />
                      <span>{actualPax ?? '—'} Pax Seated (Cap: {capacityPax ?? '—'})</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Running Order:</span>
                    <span className="font-black text-emerald-400">
                      ₹{liveAmount} ({liveItemCount} items)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Section:</span>
                    <span className="font-semibold text-slate-300">{colleague.section}</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl border space-y-1.5 text-xs ${
 'bg-emerald-50/70 border-emerald-200'
 }`}
                >
                  <div className="flex justify-between">
                    <span className="text-slate-400">Table Status:</span>
                    <span className="font-bold text-emerald-600">Available (Vacant)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seated Guests:</span>
                    <span className="font-bold text-slate-300">0 Pax ({capacityPax ?? '—'} Chairs Free)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Amount:</span>
                    <span className="font-black text-slate-400">₹0 (No Active Order)</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => onSelectOtherTableForOrder(tableName, colleague.name)}
                  className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Select & Take Order (KOT)</span>
                </button>

                {isOccupied && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onSelectOtherTableForBilling(tableName, colleague.name)}
                      className="py-2 px-2.5 rounded-xl bg-[#123C2B] hover:bg-[#1B5138] text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Bill Table</span>
                    </button>
                    <button
                      onClick={() => onOpenUpiForOtherTable(tableName, liveAmount)}
                      className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Show UPI QR</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onNotifyAssignedWaiter(tableName, colleague.name)}
                  className={`w-full py-1.5 px-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
 }`}
                >
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span>Notify {colleague.name.split(' ')[0]} (Send Call)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
