import React, { useState, useMemo } from 'react';
import {
  Grid,
  Users,
  Search,
  Plus,
  ArrowRightLeft,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { WaiterStaffProfile } from '../components/WaiterLoginScreen';
import { useTableBills } from '../utils/useTableBills';

interface MyTablesViewProps {
  isDark?: boolean;
  tablesList: TableStatusItem[];
  waiterSession?: WaiterStaffProfile;
  onUpdateTableStatus: (tableId: number, newStatus: TableStatusItem['status']) => void;
  onTakeOrder: (tableName: string) => void;
  onTransferTable: (tableName: string) => void;
  onBillTable: (tableName: string) => void;
  onMarkTableServed?: (tableId: number, tableName: string) => void;
  onOpenPaxModal?: (table: TableStatusItem) => void;
  onOpenOtherTablesPage?: () => void;
  triggerToast: (msg: string) => void;
}

export const MyTablesView: React.FC<MyTablesViewProps> = ({
  tablesList,
  waiterSession,
  onUpdateTableStatus,
  onTakeOrder,
  onTransferTable,
  onBillTable,
  onMarkTableServed,
  onOpenPaxModal,
  onOpenOtherTablesPage,
  triggerToast,
}) => {
  // Live running bills for the tables on this floor.
  const tableBills = useTableBills(
    tablesList.map((table) => `Table ${table.name}`)
  );
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTable, setSearchTable] = useState('');

  const assignedStart = waiterSession?.assignedTableStart ?? 0;
  const assignedEnd = waiterSession?.assignedTableEnd ?? 0;
  const assignedCount = waiterSession?.assignedTableCount ?? 0;

  // STRICT HOTEL ADMIN ALLOCATION: Waiter gets assigned range, or all tables if unzoned/captain!
  const myAssignedTables = useMemo(() => {
    const hasZone = assignedStart > 0 && assignedEnd >= assignedStart;
    if (!hasZone) return tablesList;
    const filtered = tablesList.filter((t) => t.id >= assignedStart && t.id <= assignedEnd);
    return filtered.length > 0 ? filtered : tablesList;
  }, [tablesList, assignedStart, assignedEnd]);

  const availableCount = myAssignedTables.filter((t) => t.status === 'Available').length;
  const occupiedCount = myAssignedTables.filter((t) => t.status === 'Occupied' || t.status === 'My Table').length;
  const cleaningCount = myAssignedTables.filter((t) => t.status === 'Cleaning').length;
  const reservedCount = myAssignedTables.filter((t) => t.status === 'Reserved').length;

  const statuses = [
    { id: 'All', label: 'All', count: myAssignedTables.length, dot: '' },
    { id: 'Available', label: 'Available', count: availableCount, dot: 'bg-emerald-500' },
    { id: 'Occupied', label: 'Occupied', count: occupiedCount, dot: 'bg-rose-500' },
    { id: 'Cleaning', label: 'Cleaning', count: cleaningCount, dot: 'bg-amber-500' },
  ];

  const filteredTables = myAssignedTables.filter((t) => {
    if (statusFilter === 'Occupied' && (t.status === 'Occupied' || t.status === 'My Table')) return true;
    if (statusFilter === 'Available' && t.status === 'Available') return true;
    if (statusFilter === 'Cleaning' && t.status === 'Cleaning') return true;
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (searchTable && !t.name.toLowerCase().includes(searchTable.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Top Header & Summary Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
 'bg-white border-slate-200'
 }`}>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-black text-base ${'text-slate-900'}`}>
                My Assigned Tables ({myAssignedTables.length})
              </h2>
              <p className="text-xs text-slate-400">
                Floor management strictly for tables allocated to you by Hotel Admin ERP
              </p>
            </div>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-slate-100 border-slate-200 text-slate-700'
 }`}>
            Admin Assigned: <span className="font-black text-orange-500">{myAssignedTables.length} Tables</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-amber-100 border-amber-300 text-amber-800'
 }`}>
            Available: <span className="font-black">{availableCount}</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-slate-100 border-red-300 text-red-800'
 }`}>
            Occupied: <span className="font-black">{occupiedCount}</span>
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-blue-100 border-blue-300 text-blue-800'
 }`}>
            Cleaning: <span className="font-black">{cleaningCount}</span>
          </span>
          {reservedCount > 0 && (
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
 'bg-slate-100 border-slate-300 text-slate-700'
 }`}>
              Reserved: <span className="font-black">{reservedCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Prominent Allocated Table Range by Hotel Admin ERP */}
      <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
 'bg-white border-slate-200'
 }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold ${
 'bg-orange-100 text-orange-700 border-orange-300'
 }`}>
            <ShieldCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${'text-slate-900'}`}>
              <span>Hotel Admin Assigned Duty: <strong>{assignedStart > 0 && assignedEnd >= assignedStart ? `T-${String(assignedStart).padStart(2, '0')} to T-${String(assignedEnd).padStart(2, '0')}` : 'Full Floor Access'}</strong></span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
 'bg-emerald-100 text-emerald-800 border-emerald-300'
 }`}>
                ● {myAssignedTables.length} Tables Active Under Your Care
              </span>
            </div>
            <p className={`text-[11px] ${'text-slate-600'} mt-0.5`}>
              Staff: <strong className={'text-slate-900'}>{waiterSession?.name || 'Mahesh Saini (Captain)'}</strong> • Section: {waiterSession?.assignedSection || 'All Dining Floor'} • Shift: {waiterSession?.shift || 'Current Shift'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl border font-bold text-xs ${
 'bg-orange-100 border-orange-300 text-orange-800'
 }`}>
            {assignedStart > 0 && assignedEnd >= assignedStart ? `Assigned Tables (${myAssignedTables.length})` : `All Floor Tables (${myAssignedTables.length})`}
          </span>
          {onOpenOtherTablesPage && (
            <button
              onClick={onOpenOtherTablesPage}
              className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 transition cursor-pointer ${
 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
 }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-700" />
              <span>Other Tables Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row: Statuses & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {statuses.map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-[#2E6B4C] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.dot && <span className={`w-2 h-2 rounded-full ${st.dot}`} />}
              <span>{st.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === st.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700 font-bold border border-slate-200'
              }`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            placeholder="Search table #..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none ${
 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
 }`}
          />
        </div>
      </div>


      {/* Visual Tables Grid: Mobile 2-cols, Tablet 3-cols, Desktop 4-cols */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-32 lg:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((t) => {
            const isAvailable = t.status === 'Available';
            const isOccupied = t.status === 'Occupied';
            const isMyTable = t.status === 'My Table';
            const isCleaning = t.status === 'Cleaning';
            const isReserved = t.status === 'Reserved';

            return (
              <div
                key={t.id}
                data-testid={`card-table-${t.name}`}
                data-table-code={t.name.startsWith('T-') ? t.name : `T-${t.name.toString().padStart(2, '0')}`}
                onClick={() => onTakeOrder(`Table ${t.name}`)}
                className={`p-4 rounded-xl border transition-all hover:border-slate-400 dark:hover:border-slate-600 flex flex-col justify-between gap-3 cursor-pointer shadow-sm relative ${
 'bg-white border-slate-200'
 }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${'text-slate-900'}`}>
                        Table {t.name.startsWith('T-') ? t.name : `T-${t.name.toString().padStart(2, '0')}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
 isAvailable
 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
 : isOccupied || isMyTable
 ? 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
 : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-slate-900 dark:text-amber-300 dark:border-amber-800'
 }`}>
                        {isAvailable ? 'AVAILABLE' : isOccupied || isMyTable ? 'OCCUPIED' : t.status}
                      </span>
                    </div>
                    <div className={`text-[11px] ${'text-slate-600'} mt-0.5 flex items-center gap-1.5 font-medium`}>
                      <span className="flex items-center gap-1">
                        <Users className={`w-3.5 h-3.5 ${'text-slate-500'}`} />
                        <span>{isAvailable ? `0 Seated • Capacity: ${t.guests || 4} Chairs` : `${t.actualGuests || t.guests || 2} Pax Seated (Capacity: ${t.guests || 4})`}</span>
                      </span>
                      <span>•</span>
                      <span>{waiterSession?.assignedSection || 'Dining Hall'}</span>
                    </div>
                  </div>

                  {isMyTable && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#123C2B] animate-pulse" title="Assigned to you" />
                  )}
                </div>

                {/* Available Table Details Box */}
                {isAvailable && (
                  <div className={`p-2.5 rounded-xl border border-dashed border-emerald-300 flex items-center justify-between text-xs ${
                    'bg-emerald-50/60 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-emerald-800">Vacant & Ready</span>
                    </div>
                    <span className="font-semibold text-emerald-700 text-[11px]">
                      {t.guests || 4} Chairs Free
                    </span>
                  </div>
                )}

                {/* Body Details for Occupied or My Table */}
                {(isOccupied || isMyTable) && (
                  <div className={`p-2.5 rounded-xl border space-y-1.5 text-xs ${
 'bg-white border-slate-200 shadow-2xs'
 }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={'text-slate-600'}>Active Order:</span>
                      <span className="font-bold text-[#2E6B4C] font-mono">T-{t.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={'text-slate-600'}>Duration:</span>
                      <span className={`font-semibold flex items-center gap-1 ${'text-slate-800'}`}>
                        <Clock className={`w-3 h-3 ${'text-slate-500'}`} /> 24 mins
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={'text-slate-600'}>Food Status:</span>
                      <span className={`font-black flex items-center gap-1 ${
 t.servedStatus === 'SERVED' ? 'text-emerald-400' : 'text-amber-400'
 }`}>
                        {t.servedStatus === 'SERVED' ? 'Dishes on Table' : 'In Service'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={'text-slate-600'}>Seated Guests (Pax):</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black flex items-center gap-1 ${'text-slate-900'}`}>
                          <Users className="w-3 h-3 text-orange-500" />
                          <span>{t.actualGuests || t.guests || 2} Seated</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenPaxModal && onOpenPaxModal(t)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
 }`}
                          title="Verify or adjust seated guests count"
                        >
                          Edit Pax
                        </button>
                      </div>
                    </div>

                    {/* Customer Claimed Pax Discrepancy Highlight */}
                    {t.customerClaimedGuests && t.customerClaimedGuests !== (t.actualGuests || t.guests) && (
                      <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-amber-400">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span>Customer Entered: <strong>{t.customerClaimedGuests} Pax</strong></span>
                          </span>
                          <span className="bg-amber-500/30 text-amber-300 px-1 py-0.2 rounded font-mono font-bold text-[9px]">Mismatch</span>
                        </div>
                        <div className="text-slate-400 flex items-center justify-between text-[9px]">
                          <span>Physical count: {t.actualGuests || t.guests || 2} Pax</span>
                          <button
                            type="button"
                            onClick={() => onOpenPaxModal && onOpenPaxModal(t)}
                            className="text-amber-300 font-bold underline hover:text-white"
                          >
                            Correct Pax →
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center justify-between text-[11px] border-t pt-1.5 ${
 'border-slate-200'
 }`}>
                      <span className={'text-slate-600'}>Running Bill:</span>
                      <span className={`font-black text-sm ${'text-emerald-700'}`}>
                        ₹{(tableBills[`Table ${t.name}`]?.grandTotal || 0).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal opacity-80">
                          ({tableBills[`Table ${t.name}`]?.items.length || 0} items)
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className={`pt-2 border-t space-y-2 ${'border-slate-200'}`}>
                  {isAvailable && (
                    <button
                      data-testid={`btn-take-kot-${t.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeOrder(`Table ${t.name}`);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Take Order (KOT)</span>
                    </button>
                  )}

                  {(isOccupied || isMyTable) && (
                    <div className="space-y-2">
                      {/* 1-Tap Table Served Primary Action */}
                      <button
                        data-testid={`btn-serve-table-${t.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMarkTableServed) {
                            onMarkTableServed(t.id, t.name);
                          } else {
                            triggerToast(`Table ${t.name}: All dishes marked as served!`);
                          }
                        }}
                        className={`w-full py-2 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
 t.servedStatus === 'SERVED'
 ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
 : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
 }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.servedStatus === 'SERVED' ? 'Dishes Served to Guests' : 'Mark Table Served'}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          data-testid={`btn-take-kot-${t.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTakeOrder(`Table ${t.name}`);
                          }}
                          className="py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-bold text-xs transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add KOT</span>
                        </button>
                        <button
                          data-testid={`btn-bill-table-${t.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBillTable(`Table ${t.name}`);
                          }}
                          className="py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Billing</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPaxModal && onOpenPaxModal(t);
                          }}
                          className={`py-1.5 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1 ${
 t.customerClaimedGuests && t.customerClaimedGuests !== (t.actualGuests || t.guests)
 ? 'bg-emerald-600/20 border-emerald-600/60 text-amber-300 hover:bg-emerald-600/30 animate-pulse'
 : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
                          title="Verify / Adjust Customer Count (Pax)"
                        >
                          <Users className="w-3.5 h-3.5 text-orange-400" />
                          <span>Edit Pax ({t.actualGuests || t.guests || 2})</span>
                        </button>
                        <button
                          onClick={() => onTransferTable(`Table ${t.name}`)}
                          className={`py-1.5 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1 ${
 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
 }`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transfer</span>
                        </button>
                        <button
                          onClick={() => {
                            onUpdateTableStatus(t.id, 'Cleaning');
                            triggerToast(`Table ${t.name} marked for Cleaning.`);
                          }}
                          className={`col-span-2 py-1.5 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1 ${
 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
 }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Clean Table</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isCleaning && (
                    <button
                      onClick={() => {
                        onUpdateTableStatus(t.id, 'Available');
                        triggerToast(`Table ${t.name} is cleaned and now Available!`);
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Table Available</span>
                    </button>
                  )}

                  {isReserved && (
                    <button
                      onClick={() => {
                        onUpdateTableStatus(t.id, 'Occupied');
                        triggerToast(`Reserved guests seated at Table ${t.name}.`);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Users className="w-4 h-4" />
                      <span>Seat Reserved Guests</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
