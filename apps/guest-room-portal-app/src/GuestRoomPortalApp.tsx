import React, { useState, useEffect, useCallback } from 'react';
import { GuestPortalHeader } from './components/GuestPortalHeader';
import { GuestConciergeGrid } from './components/GuestConciergeGrid';
import { LiveOrderTrackerModal } from './components/LiveOrderTrackerModal';
import { GuestFolioReviewModal } from './components/GuestFolioReviewModal';
import {
  GuestPortalStore,
  GuestSessionModel,
  LiveRoomOrder,
  FolioSummaryModel,
} from '@spicehub/ui';

export interface GuestRoomPortalAppProps {
  store: GuestPortalStore;
  onConciergeRequest?: (requestType: string, notes?: string) => Promise<void> | void;
  onExpressCheckout?: (notes?: string) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void> | void;
  onRefreshFolio?: () => Promise<void> | void;
}

export const GuestRoomPortalApp: React.FC<GuestRoomPortalAppProps> = ({
  store,
  onConciergeRequest,
  onExpressCheckout,
  onRefreshOrders,
  onRefreshFolio,
}) => {
  const [session, setSession] = useState<GuestSessionModel | null>(store.getSession());
  const [activeTab, setActiveTab] = useState<'HOME' | 'DINING' | 'ORDERS' | 'FOLIO'>(store.getActiveTab());
  const [liveOrders, setLiveOrders] = useState<LiveRoomOrder[]>(store.getLiveOrders());
  const [folioSummary, setFolioSummary] = useState<FolioSummaryModel | null>(store.getFolioSummary());
  const [recentRequests, setRecentRequests] = useState(store.getRecentRequests());
  const [selectedOrder, setSelectedOrder] = useState<LiveRoomOrder | null>(store.getSelectedLiveOrder());

  const syncState = useCallback(() => {
    setSession(store.getSession());
    setActiveTab(store.getActiveTab());
    setLiveOrders(store.getLiveOrders());
    setFolioSummary(store.getFolioSummary());
    setRecentRequests(store.getRecentRequests());
    setSelectedOrder(store.getSelectedLiveOrder());
  }, [store]);

  useEffect(() => {
    const unsubscribe = store.subscribe(syncState);
    return () => unsubscribe();
  }, [store, syncState]);

  const handleTabChange = async (tab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO') => {
    store.setActiveTab(tab);
    if (tab === 'ORDERS' && onRefreshOrders) {
      await onRefreshOrders();
    }
    if (tab === 'FOLIO' && onRefreshFolio) {
      await onRefreshFolio();
    }
  };

  const handleConciergeRequest = async (requestType: string, notes?: string) => {
    if (onConciergeRequest) {
      await onConciergeRequest(requestType, notes);
    }
    store.addConciergeRequest({
      id: `req_${Date.now()}`,
      requestType,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none text-white">
      {/* 5-Star Luxury Header */}
      <GuestPortalHeader
        session={session}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeOrdersCount={store.getActiveOrdersCount()}
      />

      {/* Main Content Screen */}
      <main className="flex-1 pb-16">
        {activeTab === 'HOME' && (
          <GuestConciergeGrid
            recentRequests={recentRequests}
            onRequestSubmit={handleConciergeRequest}
          />
        )}

        {activeTab === 'DINING' && (
          <div className="max-w-4xl mx-auto p-8 text-center text-slate-400">
            <span className="text-5xl block mb-3">🍽️</span>
            <h3 className="text-base font-extrabold text-white">In-Room Culinary Menu</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Browse our chef-curated appetizers, regional specialties, desserts, and cocktails directly charged to your room folio.
            </p>
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <LiveOrderTrackerModal
            orders={liveOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={(ord) => (ord ? store.openOrderTracker(ord) : store.closeOrderTracker())}
          />
        )}

        {activeTab === 'FOLIO' && (
          <GuestFolioReviewModal
            folioSummary={folioSummary}
            onExpressCheckout={onExpressCheckout || (() => {})}
          />
        )}
      </main>
    </div>
  );
};
