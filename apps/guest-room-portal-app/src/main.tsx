import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GuestRoomPortalApp } from './GuestRoomPortalApp';
import { ErrorBoundary, GuestPortalStore, LiveRoomOrder, CustomerLocationSelectorModal, CustomerPortalSwitcherBar, I18nProvider } from '@spicehub/ui';
import { SpiceHubSocket } from '@spicehub/api-client';
import { API_ORIGIN, SOCKET_URL } from './config/api';
import { getPortalUrl } from './config/env';

const store = GuestPortalStore.getInstance();
const socket = SpiceHubSocket.getInstance();
const API_BASE = API_ORIGIN;

// 1. Resolve target room, hotel and QR token from URL parameters
const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const rawRoomParam =
  urlParams.get('room') ||
  urlParams.get('roomNumber') ||
  (urlParams.get('type') === 'room' ? urlParams.get('id') : null) ||
  urlParams.get('roomId');
const crossTableParam =
  urlParams.get('table') ||
  urlParams.get('tableNumber') ||
  (urlParams.get('type') === 'table' ? urlParams.get('id') : null) ||
  urlParams.get('tableId');
const hasExplicitRoom = Boolean(rawRoomParam);
const isExplicitRoomsTab = Boolean(urlParams.get('tab') && urlParams.get('tab')?.toUpperCase() === 'ROOMS');
let targetRoom = rawRoomParam || '';
const roomIdFromUrl = urlParams.get('roomId') || '';
const sessionTokenFromUrl = urlParams.get('token') || urlParams.get('sessionToken') || '';
const permanentQrTokenFromUrl = urlParams.get('qrToken') || '';
let resolvedHotelId =
  urlParams.get('hotelId') ||
  (typeof window !== 'undefined'
    ? localStorage.getItem('spicehub_hotel_id') || localStorage.getItem('hotelId')
    : null) ||
  (import.meta as any).env?.VITE_HOTEL_ID ||
  '';
let resolvedWaiterEnabled = true;
let guestSessionToken = '';
let guestSessionError = '';

// Only non-fabricated placeholders are seeded. Real guest/folio values must come from PMS.
store.setStayDetails({
  roomNumber: targetRoom,
  guestName: 'Valued Guest',
  roomType: 'Room',
  wifiSsid: 'SpiceHub_Guest',
  wifiPassword: '',
  activeOrdersCount: 0,
  totalFolioAmount: 0,
});
store.setFolioSummary(null);

async function resolveHotelId(): Promise<string> {
  if (resolvedHotelId) return resolvedHotelId;
  try {
    const res = await fetch(`${API_BASE}/api/v1/pos/demo-context`);
    const body = await res.json().catch(() => null);
    if (body?.success && body?.data?.hotel?.id) {
      resolvedHotelId = String(body.data.hotel.id);
      if (typeof body.data.hotel.waiterEnabled === 'boolean') {
        resolvedWaiterEnabled = body.data.hotel.waiterEnabled;
      }
    }
  } catch (err) {
    console.warn('[Guest Portal] Hotel context resolution note:', err);
  }
  return resolvedHotelId;
}

async function probeGuestSession(token: string): Promise<boolean> {
  try {
    const hotelId = resolvedHotelId || urlParams.get('hotelId') || '';
    const headers: Record<string, string> = { 'x-guest-session-token': token };
    if (hotelId) headers['x-hotel-id'] = hotelId;
    const res = await fetch(`${API_BASE}/api/v1/guest-portal/stay/status`, {
      headers,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && json.data?.hotelId) {
      resolvedHotelId = String(json.data.hotelId);
      return true;
    }
  } catch {}
  return false;
}

async function resolveGuestSession(roomToUse?: string): Promise<void> {
  if (roomToUse) targetRoom = roomToUse;
  const candidateToken =
    sessionTokenFromUrl ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('spicehub_guest_session') || ''
      : '');

  if (candidateToken && (await probeGuestSession(candidateToken))) {
    guestSessionToken = candidateToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('spicehub_guest_session', candidateToken);
    }
    return;
  }
  if (typeof window !== 'undefined' && !sessionTokenFromUrl) {
    localStorage.removeItem('spicehub_guest_session');
  }

  const hotelId = await resolveHotelId();
  if (!hotelId) {
    guestSessionError = 'Hotel context could not be resolved from this QR link.';
    console.warn('[Guest Portal]', guestSessionError);
    return;
  }

  const params = new URLSearchParams({ hotelId, roomNumber: targetRoom });
  if (roomIdFromUrl) params.set('roomId', roomIdFromUrl);
  if (permanentQrTokenFromUrl) params.set('qrToken', permanentQrTokenFromUrl);

  try {
    const res = await fetch(`${API_BASE}/api/v1/guest-portal/qr/resolve?${params.toString()}`);
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && json.data?.sessionToken) {
      guestSessionToken = String(json.data.sessionToken);
      if (json.data.hotelId) resolvedHotelId = String(json.data.hotelId);
      if (typeof json.data.waiterEnabled === 'boolean') {
        resolvedWaiterEnabled = json.data.waiterEnabled;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('spicehub_guest_session', guestSessionToken);
      }
      return;
    }
    guestSessionError = json?.message || 'Room QR session could not be resolved.';
    console.warn('[Guest Portal]', guestSessionError);
  } catch (err: any) {
    guestSessionError = err?.message || 'Room QR session network error.';
    console.warn('[Guest Portal]', guestSessionError);
  }
}

