import './index.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerMenuApp, CustomerRequestType } from './CustomerMenuApp';
import { ErrorBoundary, MenuCartStore, CustomerLocationSelectorModal, CustomerPortalSwitcherBar, I18nProvider, CustomerDownloadAppBanner, installGlobalNumericInputGuard } from '@spicehub/ui';
import { Users, ArrowRight, AlertCircle, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { SpiceHubSocket, SpiceHubClient } from '@spicehub/api-client';
import { API_ORIGIN, SOCKET_URL } from './config/api';
import { getPortalUrl } from './config/env';

installGlobalNumericInputGuard();

const store = MenuCartStore.getInstance();
const socket = SpiceHubSocket.getInstance();
const API_BASE = API_ORIGIN;
const parentOrigin = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('parentOrigin') : null;
const isCustomerApkEmbed =
  typeof window !== 'undefined' && (window.parent !== window || Boolean(parentOrigin));
const isNativeCustomerRuntime = Boolean((window as any)?.Capacitor?.isNativePlatform?.());

export interface PlacedOrderItem {
  id?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus?: string;
  specialInstructions?: string;
}

export interface PlacedOrder {
  id?: string;
  orderId?: string;
  orderNumber: string;
  orderStatus: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  items: PlacedOrderItem[];
  cookingInstructions?: string;
  placedAt?: string | Date;
  totalAmount?: number;
}

export const CustomerAppRoot: React.FC = () => {
  // Inside the app the portal runs in an iframe, where the Capacitor bridge is
  // absent — the embed flag is the only signal available there.
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const queryHotelId = urlParams.get('hotelId');
  const queryTableId = urlParams.get('tableId');
  const rawTableParam =
    urlParams.get('table') ||
    urlParams.get('tableNumber') ||
    (urlParams.get('type') === 'table' ? urlParams.get('id') : null) ||
    queryTableId;
  const crossRoomParam =
    urlParams.get('room') ||
    urlParams.get('roomNumber') ||
    (urlParams.get('type') === 'room' ? urlParams.get('id') : null) ||
    urlParams.get('roomId');
  const hasExplicitTable = Boolean(rawTableParam || (queryHotelId && queryTableId));

  const paramFormat = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('table')) return `?table=${sp.get('table')}`;
    if (sp.has('tableId')) return `?tableId=${sp.get('tableId')}`;
    if (sp.get('type') === 'table') return `?type=table&id=${sp.get('id')}`;
    if (sp.has('tableNumber')) return `?tableNumber=${sp.get('tableNumber')}`;
    return '';
  }, []);

  const [showLocationModal, setShowLocationModal] = useState<boolean>(
    () => !hasExplicitTable && !crossRoomParam && !isCustomerApkEmbed
  );
  const [hotelId, setHotelId] = useState<string>('');
  const [hotelName, setHotelName] = useState<string>('SpiceHub Hotel');
  const [hotelLocation, setHotelLocation] = useState<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    googleMapUrl?: string;
  }>({
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    googleMapUrl: 'https://www.google.com/maps/search/?api=1&query=26.9124,75.7873',
  });
  const [tableId, setTableId] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [section, setSection] = useState<string>('Dining');
  const [tableSessionId, setTableSessionId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [occupiedTable, setOccupiedTable] = useState<{
    isOccupied: boolean;
    isTableFull?: boolean;
    errorCode: string;
    message: string;
    tableNumber: string;
    tableId?: string;
    capacity?: number;
    guestCount?: number;
    hotelId?: string;
    hotelName?: string;
    section?: string;
    viewOnlyAccepted?: boolean;
  } | null>(null);
  const [canOrder, setCanOrder] = useState<boolean>(true);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [guestCount, setGuestCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('spicehub_customer_guest_count');
      if (saved && Number(saved) > 0) return Number(saved);
    } catch {}
    return 2;
  });
  const [showPaxModal, setShowPaxModal] = useState<boolean>(false);
  const [waiterEnabled, setWaiterEnabled] = useState<boolean>(true);
  const [bootstrapError, setBootstrapError] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const isPlacingOrderRef = useRef<boolean>(false);
  const [isBillSettledModalOpen, setIsBillSettledModalOpen] = useState<boolean>(false);
  const [settledBillInfo, setSettledBillInfo] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<PlacedOrder[]>(() => {
    try {
      const saved = localStorage.getItem('spicehub_customer_active_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchSessionOrders = useCallback(async (sId: string) => {
    try {
      const hId = hotelId || new URLSearchParams(window.location.search).get('hotelId') || localStorage.getItem('spicehub_customer_hotel_id') || '';
      const url = new URL(`${API_BASE}/api/v1/pos/table-session/${sId}/orders`);
      if (hId) url.searchParams.set('hotelId', hId);
      const ordersRes = await fetch(url.toString(), {
        headers: hId ? { 'x-hotel-id': hId } : {},
      });
      if (ordersRes.ok) {
        const body = await ordersRes.json();
        if (body.success && Array.isArray(body.data)) {
          setActiveOrders(body.data);
          try {
            localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(body.data));
          } catch {}
          return body.data;
        }
      }
    } catch (err) {
      console.warn('[CustomerApp] Could not fetch session orders:', err);
    }
    return null;
  }, [hotelId]);

  useEffect(() => {
    const handleMainBack = (e: MessageEvent) => {
      if (e.data?.type === 'spicehub:hardware-back-pressed') {
        if (showPaxModal) {
          setShowPaxModal(false);
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'spicehub:back-handled' }, '*');
          }
          return;
        }
        if (showLocationModal) {
          setShowLocationModal(false);
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'spicehub:back-handled' }, '*');
          }
          return;
        }
        if (occupiedTable && !occupiedTable.viewOnlyAccepted) {
          setOccupiedTable(null);
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'spicehub:exit-portal-requested' }, '*');
          }
          return;
        }
      }
    };
    window.addEventListener('message', handleMainBack);
    return () => window.removeEventListener('message', handleMainBack);
  }, [showPaxModal, showLocationModal, occupiedTable]);

  const bootstrap = useCallback(async (overrideTableNumber?: string) => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlHotelId = searchParams.get('hotelId');
      const storedHotelId = localStorage.getItem('spicehub_customer_hotel_id');
      const isCrossHotelSwitch = Boolean(urlHotelId && storedHotelId && urlHotelId !== storedHotelId);

      if (isCrossHotelSwitch) {
        console.warn(`[CustomerApp] Cross-hotel QR detected: switching from ${storedHotelId} to ${urlHotelId}. Purging previous hotel cart and active session.`);
        store.clearCart();
        setActiveOrders([]);
        localStorage.removeItem('spicehub_customer_active_orders');
        localStorage.removeItem('spicehub_customer_session_token');
        localStorage.removeItem('spicehub_customer_hotel');
        localStorage.removeItem('spicehub_customer_hotel_id');
        localStorage.removeItem('spicehub_customer_table');
        sessionStorage.removeItem('spicehub_customer_session_token');
      }

      const qHotelId = urlHotelId || storedHotelId || '6ae06d00ddbafddfbb0a8013';
      const qTableId = searchParams.get('tableId');
      const rawTable =
        overrideTableNumber ||
        searchParams.get('table') ||
        searchParams.get('tableNumber') ||
        (searchParams.get('type') === 'table' ? searchParams.get('id') : null) ||
        qTableId;
      const qrToken = searchParams.get('qrToken') || searchParams.get('token');
      const isQrEntry = Boolean((qHotelId || qrToken) && (qTableId || rawTable) && !overrideTableNumber);

      // Real QR entry is authoritative. Demo context is a local-only fallback.
      if (isQrEntry) {
        const qrUrl = new URL(`${API_BASE}/api/v1/pos/table/qr-entry`);
        qrUrl.searchParams.set('hotelId', String(qHotelId));
        if (qTableId) qrUrl.searchParams.set('tableId', String(qTableId));
        if (rawTable) qrUrl.searchParams.set('table', String(rawTable));
        if (qrToken) qrUrl.searchParams.set('token', qrToken);
        const existingClientToken = isCrossHotelSwitch
          ? null
          : (searchParams.get('sessionToken') ||
             localStorage.getItem('spicehub_customer_session_token') ||
             sessionStorage.getItem('spicehub_customer_session_token'));
        if (existingClientToken) {
          qrUrl.searchParams.set('sessionToken', existingClientToken);
        }

        const qrRes = await fetch(qrUrl.toString());
        const qrBody = await qrRes.json().catch(() => null);
        if (!qrRes.ok || !qrBody?.success || !qrBody?.data?.sessionToken) {
          if (
            qrBody?.errorCode === 'TABLE_ALREADY_OCCUPIED' ||
            qrBody?.errorCode === 'TABLE_BILLING_IN_PROGRESS' ||
            qrBody?.errorCode === 'TABLE_NOT_AVAILABLE'
          ) {
            const occData = qrBody.data || {};
            const occTableNumber = occData.tableNumber || rawTable || 'Dining';
            const occHotelId = String(occData.hotelId || qHotelId);
            const occHotelName = occData.hotelName || 'SpiceHub Hotel';

            setHotelId(occHotelId);
            setHotelName(occHotelName);
            setTableNumber(occTableNumber);
            if (occData.tableId) setTableId(String(occData.tableId));
            if (occData.section) setSection(occData.section);
            if (typeof occData.waiterEnabled === 'boolean') setWaiterEnabled(occData.waiterEnabled);
            setShowPaxModal(false);
            setCanOrder(false);
            setIsReadOnly(true);

            setOccupiedTable({
              isOccupied: true,
              isTableFull: Boolean(occData.isTableFull),
              errorCode: qrBody.errorCode,
              message: qrBody.message || `Table ${occTableNumber} is currently occupied.`,
              tableNumber: occTableNumber,
              tableId: occData.tableId ? String(occData.tableId) : undefined,
              capacity: occData.capacity || 4,
              guestCount: occData.guestCount || 4,
              hotelId: occHotelId,
              hotelName: occHotelName,
              section: occData.section,
              viewOnlyAccepted: false,
            });

            // Pre-load dishes so customer can browse catalog in view-only mode
            try {
              const menuRes = await fetch(`${API_BASE}/api/v1/pos/menu?hotelId=${encodeURIComponent(occHotelId)}`, { cache: 'no-store' });
              const menuBody = await menuRes.json().catch(() => null);
              if (menuBody?.success && Array.isArray(menuBody.data)) {
                store.setMenuItems(menuBody.data);
              }
            } catch {}

            setIsReady(true);
            return;
          }

          throw new Error(qrBody?.message || 'This table QR code is invalid or has expired.');
        }

        const d = qrBody.data;
        const qrHotelIdStr = String(d.hotelId || qHotelId);
        const qrHotelNameStr = d.hotelName || 'SpiceHub Hotel';
        const qrTableNumberStr = d.tableNumber || '';

        const previousHotelId = storedHotelId;
        const isCrossHotel = Boolean(previousHotelId && previousHotelId !== qrHotelIdStr);

        if (isCrossHotel) {
          console.warn(`[CustomerApp] Cross-hotel transfer: switched from ${previousHotelId} to ${qrHotelIdStr} (${qrHotelNameStr}). Purging old hotel cart & session.`);
          store.clearCart();
          setActiveOrders([]);
          try {
            localStorage.removeItem('spicehub_customer_active_orders');
            localStorage.removeItem('spicehub_customer_session_token');
            sessionStorage.removeItem('spicehub_customer_session_token');
          } catch {}
          setLiveToast({
            message: `Switched property to ${qrHotelNameStr} • Table ${qrTableNumberStr}`,
            type: 'success',
          });
        }

        setHotelId(qrHotelIdStr);
        setHotelName(qrHotelNameStr);
        if (d?.hotelCity || d?.hotelAddress || d?.googleMapUrl) {
          setHotelLocation({
            street: d.hotelStreet || d.hotelAddress?.street || '',
            city: d.hotelCity || d.hotelAddress?.city || 'Jaipur',
            state: d.hotelState || d.hotelAddress?.state || 'Rajasthan',
            country: d.hotelCountry || d.hotelAddress?.country || 'India',
            pincode: d.hotelPincode || d.hotelAddress?.pincode || '',
            latitude: d.hotelCoordinates?.latitude,
            longitude: d.hotelCoordinates?.longitude,
            googleMapUrl: d.googleMapUrl,
          });
        }
        setTableId(String(d.tableId));
        setTableNumber(qrTableNumberStr);
        setSection(d.section || 'Dining');
        setTableSessionId(String(d.sessionId));
        setSessionToken(String(d.sessionToken));
        setCanOrder(true);
        setIsReadOnly(false);
        setOccupiedTable(null);
        setGuestCount(Number(d.guestCount) > 0 ? Number(d.guestCount) : 2);
        if (typeof d.waiterEnabled === 'boolean') {
          setWaiterEnabled(d.waiterEnabled);
        }

        try {
          localStorage.setItem('spicehub_customer_table', qrTableNumberStr);
          localStorage.setItem('spicehub_customer_hotel', qrHotelNameStr);
          localStorage.setItem('spicehub_customer_hotel_id', qrHotelIdStr);
          localStorage.setItem('spicehub_customer_session_token', String(d.sessionToken));
          const parentOrigin = new URLSearchParams(window.location.search).get('parentOrigin');
          const allowedParentOrigins = new Set([
            'https://localhost',
            'capacitor://localhost',
            'http://localhost:3012',
            ...(import.meta.env.VITE_CUSTOMER_SHELL_ORIGINS || '')
              .split(',')
              .map((origin) => origin.trim())
              .filter(Boolean),
          ]);
          if (window.parent !== window && parentOrigin && allowedParentOrigins.has(parentOrigin)) {
            window.parent.postMessage(
              {
                type: 'spicehub:table-session-ready',
                hotelId: qrHotelIdStr,
                hotelName: qrHotelNameStr,
                tableNumber: qrTableNumberStr,
                sessionToken: String(d.sessionToken),
                isCrossHotelTransfer: isCrossHotel,
                previousHotelId,
              },
              parentOrigin
            );
          }
          const isCompanionJoining = Boolean(d.hasActiveSession || d.isExistingSession);
          if (qrTableNumberStr && !isCompanionJoining && !localStorage.getItem(`spicehub_table_pax_set_${qrTableNumberStr}`)) {
            setShowPaxModal(true);
          } else if (isCompanionJoining) {
            setShowPaxModal(false);
            setLiveToast({
              message: `Joined Table ${qrTableNumberStr} group tab! Companion orders synchronized.`,
              type: 'info',
            });
            setTimeout(() => setLiveToast(null), 5000);
          } else {
            setShowPaxModal(false);
          }
        } catch {}

        if (d.sessionId) {
          await fetchSessionOrders(String(d.sessionId));
        }
        try {
          const menuRes = await fetch(`${API_BASE}/api/v1/pos/menu?hotelId=${encodeURIComponent(qrHotelIdStr)}`, { cache: 'no-store' });
          const menuBody = await menuRes.json().catch(() => null);
          if (menuBody?.success && Array.isArray(menuBody.data)) {
            store.setMenuItems(menuBody.data);
          }
        } catch {}
        return;
      }

      // Local development / emulator bootstrap with selected or demo table.
      const res = await fetch(`${API_BASE}/api/v1/pos/demo-context`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success || !body?.data) {
        throw new Error(body?.message || 'Unable to initialize a dining session.');
      }

      const d = body.data;
      if (typeof d.waiterEnabled === 'boolean') {
        setWaiterEnabled(d.waiterEnabled);
      } else if (typeof d.hotel?.waiterEnabled === 'boolean') {
        setWaiterEnabled(d.hotel.waiterEnabled);
      }
      setHotelId(d.hotel.id);
      const urlHotel = searchParams.get('hotel') || searchParams.get('hotelName');
      setHotelName(urlHotel || d.hotel.name);
      if (d.hotel?.city || d.hotel?.address || d.hotel?.googleMapUrl) {
        setHotelLocation({
          street: d.hotel.street || d.hotel.address?.street || '',
          city: d.hotel.city || d.hotel.address?.city || 'Jaipur',
          state: d.hotel.state || d.hotel.address?.state || 'Rajasthan',
          country: d.hotel.country || d.hotel.address?.country || 'India',
          pincode: d.hotel.pincode || d.hotel.address?.pincode || '',
          latitude: d.hotel.coordinates?.latitude,
          longitude: d.hotel.coordinates?.longitude,
          googleMapUrl: d.hotel.googleMapUrl,
        });
      }

      const targetTableStr = (rawTable || 'T-04').trim();
      const numOnly = targetTableStr.replace(/[^0-9]/g, '');
      const normalizedT = numOnly ? `T-${numOnly.padStart(2, '0')}` : targetTableStr;
      const matchedTable =
        d.tables?.find(
          (t: any) =>
            t.tableNumber === targetTableStr ||
            t.tableNumber === normalizedT ||
            t.tableNumber === `T-${numOnly}` ||
            t.tableNumber === `Table ${numOnly}` ||
            t.id === targetTableStr
        ) ||
        d.table || {
          id: targetTableStr,
          tableNumber: targetTableStr,
          section: 'Indoor AC Dining',
        };

      setTableId(matchedTable.id);
      setTableNumber(matchedTable.tableNumber);
      setSection(matchedTable.section || 'Indoor AC Dining');

      try {
        const storedHotelName = urlHotel || d.hotel?.name || 'SpiceHub Hotel';
        const storedTableNumber = matchedTable.tableNumber || '';
        localStorage.setItem('spicehub_customer_table', storedTableNumber);
        localStorage.setItem('spicehub_customer_hotel', storedHotelName);
        if (d.hotel?.id) {
          localStorage.setItem('spicehub_customer_hotel_id', String(d.hotel.id));
        }
        if (storedTableNumber && !localStorage.getItem(`spicehub_table_pax_set_${storedTableNumber}`)) {
          setShowPaxModal(true);
        }
      } catch {}

      if (d.session) {
        setTableSessionId(d.session.id);
        setSessionToken(d.session.token);
        setGuestCount(Number(d.session.guestCount) > 0 ? Number(d.session.guestCount) : 2);
      }
      if (d.orders && Array.isArray(d.orders) && d.orders.length > 0) {
        setActiveOrders(d.orders);
        try {
          localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(d.orders));
        } catch {}
      } else if (d.session?.id) {
        await fetchSessionOrders(d.session.id);
      }
      if (d.menuItems && d.menuItems.length > 0) {
        store.setMenuItems(d.menuItems);
        console.log(`[CustomerApp] Loaded ${d.menuItems.length} menu items from backend`);
      }
    } catch (err: any) {
      console.warn('[CustomerApp] Session bootstrap failed:', err);
      setBootstrapError(err?.message || 'Unable to connect to this dining table.');
    } finally {
      setIsReady(true);
    }
  }, [fetchSessionOrders]);

  useEffect(() => {
    if (crossRoomParam) {
      const dest = new URL(getPortalUrl('guest'), window.location.href);
      dest.searchParams.set('room', crossRoomParam);
      dest.searchParams.set('redirectToast', 'from_table');
      if (urlParams.get('hotelId')) dest.searchParams.set('hotelId', String(urlParams.get('hotelId')));
      window.location.replace(dest.toString());
      return;
    }

    if (urlParams.get('redirectToast') || urlParams.get('redirectReason')) {
      setLiveToast({
        message: 'Redirected to your Dine-in Table Menu',
        type: 'info',
      });
      setTimeout(() => setLiveToast(null), 5000);
    }
  }, [crossRoomParam]);

  useEffect(() => {
    if (crossRoomParam) return;
    if (hasExplicitTable) {
      void bootstrap();
    } else {
      // In generic visits (no query params), prompt user to choose table or room
      setIsReady(true);
    }
  }, [hasExplicitTable, crossRoomParam, bootstrap]);

  // Connect socket once hotel and session are initialized
  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: SOCKET_URL,
      hotelId,
      tableSessionId,
      token: sessionToken || undefined,
    });

    const unbind86 = socket.on('menu:item_86_toggled', (payload: any) => {
      console.log('[CustomerApp] Realtime 86 broadcast:', payload);
      store.handleItem86Toggled(payload);
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated', { detail: payload }));
    });

    const unbindCatalogUpdated = socket.on('menu:catalog_updated', (payload: any) => {
      console.log('[CustomerApp] Realtime menu catalog updated:', payload);
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated', { detail: payload }));
    });

    const unbindCategoryCreated = socket.on('menu:category_created', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindCategoryDeleted = socket.on('menu:category_deleted', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindCategoryUpdated = socket.on('menu:category_updated', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindItemCreated = socket.on('menu:item_created', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });
    const unbindItemDeleted = socket.on('menu:item_deleted', () => {
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated'));
    });

    const handleStatusPayload = (payload: any, forcedStatus?: string) => {
      const targetStatus = forcedStatus || payload.orderStatus;
      console.log('[CustomerApp] Realtime order status event:', { payload, targetStatus });
      setActiveOrders((prev) => {
        const updated = prev.map((o) => {
          if (
            o.orderNumber === payload.orderNumber ||
            o.id === payload.orderId ||
            o.orderId === payload.orderId ||
            (payload.order && payload.order.orderNumber === o.orderNumber)
          ) {
            return { ...o, orderStatus: targetStatus };
          }
          return o;
        });
        try {
          localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (targetStatus === 'PREPARING') {
        setLiveToast({ message: '👨‍🍳 Kitchen started cooking your order fresh!', type: 'info' });
      } else if (targetStatus === 'READY') {
        setLiveToast({ message: '🔔 Your order is plated & ready! Waiter is bringing it to your table.', type: 'success' });
      } else if (targetStatus === 'SERVED') {
        setLiveToast({ message: '🍽️ Your order has been served! Enjoy your meal.', type: 'success' });
      }
      setTimeout(() => setLiveToast(null), 6000);

      if (tableSessionId) {
        fetchSessionOrders(tableSessionId);
      }
    };

    const unbindOrderStatus = socket.on('order:status_updated', (payload: any) => handleStatusPayload(payload));
    const unbindKdsPreparing = socket.on('kds:order_preparing', (payload: any) => handleStatusPayload(payload, 'PREPARING'));
    const unbindKdsReady = socket.on('kds:order_ready', (payload: any) => handleStatusPayload(payload, 'READY'));
    const unbindOrderDelivered = socket.on('order:delivered', (payload: any) => handleStatusPayload(payload, 'SERVED'));

    // Multi-Guest Collaborative Ordering: Live orders from table companions
    const unbindOrderPlaced = socket.on('table:order_placed', (payload: any) => {
      console.log('🍽️ [CustomerApp] Multi-guest order received:', payload);
      if (payload?.placedOrder) {
        setActiveOrders((prev) => {
          if (prev.some((o) => o.id === payload.placedOrder.id || o.orderNumber === payload.placedOrder.orderNumber)) {
            return prev;
          }
          const updated = [...prev, payload.placedOrder];
          try {
            localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setLiveToast({
          message: `Table companion added Order #${payload.placedOrder.orderNumber}! Sent to Kitchen KDS.`,
          type: 'success',
        });
        setTimeout(() => setLiveToast(null), 6000);
      }
      if (tableSessionId) {
        fetchSessionOrders(tableSessionId);
      }
    });

    // Realtime Cashier POS Settle Sync & Post-Payment Auto-Clear Session
    const handleBillSettledEvent = (payload: any) => {
      console.log('💳 [CustomerApp] Realtime Cashier POS Bill Settled:', payload);
      const isTargetTable =
        !payload?.tableSessionId ||
        String(payload.tableSessionId) === String(tableSessionId) ||
        (payload.tableNumber && String(payload.tableNumber) === String(tableNumber));

      if (isTargetTable) {
        setIsBillSettledModalOpen(true);
        setSettledBillInfo(payload);
        setActiveOrders([]);
        store.clearCart();
        window.dispatchEvent(new CustomEvent('spicehub:bill_settled', { detail: payload }));
        try {
          localStorage.removeItem('spicehub_customer_active_orders');
          localStorage.removeItem('spicehub_customer_session_token');
          localStorage.removeItem('spicehub_customer_table');
        } catch {}

        const parentOrigin = new URLSearchParams(window.location.search).get('parentOrigin');
        if (window.parent !== window && parentOrigin) {
          window.parent.postMessage(
            {
              type: 'spicehub:table-session-settled',
              hotelId,
              tableNumber,
              tableSessionId,
              billNumber: payload?.billNumber,
              amount: payload?.amount || payload?.grandTotal,
              paymentMode: payload?.paymentMode || 'POS',
            },
            parentOrigin
          );
        }
      }
    };

    const unbindBillSettled = socket.on('table:bill_settled', handleBillSettledEvent);
    const unbindSessionClosed = socket.on('table:session_closed', handleBillSettledEvent);

    return () => {
      unbind86();
      unbindCatalogUpdated();
      unbindCategoryCreated();
      unbindCategoryDeleted();
      unbindCategoryUpdated();
      unbindItemCreated();
      unbindItemDeleted();
      unbindOrderStatus();
      unbindKdsPreparing();
      unbindKdsReady();
      unbindOrderDelivered();
      unbindOrderPlaced();
      unbindBillSettled();
      unbindSessionClosed();
    };
  }, [hotelId, tableSessionId, tableNumber, sessionToken, fetchSessionOrders]);

  // Real-time polling fallback: while active orders are cooking or placed, keep in sync with KDS
  useEffect(() => {
    if (!tableSessionId) return;
    const hasUnservedOrders = activeOrders.some((o) => o.orderStatus !== 'SERVED' && o.orderStatus !== 'CANCELLED');
    if (!hasUnservedOrders) return;

    const interval = setInterval(() => {
      fetchSessionOrders(tableSessionId);
    }, 4000);

    return () => clearInterval(interval);
  }, [tableSessionId, activeOrders, fetchSessionOrders]);

  const handleRequestService = async (type: CustomerRequestType, notes?: string, priority?: string) => {
    console.log(`[Customer] Requesting service: ${type} for table ${tableNumber}, notes: ${notes}`);
    const reqPriority = priority || (type === 'FOOD_ISSUE' || type === 'TABLE_ISSUE' ? 'URGENT' : 'HIGH');
    
    // 1. Send HTTP request to central engine
    try {
      const res = await fetch(`${API_BASE}/api/v1/requests/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          tableId,
          tableSessionId,
          requestType: type,
          priority: reqPriority,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      console.log('Service request HTTP response:', data);
    } catch (e) {
      console.warn('HTTP request fallback to socket:', e);
    }

    // 2. Direct socket emission for 0ms millisecond sync to all on-duty waiters
    socket.emit('service:request', {
      hotelId,
      table: tableNumber,
      tableNumber,
      type,
      requestType: type,
      priority: reqPriority,
      notes: notes || undefined,
    });

    const displayMsg =
      type === 'FOOD_ISSUE' || type === 'TABLE_ISSUE'
        ? `Issue reported with URGENT priority! Waiter & floor supervisor alerted.`
        : type === 'TABLE_VACATED'
          ? `Thank you! Staff notified table is vacant for cleaning.`
          : `${type.replace(/_/g, ' ')} call sent! Waiter notified.`;

    setLiveToast({
      message: displayMsg,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 4000);
  };

  const handleCancelOrder = async (orderId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/pos/orders/${orderId}/cancel-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ hotelId, orderId, reason: 'Customer cancelled order before kitchen preparation' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setLiveToast({
          message: data?.message || 'Could not cancel order. Kitchen may have already started preparing food.',
          type: 'warn',
        });
        setTimeout(() => setLiveToast(null), 5000);
        return false;
      }
      setActiveOrders((prev) =>
        prev.map((o) => (o.id === orderId || o.orderId === orderId ? { ...o, orderStatus: 'CANCELLED' as any } : o))
      );
      setLiveToast({
        message: 'Order cancelled successfully!',
        type: 'success',
      });
      setTimeout(() => setLiveToast(null), 4000);
      return true;
    } catch (err: any) {
      setLiveToast({
        message: err?.message || 'Could not cancel order.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 4000);
      return false;
    }
  };

  const handlePlaceOrder = async (idempotencyKey: string, instructions?: string, clientItems?: any[], requestedGuestCount?: number): Promise<boolean> => {
    if (occupiedTable || !canOrder || isReadOnly) {
      setLiveToast({
        message: occupiedTable?.message || 'Table is currently occupied. Food orders cannot be placed from this device.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 5000);
      return false;
    }

    const cartItems = clientItems && clientItems.length > 0 ? clientItems : store.getCartItems();
    if (!cartItems || cartItems.length === 0) {
      console.warn('[handlePlaceOrder] cart is empty');
      return false;
    }

    if (isPlacingOrderRef.current) {
      console.warn('[handlePlaceOrder] Ignored duplicate rapid submission');
      return false;
    }
    isPlacingOrderRef.current = true;

    try {
      if (!hotelId || !tableSessionId || !sessionToken) {
      console.warn('[handlePlaceOrder] session not ready:', { hotelId, tableSessionId, sessionToken: Boolean(sessionToken) });
      setLiveToast({ message: 'Dining session is not ready. Please rescan the table QR code.', type: 'warn' });
      setTimeout(() => setLiveToast(null), 5000);
      return false;
    }

    const effectiveGuestCount =
      Number(requestedGuestCount) > 0 ? Number(requestedGuestCount) : guestCount;

    if (effectiveGuestCount !== guestCount) setGuestCount(effectiveGuestCount);

    const payload = {
      hotelId,
      tableId,
      tableSessionId,
      sessionToken,
      guestCount: effectiveGuestCount,
      items: cartItems.map((ci: any) => ({
        menuItemId: ci.id || ci.menuItemId,
        name: ci.name,
        price: ci.price || ci.unitPrice,
        quantity: ci.qty || ci.quantity || 1,
        specialInstructions: ci.specialInstructions,
      })),
      cookingInstructions: instructions || '',
      idempotencyKey,
      customerLocation: {
        onPremises: true,
        latitude: 26.9124,
        longitude: 75.7873,
        verifiedAt: new Date().toISOString(),
      },
    };

    console.log('[handlePlaceOrder] sending order payload:', JSON.stringify(payload));
    let serverOrderData: any = null;

    // Authoritative POS order placement. Never show an order that the server rejected.
    try {
      const res = await fetch(`${API_BASE}/api/v1/pos/orders/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      console.log('[handlePlaceOrder] response status:', res.status, 'data:', data);
      if (!res.ok || !data?.success || !(data?.data || data?.order)) {
        setLiveToast({
          message: data?.message || 'Order could not be sent to the kitchen. Please try again.',
          type: 'warn',
        });
        setTimeout(() => setLiveToast(null), 6000);
        return false;
      }
      serverOrderData = data.data || data.order;
    } catch (err: any) {
      console.error('[handlePlaceOrder] error:', err);
      setLiveToast({
        message: err?.message || 'Kitchen is unreachable. Your order was not placed.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 6000);
      return false;
    }

    const placeOrderId = serverOrderData._id
      ? serverOrderData._id.toString()
      : (serverOrderData.id ? String(serverOrderData.id) : '');

    const placedOrder: PlacedOrder = {
      id: placeOrderId,
      orderId: placeOrderId,
      orderNumber: serverOrderData.orderNumber,
      orderStatus: (serverOrderData.orderStatus as any) || 'PLACED',
      items: Array.isArray(serverOrderData.items) && serverOrderData.items.length > 0
        ? serverOrderData.items.map((item: any) => ({
            id: item._id ? String(item._id) : item.id,
            menuItemId: item.menuItemId ? String(item.menuItemId) : undefined,
            name: item.name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            subtotal: Number(item.subtotal) || 0,
            itemStatus: item.itemStatus,
            specialInstructions: item.specialInstructions,
          }))
        : cartItems.map((ci: any) => ({
            id: ci.id || ci.menuItemId,
            menuItemId: ci.id || ci.menuItemId,
            name: ci.name,
            quantity: ci.qty || ci.quantity || 1,
            unitPrice: ci.price || ci.unitPrice || 0,
            subtotal: (ci.price || ci.unitPrice || 0) * (ci.qty || ci.quantity || 1),
          })),
      cookingInstructions: instructions || '',
      placedAt: serverOrderData.placedAt || new Date().toISOString(),
      totalAmount: Number(serverOrderData.totalAmount) || cartItems.reduce(
        (acc: number, ci: any) => acc + (ci.price || ci.unitPrice || 0) * (ci.qty || ci.quantity || 1),
        0
      ),
    };

    setActiveOrders((prev) => {
      if (prev.some((order) => order.id === placedOrder.id && order.id)) return prev;
      const updated = [...prev, placedOrder];
      try {
        localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Guest-count updates are persisted by the backend together with the order.
    setLiveToast({
      message: `Order ${placedOrder.orderNumber} sent to Kitchen KDS! Table ${tableNumber}`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return true;
    } finally {
      isPlacingOrderRef.current = false;
    }
  };

  const handleSettleBill = async (paymentMode: 'UPI' | 'CARD' | 'CASH' | 'ROOM', amount: number, utr?: string) => {
    console.log(`[Customer] Settling bill for table ${tableNumber} (Mode: ${paymentMode}, Amount: ${amount})`);
    const idempotencyKey = `PAY_T5_${Date.now()}`;
    const payload = {
      hotelId,
      tableSessionId,
      paymentMode,
      amount,
      utrNumber: utr || (paymentMode === 'UPI' ? `UPI${Date.now()}` : undefined),
      idempotencyKey,
    };

    let result: any = null;
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
          'x-session-token': sessionToken,
        },
        body: JSON.stringify(payload),
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        setLiveToast({
          message: result?.message || 'Payment could not be completed. Please retry or call a cashier.',
          type: 'warn',
        });
        setTimeout(() => setLiveToast(null), 6000);
        return result;
      }
    } catch (err: any) {
      setLiveToast({
        message: err?.message || 'Payment gateway unreachable. No payment was recorded.',
        type: 'warn',
      });
      setTimeout(() => setLiveToast(null), 6000);
      return null;
    }

    // Only broadcast and clear after the backend has recorded the payment.
    socket.emit('payment:completed', {
      hotelId,
      tableNumber,
      tableSessionId,
      amount,
      paymentMode,
    });

    socket.emit('table:status_changed', {
      hotelId,
      tableNumber,
      status: 'NEEDS_CLEANING',
    });

    setActiveOrders([]);
    try {
      localStorage.removeItem('spicehub_customer_active_orders');
    } catch {}

    setLiveToast({
      message: `Bill ₹${amount} settled via ${paymentMode}! Table marked for cleaning.`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return result;
  };

  if (crossRoomParam) {
    return (
      <div className="min-h-screen bg-[#F2F7F2] flex flex-col items-center justify-center text-[#123C2B] p-4 font-sans">
        <div className="w-12 h-12 border-4 border-[#123C2B] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-[#123C2B]">Redirecting to In-Room Guest Portal...</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F2F7F2] flex flex-col items-center justify-center text-[#123C2B] font-sans">
        <div className="w-12 h-12 border-4 border-[#123C2B] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold tracking-wide text-[#123C2B]">Connecting to Dining Session...</p>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-[#F2F7F2] flex flex-col items-center justify-center px-6 text-center text-[#123C2B] font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-4 text-amber-700 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-[#123C2B] tracking-tight">Dining session unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-[#5D675F] leading-relaxed">{bootstrapError}</p>
        <p className="mt-1 text-xs text-[#5D675F]/80">Please rescan the QR code on your table or ask a waiter for assistance.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-2xl bg-[#123C2B] hover:bg-[#1B4D3E] px-6 py-3 text-sm font-bold text-white shadow-md active:scale-95 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      {showLocationModal && !hasExplicitTable && !crossRoomParam && !isCustomerApkEmbed && (
        <CustomerLocationSelectorModal
          isOpen={showLocationModal}
          currentApp="customer"
          apiBaseUrl={API_BASE}
          hotelId={hotelId}
          tablePortalUrl={getPortalUrl('customer')}
          roomPortalUrl={getPortalUrl('guest')}
          onSelectTable={(selectedTable) => {
            setShowLocationModal(false);
            void bootstrap(selectedTable);
          }}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Direct Camera / Chrome Scanner Pax Modal */}
      {showPaxModal && (
        <div data-testid="table-pax-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-1 border border-emerald-100">
                <Users className="w-6 h-6 text-emerald-800" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                {hotelName} • Table {tableNumber || 'Dining'}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Table Seating & Guests</h2>
              <p className="text-xs text-slate-500">Please confirm how many guests are seated with you</p>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-testid={`pax-option-${num}`}
                  onClick={() => {
                    setGuestCount(num);
                  }}
                  className={`py-3 rounded-2xl font-bold text-sm border transition flex flex-col items-center justify-center gap-0.5 ${
                    guestCount === num
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-base font-extrabold">{num}</span>
                  <span className="text-[9px] font-medium opacity-80">{num === 1 ? 'Guest' : 'Guests'}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="pax-confirm-btn"
              onClick={async () => {
                setShowPaxModal(false);
                const selectedPax = guestCount || 2;
                if (tableNumber) {
                  try {
                    localStorage.setItem(`spicehub_table_pax_set_${tableNumber}`, String(selectedPax));
                    localStorage.setItem('spicehub_customer_guest_count', String(selectedPax));
                  } catch {}
                }
                // Immediately sync guestCount to backend MongoDB session
                if (hotelId && (tableSessionId || tableId)) {
                  try {
                    await fetch(`${API_BASE}/api/v1/pos/table-session/pax`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        hotelId,
                        tableId,
                        tableSessionId,
                        sessionToken,
                        guestCount: selectedPax,
                      }),
                    });
                  } catch (err) {
                    console.warn('Failed to sync table session pax:', err);
                  }
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Confirm & View Menu ({guestCount || 2} Pax)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table Already Occupied Bilingual Alert Screen */}
      {occupiedTable && !occupiedTable.viewOnlyAccepted && (
        <div data-testid="table-already-occupied-screen" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-6 text-center text-slate-900 sm:p-8">
            {/* Top Warning Badge */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                {occupiedTable.errorCode === 'TABLE_BILLING_IN_PROGRESS' ? 'BILLING IN PROGRESS' : 'TABLE ALREADY OCCUPIED'}
              </span>
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
                Table {occupiedTable.tableNumber} is Occupied
              </h2>
              <p className="text-sm font-medium text-red-600">
                Table is currently occupied • {occupiedTable.guestCount || 4} guests seated
              </p>
            </div>

            {/* Occupancy details card */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-left text-xs">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-1.5">
                <span className="text-slate-500">Current Seated Guests:</span>
                <span className="shrink-0 font-semibold text-slate-900">{occupiedTable.guestCount || 4} Guests Seated</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-1.5">
                <span className="text-slate-500">Table Capacity:</span>
                <span className="shrink-0 font-semibold text-slate-900">{occupiedTable.capacity || 4} Seats</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-1.5">
                <span className="text-slate-500">Occupancy Status:</span>
                <span className="shrink-0 text-right font-semibold uppercase text-red-600">
                  {occupiedTable.isTableFull ? 'Full Capacity Reached (100%)' : 'Active Dining Session'}
                </span>
              </div>
              <p className="pt-1 text-[11px] leading-relaxed text-slate-500">
                For guest privacy and billing integrity, when a table is occupied, new orders cannot be placed from another personal device.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Option 0: Resume My Table Session */}
              {localStorage.getItem('spicehub_customer_table') === occupiedTable.tableNumber && (
                <button
                  type="button"
                  data-testid="occupied-resume-session-btn"
                  onClick={() => {
                    setOccupiedTable(null);
                    setCanOrder(true);
                    setIsReadOnly(false);
                    const savedOrders = localStorage.getItem('spicehub_customer_active_orders');
                    if (savedOrders) {
                      try {
                        setActiveOrders(JSON.parse(savedOrders));
                      } catch {}
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm active:scale-98"
                >
                  <span>I am Dining at Table {occupiedTable.tableNumber} (Resume Order)</span>
                </button>
              )}

              {/* Option 1: Call Waiter */}
              <button
                type="button"
                data-testid="occupied-call-waiter-btn"
                onClick={async () => {
                  try {
                    await handleRequestService('CALL_WAITER');
                    setLiveToast({ message: `Waiter notified! Staff will assist you at Table ${occupiedTable.tableNumber}`, type: 'success' });
                  } catch (e) {
                    setLiveToast({ message: 'Waiter call dispatched to staff.', type: 'info' });
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                <span>Call Waiter</span>
              </button>

              {/* Option 2: View Menu (View-Only) */}
              <button
                type="button"
                data-testid="occupied-view-menu-btn"
                onClick={() => {
                  setOccupiedTable(prev => prev ? ({ ...prev, viewOnlyAccepted: true }) : null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span>Browse menu (view only)</span>
              </button>

              {/* Option 3: Choose Another Table */}
              <button
                type="button"
                data-testid="occupied-select-another-btn"
                onClick={() => {
                  setShowLocationModal(true);
                }}
                className="w-full py-2.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
              >
                Select or Scan Another Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Cashier POS Settle & Post-Payment Auto-Clear Modal */}
      {isBillSettledModalOpen && (
        <div
          data-testid="cashier-bill-settled-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40 shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Payment Received • Bill Settled
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                Thank You for Dining!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your dining tab for <strong className="text-emerald-700 dark:text-emerald-300">Table {tableNumber}</strong> has been successfully settled at Cashier POS.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Bill Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #{settledBillInfo?.billNumber || 'SETTLED'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Settled Amount</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                  ₹{settledBillInfo?.amount || settledBillInfo?.grandTotal || '0'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Payment Mode</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {settledBillInfo?.paymentMode || 'Cashier POS'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Your session has been cleared. To order again later, simply re-scan the table standee.
            </p>

            <button
              type="button"
              data-testid="settled-modal-done-btn"
              onClick={() => {
                setIsBillSettledModalOpen(false);
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'spicehub:exit-portal-requested' }, '*');
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition cursor-pointer"
            >
              Done / Return to Home
            </button>
          </div>
        </div>
      )}

      {liveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm dark:shadow-none border text-sm font-bold flex items-center justify-between gap-2 ${
 liveToast.type === 'success'
 ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
 : 'bg-slate-900 text-amber-200 border-amber-600'
 }`}
          >
            <span>{liveToast.message}</span>
            <button onClick={() => setLiveToast(null)} className="text-white/60 hover:text-white p-0.5" aria-label="Close toast">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <CustomerMenuApp
        store={store}
        hotelName={hotelName}
        hotelLocation={hotelLocation}
        tableNumber={tableNumber}
        section={section}
        onRequestService={handleRequestService}
        onPlaceOrder={handlePlaceOrder}
        onCancelOrder={handleCancelOrder}
        onSettleBill={handleSettleBill}
        activeOrders={activeOrders}
        initialGuestCount={guestCount}
        hotelId={hotelId}
        waiterEnabled={waiterEnabled}
        canOrder={canOrder && !occupiedTable}
        isReadOnly={isReadOnly || Boolean(occupiedTable)}
        occupiedWarning={occupiedTable?.message}
        onRefreshOrders={() => {
          if (tableSessionId) fetchSessionOrders(tableSessionId);
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
          <CustomerAppRoot />
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
