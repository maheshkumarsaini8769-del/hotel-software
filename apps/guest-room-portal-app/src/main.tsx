import React from 'react';
import ReactDOM from 'react-dom/client';
import { GuestRoomPortalApp } from './GuestRoomPortalApp';
import { GuestPortalStore } from '@spicehub/ui';

const store = GuestPortalStore.getInstance();

// Seed initial stay details
store.setStayDetails({
  roomNumber: '302',
  guestName: 'Rohit Khanna',
  checkInDate: '2026-10-01',
  checkOutDate: '2026-10-04',
  wifiPassword: 'TajGuest@302',
  activeOrdersCount: 1,
  totalFolioAmount: 4850,
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GuestRoomPortalApp
        store={store}
        onConciergeRequest={async (requestType, notes) => {
          console.log(`🛎️ [Guest Room 302] Requested concierge service: ${requestType}`, notes);
        }}
        onExpressCheckout={async (notes) => {
          console.log(`💳 [Guest Room 302] Express checkout requested`, notes);
        }}
      />
    </React.StrictMode>
  );
}
