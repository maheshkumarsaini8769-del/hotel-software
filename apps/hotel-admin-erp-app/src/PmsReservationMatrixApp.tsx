import React, { useState, useEffect, useCallback } from 'react';
import { PmsMatrixHeader } from './components/pms/PmsMatrixHeader';
import { PmsCategoryFilter } from './components/pms/PmsCategoryFilter';
import { PmsCalendarGrid } from './components/pms/PmsCalendarGrid';
import { PmsQuickBookingDrawer } from './components/pms/PmsQuickBookingDrawer';
import { PmsReservationDetailModal } from './components/pms/PmsReservationDetailModal';
import { MatrixStore } from '../../../packages/ui/src/pms/MatrixStore';
import {
  MatrixCalendarData,
  MatrixReservationBlock,
  QuickReserveTarget,
} from '../../../packages/ui/src/pms/types';

export interface PmsReservationMatrixAppProps {
  store: MatrixStore;
  onFetchMatrixData?: (startDate: string, days: number, roomTypeId?: string) => Promise<void> | void;
  onConfirmBooking?: (data: {
    roomTypeId: string;
    roomId?: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    advancePaymentAmount: number;
    specialRequests?: string;
  }) => Promise<void> | void;
  onCheckInGuest?: (bookingId: string, physicalRoomId: string) => Promise<void> | void;
  onReassignRoom?: (bookingId: string, targetRoomId: string) => Promise<void> | void;
  onCancelReservation?: (bookingId: string) => Promise<void> | void;
}

