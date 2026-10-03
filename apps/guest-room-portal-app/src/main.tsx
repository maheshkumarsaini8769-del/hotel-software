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
  totalFolioAmount: 13500,
});

store.setFolioSummary({
  folioNumber: 'FOL-8821-TAJ',
  totalRoomTariff: 12000,
  totalFoodAndBeverage: 850,
  totalTaxes: 1542,
  advancePaid: 10000,
  paidAmount: 10000,
  netAmountPayable: 14392,
  dueAmount: 4392,
  status: 'OPEN',
  lineItems: [
    {
      id: 'li-1',
      department: 'ROOM_TARIFF',
      description: 'Deluxe Heritage Room Tariff (3 Nights)',
      rate: 4000,
      taxAmount: 1440,
      netAmount: 12000,
      createdAt: '2026-10-01T12:00:00Z',
    },
    {
      id: 'li-2',
      department: 'FOOD_AND_BEVERAGE',
      description: 'In-Room Dining: Paneer Tikka & Dal Makhani',
      rate: 850,
      taxAmount: 102,
      netAmount: 850,
      createdAt: '2026-10-01T20:30:00Z',
    },
    {
      id: 'li-3',
      department: 'LAUNDRY',
      description: 'Express Laundry & Pressing Service',
      rate: 650,
      taxAmount: 0,
      netAmount: 650,
      createdAt: '2026-10-02T10:15:00Z',
    },
  ],
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
