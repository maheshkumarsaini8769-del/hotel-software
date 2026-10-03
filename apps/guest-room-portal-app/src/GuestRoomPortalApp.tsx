import React, { useState, useEffect, useCallback } from 'react';
import { GuestPortalHeader } from './components/GuestPortalHeader';
import { GuestConciergeGrid } from './components/GuestConciergeGrid';
import { LiveOrderTrackerModal } from './components/LiveOrderTrackerModal';
import { GuestFolioReviewModal } from './components/GuestFolioReviewModal';
import { InRoomDiningView } from './components/InRoomDiningView';
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
          <InRoomDiningView
            roomNumber={session?.roomNumber || '302'}
            onOrderPlaced={(items) => {
              store.addLiveOrder({
                orderId: `ord_ird_${Date.now()}`,
                placedAt: new Date().toISOString(),
                estimatedMinutes: 25,
                status: 'PREPARING',
                items: items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unitPrice: i.price,
                })),
                totalAmount: items.reduce((s, it) => s + it.price * it.quantity, 0),
              });
            }}
          />
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
