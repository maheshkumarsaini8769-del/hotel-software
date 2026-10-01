import React, { useEffect, useState, useMemo } from 'react';
import {
  IGroupBookingUI,
  IGroupSummaryUI,
  INewGroupBookingPayload,
  IBulkCheckInPayload,
  IPostIncidentalPayload,
  CorporateStore,
} from '@spicehub/ui';
import { CorporateHeader } from './CorporateHeader';
import { GroupBookingCard } from './GroupBookingCard';
import { NewGroupBookingModal } from './NewGroupBookingModal';
import { BulkCheckInModal } from './BulkCheckInModal';
import { CorporateSplitFolioModal } from './CorporateSplitFolioModal';
import { PostIncidentalModal } from './PostIncidentalModal';
import { SettleFolioModal } from './SettleFolioModal';

interface CorporateMasterFolioAppProps {
  apiBaseUrl?: string;
  token?: string;
  hotelId?: string;
}

export const CorporateMasterFolioApp: React.FC<CorporateMasterFolioAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  token = '',
  hotelId = '',
}) => {
  const store = useMemo(() => new CorporateStore(), []);

  const [groupBookings, setGroupBookings] = useState<IGroupBookingUI[]>([]);
  const [summary, setSummary] = useState<IGroupSummaryUI>({
    totalGroups: 0,
    totalRoomsBlocked: 0,
    totalRoomsCheckedIn: 0,
    totalCorporateDue: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<IGroupBookingUI | null>(null);

  // Available metadata for dropdowns
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'NEW_GROUP' | 'BULK_CHECKIN' | 'POST_INCIDENTAL' | 'SPLIT_FOLIO' | 'SETTLE_MASTER' | null
  >(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
  });

  // Fetch groups
  const loadGroupBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setGroupBookings(data.groupBookings || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err: any) {
      console.error('Failed to load group bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch room types & available rooms for check-in modals
  const loadMeta = async () => {
    try {
      // 1. Room types
      const rtRes = await fetch(`${apiBaseUrl}/pms/room-types`, { headers: getHeaders() });
      if (rtRes.ok) {
        const rtData = await rtRes.json();
        setRoomTypes(rtData.roomTypes || []);
      }

      // 2. Clean available rooms from arrivals board or rooms endpoint
      const rRes = await fetch(`${apiBaseUrl}/pms/bookings/arrivals-board`, { headers: getHeaders() });
      if (rRes.ok) {
        const rData = await rRes.json();
        setAvailableRooms(rData.cleanAvailableRooms || []);
      }
    } catch (err) {
      console.warn('Could not load room meta:', err);
    }
  };

  useEffect(() => {
    loadGroupBookings();
    loadMeta();
  }, [filterStatus, searchQuery]);

  // Handle New Group Booking
  const handleCreateGroup = async (payload: INewGroupBookingPayload) => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadGroupBookings();
      }
    } catch (err: any) {
      alert(`Error creating group booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Bulk Check In
  const handleBulkCheckIn = async (payload: IBulkCheckInPayload) => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings/${selectedGroup._id}/bulk-check-in`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadGroupBookings();
        await loadMeta();
      }
    } catch (err: any) {
      alert(`Error during bulk check-in: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Post Incidental Charge
  const handlePostIncidental = async (payload: IPostIncidentalPayload) => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings/${selectedGroup._id}/incidental`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadGroupBookings();
        alert(`Charge of ₹${data.lineItem?.netAmount || 0} successfully posted to ${data.chargedTo}!`);
      }
    } catch (err: any) {
      alert(`Error posting charge: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Settle Corporate Master Folio
  const handleSettleCorporate = async (amount: number, paymentMethod: string) => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings/${selectedGroup._id}/settle-master`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, paymentMethod }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setActiveModal(null);
        await loadGroupBookings();
      }
    } catch (err: any) {
      alert(`Error settling corporate folio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Settle Individual Folio
  const handleSettleIndividual = async (folioId: string, amount: number) => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings/${selectedGroup._id}/settle-individual`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ folioId, amount }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await loadGroupBookings();
      }
    } catch (err: any) {
      alert(`Error settling guest folio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Bulk Checkout Entire Group
  const handleBulkCheckout = async (group: IGroupBookingUI) => {
    const confirmCheckout = window.confirm(
      `Are you sure you want to check out all in-house rooms for group "${group.groupName}"? Rooms will be marked DIRTY for housekeeping.`
    );
    if (!confirmCheckout) return;

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/group-bookings/${group._id}/bulk-checkout`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await loadGroupBookings();
        await loadMeta();
        alert(`Checked out ${data.checkedOutCount} rooms successfully!`);
      }
    } catch (err: any) {
      alert(`Error during group checkout: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Invoices helper for modal
  const fetchGroupInvoices = async (groupBookingId: string) => {
    const res = await fetch(`${apiBaseUrl}/group-bookings/${groupBookingId}/invoices`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      corporateInvoice: data.corporateInvoice,
      individualInvoices: data.individualInvoices || [],
    };
  };

  return (
    <div className="min-h-screen bg-[#080b10] text-zinc-100 flex flex-col font-sans">
      {/* Top Header & KPI Bar */}
      <CorporateHeader
        summary={summary}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewBookingClick={() => setActiveModal('NEW_GROUP')}
        onRefreshClick={() => {
          loadGroupBookings();
          loadMeta();
        }}
        loading={loading}
      />

      {/* Main Content: Grid of Group Cards */}
      <div className="flex-1 p-6">
        {loading && groupBookings.length === 0 ? (
          <div className="py-24 text-center">
            <span className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-zinc-500 text-xs mt-3">Loading corporate bookings...</div>
          </div>
        ) : groupBookings.length === 0 ? (
          <div className="py-20 text-center bg-[#0e131d] rounded-2xl border border-zinc-800 p-8 max-w-xl mx-auto">
            <span className="text-4xl">🏢</span>
            <h3 className="text-lg font-bold text-white mt-3">No Group Bookings Found</h3>
            <p className="text-zinc-400 text-xs mt-1 mb-5">
              Create your first corporate room block with automated GST invoicing and split policies.
            </p>
            <button
              onClick={() => setActiveModal('NEW_GROUP')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg transition-all"
            >
              + Create First Group Booking
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupBookings.map((group) => (
              <GroupBookingCard
                key={group._id}
                group={group}
                onBulkCheckIn={(g) => {
                  setSelectedGroup(g);
                  setActiveModal('BULK_CHECKIN');
                }}
                onPostIncidental={(g) => {
                  setSelectedGroup(g);
                  setActiveModal('POST_INCIDENTAL');
                }}
                onViewSplitFolio={(g) => {
                  setSelectedGroup(g);
                  setActiveModal('SPLIT_FOLIO');
                }}
                onSettleCorporate={(g) => {
                  setSelectedGroup(g);
                  setActiveModal('SETTLE_MASTER');
                }}
                onBulkCheckout={handleBulkCheckout}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {activeModal === 'NEW_GROUP' && (
        <NewGroupBookingModal
          roomTypes={roomTypes}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateGroup}
          loading={loading}
        />
      )}

      {activeModal === 'BULK_CHECKIN' && selectedGroup && (
        <BulkCheckInModal
          group={selectedGroup}
          availableRooms={availableRooms}
          onClose={() => setActiveModal(null)}
          onSubmit={handleBulkCheckIn}
          loading={loading}
        />
      )}

      {activeModal === 'POST_INCIDENTAL' && selectedGroup && (
        <PostIncidentalModal
          group={selectedGroup}
          onClose={() => setActiveModal(null)}
          onSubmit={handlePostIncidental}
          loading={loading}
        />
      )}

      {activeModal === 'SPLIT_FOLIO' && selectedGroup && (
        <CorporateSplitFolioModal
          group={selectedGroup}
          fetchInvoices={fetchGroupInvoices}
          onSettleCorporate={async (g, amt) => {
            setSelectedGroup(g);
            setActiveModal('SETTLE_MASTER');
          }}
          onSettleIndividual={handleSettleIndividual}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'SETTLE_MASTER' && selectedGroup && (
        <SettleFolioModal
          group={selectedGroup}
          initialDue={
            typeof selectedGroup.masterFolioId === 'object' && selectedGroup.masterFolioId
              ? (selectedGroup.masterFolioId as any).dueAmount || 0
              : 0
          }
          onClose={() => setActiveModal(null)}
          onSubmit={handleSettleCorporate}
          loading={loading}
        />
      )}
    </div>
  );
};
