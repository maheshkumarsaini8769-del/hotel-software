import React from 'react';
import { CommunityTableDTO } from '../../../../../packages/ui/src/co-dining/types';
import { CoDiningHelper } from '../../../../../packages/ui/src/co-dining/CoDiningHelper';

export interface SeatMapGridProps {
  table: CommunityTableDTO;
  selectedSeatNumbers: number[];
  onToggleSeat: (seatNumber: number) => void;
  onAllocateSeats?: () => void;
  onReleaseSeat?: (seatNumber: number, sessionId?: string) => void;
}

export const SeatMapGrid: React.FC<SeatMapGridProps> = ({
  table,
  selectedSeatNumbers,
  onToggleSeat,
  onAllocateSeats,
  onReleaseSeat,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            🍽️ Table {table.tableNumber} ({table.section})
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            {CoDiningHelper.formatSeatingSummary(table)}
          </p>
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
          {table.availableSeatsCount > 0 ? `${table.availableSeatsCount} Open Seats` : 'Full Table'}
        </span>
      </div>

      {/* Visual Table & Chairs Blueprint */}
      <div
        style={{
          position: 'relative',
          padding: '24px',
          backgroundColor: '#F9FAFB',
          borderRadius: '14px',
          border: '1px dashed #D1D5DB',
          marginBottom: '16px',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
          Tap an Open Seat to Select for Solo/Pair Booking
        </div>

        {/* Seat Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(4, table.capacity)}, 1fr)`,
            gap: '12px',
          }}
        >
          {table.seats.map((seat) => {
            const isSelected = selectedSeatNumbers.includes(seat.seatNumber);
            const style = CoDiningHelper.getSeatStatusStyle(seat.status, isSelected);

            return (
              <div
                key={seat.seatNumber}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggleSeat(seat.seatNumber)}
                  disabled={seat.status !== 'AVAILABLE'}
                  style={{
                    width: '100%',
                    minHeight: '64px',
                    padding: '8px',
                    borderRadius: '10px',
                    border: `2px solid ${style.border}`,
                    backgroundColor: style.bg,
                    color: style.textColor,
                    cursor: seat.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: isSelected ? '0 0 0 3px rgba(79, 70, 229, 0.2)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🪑</span>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    {seat.seatLabel || `Seat ${seat.seatNumber}`}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>
                    {style.label}
                  </span>
                </button>

                {seat.status === 'OCCUPIED' && seat.guestName && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#4B5563',
                      marginTop: '4px',
                      textAlign: 'center',
                      maxWidth: '100px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    👤 {seat.guestName}
                  </div>
                )}

                {seat.status === 'OCCUPIED' && onReleaseSeat && (
                  <button
                    type="button"
                    onClick={() => onReleaseSeat(seat.seatNumber, seat.currentSessionId)}
                    style={{
                      marginTop: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FFFFFF',
                      color: '#DC2626',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Release
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedSeatNumbers.length > 0 && onAllocateSeats && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#EEF2FF',
            border: '1px solid #C7D2FE',
          }}
        >
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#3730A3' }}>
              {selectedSeatNumbers.length} Seat{selectedSeatNumbers.length > 1 ? 's' : ''} Selected
            </span>
            <div style={{ fontSize: '12px', color: '#4F46E5' }}>
              Seats: {selectedSeatNumbers.join(', ')}
            </div>
          </div>

          <button
            type="button"
            onClick={onAllocateSeats}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Confirm Co-Dining Seating
          </button>
        </div>
      )}
    </div>
  );
};
