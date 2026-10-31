import React, { useState, useEffect } from 'react';
import {
  Bell,
  ChefHat,
  Users,
  Receipt,
  AlertTriangle,
  Volume2,
  VolumeX,
  X,
  Trash2,
  CheckCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order_ready' | 'guest_request' | 'new_order' | 'stock_alert' | 'system';
  severity: 'urgent' | 'warning' | 'info' | 'success';
  timestamp: string;
  timeAgo?: string;
  tableNumber?: string;
  orderNumber?: string;
  isRead: boolean;
  actionLabel?: string;
  actionPayload?: any;
}

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onAction?: (notification: AppNotificationItem) => void;
  onSendTestAlert?: () => void;
  isDark?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDismiss,
  onAction,
  onSendTestAlert,
  isDark = true,
  isMuted,
  onToggleMute,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'order_ready' | 'guest_request' | 'new_order'>('all');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [isOpen]);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          new Notification('SpiceHub Waiter App', {
            body: 'Real-time kitchen & table notifications enabled successfully!',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Notification permission request error:', err);
      }
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const getIcon = (type: AppNotificationItem['type']) => {
    switch (type) {
      case 'order_ready':
        return <ChefHat className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />;
      case 'guest_request':
        return <Users className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />;
      case 'new_order':
        return <Receipt className={`w-4 h-4 ${isDark ? 'text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-300'}`} />;
      case 'stock_alert':
        return <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />;
      default:
        return <Bell className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />;
    }
  };

  const getBadgeBg = (type: AppNotificationItem['type'], isDarkTheme: boolean) => {
    switch (type) {
      case 'order_ready':
        return isDarkTheme ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'guest_request':
        return isDarkTheme ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'new_order':
        return isDarkTheme ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' : 'bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
      case 'stock_alert':
        return isDarkTheme ? 'bg-red-950/80 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200';
      default:
        return isDarkTheme ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
      <div
        className={`w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-sm dark:shadow-none border overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-orange-950/20'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-tight">Live Real-time Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Kitchen KDS, Customer Requests & Floor Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Permission Utility Bar */}
        <div
          className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          {/* Native Browser Push Permission status */}
          <div className="flex items-center gap-2">
            {browserPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Push Alerts: Active
              </span>
            ) : browserPermission === 'denied' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-3 h-3" />
                Push: Blocked in Browser
              </span>
            ) : (
              <button
                onClick={requestBrowserPermission}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
              >
                <Smartphone className="w-3 h-3" />
                Enable Device Push
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg border flex items-center gap-1 transition ${
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
              title={isMuted ? 'Notification chime muted (Click to unmute)' : 'Notification chime active (Click to mute)'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>
          </div>

          {/* Test Trigger Button */}
          {onSendTestAlert && (
            <button
              onClick={onSendTestAlert}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                isDark
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                  : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-orange-500" />
              Send Test Notification
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className={`px-4 pt-2.5 pb-2 flex items-center gap-1.5 overflow-x-auto shrink-0 custom-scrollbar ${
          isDark ? 'border-b border-slate-800' : 'border-b border-slate-200'
        }`}>
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'order_ready', label: 'Kitchen Ready', count: notifications.filter(n => n.type === 'order_ready').length },
            { id: 'guest_request', label: 'Service Calls', count: notifications.filter(n => n.type === 'guest_request').length },
            { id: 'new_order', label: 'Orders', count: notifications.filter(n => n.type === 'new_order').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeFilter === tab.id
                    ? 'bg-white text-orange-600 font-black'
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[220px]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm">All caught up!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                No active notifications in this category. You will receive live alerts when Kitchen finishes food or guests ring for assistance.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkAsRead(item.id)}
                className={`relative p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  !item.isRead
                    ? isDark
                      ? 'bg-slate-800/90 border-orange-500/50 shadow-md ring-1 ring-orange-500/20'
                      : 'bg-orange-50/70 border-orange-300 shadow-md ring-1 ring-orange-300/40'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Unread Indicator Dot */}
                {!item.isRead && (
                  <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  {/* Category Icon Badge */}
                  <div className={`p-2 rounded-xl border shrink-0 ${getBadgeBg(item.type, isDark)}`}>
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs tracking-tight truncate">{item.title}</span>
                      {item.tableNumber && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {item.tableNumber}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-800/40">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{item.timeAgo || 'Just now'}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {item.actionLabel && onAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction(item);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-1 shadow-xs"
                          >
                            <span>{item.actionLabel}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(item.id);
                          }}
                          className={`p-1 rounded-md transition ${
                            isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                          }`}
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`p-3 border-t flex items-center justify-between shrink-0 text-xs font-semibold ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
              notifications.length === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          <button
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              unreadCount === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'text-orange-400 hover:bg-orange-500/10'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
