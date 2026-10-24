import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BedDouble,
  ShoppingCart,
  Sparkles,
  Clock,
  ArrowLeft,
  Trash2,
  CheckCheck,
  Check,
  Filter,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import type { ErpModuleKey } from '../../types/erp';
import { apiFetch } from '../../config/api';

export interface ErpNotification {
  id: string;
  category: 'KITCHEN' | 'ROOMS' | 'INVENTORY' | 'BILLING' | 'STAFF' | 'HOUSEKEEPING';
  title: string;
  description: string;
  time: string;
  read: boolean;
  severity: 'high' | 'medium' | 'info';
  targetModule: ErpModuleKey;
  actionLabel: string;
}

/**
 * Notifications are derived from the live platform snapshot. The inbox never
 * shows fabricated operational events.
 */
function timeAgo(value?: string): string {
  if (!value) return 'Just now';
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return 'Just now';
  const minutes = Math.max(0, Math.round((Date.now() - created) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function readPersistedState(): { read: string[]; deleted: string[] } {
  if (typeof window === 'undefined') return { read: [], deleted: [] };
  try {
    const saved = JSON.parse(window.localStorage.getItem('spicehub_erp_notifications') || '{}');
    return {
      read: Array.isArray(saved?.read) ? saved.read : [],
      deleted: Array.isArray(saved?.deleted) ? saved.deleted : [],
    };
  } catch {
    return { read: [], deleted: [] };
  }
}

function buildLiveNotifications(payload: any): ErpNotification[] {
  const notifications: ErpNotification[] = [];

  (payload?.liveOperations || []).forEach((op: any) => {
    notifications.push({
      id: `op-${op.id}`,
      category: 'BILLING',
      title: `Guest Assistance: ${String(op.type || 'REQUEST').replace(/_/g, ' ')}`,
      description: `${op.roomNumber ? `Room ${op.roomNumber}` : op.tableNumber ? `Table ${op.tableNumber}` : 'Floor request'} — status ${String(
        op.status || 'OPEN'
      ).toLowerCase()}, priority ${String(op.priority || 'MEDIUM').toLowerCase()}.`,
      time: timeAgo(op.createdAt),
      read: false,
      severity: op.priority === 'HIGH' || op.priority === 'URGENT' ? 'high' : 'medium',
      targetModule: 'POS_CASHIER',
      actionLabel: 'Open POS & Billing',
    });
  });

  (payload?.recentOrders || []).forEach((order: any) => {
    notifications.push({
      id: `order-${order.id}`,
      category: 'KITCHEN',
      title: `Order ${order.orderNumber} · ${String(order.status || '').replace(/_/g, ' ')}`,
      description: `${order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : 'Dine-in'} · ${
        order.itemCount || 0
      } item(s) · ${order.guestName || 'Walk-in guest'}.`,
      time: timeAgo(order.placedAt || order.createdAt),
      read: false,
      severity: order.status === 'READY' ? 'high' : 'info',
      targetModule: 'ORDERS_KITCHEN',
      actionLabel: 'Open Kitchen KDS',
    });
  });

  (payload?.recentBookings || []).forEach((booking: any) => {
    notifications.push({
      id: `booking-${booking.id}`,
      category: 'ROOMS',
      title: `Booking ${booking.bookingNumber} · ${String(booking.status || '').replace(/_/g, ' ')}`,
      description: `${booking.guestName || 'Guest'} · ${booking.roomType || 'Room'}${
        booking.roomNumber ? ` ${booking.roomNumber}` : ''
      } · ${booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('en-IN') : ''}.`,
      time: timeAgo(booking.createdAt),
      read: false,
      severity: 'info',
      targetModule: 'ROOM_MANAGEMENT',
      actionLabel: 'View Room Matrix',
    });
  });

  (payload?.roomStatusBreakdown || []).forEach((bucket: any) => {
    const count = Number(bucket.count || 0);
    if (!count) return;
    notifications.push({
      id: `rooms-${bucket.status}`,
      category: 'HOUSEKEEPING',
      title: `${count} room(s) ${String(bucket.status || '').replace(/_/g, ' ').toLowerCase()}`,
      description: `Live room inventory: ${count} room(s) currently in ${String(bucket.status || '')
        .replace(/_/g, ' ')
        .toLowerCase()} state.`,
      time: 'Live',
      read: false,
      severity: bucket.status === 'OUT_OF_SERVICE' ? 'high' : 'info',
      targetModule: 'HOUSEKEEPING',
      actionLabel: 'View Housekeeping',
    });
  });

  return notifications;
}

interface NotificationCenterViewProps {
  isDark: boolean;
  onNavigateModule: (module: ErpModuleKey) => void;
  onBackToDashboard: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  isDark,
  onNavigateModule,
  onBackToDashboard,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<ErpNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Read/deleted state is persisted per notification id — never the content.

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await apiFetch('/dashboard/overview');
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || `Could not load live notifications (HTTP ${response.status})`);
      }
      const state = readPersistedState();
      const live = buildLiveNotifications(json.data).filter((n) => !state.deleted.includes(n.id));
      setNotifications(live.map((n) => ({ ...n, read: state.read.includes(n.id) })));
    } catch (err: any) {
      setNotifications([]);
      setLoadError(err?.message || 'Live notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'KITCHEN' | 'ROOMS' | 'INVENTORY' | 'BILLING'>('ALL');

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Persist read/delete state so the shell badge and inbox survive module
  // navigation and full page reloads.
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
    if (typeof window !== 'undefined') {
      try {
        const state = readPersistedState();
        localStorage.setItem(
          'spicehub_erp_notifications',
          JSON.stringify({
            read: notifications.filter((n) => n.read).map((n) => n.id),
            deleted: state.deleted,
          })
        );
      } catch {
        // Notification persistence is best-effort; never block the inbox.
      }
    }
  }, [notifications, unreadCount]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      onUnreadCountChange?.(next.filter((n) => !n.read).length);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      onUnreadCountChange?.(0);
      return next;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((item) => item.id !== id);
      onUnreadCountChange?.(next.filter((n) => !n.read).length);
      return next;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    onUnreadCountChange?.(0);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'UNREAD') return !item.read;
    if (activeFilter === 'KITCHEN') return item.category === 'KITCHEN';
    if (activeFilter === 'ROOMS') return item.category === 'ROOMS' || item.category === 'HOUSEKEEPING';
    if (activeFilter === 'INVENTORY') return item.category === 'INVENTORY';
    if (activeFilter === 'BILLING') return item.category === 'BILLING';
    return true;
  });

  const getCategoryBadge = (category: ErpNotification['category']) => {
    switch (category) {
      case 'KITCHEN':
        return { label: 'Kitchen KDS', icon: Flame, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'ROOMS':
        return { label: 'Rooms PMS', icon: BedDouble, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'INVENTORY':
        return { label: 'Inventory PO', icon: ShoppingCart, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
      case 'BILLING':
        return { label: 'POS Billing', icon: Zap, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'HOUSEKEEPING':
        return { label: 'Housekeeping', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      default:
        return { label: 'System Alert', icon: AlertTriangle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Operational Alerts & Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Real-time operational alerts from Kitchen KDS, Guest Room PMS, Cashier POS, and Stock Invoicing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isDark
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-300 hover:bg-rose-950/40'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: 'ALL', label: `All (${notifications.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'KITCHEN', label: 'Kitchen & KDS' },
            { id: 'ROOMS', label: 'Rooms & PMS' },
            { id: 'INVENTORY', label: 'Stock & PO' },
            { id: 'BILLING', label: 'Billing & POS' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              activeFilter === tab.id
                ? 'bg-amber-500 text-black shadow-sm'
                : isDark
                ? 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-sm font-bold text-slate-300">Loading live notifications…</div>
          <p className="text-xs text-slate-500 mt-1">Reading the platform snapshot from the backend.</p>
        </div>
      ) : loadError ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isDark ? 'bg-rose-950/30 border-rose-800/60' : 'bg-rose-50 border-rose-200'
          }`}
        >
          <div className="text-sm font-bold text-rose-300">{loadError}</div>
          <button
            onClick={() => void loadNotifications()}
            className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            All Caught Up!
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            There are no alerts matching this filter. Operations are running normally across all hotel systems.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const badge = getCategoryBadge(notif.category);
            const Icon = badge.icon;

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  notif.read
                    ? isDark
                      ? 'bg-slate-900/30 border-slate-800/60 opacity-80 hover:opacity-100'
                      : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100'
                    : isDark
                    ? 'bg-slate-900/90 border-slate-700/80 shadow-md ring-1 ring-amber-500/20'
                    : 'bg-white border-slate-200 shadow-md ring-1 ring-amber-500/20'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${badge.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badge.color}`}>
                        {badge.label}
                      </span>
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {notif.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{notif.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => onNavigateModule(notif.targetModule)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition shadow-sm"
                  >
                    <span>{notif.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className={`p-2 rounded-xl border transition ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className={`p-2 rounded-xl border transition ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                    }`}
                    title="Dismiss Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