const guestSessionReady = resolveGuestSession();

async function guestHeaders(includeJson = true): Promise<Record<string, string>> {
  await guestSessionReady;
  const hotelId = await resolveHotelId();
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (hotelId) headers['x-hotel-id'] = hotelId;
  if (guestSessionToken) headers['x-guest-session-token'] = guestSessionToken;
  return headers;
}

// 3. Connect to the guest-safe API to hydrate real-time stay & folio
async function hydrateLiveRoomStay() {
  try {
    await guestSessionReady;
    if (!guestSessionToken) return;
    const res = await fetch(`${API_BASE}/api/v1/guest-portal/stay/status`, {
      headers: await guestHeaders(false),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.stay) {
        const { room, stay, folio } = json.data;
        if (json.data.hotelId) resolvedHotelId = String(json.data.hotelId);
        store.setStayDetails({
          hotelId: resolvedHotelId,
          roomNumber: room.roomNumber,
          roomType: room.roomTypeName || 'Room',
          guestName: stay.guestName,
          checkInDate: stay.checkInTimestamp,
          checkOutDate: stay.expectedCheckOutTimestamp,
          wifiPassword: stay.wifiPassword || '',
          wifiSsid: stay.wifiSsid || 'SpiceHub_Guest',
          status: stay.stayStatus,
          activeOrdersCount: store.getActiveOrdersCount(),
          totalFolioAmount: folio?.netAmountPayable || 0,
        });

        if (folio) {
          store.setFolioSummary({
            folioNumber: folio.folioNumber,
            totalRoomTariff: folio.totalRoomTariff || 0,
            totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
            totalLaundry: folio.totalLaundry || 0,
            totalPaidServices: folio.totalPaidServices || 0,
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

// 4. Hydrate existing in-room orders
async function hydrateInRoomOrders() {
  try {
    await guestSessionReady;
    if (!guestSessionToken) return;
    const res = await fetch(`${API_BASE}/api/v1/guest-portal/orders/live`, {
      headers: await guestHeaders(false),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const liveOrders: LiveRoomOrder[] = json.data.map((ord: any) => ({
          id: ord.id || ord._id,
          orderNumber: ord.orderNumber,
          orderStatus: ord.orderStatus,
          placedAt: ord.placedAt,
          preparedAt: ord.preparedAt,
          readyAt: ord.readyAt,
          servedAt: ord.servedAt,
          cookingInstructions: ord.cookingInstructions,
          items: (ord.items || []).map((it: any) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
            specialInstructions: it.specialInstructions,
          })),
          grandTotal: ord.grandTotal,
        }));
        store.setLiveOrders(liveOrders);
        if (liveOrders.length > 0 && !store.getSelectedLiveOrder()) {
          store.openOrderTracker(liveOrders[0]);
        }
      }
    }
  } catch (err) {
    console.warn(`[Guest Portal] In-room orders hydration note:`, err);
  }
}

// 5. Hydrate existing concierge requests for room (Shift 60)
async function hydrateConciergeRequests() {
  try {
    await guestSessionReady;
    if (!guestSessionToken) return;
    const res = await fetch(`${API_BASE}/api/v1/guest-portal/requests/live`, {
      headers: await guestHeaders(false),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        store.setRecentRequests(json.data);
      }
    }
  } catch (err) {
    console.warn(`[Guest Portal] Concierge requests hydration note:`, err);
  }
}

hydrateLiveRoomStay();
hydrateInRoomOrders();
hydrateConciergeRequests();

// 6. Real-Time Socket Connection & Periodic Polling
void (async () => {
  await guestSessionReady;
  const hotelId = await resolveHotelId();
  if (!hotelId) {
    console.warn('[Guest Portal] Socket connection skipped: hotel context unavailable');
    return;
  }

  const authToken = guestSessionToken;

  try {
    socket.connect({
      serverUrl: SOCKET_URL,
      hotelId,
      station: `guest_room_${targetRoom}`,
      token: authToken || undefined,
    });

    socket.on('order:status_updated', (data: any) => {
      console.log('🔄 [GuestPortal] Order status updated via socket:', data);
      store.handleOrderStatusUpdated({
        orderId: data.orderId,
        orderStatus: data.orderStatus,
        readyAt: data.readyAt,
      });
    });

    socket.on('pms:folio_updated', (data: any) => {
      if (data.roomNumber === targetRoom) {
        hydrateLiveRoomStay();
      }
    });

    socket.on('pms:concierge_request_updated', (data: any) => {
      if (data.roomNumber === targetRoom) {
        hydrateConciergeRequests();
      }
    });

    socket.on('pms:concierge_request_created', (data: any) => {
      if (data.roomNumber === targetRoom) {
        hydrateConciergeRequests();
      }
    });
  } catch (e) {
    console.warn('Socket init note:', e);
  }
})();

// Resilient polling for order & concierge updates
setInterval(() => {
  void hydrateInRoomOrders();
  void hydrateConciergeRequests();
}, 5000);

const GuestRoomPortalRoot: React.FC = () => {
  const [showLocationModal, setShowLocationModal] = React.useState<boolean>(false);
  const [currentRoomNumber, setCurrentRoomNumber] = React.useState<string>(targetRoom);
  const [isCheckoutRequested, setIsCheckoutRequested] = React.useState(false);
  const [isStayCheckedOut, setIsStayCheckedOut] = React.useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = React.useState<any>(null);
  const [hotelId, setHotelId] = React.useState<string>(resolvedHotelId);
  const [waiterEnabled, setWaiterEnabled] = React.useState<boolean>(resolvedWaiterEnabled);

  const roomParamFormat = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('room')) return `?room=${sp.get('room')}`;
    if (sp.has('roomNumber')) return `?roomNumber=${sp.get('roomNumber')}`;
    if (sp.get('type') === 'room') return `?type=room&id=${sp.get('id')}`;
    if (sp.has('roomId')) return `?roomId=${sp.get('roomId')}`;
    return '';
  }, []);

  const [crossPortalToast, setCrossPortalToast] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('redirectToast') || sp.get('redirectReason')) {
      return '🛎️ Redirected to your In-Room Guest Portal';
    }
    return null;
  });

  React.useEffect(() => {
    if (crossPortalToast) {
      const timer = setTimeout(() => setCrossPortalToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [crossPortalToast]);

  React.useEffect(() => {
    if (crossTableParam) {
      const dest = new URL(getPortalUrl('customer'), window.location.href);
      dest.searchParams.set('table', crossTableParam);
      dest.searchParams.set('redirectToast', 'from_room');
      if (urlParams.get('hotelId')) dest.searchParams.set('hotelId', String(urlParams.get('hotelId')));
      window.location.replace(dest.toString());
    }
  }, []);

  React.useEffect(() => {
    void guestSessionReady.then(async () => {
      const id = await resolveHotelId();
      if (id) setHotelId(id);
      setWaiterEnabled(resolvedWaiterEnabled);
    });
  }, []);

  React.useEffect(() => {
    try {
      socket.on('pms:checkout_requested', (data: any) => {
        if (data.roomNumber === targetRoom) {
          if (!data.hotelId || (resolvedHotelId && String(data.hotelId) !== String(resolvedHotelId))) return;
          setIsCheckoutRequested(true);
        }
      });

      socket.on('pms:stay_checked_out', (data: any) => {
        if (data.roomNumber === targetRoom) {
          if (!data.hotelId || (resolvedHotelId && String(data.hotelId) !== String(resolvedHotelId))) return;
          const curSession = store.getSession() as any;
          if (curSession?.stayId && data.stayId && String(data.stayId) !== String(curSession.stayId)) return;
          setIsStayCheckedOut(true);
          setCheckoutInvoice(data);
          hydrateLiveRoomStay();
        }
      });

      socket.on('pms:folio_settled', (data: any) => {
        if (data.roomNumber === targetRoom) {
          if (!data.hotelId || (resolvedHotelId && String(data.hotelId) !== String(resolvedHotelId))) return;
          hydrateLiveRoomStay();
        }
      });

      // Hydrate stay status on mount / reload through the guest-safe endpoint
      void (async () => {
        try {
          await guestSessionReady;
          if (!guestSessionToken) return;
          const r = await fetch(`${API_BASE}/api/v1/guest-portal/stay/status`, {
            headers: await guestHeaders(false),
          });
          const json = await r.json();
          if (json.success && json.data?.stay) {
            const { stay, folio } = json.data;
            if (stay.stayStatus === 'CHECKED_OUT' || stay.taxInvoiceNumber) {
              setIsStayCheckedOut(true);
              setCheckoutInvoice({
                invoiceNumber: stay.taxInvoiceNumber,
                paymentMode: folio?.settlementNotes || 'Settled',
                totalPaid: folio?.paidAmount || folio?.netAmountPayable || 0,
                roomNumber: targetRoom,
              });
            } else {
              setIsStayCheckedOut(false);
              setCheckoutInvoice(null);
              if (stay.checkoutRequested) {
                setIsCheckoutRequested(true);
              } else {
                setIsCheckoutRequested(false);
              }
            }
          }
        } catch {}
      })();
    } catch (e) {
      console.warn('Socket checkout event bind note:', e);
    }
  }, []);

  if (crossTableParam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-blue-400">Redirecting to Dine-in Table Menu...</p>
      </div>
    );
  }

  return (
    <>
      <CustomerPortalSwitcherBar
        currentApp="guest"
        currentLocationName={currentRoomNumber ? `Room ${currentRoomNumber}${roomParamFormat ? ` (${roomParamFormat})` : ''}` : undefined}
        destinationUrl={getPortalUrl('customer')}
      />
      {crossPortalToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
          <div className="px-4 py-3 rounded-2xl shadow-sm dark:shadow-none border text-sm font-bold flex items-center justify-between gap-2 bg-blue-950 text-blue-200 border-blue-600">
            <span>{crossPortalToast}</span>
            <button onClick={() => setCrossPortalToast(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      )}
      <CustomerLocationSelectorModal
        isOpen={showLocationModal}
        currentApp="guest"
        apiBaseUrl={API_BASE}
        hotelId={hotelId}
        tablePortalUrl={getPortalUrl('customer')}
        roomPortalUrl={getPortalUrl('guest')}
        onSelectRoom={(r, token) => {
          targetRoom = r;
          setCurrentRoomNumber(r);
          if (token) {
            guestSessionToken = token;
            if (typeof window !== 'undefined') {
              localStorage.setItem('spicehub_guest_session', token);
            }
          }
          store.setStayDetails({ roomNumber: r });
          setShowLocationModal(false);
          window.dispatchEvent(new CustomEvent('guest:set_tab', { detail: 'HOME' }));
          void resolveGuestSession(r).then(() => {
            void hydrateLiveRoomStay();
            void hydrateInRoomOrders();
          });
        }}
        onClose={() => setShowLocationModal(false)}
      />
      <GuestRoomPortalApp
        store={store}
        hotelId={hotelId}
        waiterEnabled={waiterEnabled}
        isCheckoutRequested={isCheckoutRequested}
        isStayCheckedOut={isStayCheckedOut}
        checkoutInvoice={checkoutInvoice}
        onRoomBooked={(newRoom, sessionToken) => {
          targetRoom = newRoom;
          setCurrentRoomNumber(newRoom);
          if (sessionToken) {
            guestSessionToken = sessionToken;
            if (typeof window !== 'undefined') {
              localStorage.setItem('spicehub_guest_session', sessionToken);
            }
          }
          store.setStayDetails({ roomNumber: newRoom });
          void hydrateLiveRoomStay();
          void hydrateInRoomOrders();
        }}
        onConciergeRequest={async (requestType, notes, isBillable, billableAmount) => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/guest-portal/requests/concierge`, {
            method: 'POST',
            headers: await guestHeaders(),
            body: JSON.stringify({
              requestType,
              notes,
              isBillable: !!isBillable,
              billableAmount: billableAmount || 0,
              billableDescription: isBillable ? `In-Room Guest Order: ${requestType}` : undefined,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            console.warn('[Guest Portal] Concierge request rejected:', json?.message);
            return false;
          }
          if (json.data?.folio) {
            hydrateLiveRoomStay();
          }
          hydrateConciergeRequests();
          return true;
        } catch (e) {
          console.warn('Concierge request error:', e);
          return false;
        }
      }}
      onInRoomOrderPlaced={async (items, instructions) => {
        try {
          const hotelId = (await resolveHotelId()) || urlParams.get('hotelId') || '';
          const res = await fetch(`${API_BASE}/api/v1/guest-portal/orders/place`, {
            method: 'POST',
            headers: {
              ...(await guestHeaders()),
              'x-idempotency-key': `GUEST_ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            },
            body: JSON.stringify({
              hotelId,
              roomNumber: targetRoom,
              roomId: roomIdFromUrl || undefined,
              items: items.map((it) => ({
                menuItemId: it.dishId,
                name: it.name,
                quantity: it.quantity,
              })),
              cookingInstructions: instructions || 'Freshly prepared for Guest In-Room Dining',
              chargeToRoom: true,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success || !json?.data) {
            console.warn('[Guest Portal] In-room order rejected:', json?.message);
            return false;
          }

          {
            const { order, folio } = json.data;
            if (order) {
              const liveOrd: LiveRoomOrder = {
                id: order.id || order._id || `room-order-${Date.now()}`,
                orderNumber: order.orderNumber,
                orderStatus: order.orderStatus,
                placedAt: order.placedAt,
                cookingInstructions: order.cookingInstructions,
                items: (order.items || []).map((it: any) => ({
                  menuItemId: it.menuItemId,
                  name: it.name,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  subtotal: it.subtotal,
                  specialInstructions: it.specialInstructions,
                })),
                grandTotal: order.grandTotal,
              };
              store.addLiveOrder(liveOrd);
              store.openOrderTracker(liveOrd);
            }

            if (folio) {
              store.setFolioSummary({
                folioNumber: folio.folioNumber,
                totalRoomTariff: folio.totalRoomTariff || 0,
                totalFoodAndBeverage: folio.totalFoodAndBeverage || 0,
                totalLaundry: folio.totalLaundry || 0,
                totalPaidServices: folio.totalPaidServices || 0,
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
              const cur = store.getSession();
              if (cur) {
                store.setStayDetails({
                  ...cur,
                  totalFolioAmount: folio.netAmountPayable,
                  activeOrdersCount: store.getActiveOrdersCount(),
                });
              }
            }
            return order || true;
          }
        } catch (e) {
          console.warn('In-room order placement error:', e);
          return false;
        }
      }}
      onRefreshOrders={hydrateInRoomOrders}
      onRefreshFolio={hydrateLiveRoomStay}
      onExpressCheckout={async (notes, paymentMethod, rating, comment) => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/guest-portal/checkout/express-request`, {
            method: 'POST',
            headers: await guestHeaders(),
            body: JSON.stringify({
              notes,
              paymentMethodPreference: paymentMethod,
              feedbackRating: rating,
              feedbackComment: comment,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            console.warn('[Guest Portal] Express checkout rejected:', json?.message);
            return false;
          }
          setIsCheckoutRequested(true);
          setIsStayCheckedOut(true);
          if (json?.data) {
            setCheckoutInvoice(json.data);
          }
          await hydrateLiveRoomStay();
          return true;
        } catch (e) {
          console.warn('Express checkout error:', e);
          return false;
        }
      }}
      onSettleFolio={async (paymentMode: string, transactionRef?: string) => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/guest-portal/folio/settle`, {
            method: 'POST',
            headers: await guestHeaders(),
            body: JSON.stringify({
              paymentMode,
              transactionRef,
            }),
          });
          const json = await res.json();
          if (json.success) {
            await hydrateLiveRoomStay();
            return {
              success: true,
              invoiceNumber: json.data?.invoiceNumber,
              message: json.message,
            };
          }
          return { success: false, message: json.message || 'Payment settlement failed' };
        } catch (e: any) {
          console.warn('Folio settle error:', e);
          return { success: false, message: e.message || 'Payment network error' };
        }
      }}
    />
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <GuestRoomPortalRoot />
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
