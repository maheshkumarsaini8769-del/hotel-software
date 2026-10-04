import React from 'react';
import ReactDOM from 'react-dom/client';
import { GuestRoomPortalApp } from './GuestRoomPortalApp';
import { GuestPortalStore } from '@spicehub/ui';

const store = GuestPortalStore.getInstance();

// 1. Resolve Target Room from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const targetRoom = urlParams.get('room') || '102';

// 2. Default Seed Stay Details
store.setStayDetails({
  roomNumber: targetRoom,
  guestName: 'Vikramaditya & Ananya Singhania',
  checkInDate: new Date().toISOString(),
  checkOutDate: new Date(Date.now() + 86400000).toISOString(),
  wifiPassword: `TajGuest@${targetRoom}`,
  wifiSsid: 'TajGateway_HighSpeed',
  activeOrdersCount: 0,
  totalFolioAmount: 4368,
});

store.setFolioSummary({
  folioNumber: `FOLIO-${targetRoom}-${Date.now().toString().slice(-4)}`,
  totalRoomTariff: 3900,
  totalFoodAndBeverage: 0,
  totalTaxes: 468,
  advancePaid: 3000,
  paidAmount: 3000,
  netAmountPayable: 4368,
  dueAmount: 1368,
  folioStatus: 'OPEN',
  lineItems: [
    {
      id: 'li-base-room',
      department: 'ROOM_RENT',
      description: `Heritage Room ${targetRoom} Accommodation Tariff`,
      rate: 3900,
      taxAmount: 468,
      netAmount: 4368,
      createdAt: new Date().toISOString(),
    },
  ],
});

// 3. Connect to live PMS API to hydrate real-time stay & folio
async function hydrateLiveRoomStay() {
  try {
    const res = await fetch(`http://localhost:5000/api/v1/pms/frontdesk/room-stay-details/${targetRoom}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.stay) {
        const { room, stay, folio } = json.data;
        store.setStayDetails({
          roomNumber: room.roomNumber,
          guestName: stay.guestName,
          checkInDate: stay.checkInTimestamp,
          checkOutDate: stay.expectedCheckOutTimestamp,
          wifiPassword: stay.wifiPassword || `TajGuest@${room.roomNumber}`,
          wifiSsid: stay.wifiSsid || 'TajGateway_HighSpeed',
          activeOrdersCount: 0,
          totalFolioAmount: folio?.netAmountPayable || 0,
        });

        if (folio) {
          store.setFolioSummary({
            folioNumber: folio.folioNumber,
            totalRoomTariff: folio.totalRoomTariff || 0,
            totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
            totalTaxes: folio.totalTaxes || 0,
            advancePaid: folio.advancePaid || 0,
            paidAmount: folio.paidAmount || 0,
            netAmountPayable: folio.netAmountPayable || 0,
            dueAmount: folio.dueAmount || 0,
            folioStatus: folio.folioStatus || 'OPEN',
            lineItems: (folio.lineItems || []).map((li: any) => ({
              id: li.id || li._id || `li-${Date.now()}`,
              department: li.department || 'INCIDENTAL',
              description: li.description || 'Charge',
              rate: li.rate || 0,
              taxAmount: li.taxAmount || 0,
              netAmount: li.netAmount || 0,
              createdAt: li.postedAt || li.createdAt || new Date().toISOString(),
            })),
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[Guest Portal] Stay hydration note:`, err);
  }
}

hydrateLiveRoomStay();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GuestRoomPortalApp
        store={store}
        onConciergeRequest={async (requestType, notes) => {
          try {
            await fetch('http://localhost:5000/api/v1/pms/frontdesk/concierge-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomNumber: targetRoom, requestType, notes }),
            });
          } catch (e) {
            console.warn('Concierge request error:', e);
          }
        }}
        onInRoomOrderPlaced={async (items) => {
          const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
          const desc = `In-Room Dining: ` + items.map((i) => `${i.name} x${i.quantity}`).join(', ');
          try {
            const res = await fetch('http://localhost:5000/api/v1/pms/frontdesk/post-inroom-charge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roomNumber: targetRoom,
                department: 'ROOM_SERVICE',
                description: desc,
                amount: total,
              }),
            });
            const json = await res.json();
            if (json.success && json.data?.folio) {
              const fol = json.data.folio;
              store.setFolioSummary({
                folioNumber: fol.folioNumber,
                totalRoomTariff: fol.totalRoomTariff || 0,
                totalFoodAndBeverage: fol.totalFoodAndBeverage || 0,
                totalTaxes: fol.totalTaxes || 0,
                advancePaid: fol.advancePaid || 0,
                paidAmount: fol.paidAmount || 0,
                netAmountPayable: fol.netAmountPayable || 0,
                dueAmount: fol.dueAmount || 0,
                folioStatus: fol.folioStatus || 'OPEN',
                lineItems: (fol.lineItems || []).map((li: any) => ({
                  id: li.id || li._id || `li-${Date.now()}`,
                  department: li.department || 'INCIDENTAL',
                  description: li.description || 'Charge',
                  rate: li.rate || 0,
                  taxAmount: li.taxAmount || 0,
                  netAmount: li.netAmount || 0,
                  createdAt: li.postedAt || li.createdAt || new Date().toISOString(),
                })),
              });
            }
          } catch (e) {
            console.warn('Post order charge error:', e);
          }
        }}
        onExpressCheckout={async (notes) => {
          console.log(`💳 [Guest Room ${targetRoom}] Express checkout requested`, notes);
        }}
      />
    </React.StrictMode>
  );
}
