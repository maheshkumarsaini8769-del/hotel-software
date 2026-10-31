import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import axios from 'axios';
import {
  DiningReservationStore,
  IDiningReservationUI,
  INewDiningReservationPayload,
  MealPeriodUI,
} from '@spicehub/ui';
import { DiningReservationHeader } from './DiningReservationHeader';
import { ReservationTimelineBoard } from './ReservationTimelineBoard';
import { VipDiningReservationModal } from './VipDiningReservationModal';
import { GuestDietaryCardModal } from './GuestDietaryCardModal';
import { SeatGuestModal } from './SeatGuestModal';

interface DiningReservationAppProps {
  apiBaseUrl?: string;
  authToken?: string;
  hotelId?: string;
}

export const DiningReservationApp: React.FC<DiningReservationAppProps> = ({
  apiBaseUrl = API_BASE_URL,
  authToken,
  hotelId,
}) => {
  const store = useMemo(() => new DiningReservationStore(), []);
  const [state, setState] = useState(store.getState());

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [selectedSeatRes, setSelectedSeatRes] = useState<IDiningReservationUI | null>(null);

  const [isDietaryModalOpen, setIsDietaryModalOpen] = useState(false);
  const [guestDietaryData, setGuestDietaryData] = useState<{ profile: any; pastReservations: any[] }>({
    profile: null,
    pastReservations: [],
  });
  const [dietaryLoading, setDietaryLoading] = useState(false);
  const [dietaryError, setDietaryError] = useState<string | null>(null);

  const [selectedMealPeriod, setSelectedMealPeriod] = useState<MealPeriodUI | 'ALL'>('ALL');

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [store]);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (hotelId) headers['x-hotel-id'] = hotelId;
    return headers;
  }, [authToken, hotelId]);

  const fetchReservations = async () => {
    store.setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/dining-reservations`, {
        headers: authHeaders,
        params: {
          mealPeriod: selectedMealPeriod === 'ALL' ? undefined : selectedMealPeriod,
        },
      });
      if (res.data.success) {
        store.setReservations(res.data.reservations || []);
        store.setMetrics(
          res.data.metrics || {
            totalReservationsCount: 0,
            confirmedCount: 0,
            seatedCount: 0,
            vipCount: 0,
            allergenAlertsCount: 0,
          }
        );
      }
    } catch (err: any) {
      console.error('Error fetching dining reservations:', err);
      store.setError(err.response?.data?.message || err.message);
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedMealPeriod]);

  const handleCreateReservation = async (payload: INewDiningReservationPayload) => {
    store.setLoading(true);
    try {
      const res = await axios.post(`${apiBaseUrl}/dining-reservations`, payload, {
        headers: authHeaders,
      });
      if (res.data.success) {
        fetchReservations();
      }
    } catch (err: any) {
      console.error('Error creating dining reservation:', err);
      alert(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      store.setLoading(false);
    }
  };

  const handleSeatParty = async (reservationId: string, tableId?: string) => {
    store.setLoading(true);
    try {
      const res = await axios.patch(
        `${apiBaseUrl}/dining-reservations/${reservationId}/seat`,
        { tableId },
        { headers: authHeaders }
      );
      if (res.data.success) {
        fetchReservations();
      }
    } catch (err: any) {
      console.error('Error seating reservation:', err);
      alert(err.response?.data?.message || 'Failed to seat party');
    } finally {
      store.setLoading(false);
    }
  };

  const handleStatusChange = async (reservationId: string, status: string, reason?: string) => {
    store.setLoading(true);
    try {
      const res = await axios.patch(
        `${apiBaseUrl}/dining-reservations/${reservationId}/status`,
        { status, cancellationReason: reason },
        { headers: authHeaders }
      );
      if (res.data.success) {
        fetchReservations();
      }
    } catch (err: any) {
      console.error('Error updating reservation status:', err);
      alert(err.response?.data?.message || 'Failed to update reservation');
    } finally {
      store.setLoading(false);
    }
  };

  const handleViewGuestDietary = async (phone: string) => {
    setIsDietaryModalOpen(true);
    setDietaryLoading(true);
    setDietaryError(null);
    setGuestDietaryData({ profile: null, pastReservations: [] });
    try {
      const res = await axios.get(`${apiBaseUrl}/dining-reservations/guest-profile`, {
        headers: authHeaders,
        params: { phone },
      });
      if (res.data?.success && res.data?.profile) {
        setGuestDietaryData({
          profile: res.data.profile,
          pastReservations: res.data.pastReservations || [],
        });
      } else {
        setDietaryError('Guest profile not yet registered.');
      }
    } catch (err: any) {
      console.error('Error loading guest profile:', err);
      setDietaryError(
        err.response?.status === 404
          ? 'Guest profile not yet registered.'
          : err.response?.data?.message || 'Unable to load guest dietary profile.'
      );
    } finally {
      setDietaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <DiningReservationHeader
        metrics={state.metrics}
        selectedMealPeriod={selectedMealPeriod}
        onMealPeriodChange={setSelectedMealPeriod}
        onNewReservationClick={() => setIsNewBookingOpen(true)}
        onRefreshClick={fetchReservations}
        loading={state.isLoading}
      />

      {/* Main Workspace */}
      <main className="flex-1 p-6 space-y-6">
        <ReservationTimelineBoard
          reservations={state.reservations}
          onOpenSeatModal={(res) => {
            setSelectedSeatRes(res);
            setIsSeatModalOpen(true);
          }}
          onOpenDietaryModal={handleViewGuestDietary}
          onStatusChange={handleStatusChange}
        />
      </main>

      {/* Modals */}
      <VipDiningReservationModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onSubmit={handleCreateReservation}
        loading={state.isLoading}
      />

      <SeatGuestModal
        isOpen={isSeatModalOpen}
        reservation={selectedSeatRes}
        onClose={() => {
          setIsSeatModalOpen(false);
          setSelectedSeatRes(null);
        }}
        onSeat={handleSeatParty}
        loading={state.isLoading}
      />

      <GuestDietaryCardModal
        isOpen={isDietaryModalOpen}
        onClose={() => setIsDietaryModalOpen(false)}
        guestProfile={guestDietaryData.profile}
        pastReservations={guestDietaryData.pastReservations}
        loading={dietaryLoading}
        error={dietaryError}
      />
    </div>
  );
};
