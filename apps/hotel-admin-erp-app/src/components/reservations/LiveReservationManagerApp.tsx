import React, { useEffect, useState, useMemo } from 'react';
import { ApiClient } from '@spicehub/api-client';
import { getApiClient } from '../../lib/apiClient';
import {
  ReservationStore,
  RoomArrivalBookingDTO,
  CreateDiningReservationPayload,
} from '@spicehub/ui';
import { ReservationHeader } from './ReservationHeader';
import { DiningReservationCard } from './DiningReservationCard';
import { RoomArrivalCard } from './RoomArrivalCard';
import { AssignPhysicalRoomModal } from './AssignPhysicalRoomModal';
import { NewDiningReservationModal } from './NewDiningReservationModal';
import { UtensilsCrossed, Bell, Plus } from 'lucide-react';

interface LiveReservationManagerAppProps {
  apiClient?: ApiClient;
  hotelId?: string;
}

export const LiveReservationManagerApp: React.FC<LiveReservationManagerAppProps> = ({
  apiClient = getApiClient(),
  hotelId,
}) => {
  const store = useMemo(() => new ReservationStore(), []);
  const [, setTick] = useState(0);

  // Subscribe to reactive store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, [store]);

  // Load Data based on active tab and selected date
  const loadDiningData = async () => {
    try {
      store.setLoading(true);
      store.setError(null);
      const res = await apiClient.reservations.list({ date: store.getSelectedDate() });
      if (res.success && res.reservations) {
        store.setTableData(res.reservations, res.summary);
      }
    } catch (err: any) {
      console.error('Failed to load table reservations:', err);
      store.setError(err.message || 'Error loading dining reservations');
    } finally {
      store.setLoading(false);
    }
  };

  const loadRoomsData = async () => {
    try {
      store.setLoading(true);
      store.setError(null);
      const res = await apiClient.pms.getArrivalsBoard({ date: store.getSelectedDate() });
      if (res.success && res.bookings) {
        store.setArrivalsData(res.bookings, res.summary, res.availableCleanRooms || []);
      }
    } catch (err: any) {
      console.error('Failed to load arrivals board:', err);
      store.setError(err.message || 'Error loading room arrivals');
    } finally {
      store.setLoading(false);
    }
  };

  const refreshAll = () => {
    if (store.getTabMode() === 'DINING') {
      loadDiningData();
    } else {
      loadRoomsData();
    }
  };

  useEffect(() => {
    refreshAll();
  }, [store.getTabMode(), store.getSelectedDate()]);

  // Dining Seating & Cancellation Handlers
  const handleSeatDining = async (reservationId: string) => {
    try {
      store.setLoading(true);
      await apiClient.reservations.seat(reservationId);
      await loadDiningData();
    } catch (err: any) {
      alert(`Could not seat guests: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCancelDining = async (reservationId: string, isNoShow: boolean) => {
    try {
      store.setLoading(true);
      await apiClient.reservations.cancel(reservationId, isNoShow);
      await loadDiningData();
    } catch (err: any) {
      alert(`Could not cancel reservation: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleCreateDining = async (payload: CreateDiningReservationPayload) => {
    try {
      store.setLoading(true);
      await apiClient.reservations.create(payload);
      store.closeNewDiningModal();
      await loadDiningData();
    } catch (err: any) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  // Front Desk Room Assignment & Express Check-In Handlers
  const handleAssignPhysicalRoom = async (bookingId: string, roomId: string) => {
    try {
      store.setLoading(true);
      await apiClient.pms.assignRoom(bookingId, roomId);
      store.closeAssignRoomModal();
      await loadRoomsData();
    } catch (err: any) {
      alert(`Room assignment failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const handleExpressCheckIn = async (booking: RoomArrivalBookingDTO) => {
    if (!booking.allocatedRoomId) {
      store.openAssignRoomModal(booking);
      return;
    }
    try {
      store.setLoading(true);
      const allocatedId = typeof booking.allocatedRoomId === 'string'
        ? booking.allocatedRoomId
        : booking.allocatedRoomId._id;
      await (apiClient.pms as any).checkIn(booking._id, allocatedId);
      await loadRoomsData();
    } catch (err: any) {
      alert(`Express Check-in failed: ${err.message}`);
    } finally {
      store.setLoading(false);
    }
  };

  const activeTab = store.getTabMode();
  const diningList = store.getFilteredDiningReservations();
  const roomList = store.getFilteredRoomArrivals();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Luxury Dual Header */}
      <ReservationHeader
        activeTab={activeTab}
        onTabChange={(tab) => store.setTabMode(tab)}
        selectedDate={store.getSelectedDate()}
        onDateChange={(date) => store.setSelectedDate(date)}
        searchQuery={store.getSearchQuery()}
        onSearchChange={(q) => store.setSearchQuery(q)}
        diningSummary={store.getTableSummary()}
        roomsSummary={store.getArrivalsSummary()}
        onOpenNewDiningModal={() => store.openNewDiningModal()}
        onRefresh={refreshAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {store.getError() && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-2xs">
            <span>{store.getError()}</span>
            <button
              onClick={refreshAll}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab 1: Dining Table Seating */}
        {activeTab === 'DINING' && (
          <>
            {store.getLoading() && diningList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                <p className="text-xs font-medium">Syncing live table reservations...</p>
              </div>
            ) : diningList.length === 0 ? (
              <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Dining Reservations Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No table bookings scheduled for {store.getSelectedDate()}.
                </p>
                <button
                  onClick={() => store.openNewDiningModal()}
                  className="btn-glass-green mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Booking</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {diningList.map((res) => (
                  <DiningReservationCard
                    key={res._id}
                    reservation={res}
                    onSeat={handleSeatDining}
                    onCancel={handleCancelDining}
                    isLoading={store.getLoading()}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab 2: Front Desk Room Arrivals & Assignments */}
        {activeTab === 'ROOMS' && (
          <>
            {store.getLoading() && roomList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                <p className="text-xs font-medium">Loading room arrivals board...</p>
              </div>
            ) : roomList.length === 0 ? (
              <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Room Bookings Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No guest arrivals or departures recorded for this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomList.map((booking) => (
                  <RoomArrivalCard
                    key={booking._id}
                    booking={booking}
                    onOpenAssignModal={(b) => store.openAssignRoomModal(b)}
                    onCheckIn={handleExpressCheckIn}
                    isLoading={store.getLoading()}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: New Table Booking */}
      <NewDiningReservationModal
        isOpen={store.isNewDiningModalActive()}
        onClose={() => store.closeNewDiningModal()}
        onSubmit={handleCreateDining}
        isLoading={store.getLoading()}
      />

      {/* Modal: Assign Clean Room for Arrival */}
      <AssignPhysicalRoomModal
        booking={store.getSelectedBookingForAssign()}
        isOpen={store.isAssignRoomModalActive()}
        cleanRooms={store.getAvailableCleanRooms()}
        onAssign={handleAssignPhysicalRoom}
        onClose={() => store.closeAssignRoomModal()}
        isLoading={store.getLoading()}
      />
    </div>
  );
};
