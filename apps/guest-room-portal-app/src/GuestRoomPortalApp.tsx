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
  onConciergeRequest?: (requestType: string, notes?: string, isBillable?: boolean, billableAmount?: number) => Promise<void> | void;
  onInRoomOrderPlaced?: (items: { dishId: string; name: string; quantity: number; price: number }[]) => Promise<void> | void;
  onExpressCheckout?: (notes?: string, paymentMethod?: string, rating?: number, comment?: string) => Promise<void> | void;
  onRefreshOrders?: () => Promise<void> | void;
  onRefreshFolio?: () => Promise<void> | void;
  isCheckoutRequested?: boolean;
  isStayCheckedOut?: boolean;
  checkoutInvoice?: any;
}

export const GuestRoomPortalApp: React.FC<GuestRoomPortalAppProps> = ({
  store,
  onConciergeRequest,
  onInRoomOrderPlaced,
  onExpressCheckout,
  onRefreshOrders,
  onRefreshFolio,
  isCheckoutRequested = false,
  isStayCheckedOut = false,
  checkoutInvoice = null,
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

  const handleConciergeRequest = async (
    requestType: string,
    notes?: string,
    isBillable?: boolean,
    billableAmount?: number
  ) => {
    if (onConciergeRequest) {
      await onConciergeRequest(requestType, notes, isBillable, billableAmount);
    }
    store.addConciergeRequest({
      id: `req_${Date.now()}`,
      requestType,
      status: 'SUBMITTED',
      notes,
      isBillable,
      billableAmount,
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
            roomNumber={session?.roomNumber || '102'}
            onOrderPlaced={async (items) => {
              if (onInRoomOrderPlaced) {
                await onInRoomOrderPlaced(items);
              }
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
            activeOrder={selectedOrder || (liveOrders.length > 0 ? liveOrders[0] : null)}
            isCheckoutRequested={isCheckoutRequested}
            isStayCheckedOut={isStayCheckedOut}
            checkoutInvoice={checkoutInvoice}
            onExpressCheckout={onExpressCheckout || (() => {})}
          />
        )}
      </main>
    </div>
  );
};
