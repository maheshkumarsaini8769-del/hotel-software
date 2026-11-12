import './index.css';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { waiterFetch, getWaiterToken } from './lib/waiterApi';
import { API_BASE_URL, SOCKET_URL } from './config/api';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { WaiterMobileApp, TableStatusItem } from './WaiterMobileApp';
import type { RoomServiceOrder } from './views/RoomServiceView';
import { ErrorBoundary, WaiterStore, I18nProvider, IMAGE_PLACEHOLDER, installGlobalNumericInputGuard } from '@spicehub/ui';
import { hydrateStaffLaunchContext, SpiceHubSocket } from '@spicehub/api-client';

installGlobalNumericInputGuard();
import {
  WaiterLoginScreen,
  WaiterStaffProfile,
  WaiterAuthSession,
} from './components/WaiterLoginScreen';
import { PortalsSwitcherModal } from './components/PortalsSwitcherModal';
import { Bell, UtensilsCrossed } from 'lucide-react';
import { AppNotificationItem } from './components/notifications/NotificationCenterModal';
import {
  isOrderServed,
  markOrderServedInStorage,
  getTablesServedMap,
} from './utils/servedOrdersStorage';

const store = WaiterStore.getInstance();
const socket = SpiceHubSocket.getInstance();

/**
 * Credentials must never be written to localStorage. The in-memory session
 * keeps the PIN only long enough to complete this login; persisted sessions
 * are profile data only.
 */
function persistWaiterSession(staff: WaiterStaffProfile): void {
  const { pin: _pin, ...safeStaff } = staff;
  localStorage.setItem('spicehub_waiter_session', JSON.stringify(safeStaff));
}

function waiterProfileFromServer(user: any): WaiterStaffProfile | null {
  if (!user || String(user.role || '').toUpperCase() !== 'WAITER') return null;
  const start = Number(user.assignedTableStart) || 0;
  const end = Number(user.assignedTableEnd) || 0;
  return {
    staffId: String(user.id || user._id || ''),
    name: String(user.name || 'Waiter'),
    role: 'Senior Waiter',
    avatar: String(user.avatar || IMAGE_PLACEHOLDER),
    assignedSection: String(user.assignedSection || ''),
    assignedTableStart: start,
    assignedTableEnd: end,
    assignedTableCount: start > 0 && end >= start ? end - start + 1 : 0,
    shift: String(user.shift || ''),
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  };
}

// A waiter with no assigned zone covers the whole floor. Treating 0-0 as an
// empty range used to drop every service request, so an unassigned waiter never
// heard a "Call Waiter" buzzer.
function isTableInWaiterZone(
  table: unknown,
  start: number | undefined,
  end: number | undefined
): boolean {
  const numOnly = parseInt(String(table ?? '').replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(numOnly)) return true;
  const hasZone =
    Number.isFinite(start) && Number.isFinite(end) && Number(end) >= Number(start) && Number(end) > 0;
  if (!hasZone) return true;
  return numOnly >= Number(start) && numOnly <= Number(end);
}

// Audio chime using browser Web Audio API
function playAlertChime(type: 'request' | 'ready' = 'request') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'ready') {
      // Pleasant double chime for food ready
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    } else {
      // Urgent triple pulse for customer assistance
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24); // C6
    }

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (e) {
    console.warn('Audio chime skipped:', e);
  }
}

async function requestWaiterNotificationPermission(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.info('System notifications are disabled for the Waiter app.');
      }
      return;
    } catch (error) {
      console.warn('Could not request Android notification permission:', error);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.info('Browser notifications are disabled for the Waiter portal.');
      }
    } catch (error) {
      console.warn('Could not request browser notification permission:', error);
    }
  }
}

async function triggerNativeNotification(title: string, body: string, tag?: string): Promise<void> {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage(
      { type: 'spicehub:system-notification', title, body, tag },
      '*'
    );
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 2_147_483_647),
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) },
            extra: { tag },
          }],
        });
        return;
      }
    } catch (error) {
      console.warn('Android system notification could not be scheduled:', error);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: tag || String(Date.now()),
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.warn('Browser system notification could not be shown:', error);
    }
  }
}

