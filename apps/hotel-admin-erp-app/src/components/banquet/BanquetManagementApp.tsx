import React, { useEffect, useState, useMemo } from 'react';
import {
  IBanquetBookingUI,
  IBanquetMetricsUI,
  INewBanquetBookingPayload,
  IUpdateProspectusPayload,
  IPostBanquetExtraChargePayload,
  BanquetStore,
} from '@spicehub/ui';
import { BanquetHeader } from './BanquetHeader';
import { BanquetEventCard } from './BanquetEventCard';
import { NewBanquetBookingModal } from './NewBanquetBookingModal';
import { FunctionProspectusModal } from './FunctionProspectusModal';
import { PostBanquetChargeModal } from './PostBanquetChargeModal';
import { SettleBanquetFolioModal } from './SettleBanquetFolioModal';

interface BanquetManagementAppProps {
  apiBaseUrl?: string;
  token?: string;
  hotelId?: string;
}

export const BanquetManagementApp: React.FC<BanquetManagementAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  token = '',
  hotelId = '',
}) => {
  const store = useMemo(() => new BanquetStore(), []);

  const [bookings, setBookings] = useState<IBanquetBookingUI[]>([]);
  const [metrics, setMetrics] = useState<IBanquetMetricsUI>({
    totalEvents: 0,
    upcomingEventsCount: 0,
    totalPaxExpected: 0,
    totalRevenueContracted: 0,
    totalBalanceDue: 0,
  });

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSlot, setFilterSlot] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<IBanquetBookingUI | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<'NEW_BOOKING' | 'VIEW_FP' | 'POST_CHARGE' | 'SETTLE_FOLIO' | null>(
    null
  );

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
  });

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Dashboard Metrics
      const mRes = await fetch(`${apiBaseUrl}/banquets/dashboard`, { headers: getHeaders() });
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      // 2. Bookings List
      const bRes = await fetch(
        `${apiBaseUrl}/banquets?status=${filterStatus}&timeSlot=${filterSlot}&search=${encodeURIComponent(searchQuery)}`,
        { headers: getHeaders() }
      );
      if (bRes.ok) {
        const bData = await bRes.json();
        setBookings(bData.bookings || []);
      }
    } catch (err: any) {
      console.error('Failed to load banquet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterSlot, searchQuery]);

  // Create Booking
  const handleCreateBooking = async (payload: INewBanquetBookingPayload) => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/banquets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadData();
      }
    } catch (err: any) {
      alert(`Booking Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update Function Prospectus
  const handleSaveFP = async (payload: IUpdateProspectusPayload) => {
    if (!selectedBooking) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/banquets/${selectedBooking._id}/prospectus`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadData();
        alert('Function Prospectus (BEO) updated and distributed successfully!');
      }
    } catch (err: any) {
      alert(`FP Update Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Post Extra Charge
  const handlePostExtraCharge = async (payload: IPostBanquetExtraChargePayload) => {
    if (!selectedBooking) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/banquets/${selectedBooking._id}/extra-charge`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadData();
        alert(`Charge of ₹${data.netAmount} successfully posted to Event Master Folio!`);
      }
    } catch (err: any) {
      alert(`Error posting extra charge: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Settle Folio
  const handleSettleFolio = async (amount: number, paymentMethod: string) => {
    if (!selectedBooking) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/banquets/${selectedBooking._id}/settle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, paymentMethod }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadData();
      }
    } catch (err: any) {
      alert(`Error settling folio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Complete Event
  const handleCompleteEvent = async (booking: IBanquetBookingUI) => {
    const confirm = window.confirm(`Mark event "${booking.eventName}" as completed and release venue "${booking.venueName}"?`);
    if (!confirm) return;

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/banquets/${booking._id}/complete`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err: any) {
      alert(`Error completing event: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b10] text-zinc-100 flex flex-col font-sans">
      <BanquetHeader
        metrics={metrics}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        filterSlot={filterSlot}
        onSlotChange={setFilterSlot}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewBookingClick={() => setActiveModal('NEW_BOOKING')}
        onRefreshClick={loadData}
        loading={loading}
      />

      <div className="flex-1 p-6">
        {loading && bookings.length === 0 ? (
          <div className="py-24 text-center">
            <span className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-zinc-500 text-xs mt-3">Loading banquet functions...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center bg-[#0e131d] rounded-2xl border border-zinc-800 p-8 max-w-xl mx-auto">
            <span className="text-4xl">🏛️</span>
            <h3 className="text-lg font-bold text-white mt-3">No Banquet Bookings Found</h3>
            <p className="text-zinc-400 text-xs mt-1 mb-5">
              Create your first luxury banquet event, configure the seating layout and issue the Function Prospectus (BEO).
            </p>
            <button
              onClick={() => setActiveModal('NEW_BOOKING')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg transition-all"
            >
              + Book First Banquet Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => (
              <BanquetEventCard
                key={booking._id}
                booking={booking}
                onViewFP={(b) => {
                  setSelectedBooking(b);
                  setActiveModal('VIEW_FP');
                }}
                onPostCharge={(b) => {
                  setSelectedBooking(b);
                  setActiveModal('POST_CHARGE');
                }}
                onSettleFolio={(b) => {
                  setSelectedBooking(b);
                  setActiveModal('SETTLE_FOLIO');
                }}
                onCompleteEvent={handleCompleteEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {activeModal === 'NEW_BOOKING' && (
        <NewBanquetBookingModal
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateBooking}
          loading={loading}
        />
      )}

      {activeModal === 'VIEW_FP' && selectedBooking && (
        <FunctionProspectusModal
          booking={selectedBooking}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveFP}
          loading={loading}
        />
      )}

      {activeModal === 'POST_CHARGE' && selectedBooking && (
        <PostBanquetChargeModal
          booking={selectedBooking}
          onClose={() => setActiveModal(null)}
          onSubmit={handlePostExtraCharge}
          loading={loading}
        />
      )}

      {activeModal === 'SETTLE_FOLIO' && selectedBooking && (
        <SettleBanquetFolioModal
          booking={selectedBooking}
          initialDue={selectedBooking.dueAmount}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSettleFolio}
          loading={loading}
        />
      )}
    </div>
  );
};
