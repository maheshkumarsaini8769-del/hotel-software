import React, { useState, useEffect } from 'react';
import { CustomerPortalStore, CustomerServiceMode, ServiceRequestType, CustomerPortalHelper } from '@spicehub/ui';
import { UniversalModeSelector } from './UniversalModeSelector';
import { UniversalInRoomModal } from './UniversalInRoomModal';
import { UniversalServiceTracker } from './UniversalServiceTracker';

export interface UniversalCustomerAppProps {
  store: CustomerPortalStore;
  onSelectModeSubmit?: (mode: CustomerServiceMode, contextDetails: any) => Promise<void> | void;
  onPlaceOrderSubmit?: (items: any[], cookingInstructions?: string) => Promise<void> | void;
  onRequestServiceSubmit?: (type: ServiceRequestType, notes?: string) => Promise<void> | void;
}

export const UniversalCustomerApp: React.FC<UniversalCustomerAppProps> = ({
  store,
  onSelectModeSubmit,
  onPlaceOrderSubmit,
  onRequestServiceSubmit,
}) => {
  const [session, setSession] = useState(store.getSession());
  const [cartItems, setCartItems] = useState(store.getCartItems());
  const [serviceRequests, setServiceRequests] = useState(store.getServiceRequests());
  const [activeOrders, setActiveOrders] = useState(store.getActiveOrders());
  const [isLoading, setIsLoading] = useState(store.getIsLoading());
  const [errorMessage, setErrorMessage] = useState(store.getErrorMessage());

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedPendingMode, setSelectedPendingMode] = useState<CustomerServiceMode | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setSession(store.getSession());
      setCartItems(store.getCartItems());
      setServiceRequests(store.getServiceRequests());
      setActiveOrders(store.getActiveOrders());
      setIsLoading(store.getIsLoading());
      setErrorMessage(store.getErrorMessage());
    });
    return () => unsubscribe();
  }, [store]);

  const handleModeCardClick = (mode: CustomerServiceMode) => {
    if (mode === 'IN_ROOM_DINING') {
      setSelectedPendingMode(mode);
      setIsRoomModalOpen(true);
    } else {
      if (onSelectModeSubmit) {
        onSelectModeSubmit(mode, {});
      } else {
        store.setServiceMode(mode);
      }
    }
  };

  const handleInRoomConfirm = async (details: {
    roomNumber: string;
    guestName?: string;
    billingPreference: 'POST_TO_ROOM' | 'PAY_ONLINE_NOW';
  }) => {
    setIsRoomModalOpen(false);
    if (onSelectModeSubmit && selectedPendingMode) {
      await onSelectModeSubmit(selectedPendingMode, details);
    }
  };

  const cartTotals = store.getCartTotals();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🍽️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              SpiceHub Self-Service
            </h1>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              {session?.serviceMode
                ? CustomerPortalHelper.formatServiceModeLabel(session.serviceMode)
                : 'Select Your Dining Location'}
            </div>
          </div>
        </div>

        {session?.serviceMode && (
          <button
            onClick={() => setSelectedPendingMode(null)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Switch Mode
          </button>
        )}
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* If no service mode selected, display Mode Selector */}
        {!session?.serviceMode ? (
          <UniversalModeSelector
            currentMode={session?.serviceMode}
            onSelectMode={handleModeCardClick}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Context Badge */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #E5E7EB',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Active Order Destination</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  {session.serviceMode === 'IN_ROOM_DINING'
                    ? `Room #${session.inRoomContext?.roomNumber || 'Pending'}`
                    : session.serviceMode === 'DINE_IN_RESTAURANT'
                    ? `Table #${session.dineInContext?.tableNumber || 'Pending'} (${session.dineInContext?.section || 'Dining'})`
                    : 'Takeaway Counter Pickup'}
                </div>
              </div>

              {session.serviceMode === 'IN_ROOM_DINING' && (
                <span
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    fontWeight: 600,
                  }}
                >
                  {session.inRoomContext?.billingPreference === 'POST_TO_ROOM'
                    ? 'Room Folio'
                    : 'Online Pay'}
                </span>
              )}
            </div>

            {/* Quick Service Requests Bar */}
            <UniversalServiceTracker
              serviceMode={session.serviceMode}
              serviceRequests={serviceRequests}
              onRequestService={async (type, notes) => {
                if (onRequestServiceSubmit) {
                  await onRequestServiceSubmit(type, notes);
                }
              }}
              isSubmitting={isLoading}
            />

            {/* Active Orders Tracker */}
            {activeOrders.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                  📦 Active Kitchen Orders ({activeOrders.length})
                </div>
                {activeOrders.map((ord: any) => (
                  <div
                    key={ord._id || ord.orderNumber}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#F9FAFB',
                      marginBottom: '8px',
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                        Order #{ord.orderNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: ord.orderStatus === 'PLACED' ? '#FEF3C7' : '#D1FAE5',
                          color: ord.orderStatus === 'PLACED' ? '#92400E' : '#065F46',
                        }}
                      >
                        {ord.orderStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      {ord.items?.length || 0} items • Est. delivery ~{CustomerPortalHelper.getEstimatedDeliveryMinutes(session.serviceMode, ord.items?.length || 1)} mins
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cart Preview (if items exist) */}
            {cartItems.length > 0 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                  🛒 Current Order Cart ({cartTotals.totalItemCount} items)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cartItems.map((item) => (
                    <div
                      key={item.menuItemId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '14px',
                      }}
                    >
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{item.subtotal}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: '1px dashed #E5E7EB',
                      paddingTop: '8px',
                      marginTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                  >
                    <span>Total (incl. 5% GST):</span>
                    <span>₹{cartTotals.grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onPlaceOrderSubmit) {
                      onPlaceOrderSubmit(cartItems);
                    }
                  }}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    minHeight: '48px',
                  }}
                >
                  {isLoading ? 'Sending to Kitchen...' : `Place Order • ₹${cartTotals.grandTotal}`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* In-Room Verification Modal */}
      {isRoomModalOpen && (
        <UniversalInRoomModal
          initialRoomNumber={session?.inRoomContext?.roomNumber || ''}
          initialGuestName={session?.guestInfo?.guestName || ''}
          onConfirm={handleInRoomConfirm}
          onCancel={() => setIsRoomModalOpen(false)}
          isSubmitting={isLoading}
        />
      )}
    </div>
  );
};