export const WaiterAppRoot: React.FC = () => {
  // Tenant context comes from the signed-in staff session. No hardcoded hotel.
  const [hotelId, setHotelId] = useState<string>('');
  const [notSubscribed, setNotSubscribed] = useState<boolean>(false);
  const [expectedStaffId] = useState<string>(() => {
    const launchContext = hydrateStaffLaunchContext();
    if (typeof window === 'undefined') return '';

    const url = new URL(window.location.href);
    ['staffId', 'staffName', 'staffRole', 'avatar', 'section', 'tableStart', 'tableEnd', 'shift'].forEach((key) => {
      url.searchParams.delete(key);
    });
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
    return launchContext.staffId || '';
  });
  const [waiterSession, setWaiterSession] = useState<WaiterStaffProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem('spicehub_token')));
  const [authError, setAuthError] = useState('');
  const handledServiceRequestsRef = useRef(new Set<string>());
  // Validate the persisted staff session on boot. An expired JWT must not leave
  // the terminal in a half-authenticated state.
  useEffect(() => {
    const token =
      (typeof window !== 'undefined' && localStorage.getItem('spicehub_token')) || '';
    if (!token) {
      setAuthChecking(false);
      setWaiterSession(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await waiterFetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(localStorage.getItem('spicehub_hotel_id')
              ? { 'x-hotel-id': localStorage.getItem('spicehub_hotel_id')! }
              : {}),
          },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('spicehub_token');
          localStorage.removeItem('spicehub_hotel_id');
          localStorage.removeItem('spicehub_auth_user');
          localStorage.removeItem('spicehub_waiter_session');
          if (!cancelled) setWaiterSession(null);
          if (!cancelled) setAuthError('Your staff session is no longer valid. Sign in again.');
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setWaiterSession(null);
            setAuthError('Could not verify staff access with the hotel server. Retry when connected.');
          }
          return;
        }
        const body = await response.json().catch(() => null);
        const user = body?.data?.user;
        const tenant = body?.data?.tenant;
        const profile = waiterProfileFromServer(user);
        if (
          !profile?.staffId ||
          (expectedStaffId && profile.staffId !== expectedStaffId)
        ) {
          localStorage.removeItem('spicehub_token');
          localStorage.removeItem('spicehub_hotel_id');
          localStorage.removeItem('spicehub_auth_user');
          localStorage.removeItem('spicehub_waiter_session');
          if (!cancelled) {
            setWaiterSession(null);
            setAuthError('This account is not authorized for the Waiter portal. Sign in with an active waiter profile.');
          }
          return;
        }
        if (tenant?.enabledPortals && Array.isArray(tenant.enabledPortals)) {
          if (!tenant.enabledPortals.includes('waiter')) {
            if (!cancelled) {
              setNotSubscribed(true);
              setWaiterSession(null);
            }
            return;
          } else {
            if (!cancelled) setNotSubscribed(false);
          }
        }
        if (user?.hotelId && !cancelled) {
          localStorage.setItem('spicehub_hotel_id', String(user.hotelId));
          setHotelId(String(user.hotelId));
          setWaiterSession(profile);
          setAuthError('');
          persistWaiterSession(profile);
          localStorage.setItem('spicehub_auth_user', JSON.stringify(user));
        }
      } catch {
        if (!cancelled) {
          setWaiterSession(null);
          setAuthError('Could not verify staff access with the hotel server. Retry when connected.');
        }
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expectedStaffId]);

  const [isPortalsModalOpen, setIsPortalsModalOpen] = useState(false);
  const [waiterUser, setWaiterUser] = useState<{ id: string; name: string }>(() => {
    return {
      id: waiterSession?.staffId || '',
      name: waiterSession ? `${waiterSession.name} (${waiterSession.role})` : 'Staff not signed in',
    };
  });
  const [notification, setNotification] = useState<{ message: string; type: 'urgent' | 'success' } | null>(null);
  const [tables, setTables] = useState<TableStatusItem[]>([]);
  const [readyOrderAlert, setReadyOrderAlert] = useState<{ orderNumber: string; tableNumber: string } | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [waiterFloat, setWaiterFloat] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<
    Array<{ id: string; orderNumber: string; location: string; total: number; orderStatus: string; updatedAt: string }>
  >([]);
  // Notifications are driven by real socket events and server-side service
  // requests. No demo order numbers are fabricated on startup.
  const getInitialNotificationsForWaiter = (_start: number): AppNotificationItem[] => [];

  const [notifications, setNotifications] = useState<AppNotificationItem[]>(() => {
    return getInitialNotificationsForWaiter(waiterSession?.assignedTableStart || 1);
  });

  useEffect(() => {
    if (waiterSession) {
      setNotifications(getInitialNotificationsForWaiter(waiterSession.assignedTableStart));
    }
  }, [waiterSession?.staffId, waiterSession?.assignedTableStart]);

  const scopedNotifications = useMemo(() => {
    if (!waiterSession) return notifications;
    return notifications.filter((n) => {
      if (!n.tableNumber) return true;
      return (
        isTableInWaiterZone(
          n.tableNumber,
          waiterSession.assignedTableStart,
          waiterSession.assignedTableEnd
        ) || (n as any).isDelegatedToMe
      );
    });
  }, [notifications, waiterSession]);

  const handleSendTestAlert = () => {
    playAlertChime('ready');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (_) {}
    }
    const testNotif: AppNotificationItem = {
      id: `test-${Date.now()}`,
      title: '🍳 Test Kitchen Alert: Table 5 Ready',
      message: 'Chef Vikram finished KOT #D1035 (2x Dal Makhani, 4x Garlic Naan). 60s pickup timer started!',
      type: 'order_ready',
      severity: 'urgent',
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      tableNumber: 'Table 5',
      orderNumber: '#D1035',
      isRead: false,
      actionLabel: 'Pick Up & Serve',
    };
    setNotifications((prev) => [testNotif, ...prev]);
    void triggerNativeNotification('Kitchen Alert: Table 5', 'Order #D1035 ready for pickup at Hot Pass!');
    setNotification({
      message: 'Real-time test notification triggered! Sound chime & card attached.',
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = (staff: WaiterStaffProfile, session?: WaiterAuthSession) => {
    setWaiterSession(staff);
    setAuthError('');
    void requestWaiterNotificationPermission();
    try {
      persistWaiterSession(staff);
    } catch (_) {}

    if (session?.token) {
      // Persist the server issued JWT so the terminal stays authenticated
      // across reloads. The PIN itself is never stored.
      localStorage.setItem('spicehub_token', session.token);
      if (session.user?.hotelId) {
        localStorage.setItem('spicehub_hotel_id', session.user.hotelId);
        setHotelId(session.user.hotelId);
      }
      localStorage.setItem(
        'spicehub_auth_user',
        JSON.stringify({
          id: session.user?.id || staff.staffId,
          name: session.user?.name || staff.name,
          email: session.user?.email || '',
          role: session.user?.role || staff.role,
          hotelId: session.user?.hotelId || '',
        })
      );
    }

    setWaiterUser({ id: staff.staffId, name: `${staff.name} (${staff.role})` });
    store.setProfile({
      userId: staff.staffId,
      name: staff.name,
      hotelId: session?.user?.hotelId || hotelId,
      shiftStatus: 'ON_DUTY' as any,
    });
    setNotification({
      message: staff.assignedTableStart > 0 && staff.assignedTableEnd >= staff.assignedTableStart
        ? `Logged in as ${staff.name} (${staff.role}). Assigned Zone: Tables T-${String(staff.assignedTableStart).padStart(2, '0')} to T-${String(staff.assignedTableEnd).padStart(2, '0')}.`
        : `Logged in as ${staff.name} (${staff.role}). No table assignment is configured.`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogout = () => {
    setWaiterSession(null);
    try {
      localStorage.removeItem('spicehub_waiter_session');
      localStorage.removeItem('spicehub_token');
      localStorage.removeItem('spicehub_hotel_id');
      localStorage.removeItem('spicehub_auth_user');
    } catch (_) {}
  };

  const handleUpdateProfilePhoto = (newAvatar: string) => {
    if (!waiterSession) return;
    const updated: WaiterStaffProfile = { ...waiterSession, avatar: newAvatar };
    setWaiterSession(updated);
    try {
      persistWaiterSession(updated);
      const customAvatars = JSON.parse(localStorage.getItem('spicehub_custom_waiter_avatars') || '{}');
      customAvatars[waiterSession.staffId] = newAvatar;
      localStorage.setItem('spicehub_custom_waiter_avatars', JSON.stringify(customAvatars));
    } catch (_) {}

    // Persist to backend API
    waiterFetch(`${API_BASE_URL}/hotel-staff/${waiterSession.staffId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: newAvatar }),
    }).catch((err) => console.warn('Backend avatar update skipped:', err));

    setNotification({
      message: `✓ Profile photo updated for ${waiterSession.name}!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTables = useCallback(async (hId: string) => {
    try {
      const res = await waiterFetch(`${API_BASE_URL}/table-management/tables?hotelId=${hId}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          const tablesServedMap = getTablesServedMap();
          const mapped: TableStatusItem[] = body.data.flatMap((t: any) => {
            const tableNumber = typeof t.tableNumber === 'string' ? t.tableNumber.trim() : '';
            const tableNum = Number(tableNumber.replace(/\D/g, ''));
            if (!tableNumber || !Number.isInteger(tableNum) || tableNum <= 0) return [];

            const assignedWaiterId = t.assignedWaiterId?._id || t.assignedWaiterId?.id || t.assignedWaiterId;
            const hasExplicitAssignment = Boolean(assignedWaiterId);
            const isAssigned = hasExplicitAssignment
              ? String(assignedWaiterId) === String(waiterUser.id)
              : isTableInWaiterZone(
                  tableNum,
                  waiterSession?.assignedTableStart,
                  waiterSession?.assignedTableEnd
                );

            const rawStatus = String(t.currentStatus || '').toUpperCase();
            if (!['AVAILABLE', 'OCCUPIED', 'PARTIALLY_OCCUPIED', 'BILLING', 'PAYMENT_SETTLED', 'CLEANING', 'DIRTY', 'RESERVED'].includes(rawStatus)) {
              return [];
            }
            let status: 'Available' | 'Occupied' | 'My Table' | 'Cleaning' | 'Reserved' = 'Available';
            if (rawStatus === 'OCCUPIED' || rawStatus === 'PARTIALLY_OCCUPIED') {
              status = isAssigned ? 'My Table' : 'Occupied';
            } else if (rawStatus === 'BILLING' || rawStatus === 'PAYMENT_SETTLED') {
              status = isAssigned ? 'My Table' : 'Occupied';
            } else if (rawStatus === 'CLEANING' || rawStatus === 'DIRTY') {
              status = 'Cleaning';
            } else if (rawStatus === 'RESERVED') {
              status = 'Reserved';
            } else {
              status = 'Available';
            }
            return {
              id: tableNum,
              name: tableNumber.replace(/^T-0?/, ''),
              guests: Number.isFinite(t.capacity) ? Number(t.capacity) : undefined,
              status,
              isAssignedToMe: isAssigned,
              assignedWaiterName: typeof t.assignedWaiter === 'string' ? t.assignedWaiter : t.assignedWaiter?.name,
              assignedWaiterId: assignedWaiterId ? String(assignedWaiterId) : undefined,
              section: t.section,
              servedStatus: (tablesServedMap[String(tableNum)] === 'SERVED' || t.orderStatus === 'SERVED')
                ? 'SERVED'
                : (status === 'My Table' || status === 'Occupied' ? 'NOT_SERVED' : undefined),
              customerClaimedGuests: t.customerClaimedGuests ?? undefined,
              actualGuests: t.actualGuests ?? undefined,
              paxVerified: typeof t.paxVerified === 'boolean' ? t.paxVerified : undefined,
            };
          });
          setTables(mapped);
        }
      }
    } catch (err) {
      console.warn('Tables fetch error:', err);
    }
  }, [waiterSession, waiterUser.id]);

  // Live waiter cash float (server side, tenant + staff scoped).
  const fetchWaiterFloat = useCallback(async () => {
    // The float register is tenant + staff scoped: only fetch it once a staff
    // session exists.
    if (!getWaiterToken()) return;
    try {
      const response = await waiterFetch(`${API_BASE_URL}/waiter-cash-float/active`);
      if (!response.ok) return;
      const body = await response.json();
      if (body?.success) {
        setWaiterFloat(body.activeFloat || null);
      }
    } catch (err) {
      console.warn('Waiter float fetch error:', err);
    }
  }, []);

  const openWaiterFloat = useCallback(
    async (amount: number) => {
      const response = await waiterFetch(`${API_BASE_URL}/waiter-cash-float/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingFloat: amount, waiterName: waiterUser.name }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || 'Could not open the waiter float.');
      }
      await fetchWaiterFloat();
    },
    [fetchWaiterFloat, waiterUser.name]
  );

  // Live completed orders for the dashboard "Recent Completed" list.
  const fetchRecentOrders = useCallback(async (hId: string) => {
    if (!hId) return;
    try {
      const response = await waiterFetch(
        `${API_BASE_URL}/pos/orders/recent?status=SERVED&limit=5&hotelId=${encodeURIComponent(hId)}`
      );
      if (!response.ok) return;
      const body = await response.json();
      if (body.success && Array.isArray(body.data)) {
        setRecentOrders(
          body.data.map((order: any) => ({
            id: String(order.id || order._id),
            orderNumber: String(order.orderNumber || ''),
            location: String(order.location || '—'),
            total: Number(order.total || 0),
            orderStatus: String(order.orderStatus || ''),
            updatedAt: String(order.updatedAt || order.servedAt || new Date().toISOString()),
          }))
        );
      }
    } catch (err) {
      console.warn('Recent orders fetch error:', err);
    }
  }, []);

  // Live menu catalog for the Menu & Stock view and Quick KOT sheet.
  const fetchMenuItems = useCallback(async (hId: string) => {
    if (!hId) return;
    try {
      const res = await waiterFetch(`${API_BASE_URL}/pos/menu?hotelId=${encodeURIComponent(hId)}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setMenuItems(body.data);
        }
      }
    } catch (err) {
      console.warn('Menu fetch error:', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        // The signed-in staff session carries the tenant. The demo context is
        // only a fallback for an unauthenticated local preview.
        const sessionHotelId =
          (typeof window !== 'undefined' && localStorage.getItem('spicehub_hotel_id')) || '';
        const res = sessionHotelId
          ? { ok: true, json: async () => ({ success: true, data: { hotel: { id: sessionHotelId } } }) }
          : await waiterFetch(`${API_BASE_URL}/pos/demo-context`);
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const d = body.data;
            if (d.hotel?.id) {
              setHotelId(d.hotel.id);
            }
            if (d.hotel?.id) {
              fetchTables(d.hotel.id);
              void fetchRecentOrders(d.hotel.id);
              void fetchMenuItems(d.hotel.id);
            }
            if (d.menuItems && Array.isArray(d.menuItems) && d.menuItems.length > 0) {
              setMenuItems(d.menuItems);
            }
            if (!waiterSession && d.waiter) {
              setWaiterUser({ id: d.waiter.id, name: d.waiter.name });
              store.setProfile({
                userId: d.waiter.id,
                name: d.waiter.name,
                hotelId: d.hotel.id,
                shiftStatus: 'ON_DUTY' as any,
              });
            }

            // Fetch any existing open requests for this hotel
            try {
              const reqRes = await waiterFetch(`${API_BASE_URL}/requests/waiter/assigned?hotelId=${d.hotel.id}`);
              if (reqRes.ok) {
                const reqBody = await reqRes.json();
                if (reqBody.success && Array.isArray(reqBody.data)) {
                  // Replace the local request queue with the server snapshot so
                  // resolved calls never linger and no demo call is fabricated.
                  store.setRequests(
                    reqBody.data.map((r: any) => ({
                      id: r.id || r._id,
                      requestType: r.requestType || r.type || 'CALL_WAITER',
                      tableNumber:
                        r.tableNumber ||
                        r.table?.tableNumber ||
                        (r.roomNumber ? `Room ${r.roomNumber}` : ''),
                      notes: r.notes,
                      status: r.status || 'ASSIGNED',
                      createdAt: r.createdAt || new Date().toISOString(),
                      slaMinutes: r.slaMinutes || 1,
                      priority: r.priority || 'HIGH',
                    }))
                  );
                }
              }
            } catch (fetchErr) {
              console.warn('Initial requests fetch error:', fetchErr);
            }
          }
        }
      } catch (err) {
        console.warn('Fallback to default credentials:', err);
      }
    }
    init();
  }, [fetchTables, waiterSession]);

  // Re-fetch tables whenever waiterSession changes
  useEffect(() => {
    if (hotelId) {
      fetchTables(hotelId);
      void fetchRecentOrders(hotelId);
      void fetchWaiterFloat();
      void fetchMenuItems(hotelId);
    }
  }, [waiterSession, hotelId, fetchTables, fetchRecentOrders, fetchWaiterFloat, fetchMenuItems]);

  // Pickup tickets are created by the kitchen over the socket stream only.
  // No demo ticket is fabricated on startup.
  const [pickupTickets, setPickupTickets] = useState<any[]>([]);
  const [roomServiceOrders, setRoomServiceOrders] = useState<RoomServiceOrder[]>([]);
  const [roomServiceLoadState, setRoomServiceLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [roomServiceRefresh, setRoomServiceRefresh] = useState(0);

  const [kitchenBuzzers, setKitchenBuzzers] = useState<any[]>([]);

  // Fetch initial kitchen buzzers & ready pickups
  useEffect(() => {
    if (!hotelId) return;
    let cancelled = false;
    setRoomServiceLoadState('loading');
    waiterFetch(`${API_BASE_URL}/pos/kds/buzzers?hotelId=${hotelId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setKitchenBuzzers(res.data);
        }
      })
      .catch(() => {});

    waiterFetch(`${API_BASE_URL}/pos/kds/orders?status=ALL${hotelId ? `&hotelId=${encodeURIComponent(hotelId)}` : ''}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Room orders request failed (${response.status})`);
        const res = await response.json();
        if (!res.success || !Array.isArray(res.data)) {
          throw new Error(res.message || 'Room orders response was invalid');
        }
        if (!cancelled) {
          const roomOrders = res.data
            .filter((order: any) => order.roomId?.roomNumber)
            .map((order: any): RoomServiceOrder => {
              const totalAmount = (order.items || []).reduce(
                (sum: number, item: any) =>
                  sum + Number(item.subtotal || Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)),
                0
              );
              const placedAt = new Date(order.placedAt || order.createdAt || Date.now());
              const elapsedMinutes = Number.isFinite(placedAt.getTime())
                ? Math.max(0, Math.floor((Date.now() - placedAt.getTime()) / 60000))
                : 0;
              return {
                id: String(order._id),
                room: `Room ${order.roomId.roomNumber}`,
                guestName: 'In-room guest',
                timeAgo: elapsedMinutes < 1 ? 'Just now' : `${elapsedMinutes} min ago`,
                status: order.orderStatus === 'READY' ? 'READY_FOR_TRAY' : 'PREPARING',
                items: (order.items || []).map((item: any) =>
                  `${item.quantity || 1}x ${item.name || 'Menu item'}`
                ),
                totalAmount: Number.isFinite(totalAmount) ? totalAmount : undefined,
              };
            });
          setRoomServiceOrders((prev) => {
            const currentById = new Map(prev.map((order) => [order.id, order]));
            const serverIds = new Set(roomOrders.map((order) => order.id));
            const merged = roomOrders.map((order) => {
              const current = currentById.get(order.id);
              return current && (current.status === 'IN_TRANSIT' || current.status === 'DELIVERED')
                ? current
                : order;
            });
            return [...merged, ...prev.filter((order) => !serverIds.has(order.id))];
          });

          const tickets = res.data
            .filter((order: any) => order.orderStatus === 'READY')
            .map((order: any) => {
            const tableNum = order.tableId?.tableNumber || order.tableNumber || (order.roomId ? `Room ${order.roomId.roomNumber}` : 'T-01');
            return {
              _id: String(order._id),
              id: String(order._id),
              orderNumber: order.orderNumber,
              tableNumber: tableNum.startsWith('Table') ? tableNum : `Table ${tableNum}`,
              floorLevel: order.tableId?.section || 'Dining Floor',
              itemsSummary: (order.items || []).map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', '),
              itemsCount: (order.items || []).length,
              slaMinutes: 10,
              snoozeCount: 0,
              readyAt: order.readyAt || order.updatedAt || new Date().toISOString(),
              status: 'READY_FOR_PICKUP',
              urgency: 'URGENT',
            };
          });
          setPickupTickets((prev) => {
            const existingIds = new Set(prev.map(p => p.id || p._id));
            const newOnes = tickets.filter((t: any) => !existingIds.has(t.id));
            return [...prev, ...newOnes];
          });
          setRoomServiceLoadState('ready');
        }
      })
      .catch((error) => {
        console.error('Could not load active room-service orders:', error);
        if (!cancelled) setRoomServiceLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId, roomServiceRefresh]);

  useEffect(() => {
    if (!hotelId) return;

    socket.connect({
      serverUrl: SOCKET_URL,
      hotelId,
      userId: waiterUser.id,
      station: 'waiters',
    });

    // Handle service requests (both 'service:request' and 'request:new')
    const handleIncomingRequest = (data: any) => {
      console.log('Realtime service request arrived:', data);
      const table = data.table || data.tableNumber || '';
      const isInMyTableRange = isTableInWaiterZone(
        table,
        waiterSession?.assignedTableStart,
        waiterSession?.assignedTableEnd
      );
      const hasExplicitAssignment = Boolean(data.toWaiterId || data.toWaiterName);
      const isAssignedToMe =
        data.toWaiterId === waiterUser.id ||
        (Boolean(data.toWaiterName) &&
          Boolean(waiterSession) &&
          String(data.toWaiterName).toLowerCase().includes(waiterSession!.name.toLowerCase()));

      if (hasExplicitAssignment ? !isAssignedToMe : !isInMyTableRange) {
        console.log(`[WaiterApp] Skipping request for ${table} as it is outside assigned range (${waiterSession?.assignedTableStart}-${waiterSession?.assignedTableEnd})`);
        return;
      }

      playAlertChime('request');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (_) {}
      }

      const type = data.type || data.requestType || 'CALL_WAITER';
      const requestKey = String(
        data.id ||
        data.requestId ||
        data._id ||
        `${table}:${type}:${data.createdAt || ''}`
      );
      if (handledServiceRequestsRef.current.has(requestKey)) return;
      handledServiceRequestsRef.current.add(requestKey);
      if (handledServiceRequestsRef.current.size > 100) {
        const oldestRequest = handledServiceRequestsRef.current.values().next().value;
        if (oldestRequest) handledServiceRequestsRef.current.delete(oldestRequest);
      }

      store.addRequest({
        id: data.id || data.requestId || `req-${Date.now()}`,
        tableNumber: table,
        requestType: type as any,
        status: 'ASSIGNED' as any,
        createdAt: data.createdAt || new Date().toISOString(),
        slaMinutes: data.slaMinutes || 1,
        priority: data.priority || 'HIGH',
      });

      const newNotif: AppNotificationItem = {
        id: `notif-req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `Service Call: ${table}`,
        message: `Guest requested ${type.replace(/_/g, ' ')}!`,
        type: 'guest_request',
        severity: 'urgent',
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        tableNumber: table,
        isRead: false,
        actionLabel: 'Attend Guest',
      };
      setNotifications((prev) => [newNotif, ...prev]);
      void triggerNativeNotification(
        `Assistance Call: ${table}`,
        `Guest requested ${type.replace(/_/g, ' ')}`,
        requestKey
      );

      setNotification({
        message: `Assistance Needed: ${table} requested ${type.replace(/_/g, ' ')}!`,
        type: 'urgent',
      });
      setTimeout(() => setNotification(null), 7000);
    };

    const unbindServiceRequest = socket.on('service:request', handleIncomingRequest);
    const unbindRequestNew = socket.on('request:new', handleIncomingRequest);

    const unbindRoomOrder = socket.on('waiter:room_order', (data: any) => {
      const roomNumber = String(data.roomNumber || '').trim();
      const orderId = String(data.orderId || data.id || '');
      if (!roomNumber || !orderId) return;

      const destination = `Room ${roomNumber}`;
      const orderNumber = data.orderNumber || 'New room-service order';
      const items = Array.isArray(data.items)
        ? data.items.map((item: any) => `${item.quantity || item.qty || 1}x ${item.name || 'Menu item'}`)
        : [];
      const totalAmount = Array.isArray(data.items)
        ? data.items.reduce((sum: number, item: any) => {
            const quantity = Number(item.quantity || item.qty || 1);
            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
            return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0);
          }, 0)
        : undefined;
      setRoomServiceOrders((prev) => [
        {
          id: orderId,
          room: destination,
          guestName: 'In-room guest',
          timeAgo: 'Just now',
          status: 'PREPARING',
          items,
          totalAmount,
        },
        ...prev.filter((order) => order.id !== orderId),
      ]);
      playAlertChime('request');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      setNotifications((prev) => [
        {
          id: `notif-room-order-${data.orderId || Date.now()}`,
          title: `Room Service: ${destination}`,
          message: `${orderNumber} is being prepared. ${data.itemsSummary || 'Guest order sent to Kitchen.'}`,
          type: 'new_order',
          severity: 'urgent',
          timestamp: new Date().toISOString(),
          timeAgo: 'Just now',
          tableNumber: destination,
          orderNumber,
          isRead: false,
          actionLabel: 'Track for delivery',
        },
        ...prev.filter((notification) => notification.orderNumber !== orderNumber),
      ]);
      void triggerNativeNotification(
        `Room Service: ${destination}`,
        `${orderNumber} is being prepared for delivery.`
      );
      setNotification({
        message: `${orderNumber} for ${destination} is being prepared in Kitchen.`,
        type: 'success',
      });
      window.setTimeout(() => setNotification(null), 7000);
    });

    // Handle Food Ready notifications from Kitchen KDS
    const handleOrderReady = (data: any) => {
      console.log('Order ready from Kitchen:', data);
      const roomNumber = data.roomNumber || data.roomId?.roomNumber;
      const tableNum = roomNumber ? `Room ${roomNumber}` : data.tableNumber || '';

      let currentStart = waiterSession?.assignedTableStart;
      let currentEnd = waiterSession?.assignedTableEnd;
      if (currentStart === undefined || currentEnd === undefined) {
        try {
          const saved = localStorage.getItem('spicehub_waiter_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            currentStart = parsed.assignedTableStart;
            currentEnd = parsed.assignedTableEnd;
          }
        } catch (_) {}
      }
      if (currentStart === undefined) currentStart = 1;
      if (currentEnd === undefined) currentEnd = 6;

      const isAssignedWaiter =
        !data.assignedWaiterId || String(data.assignedWaiterId) === String(waiterUser.id);
      const isMine = isAssignedWaiter && (
        Boolean(roomNumber) || isTableInWaiterZone(tableNum, currentStart, currentEnd)
      );

      const isDelegatedToMe = data.toWaiterId === waiterUser.id || 
        (data.toWaiterName && waiterSession && data.toWaiterName.toLowerCase().includes(waiterSession.name.toLowerCase()));

      if (!isMine && !isDelegatedToMe) {
        console.log(`[WaiterApp] Skipping order ready for ${tableNum} as it is outside assigned range (${currentStart}-${currentEnd})`);
        return;
      }

      playAlertChime('ready');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (_) {}
      }

      const ticketId = data.id || data.orderId || `pickup-${Date.now()}`;
      const orderNum = data.orderNumber || `KOT #${Date.now().toString().slice(-4)}`;
      if (roomNumber) {
        setRoomServiceOrders((prev) => {
          const existing = prev.find((order) => order.id === String(ticketId));
          const readyOrder: RoomServiceOrder = {
            id: String(ticketId),
            room: `Room ${roomNumber}`,
            guestName: existing?.guestName || 'In-room guest',
            timeAgo: existing?.timeAgo || 'Just now',
            status: 'READY_FOR_TRAY',
            items: Array.isArray(data.items)
              ? data.items.map((item: any) => `${item.quantity || item.qty || 1}x ${item.name || 'Menu item'}`)
              : existing?.items || [],
            totalAmount: existing?.totalAmount,
          };
          return [readyOrder, ...prev.filter((order) => order.id !== readyOrder.id)];
        });
      }

      setReadyOrderAlert({ orderNumber: orderNum, tableNumber: tableNum });

      setPickupTickets((prev) => [
        {
          _id: ticketId,
          id: ticketId,
          orderNumber: orderNum,
          tableNumber: tableNum,
          floorLevel: data.section || 'Dining Floor',
          itemsSummary: data.itemsSummary || (Array.isArray(data.items) ? data.items.map((i: any) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ') : 'Ready dishes'),
          itemsCount: Array.isArray(data.items) ? data.items.length : 2,
          slaMinutes: 10,
          snoozeCount: 0,
          readyAt: new Date().toISOString(),
          status: 'READY_FOR_PICKUP',
          urgency: 'URGENT',
        },
        ...prev.filter((t) => (t._id || t.id) !== ticketId && t.orderNumber !== orderNum),
      ]);

      const newNotif: AppNotificationItem = {
        id: `notif-ready-${ticketId}`,
        title: `Kitchen Ready: ${tableNum}`,
        message: `Order ${orderNum} is ready at Kitchen Hot Pass! Pickup ready (60s SLA).`,
        type: 'order_ready',
        severity: 'urgent',
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        tableNumber: tableNum,
        orderNumber: orderNum,
        isRead: false,
        actionLabel: 'Pick Up & Serve',
      };
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.orderNumber !== orderNum)]);
      void triggerNativeNotification(`Kitchen Ready: ${tableNum}`, `Order ${orderNum} is ready at Hot Pass!`);

      setNotification({
        message: `Order Ready: Kitchen finished ${orderNum} for ${tableNum}! Pickup ready (60s SLA).`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 8000);
      fetchTables(hotelId);
    };

    const unbindOrderReady = socket.on('order:ready', handleOrderReady);
    const unbindKdsTicketReady = socket.on('kds:ticket_ready', handleOrderReady);

    const unbindTableStatusChanged = socket.on('table:status_changed', (data: any) => {
      fetchTables(hotelId);
    });

    const unbindOrderServed = socket.on('order:served', (data: any) => {
      markOrderServedInStorage(data.orderId, data.orderNumber || data.orderId, data.tableNumber);
      if (data.orderId) {
        setRoomServiceOrders((prev) =>
          prev.map((order) =>
            order.id === String(data.orderId) ? { ...order, status: 'DELIVERED' } : order
          )
        );
      }
      setPickupTickets((prev) => prev.filter((t) => t.orderNumber !== data.orderNumber && t.id !== data.orderId && t._id !== data.orderId));
      fetchTables(hotelId);
    });

    const handleIncomingOrder = (data: any) => {
      console.log('Incoming order in waiter app:', data);
      fetchTables(hotelId);
      const targetT = data.tableNumber || data.table || 'Table';
      const isMine = isTableInWaiterZone(
        targetT,
        waiterSession?.assignedTableStart,
        waiterSession?.assignedTableEnd
      );
      if (isMine) {
        const newNotif: AppNotificationItem = {
          id: `notif-ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: `New Order: ${targetT}`,
          message: `${targetT} ordered ${Array.isArray(data.items) ? data.items.length : 'items'}! Sent to Kitchen.`,
          type: 'new_order',
          severity: 'info',
          timestamp: new Date().toISOString(),
          timeAgo: 'Just now',
          tableNumber: targetT,
          isRead: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        void triggerNativeNotification(`New Order: ${targetT}`, 'Dispatched to Kitchen');

        setNotification({
          message: `New Order: ${targetT} ordered ${Array.isArray(data.items) ? data.items.length : 'items'}! Sent to Kitchen.`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 6000);
      }
    };

    const unbindOrderCreated = socket.on('order:created', handleIncomingOrder);
    const unbindWaiterKot = socket.on('waiter:new_kot', handleIncomingOrder);

    const unbindStockLow = socket.on('stock:low_alert', (data: any) => {
      playAlertChime('ready');
      const newNotif: AppNotificationItem = {
        id: `notif-stock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: `Inventory 86 Alert`,
        message: `Kitchen reports ${data.ingredientName} low (${data.remainingQuantity} ${data.unit} left)!`,
        type: 'stock_alert',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      setNotification({
        message: `Inventory Alert: Kitchen reports ${data.ingredientName} low (${data.remainingQuantity} ${data.unit} left)!`,
        type: 'urgent',
      });
      setTimeout(() => setNotification(null), 8000);
    });

    const unbindKitchenBuzzer = socket.on('kitchen:buzzer', (buzz: any) => {
      console.log('📢 Kitchen buzzer received in Waiter App:', buzz);
      setKitchenBuzzers((prev) => [buzz, ...prev.filter((b) => b.id !== buzz.id)]);
    });

    const unbindKitchenBuzzerAck = socket.on('kitchen:buzzer_ack', (ack: any) => {
      console.log('✅ Kitchen buzzer acknowledged by Chef:', ack);
      playAlertChime('ready');
      setNotification({
        message: `Chef Acknowledged Buzzer for ${ack.table}! (${ack.message})`,
        type: 'success',
      });
      setKitchenBuzzers((prev) =>
        prev.map((b) =>
          b.id === ack.id
            ? { ...b, status: 'ACKNOWLEDGED', acknowledgedBy: ack.acknowledgedBy }
            : b
        )
      );
      setTimeout(() => setNotification(null), 6000);
    });

    const unbindItem86 = socket.on('menu:item_86_toggled', (data: any) => {
      console.log('🚨 [WaiterApp] Item 86 status toggled in realtime:', data);
      setMenuItems((prev) =>
        prev.map((it) => {
          const mId = it.id || it.menuItemId || it._id;
          if (mId === data.menuItemId || it.name === data.name) {
            return {
              ...it,
              isAvailable: data.isAvailable,
              outOfStockReason: data.outOfStockReason,
            };
          }
          return it;
        })
      );
      playAlertChime('ready');
      setNotification({
        message: `📢 Menu Sync: "${data.name}" is now ${data.isAvailable ? 'IN STOCK' : '86\'D (OUT OF STOCK)'}!`,
        type: data.isAvailable ? 'success' : 'urgent',
      });
      setTimeout(() => setNotification(null), 6000);
    });

    const unbindTaskDelegated = socket.on('waiter:task_delegated', (data: any) => {
      console.log('🤝 Realtime task delegated event:', data);
      const isForMe = data.toWaiterId === waiterUser.id || 
        (data.toWaiterName && waiterSession && data.toWaiterName.toLowerCase().includes(waiterSession.name.toLowerCase()));

      if (isForMe) {
        playAlertChime('ready');
        setNotification({
          message: `🤝 Handover from ${data.fromWaiterName}: ${data.taskTitle} on ${data.table} (Reason: ${data.reason})`,
          type: 'urgent',
        });
        const newNotif: AppNotificationItem = {
          id: `notif-delegated-${Date.now()}`,
          title: `Handover from ${data.fromWaiterName}`,
          message: `${data.taskTitle} on ${data.table} handed over to you. Reason: ${data.reason}`,
          type: 'guest_request',
          severity: 'urgent',
          timestamp: new Date().toISOString(),
          timeAgo: 'Just now',
          tableNumber: data.table,
          isRead: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        setTimeout(() => setNotification(null), 8000);
      }
    });

    const unbindPortals = socket.on('tenant:portals_updated', (data: any) => {
      if (data?.enabledPortals && Array.isArray(data.enabledPortals)) {
        setNotSubscribed(!data.enabledPortals.includes('waiter'));
      }
    });

    return () => {
      unbindServiceRequest();
      unbindRequestNew();
      unbindRoomOrder();
      unbindOrderReady();
      unbindKdsTicketReady();
      unbindTableStatusChanged();
      unbindOrderServed();
      unbindOrderCreated();
      unbindWaiterKot();
      unbindStockLow();
      unbindKitchenBuzzer();
      unbindKitchenBuzzerAck();
      unbindItem86();
      unbindTaskDelegated();
      unbindPortals();
    };
  }, [hotelId, waiterUser.id, fetchTables]);

  if (authChecking && !waiterSession) {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center bg-[#F6F1E6] text-[#1B2A22]">
        Verifying staff access…
      </div>
    );
  }

  if (notSubscribed) {
    return (
      <div className="min-h-screen bg-[#F6F1E6] text-[#1B2A22] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-[#EFC9BC] bg-[#FFFDF8] p-8 shadow-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#EFC9BC] bg-[#F9ECE7] text-3xl">
            🔒
          </div>
          <span className="inline-block px-3 py-1 rounded-full border border-[#EFC9BC] bg-[#F9ECE7] text-xs font-bold text-[#A93B21]">
            Workstation Not Subscribed
          </span>
          <h2 className="text-xl font-black text-[#123C2B]">Waiter Handheld Is Inactive</h2>
          <p className="text-xs leading-relaxed text-[#7C7566]">
            This property's subscription does not include the Waiter Mobile Handheld terminal.
            Please contact your Super Administrator to activate this module.
          </p>
          <button
            onClick={() => setIsPortalsModalOpen(true)}
            className="w-full rounded-xl bg-[#123C2B] hover:bg-[#1B5138] px-4 py-3 text-xs font-bold text-white transition"
          >
            Switch Operational Portal
          </button>
        </div>
        <PortalsSwitcherModal
          isOpen={isPortalsModalOpen}
          onClose={() => setIsPortalsModalOpen(false)}
          currentPortalId="waiter"
        />
      </div>
    );
  }

  if (!waiterSession) {
    return (
      <div className="min-h-screen bg-[#F6F1E6] text-[#1B2A22] flex flex-col justify-between">
        {authError && (
          <p role="alert" className="mx-auto mt-4 w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {authError}
          </p>
        )}
        <WaiterLoginScreen
          onLoginSuccess={handleLogin}
          onOpenPortalsSwitcher={() => setIsPortalsModalOpen(true)}
        />
        <PortalsSwitcherModal
          isOpen={isPortalsModalOpen}
          onClose={() => setIsPortalsModalOpen(false)}
          currentPortalId="waiter"
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-full max-w-full overflow-x-hidden flex flex-col justify-between">
      {notification && (
        <div data-testid="live-urgent-notification-banner" className="fixed top-3 left-3 right-3 z-50 animate-in fade-in slide-in-from-top-2 max-w-lg mx-auto">
          <div
            className={`p-4 rounded-2xl shadow-sm dark:shadow-none border flex items-center justify-between gap-3 ${
 notification.type === 'urgent'
 ? 'bg-[#FFFDF8] border-[#E9C98A] text-[#123C2B]'
 : 'bg-[#FFFDF8] border-[#CFE0D2] text-[#123C2B]'
 }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                {notification.type === 'urgent' ? (
                  <Bell className="w-5 h-5 text-amber-300" />
                ) : (
                  <UtensilsCrossed className="w-5 h-5 text-emerald-300" />
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold tracking-tight">{notification.message}</p>
            </div>
            <button
              data-testid="btn-dismiss-notification"
              onClick={() => setNotification(null)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <WaiterMobileApp
        store={store}
        tables={tables}
        recentOrders={recentOrders}
        menuItems={menuItems}
        waiterSession={waiterSession}
        notifications={scopedNotifications}
        onMarkNotificationRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))}
        onMarkAllNotificationsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
        onClearAllNotifications={() => setNotifications([])}
        onDismissNotification={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
        onSendTestAlert={handleSendTestAlert}
        onLogout={handleLogout}
        onUpdateAvatar={handleUpdateProfilePhoto}
        onOpenPortalsSwitcher={() => setIsPortalsModalOpen(true)}
        readyOrderAlert={readyOrderAlert}
        onRefreshTables={() => fetchTables(hotelId)}
        onShiftChange={async (newStatus) => {
          console.log(`Waiter shift status updated: ${newStatus}`);
          socket.emit('waiter:shift_changed', {
            waiterId: waiterUser.id,
            waiterName: waiterUser.name,
            shiftStatus: newStatus,
            hotelId,
          });
        }}
        pickupTickets={pickupTickets}
        roomServiceOrders={roomServiceOrders}
        roomServiceLoadState={roomServiceLoadState}
        onRefreshRoomServiceOrders={() => setRoomServiceRefresh((current) => current + 1)}
        onRoomServiceOrderStatusChange={async (orderId, nextStatus) => {
          if (nextStatus === 'DELIVERED') {
            const response = await waiterFetch(`${API_BASE_URL}/pos/orders/${encodeURIComponent(orderId)}/serve`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'SERVED' }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              setNotification({
                message: result.message || 'Could not save room delivery. Please retry.',
                type: 'urgent',
              });
              return false;
            }
          }

          setRoomServiceOrders((prev) =>
            prev.map((order) => order.id === orderId ? { ...order, status: nextStatus } : order)
          );
          return true;
        }}
        onServeOrder={async (orderId, orderNum, table) => {
          console.log(`Marking order served: ${orderNum} to ${table}`);
          markOrderServedInStorage(orderId, orderNum, table);
          try {
            await waiterFetch(`${API_BASE_URL}/pos/orders/${orderId}/serve`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({ status: 'SERVED' }),
            }).catch(() => {});

            socket.emit('order:served', {
              orderId,
              orderNumber: orderNum,
              tableNumber: table,
              hotelId,
            });

            fetchTables(hotelId);
          } catch (e) {
            console.warn('Serve API error:', e);
          }
        }}
        onConfirmPickup={(ticketId) => {
          markOrderServedInStorage(ticketId, ticketId, '');
          setPickupTickets((prev) => prev.filter((t) => (t._id || t.id) !== ticketId && t.id !== ticketId && t._id !== ticketId));
          socket.emit('order:delivered', { ticketId, waiter: waiterUser.name, hotelId });
          setNotification({
            message: 'Order marked as delivered to guest table!',
            type: 'success',
          });
          setTimeout(() => setNotification(null), 3000);
        }}
        onSnoozePickup={(ticketId) => {
          setPickupTickets((prev) =>
            prev.map((t) => {
              if ((t._id || t.id) === ticketId || t.id === ticketId || t._id === ticketId) {
                return {
                  ...t,
                  status: 'WAITER_EN_ROUTE',
                  snoozeCount: (t.snoozeCount || 0) + 1,
                };
              }
              return t;
            })
          );
          socket.emit('waiter:snooze', { ticketId, waiter: waiterUser.name, hotelId, extendSeconds: 60 });
          setNotification({
            message: 'On my way! Kitchen informed (+60s added to timer).',
            type: 'success',
          });
          setTimeout(() => setNotification(null), 3000);
        }}
        onAcceptRequest={async (reqId) => {
          console.log(`Accepted request: ${reqId}`);
          try {
            await waiterFetch(`${API_BASE_URL}/requests/${reqId}/accept`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ waiterId: waiterUser.id, hotelId }),
            });
          } catch (e) {
            console.warn('HTTP accept failed, using socket:', e);
          }
          socket.emit('request:accepted', { reqId, waiter: waiterUser.name, hotelId });
        }}
        onCompleteRequest={async (reqId) => {
          console.log(`Completed request: ${reqId}`);
          try {
            await waiterFetch(`${API_BASE_URL}/requests/${reqId}/resolve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resolutionNotes: 'Completed by floor captain', hotelId }),
            });
          } catch (e) {
            console.warn('HTTP resolve failed, using socket:', e);
          }
          socket.emit('request:completed', { reqId, hotelId });
        }}
        onFireKot={async (tableId, items, instructions) => {
          console.log(`Firing KOT for table ${tableId}:`, items);
          try {
            await waiterFetch(`${API_BASE_URL}/pos/orders/place`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': `kot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              },
              body: JSON.stringify({
                hotelId,
                tableId,
                tableNumber: tableId,
                items: items.map((i: any) => ({
                  menuItemId: i.menuItemId,
                  name: i.name,
                  price: i.unitPrice,
                  unitPrice: i.unitPrice,
                  quantity: i.quantity,
                  specialInstructions: i.specialInstructions,
                })),
                cookingInstructions: instructions,
              }),
            });
          } catch (err) {
            console.error('Failed to fire KOT via HTTP:', err);
          }
          socket.emit('waiter:kot_fired', {
            tableId,
            tableNumber: tableId,
            waiterName: waiterUser.name,
            items,
            instructions,
            hotelId,
          });
          setTimeout(() => fetchTables(hotelId), 600);
        }}
        onRequestCashDrop={async (actualCash, reason) => {
          // Persist the handover on the server, then notify the floor.
          const response = await waiterFetch(`${API_BASE_URL}/waiter-cash-float/request-drop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actualCashHandedOver: actualCash,
              varianceReason: reason,
            }),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body?.success) {
            throw new Error(body?.message || 'Cash drop could not be submitted.');
          }
          await fetchWaiterFloat();
          socket.emit('waiter:cash_drop_requested', {
            waiterUserId: waiterUser.id,
            waiterName: waiterUser.name,
            actualCash,
            reason,
            hotelId,
          });
        }}
        waiterFloat={waiterFloat || undefined}
        onOpenFloat={openWaiterFloat}
        onGenerateUpiQr={async (tableNumber, amount) => {
          console.log(`Generating Dynamic UPI QR for ${tableNumber}: ₹${amount}`);
          socket.emit('waiter:generate_upi_qr', {
            tableNumber,
            amount,
            waiterUserId: waiterUser.id,
            hotelId,
          });
        }}
        kitchenBuzzers={kitchenBuzzers}
        onSendKitchenBuzzer={async (buzzData) => {
          console.log('📢 Firing kitchen buzzer to backend & KDS:', buzzData);
          try {
            const res = await waiterFetch(`${API_BASE_URL}/pos/kds/buzzer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                hotelId,
                station: buzzData.station,
                table: buzzData.table,
                message: buzzData.message,
                priority: buzzData.priority || 'HIGH',
                waiterName: waiterUser.name || 'Floor Captain',
                waiterId: waiterUser.id || 'W-101',
              }),
            });
            if (res.ok) {
              const body = await res.json();
              if (body.success && body.data) {
                setKitchenBuzzers((prev) => [body.data, ...prev.filter((b) => b.id !== body.data.id)]);
              }
            }
          } catch (err) {
            console.warn('HTTP kitchen buzzer post failed, relying on socket:', err);
          }

          socket.emit('kitchen:buzzer', {
            hotelId,
            station: buzzData.station,
            table: buzzData.table,
            message: buzzData.message,
            priority: buzzData.priority || 'HIGH',
            waiterName: waiterUser.name || 'Floor Captain',
            waiterId: waiterUser.id || 'W-101',
            timestamp: new Date().toISOString(),
          });
        }}
        onToggleItem86={async (itemId, isAvailable, reason) => {
          console.log(`[WaiterApp] Toggling item ${itemId} to ${isAvailable ? 'IN STOCK' : '86 OUT OF STOCK'}`);
          setMenuItems((prev) =>
            prev.map((it) => {
              const mId = it.id || it.menuItemId || it._id;
              if (mId === itemId) {
                return {
                  ...it,
                  isAvailable,
                  outOfStockReason: !isAvailable ? (reason || 'FLOOR_STAFF_TOGGLE') : undefined,
                };
              }
              return it;
            })
          );

          try {
            const res = await waiterFetch(`${API_BASE_URL}/pos/menu/${itemId}/toggle-86`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-hotel-id': hotelId },
              body: JSON.stringify({
                isAvailable,
                reason: reason || 'FLOOR_STAFF_TOGGLE',
                chefName: waiterUser.name,
              }),
            });

            if (res.ok) {
              const body = await res.json();
              socket.emit('menu:item_86_toggled', {
                menuItemId: itemId,
                hotelId,
                isAvailable,
                reason,
                actor: waiterUser.name,
              });
            }
          } catch (err) {
            console.warn('Failed to toggle 86 item via API:', err);
          }
        }}
        onDelegateTask={async ({ task, targetWaiter, reason, fromWaiter }) => {
          console.log(`[WaiterApp] Delegating task to ${targetWaiter.name}:`, task);
          socket.emit('waiter:task_delegated', {
            hotelId,
            taskId: task.id,
            taskType: task.type,
            taskTitle: task.title,
            table: task.tableNumber,
            fromWaiterId: fromWaiter.staffId,
            fromWaiterName: fromWaiter.name,
            toWaiterId: targetWaiter.staffId,
            toWaiterName: targetWaiter.name,
            reason,
            timestamp: new Date().toISOString(),
          });
        }}
      />

      <PortalsSwitcherModal
        isOpen={isPortalsModalOpen}
        onClose={() => setIsPortalsModalOpen(false)}
        currentPortalId="waiter"
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <WaiterAppRoot />
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
