import './index.css';
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerMenuApp, CustomerRequestType } from './CustomerMenuApp';
import { ErrorBoundary, MenuCartStore, CustomerLocationSelectorModal, CustomerPortalSwitcherBar, I18nProvider } from '@spicehub/ui';
import { SpiceHubSocket, SpiceHubClient } from '@spicehub/api-client';
import { API_ORIGIN, SOCKET_URL } from './config/api';
import { getPortalUrl } from './config/env';

const store = MenuCartStore.getInstance();
const socket = SpiceHubSocket.getInstance();
const API_BASE = API_ORIGIN;

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

  const [showLocationModal, setShowLocationModal] = useState<boolean>(() => !hasExplicitTable && !crossRoomParam);
  const [hotelId, setHotelId] = useState<string>('');
  const [hotelName, setHotelName] = useState<string>('SpiceHub Hotel');
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
  const [showPaxModal, setShowPaxModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const sp = new URLSearchParams(window.location.search);
    const tbl = sp.get('table') || sp.get('tableNumber') || sp.get('tableId');
    if (tbl) {
      const alreadyConfirmed = localStorage.getItem(`spicehub_table_pax_set_${tbl}`);
      return !alreadyConfirmed;
    }
    return false;
  });
  const [waiterEnabled, setWaiterEnabled] = useState<boolean>(true);
  const [bootstrapError, setBootstrapError] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);
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
      const ordersRes = await fetch(`${API_BASE}/api/v1/pos/table-session/${sId}/orders`);
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
      console.warn('⚠️ [CustomerApp] Could not fetch session orders:', err);
    }
    return null;
  }, []);

  const bootstrap = useCallback(async (overrideTableNumber?: string) => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const qHotelId = searchParams.get('hotelId') || localStorage.getItem('spicehub_customer_hotel_id') || '6ae06d00ddbafddfbb0a8013';
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
        const existingClientToken =
          searchParams.get('sessionToken') ||
          localStorage.getItem('spicehub_customer_session_token') ||
          sessionStorage.getItem('spicehub_customer_session_token');
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

        setHotelId(qrHotelIdStr);
        setHotelName(qrHotelNameStr);
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
          if (qrTableNumberStr && !localStorage.getItem(`spicehub_table_pax_set_${qrTableNumberStr}`)) {
            setShowPaxModal(true);
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
        console.log(`✅ [CustomerApp] Loaded ${d.menuItems.length} menu items from backend`);
      }
    } catch (err: any) {
      console.warn('⚠️ [CustomerApp] Session bootstrap failed:', err);
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
        message: '🍽️ Redirected to your Dine-in Table Menu',
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
      console.log('⚡ [CustomerApp] Realtime 86 broadcast:', payload);
      store.handleItem86Toggled(payload);
      window.dispatchEvent(new CustomEvent('spicehub:menu_updated', { detail: payload }));
    });

    const unbindCatalogUpdated = socket.on('menu:catalog_updated', (payload: any) => {
      console.log('⚡ [CustomerApp] Realtime menu catalog updated:', payload);
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

    const unbindOrderStatus = socket.on('order:status_updated', (payload: any) => {
      console.log('⚡ [CustomerApp] Order status updated:', payload);
      setActiveOrders((prev) => {
        const updated = prev.map((o) => {
          if (
            o.orderNumber === payload.orderNumber ||
            o.id === payload.orderId ||
            o.orderId === payload.orderId ||
            (payload.order && payload.order.orderNumber === o.orderNumber)
          ) {
            return { ...o, orderStatus: payload.orderStatus };
          }
          return o;
        });
        try {
          localStorage.setItem('spicehub_customer_active_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (payload.orderStatus === 'PREPARING') {
        setLiveToast({ message: '🍳 Kitchen started cooking your order!', type: 'info' });
      } else if (payload.orderStatus === 'READY') {
        setLiveToast({ message: '🔔 Your order is ready! Waiter is bringing it to your table.', type: 'success' });
      } else if (payload.orderStatus === 'SERVED') {
        setLiveToast({ message: '🍽️ Your order has been served! Enjoy your meal.', type: 'success' });
      }
      setTimeout(() => setLiveToast(null), 6000);
    });

    return () => {
      unbind86();
      unbindCatalogUpdated();
      unbindCategoryCreated();
      unbindCategoryDeleted();
      unbindCategoryUpdated();
      unbindItemCreated();
      unbindItemDeleted();
      unbindOrderStatus();
    };
  }, [hotelId, tableSessionId, sessionToken]);

  const handleRequestService = async (type: CustomerRequestType) => {
    console.log(`🛎️ [Customer] Requesting service: ${type} for table ${tableNumber}`);
    
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
          priority: 'HIGH',
        }),
      });
      const data = await res.json();
      console.log('✅ Service request HTTP response:', data);
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
      priority: 'HIGH',
    });

    setLiveToast({
      message: `🛎️ ${type.replace(/_/g, ' ')} call sent! Waiter notified.`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 4000);
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
      message: `🎉 Order ${placedOrder.orderNumber} sent to Kitchen KDS! Table ${tableNumber}`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return true;
  };

  const handleSettleBill = async (paymentMode: 'UPI' | 'CARD' | 'CASH' | 'ROOM', amount: number, utr?: string) => {
    console.log(`💳 [Customer] Settling bill for table ${tableNumber} (Mode: ${paymentMode}, Amount: ${amount})`);
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
      message: `🎉 Bill ₹${amount} settled via ${paymentMode}! Table marked for cleaning.`,
      type: 'success',
    });
    setTimeout(() => setLiveToast(null), 5000);
    return result;
  };

  if (crossRoomParam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-amber-400">Redirecting to In-Room Guest Portal...</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide text-amber-400">Connecting to Dining Session...</p>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-amber-400">Dining session unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">{bootstrapError}</p>
        <p className="mt-1 text-xs text-slate-500">Please rescan the QR code on your table or ask a waiter for help.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
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
      <CustomerPortalSwitcherBar
        currentApp="customer"
        currentLocationName={tableNumber ? `Table ${tableNumber}${paramFormat ? ` (${paramFormat})` : ''}` : undefined}
        destinationUrl={getPortalUrl('guest')}
      />

      {/* Direct Camera / Chrome Scanner Pax Modal */}
      {showPaxModal && (
        <div data-testid="table-pax-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-sm w-full p-6 text-white shadow-sm dark:shadow-none space-y-5">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-black mb-2 border border-amber-500/30">
                👥
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                {hotelName} • Table {tableNumber || 'Dining'}
              </span>
              <h2 className="text-xl font-black text-white">Table pe kitne log hain?</h2>
              <p className="text-xs text-slate-400">Select how many guests are seated with you</p>
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
                  className={`py-3 rounded-2xl font-black text-sm border transition flex flex-col items-center justify-center gap-0.5 ${
                    guestCount === num
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                      : 'bg-slate-900 border-slate-700 hover:border-amber-500/50 text-white'
                  }`}
                >
                  <span className="text-base">{num}</span>
                  <span className="text-[9px] font-bold opacity-75">{num === 1 ? 'Guest' : 'Guests'}</span>
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
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition"
            >
              Continue to Menu ({guestCount || 2} Pax) ➔
            </button>
          </div>
        </div>
      )}

      {/* Table Already Occupied Bilingual Alert Screen */}
      {occupiedTable && !occupiedTable.viewOnlyAccepted && (
        <div data-testid="table-already-occupied-screen" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-md w-full p-6 sm:p-8 text-white shadow-sm dark:shadow-none space-y-6 text-center animate-fadeIn">
            {/* Top Warning Badge */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center text-3xl font-black border border-red-500/40 shadow-lg shadow-sm">
              🚫
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                {occupiedTable.errorCode === 'TABLE_BILLING_IN_PROGRESS' ? 'BILLING IN PROGRESS' : 'TABLE ALREADY OCCUPIED'}
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Table {occupiedTable.tableNumber} is Occupied
              </h2>
              <p className="text-sm font-bold text-red-300">
                Table is currently occupied • {occupiedTable.guestCount || 4} guests seated
              </p>
            </div>

            {/* Occupancy details card */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Current Seated Guests:</span>
                <span className="font-bold text-amber-400">{occupiedTable.guestCount || 4} Guests Seated</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Table Capacity:</span>
                <span className="font-bold text-white">{occupiedTable.capacity || 4} Seats</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Occupancy Status:</span>
                <span className="font-black text-red-400 uppercase">
                  {occupiedTable.isTableFull ? 'Full Capacity Reached (100%)' : 'Active Dining Session'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                For guest privacy and billing integrity, when a table is occupied, new orders cannot be placed from another personal device.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Option 1: Call Waiter */}
              <button
                type="button"
                data-testid="occupied-call-waiter-btn"
                onClick={async () => {
                  try {
                    await handleRequestService('CALL_WAITER');
                    setLiveToast({ message: `🛎️ Waiter notified! Staff will assist you at Table ${occupiedTable.tableNumber}`, type: 'success' });
                  } catch (e) {
                    setLiveToast({ message: 'Waiter call dispatched to staff.', type: 'info' });
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition"
              >
                <span>🛎️ Call Waiter</span>
              </button>

              {/* Option 2: View Menu (View-Only) */}
              <button
                type="button"
                data-testid="occupied-view-menu-btn"
                onClick={() => {
                  setOccupiedTable(prev => prev ? ({ ...prev, viewOnlyAccepted: true }) : null);
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <span>📖 Browse Menu (View-Only)</span>
              </button>

              {/* Option 3: Choose Another Table */}
              <button
                type="button"
                data-testid="occupied-select-another-btn"
                onClick={() => {
                  setShowLocationModal(true);
                }}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white font-medium text-xs transition"
              >
                Select or Scan Another Table
              </button>
            </div>
          </div>
        </div>
      )}

      {liveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm dark:shadow-none border text-sm font-bold flex items-center justify-between gap-2 ${
              liveToast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
                : 'bg-amber-950 text-amber-200 border-amber-600'
            }`}
          >
            <span>{liveToast.message}</span>
            <button onClick={() => setLiveToast(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      )}
      <CustomerMenuApp
        store={store}
        hotelName={hotelName}
        tableNumber={tableNumber}
        section={section}
        onRequestService={handleRequestService}
        onPlaceOrder={handlePlaceOrder}
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
