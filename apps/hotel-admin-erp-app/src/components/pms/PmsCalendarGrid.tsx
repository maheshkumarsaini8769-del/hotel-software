import React from 'react';
import {
  MatrixDateHeader,
  MatrixRoomCategory,
  MatrixReservationBlock,
  MatrixPhysicalRoom,
} from '../../../../../packages/ui/src/pms/types';
import { MatrixHelper } from '../../../../../packages/ui/src/pms/MatrixHelper';

export interface PmsCalendarGridProps {
  dates: MatrixDateHeader[];
  roomTypes: MatrixRoomCategory[];
  bookings: MatrixReservationBlock[];
  onSelectBooking: (booking: MatrixReservationBlock) => void;
  onQuickReserveCell: (
    roomTypeId: string,
    roomId: string,
    roomNumber: string,
    categoryName: string,
    date: string
  ) => void;
}

export const PmsCalendarGrid: React.FC<PmsCalendarGridProps> = ({
  dates,
  roomTypes,
  bookings,
  onSelectBooking,
  onQuickReserveCell,
}) => {
  const getRoomStatusDot = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return 'bg-amber-400';
      case 'DIRTY':
      case 'CLEANING':
        return 'bg-orange-400';
      case 'OUT_OF_SERVICE':
        return 'bg-rose-500';
      case 'AVAILABLE':
      default:
        return 'bg-emerald-400';
    }
  };

  // Pre-calculate layouts for bookings
  const preparedBookings = bookings.map((b) => {
    const layout = MatrixHelper.calculateBlockLayout(b.checkInDate, b.checkOutDate, dates);
    return {
      ...b,
      ...layout,
    };
  });

  const getBookingsForRoom = (roomId: string) => {
    return preparedBookings.filter((b) => b.allocatedRoomId === roomId && b.isVisible);
  };

  // Column width constants
  const CELL_WIDTH_PX = 60; // 60px per day column

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden select-none">
      <div className="flex-1 overflow-auto relative">
        <table className="border-collapse table-fixed w-full min-w-max">
          {/* Header Row */}
          <thead>
            <tr className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
              {/* Sticky Top-Left Room Header */}
              <th className="sticky left-0 z-40 bg-slate-900 border-r border-slate-800 w-48 min-w-[192px] px-4 py-3 text-left">
                <span className="text-xs font-black tracking-wider text-amber-300 uppercase">
                  Physical Rooms
                </span>
              </th>

              {/* Date Header Columns */}
              {dates.map((d) => (
                <th
                  key={d.date}
                  style={{ width: `${CELL_WIDTH_PX}px` }}
                  className={`text-center py-2 px-1 border-r border-slate-800/60 font-mono transition ${
                    d.isWeekend ? 'bg-amber-950/20 text-amber-200' : 'text-slate-300'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400">{d.dayName}</div>
                  <div className="text-sm font-extrabold text-white">{d.dayNumber}</div>
                  <div className="text-[9px] text-slate-400">{d.monthName}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body Grouped by Category */}
          <tbody>
            {roomTypes.map((category) => (
              <React.Fragment key={category.id}>
                {/* Category Header Row */}
                <tr className="bg-slate-900/70 border-b border-slate-800">
                  <td
                    colSpan={dates.length + 1}
                    className="px-4 py-2 text-xs font-bold text-amber-400 tracking-wide uppercase bg-gradient-to-r from-slate-900 to-slate-950"
                  >
                    <span>🏷️ {category.name}</span>
                    <span className="text-[10px] text-slate-400 ml-2 font-normal">
                      ({category.rooms.length} Rooms Available)
                    </span>
                  </td>
                </tr>

                {/* Individual Physical Room Rows */}
                {category.rooms.map((room) => {
                  const roomBookings = getBookingsForRoom(room.id);

                  return (
                    <tr
                      key={room.id}
                      className="border-b border-slate-850/80 hover:bg-slate-900/40 transition group"
                    >
                      {/* Sticky Left Room Name & Status */}
                      <td className="sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900/90 border-r border-slate-800/80 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${getRoomStatusDot(room.status)} shadow-sm`}
                              title={`Status: ${room.status}`}
                            />
                            <span className="font-mono font-bold text-sm text-slate-100">
                              {room.roomNumber}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            F{room.floorNumber}
                          </span>
                        </div>
                      </td>

                      {/* Interactive Date Timeline Grid Cell */}
                      <td colSpan={dates.length} className="p-0 relative h-12">
                        {/* Background Empty Date Cells with + Book Button on Hover */}
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}>
                          {dates.map((d) => (
                            <div
                              key={d.date}
                              onClick={() =>
                                onQuickReserveCell(
                                  category.id,
                                  room.id,
                                  room.roomNumber,
                                  category.name,
                                  d.date
                                )
                              }
                              className={`border-r border-slate-850/40 h-full flex items-center justify-center transition cursor-pointer hover:bg-amber-500/10 group/cell ${
                                d.isWeekend ? 'bg-amber-950/5' : ''
                              }`}
                              title={`Click to reserve ${room.roomNumber} starting ${d.date}`}
                            >
                              <span className="opacity-0 group-hover/cell:opacity-100 text-[10px] font-bold text-amber-400 bg-slate-900/90 px-1 py-0.5 rounded border border-amber-500/30 transition">
                                +
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Foreground Reservation Blocks */}
                        <div className="absolute inset-0 pointer-events-none p-1 flex items-center">
                          {roomBookings.map((b) => {
                            const statusStyle = MatrixHelper.getReservationStatusStyle(b.bookingStatus);
                            const leftOffsetPercent = (b.startColIndex / dates.length) * 100;
                            const widthPercent = (b.spanCols / dates.length) * 100;
                            const nights = MatrixHelper.calculateNights(b.checkInDate, b.checkOutDate);

                            return (
                              <div
                                key={b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectBooking(b);
                                }}
                                style={{
                                  left: `${leftOffsetPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className={`absolute h-9 rounded-lg border-2 px-2.5 flex items-center justify-between text-xs font-semibold cursor-pointer pointer-events-auto transition select-none active:scale-[0.99] ${statusStyle.bg} ${statusStyle.border} ${statusStyle.glow}`}
                                title={`${b.guestName} (${b.bookingNumber}) - ${b.bookingStatus} (${nights} nights)`}
                              >
                                <div className="truncate flex items-center space-x-1.5 mr-1">
                                  <span className="truncate text-white font-bold">{b.guestName}</span>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${statusStyle.badge}`}>
                                    {nights}N
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
