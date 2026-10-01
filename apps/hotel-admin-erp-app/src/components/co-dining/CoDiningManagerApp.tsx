import React, { useState, useEffect } from 'react';
import { CoDiningStore } from '../../../../../packages/ui/src/co-dining/CoDiningStore';
import { CommunityTableDTO } from '../../../../../packages/ui/src/co-dining/types';
import { SeatMapGrid } from './SeatMapGrid';

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
    <div style={{ padding: '24px', backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111827' }}>
            🤝 Community Tables & Co-Dining Manager
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6B7280' }}>
            Maximize table utilization by seating solo and paired diners at shared community tables.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={filterMinSeats}
            onChange={(e) => store.setFilterMinSeats(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <option value={1}>Open for 1+ (Solo)</option>
            <option value={2}>Open for 2+ (Pair)</option>
            <option value={3}>Open for 3+ (Group)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTable ? '1fr 1.2fr' : '1fr', gap: '20px' }}>
        {/* Tables List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#374151' }}>
            Floor Community Tables ({tables.length})
          </h2>

          {tables.map((table) => {
            const isSelected = selectedTable?.tableId === table.tableId;
            return (
              <div
                key={table.tableId}
                onClick={() => store.selectTable(table)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
                  border: isSelected ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🍽️</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                        Table {table.tableNumber}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        {table.section} • Capacity {table.capacity}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: table.availableSeatsCount > 0 ? '#D1FAE5' : '#FEE2E2',
                      color: table.availableSeatsCount > 0 ? '#065F46' : '#991B1B',
                    }}
                  >
                    {table.availableSeatsCount} Open Seats
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '6px',
                    borderRadius: '999px',
                    backgroundColor: '#E5E7EB',
                    marginTop: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round((table.occupiedSeatsCount / table.capacity) * 100)}%`,
                      backgroundColor: table.availableSeatsCount > 0 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Table Seat Map View */}
        {selectedTable && (
          <div>
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              padding: '24px',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
              Confirm Seat Allocation
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6B7280' }}>
              Seating on Table {selectedTable?.tableNumber}, Seats {selectedSeatNumbers.join(', ')}.
            </p>

            <input
              type="text"
              placeholder="Guest / Party Name (e.g. Rahul)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
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