export const PmsReservationMatrixApp: React.FC<PmsReservationMatrixAppProps> = ({
  store,
  onFetchMatrixData,
  onConfirmBooking,
  onCheckInGuest,
  onReassignRoom,
  onCancelReservation,
}) => {
  const [calendarData, setCalendarData] = useState<MatrixCalendarData | null>(store.getData());
  const [startDate, setStartDate] = useState<string>(store.getStartDate());
  const [days, setDays] = useState<number>(store.getDays());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>(store.getSelectedRoomTypeId());
  const [quickReserveTarget, setQuickReserveTarget] = useState<QuickReserveTarget | null>(
    store.getQuickReserveTarget()
  );
  const [selectedBooking, setSelectedBooking] = useState<MatrixReservationBlock | null>(
    store.getSelectedBooking()
  );
  const [isLoading, setIsLoading] = useState<boolean>(store.getIsLoading());

  const syncState = useCallback(() => {
    setCalendarData(store.getData());
    setStartDate(store.getStartDate());
    setDays(store.getDays());
    setSelectedCategoryId(store.getSelectedRoomTypeId());
    setQuickReserveTarget(store.getQuickReserveTarget());
    setSelectedBooking(store.getSelectedBooking());
    setIsLoading(store.getIsLoading());
  }, [store]);

  useEffect(() => {
    const unsubscribe = store.subscribe(syncState);
    return () => unsubscribe();
  }, [store, syncState]);

  // Handle Date Navigation
  const handleNavigate = async (deltaDays: number) => {
    store.navigateDays(deltaDays);
    const newStart = store.getStartDate();
    if (onFetchMatrixData) {
      await onFetchMatrixData(newStart, store.getDays(), store.getSelectedRoomTypeId());
    }
  };

  const handleJumpToToday = async () => {
    store.jumpToToday();
    const today = store.getStartDate();
    if (onFetchMatrixData) {
      await onFetchMatrixData(today, store.getDays(), store.getSelectedRoomTypeId());
    }
  };

  const handleDaysChange = async (newDays: number) => {
    store.setDays(newDays);
    if (onFetchMatrixData) {
      await onFetchMatrixData(store.getStartDate(), newDays, store.getSelectedRoomTypeId());
    }
  };

  const handleSelectCategory = (catId: string | 'ALL') => {
    store.selectCategory(catId);
  };

  const handleOpenNewReservation = () => {
    const firstCat = calendarData?.roomTypes[0];
    if (!firstCat) return;

    store.openQuickReserve({
      roomTypeId: firstCat.id,
      categoryName: firstCat.name,
      checkInDate: startDate,
      checkOutDate: new Date(new Date(startDate).getTime() + 86400000).toISOString().slice(0, 10),
    });
  };

  const handleQuickReserveCell = (
    roomTypeId: string,
    roomId: string,
    roomNumber: string,
    categoryName: string,
    date: string
  ) => {
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    store.openQuickReserve({
      roomTypeId,
      roomId,
      roomNumber,
      categoryName,
      checkInDate: date,
      checkOutDate: nextDay.toISOString().slice(0, 10),
    });
  };

  const filteredRoomTypes = store.getFilteredRoomTypes();
  const allRoomTypes = calendarData?.roomTypes || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none overflow-x-hidden text-white">
      {/* Top Luxury PMS Matrix Header */}
      <PmsMatrixHeader
        startDate={startDate}
        days={days}
        kpis={calendarData?.kpis}
        onNavigate={handleNavigate}
        onJumpToToday={handleJumpToToday}
        onDaysChange={handleDaysChange}
        onNewReservation={handleOpenNewReservation}
        onRefresh={() =>
          onFetchMatrixData && onFetchMatrixData(startDate, days, selectedCategoryId)
        }
      />

      {/* Category Filter Bar */}
      <PmsCategoryFilter
        roomTypes={allRoomTypes}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main Calendar Matrix Grid */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center">
            <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl shadow-xl">
              <span className="text-xl animate-spin">⏳</span>
              <span className="text-xs font-bold text-amber-300">Synchronizing Live Matrix...</span>
            </div>
          </div>
        )}

        {calendarData && calendarData.dates.length > 0 ? (
          <PmsCalendarGrid
            dates={calendarData.dates}
            roomTypes={filteredRoomTypes}
            bookings={calendarData.bookings}
            onSelectBooking={(b) => store.openBookingPeek(b)}
            onQuickReserveCell={handleQuickReserveCell}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-32">
            <span className="text-5xl mb-3">🏨</span>
            <p className="text-sm font-semibold text-slate-300">No rooms configured or matrix not initialized.</p>
          </div>
        )}
      </main>

      {/* Quick Reservation Slide-Over Drawer */}
      <PmsQuickBookingDrawer
        target={quickReserveTarget}
        roomTypes={allRoomTypes}
        isOpen={Boolean(quickReserveTarget)}
        onClose={() => store.closeQuickReserve()}
        onConfirmBooking={async (bookingData) => {
          if (onConfirmBooking) {
            await onConfirmBooking(bookingData);
          }
          if (onFetchMatrixData) {
            await onFetchMatrixData(startDate, days, selectedCategoryId);
          }
        }}
      />

      {/* Reservation Detail Inspection Modal */}
      <PmsReservationDetailModal
        booking={selectedBooking}
        roomTypes={allRoomTypes}
        isOpen={Boolean(selectedBooking)}
        onClose={() => store.closeBookingPeek()}
        onCheckIn={async (bookingId, physicalRoomId) => {
          if (onCheckInGuest) {
            await onCheckInGuest(bookingId, physicalRoomId);
          }
          if (onFetchMatrixData) {
            await onFetchMatrixData(startDate, days, selectedCategoryId);
          }
        }}
        onReassignRoom={async (bookingId, targetRoomId) => {
          if (onReassignRoom) {
            await onReassignRoom(bookingId, targetRoomId);
          }
          if (onFetchMatrixData) {
            await onFetchMatrixData(startDate, days, selectedCategoryId);
          }
        }}
        onCancelReservation={async (bookingId) => {
          if (onCancelReservation) {
            await onCancelReservation(bookingId);
          }
          if (onFetchMatrixData) {
            await onFetchMatrixData(startDate, days, selectedCategoryId);
          }
        }}
      />
    </div>
  );
};
