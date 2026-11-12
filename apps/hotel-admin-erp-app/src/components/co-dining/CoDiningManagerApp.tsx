import React, { useState, useEffect } from 'react';
import { CoDiningStore } from '@spicehub/ui';
import { CommunityTableDTO } from '@spicehub/ui';
import { SeatMapGrid } from './SeatMapGrid';
import { Users, UtensilsCrossed, X } from 'lucide-react';

export interface CoDiningManagerAppProps {
  store: CoDiningStore;
  onAllocateSeatsSubmit?: (tableId: string, seatNumbers: number[], guestName?: string) => Promise<void> | void;
  onReleaseSeatSubmit?: (tableId: string, seatNumber: number, sessionId?: string) => Promise<void> | void;
  onEnableSharingSubmit?: (tableId: string) => Promise<void> | void;
}

export const CoDiningManagerApp: React.FC<CoDiningManagerAppProps> = ({
  store,
  onAllocateSeatsSubmit,
  onReleaseSeatSubmit,
  onEnableSharingSubmit,
}) => {
  const [tables, setTables] = useState<CommunityTableDTO[]>(store.getFilteredTables());
  const [selectedTable, setSelectedTable] = useState<CommunityTableDTO | null>(store.getSelectedTable());
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>(store.getSelectedSeatNumbers());
  const [filterSection, setFilterSection] = useState(store.getFilterSection());
  const [filterMinSeats, setFilterMinSeats] = useState(store.getFilterMinSeats());
  const [guestName, setGuestName] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTables(store.getFilteredTables());
      setSelectedTable(store.getSelectedTable());
      setSelectedSeatNumbers(store.getSelectedSeatNumbers());
      setFilterSection(store.getFilterSection());
      setFilterMinSeats(store.getFilterMinSeats());
    });
    return () => unsubscribe();
  }, [store]);

  const handleToggleSeat = (seatNumber: number) => {
    store.toggleSeatSelection(seatNumber);
  };

  const handleOpenBookingModal = () => {
    setGuestName('');
    setIsBookingModalOpen(true);
  };

  const handleConfirmAllocation = async () => {
    if (selectedTable && selectedSeatNumbers.length > 0 && onAllocateSeatsSubmit) {
      await onAllocateSeatsSubmit(selectedTable.tableId, selectedSeatNumbers, guestName.trim() || undefined);
      setIsBookingModalOpen(false);
      store.clearSeatSelection();
    }
  };

  const handleRelease = async (seatNumber: number, sessionId?: string) => {
    if (selectedTable && onReleaseSeatSubmit) {
      await onReleaseSeatSubmit(selectedTable.tableId, seatNumber, sessionId);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Community Tables & Co-Dining Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maximize table utilization by seating solo and paired diners at shared community tables.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2.5">
          <select
            value={filterMinSeats}
            onChange={(e) => store.setFilterMinSeats(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs outline-none focus:border-emerald-500 transition"
          >
            <option value={1}>Open for 1+ (Solo)</option>
            <option value={2}>Open for 2+ (Pair)</option>
            <option value={3}>Open for 3+ (Group)</option>
          </select>
        </div>
      </div>

      <div className={`grid gap-5 ${selectedTable ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Tables List */}
        <div className={`space-y-3 ${selectedTable ? 'lg:col-span-5' : 'w-full'}`}>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Floor Community Tables ({tables.length})
          </h2>

          <div className="space-y-3">
            {tables.map((table) => {
              const isSelected = selectedTable?.tableId === table.tableId;
              return (
                <div
                  key={table.tableId}
                  onClick={() => store.selectTable(table)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Table {table.tableNumber}
                        </div>
                        <div className="text-xs text-slate-500">
                          {table.section} • Capacity {table.capacity}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        table.availableSeatsCount > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {table.availableSeatsCount} Open Seats
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        table.availableSeatsCount > 0 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.round((table.occupiedSeatsCount / table.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Table Seat Map View */}
        {selectedTable && (
          <div className="lg:col-span-7">
            <SeatMapGrid
              table={selectedTable}
              selectedSeatNumbers={selectedSeatNumbers}
              onToggleSeat={handleToggleSeat}
              onAllocateSeats={handleOpenBookingModal}
              onReleaseSeat={handleRelease}
            />
          </div>
        )}
      </div>

      {/* Guest Name Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Seat Allocation
              </h3>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Seating on Table {selectedTable?.tableNumber}, Seats {selectedSeatNumbers.join(', ')}.
            </p>

            <input
              type="text"
              placeholder="Guest / Party Name (e.g. Rahul)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                className="btn-glass-green flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Seat Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
