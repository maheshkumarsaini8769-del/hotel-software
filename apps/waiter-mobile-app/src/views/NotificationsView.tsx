import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Users,
  CreditCard,
  ChefHat,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { AppNotificationItem } from '../components/notifications/NotificationCenterModal';

interface NotificationsViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
  notifications?: AppNotificationItem[];
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onAction?: (notification: AppNotificationItem) => void;
  onSendTestAlert?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  isDark,
  triggerToast,
  notifications: propNotifications,
  onMarkAllRead: propMarkAllRead,
  onDismiss: propDismiss,
  onAction,
  onSendTestAlert,
}) => {
  // No fabricated notifications: the live feed comes from the socket stream and
  // the server-side service request feed.
  const [internalNotifications, setInternalNotifications] = useState<AppNotificationItem[]>([]);

  const [filter, setFilter] = useState('All');

  const notifications = propNotifications || internalNotifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    if (propMarkAllRead) {
      propMarkAllRead();
    } else {
      setInternalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    triggerToast('All notifications marked as read.');
  };

  const handleDismiss = (id: string) => {
    if (propDismiss) {
      propDismiss(id);
    } else {
      setInternalNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'Unread' && n.isRead) return false;
    if (filter === 'Kitchen' && n.type !== 'order_ready') return false;
    if (filter === 'Requests' && n.type !== 'guest_request') return false;
    if (filter === 'Orders' && n.type !== 'new_order') return false;
    return true;
  });

  const getIcon = (type: AppNotificationItem['type']) => {
    switch (type) {
      case 'order_ready':
        return <ChefHat className="w-4 h-4 text-emerald-400" />;
      case 'guest_request':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'new_order':
        return <Receipt className="w-4 h-4 text-cyan-400" />;
      case 'stock_alert':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Live Notification Center
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white animate-pulse">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Real-time kitchen ready food, customer call bells, and floor orders
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onSendTestAlert && (
            <button
              onClick={onSendTestAlert}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-orange-400 hover:bg-slate-700'
                  : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Send Test Alert</span>
            </button>
          )}

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition ${
              unreadCount === 0
                ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {['All', 'Unread', 'Kitchen', 'Requests', 'Orders'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === f
                ? 'bg-orange-500 text-white shadow-sm'
                : isDark
                ? 'bg-[#181c2b] text-slate-400 hover:text-white border border-slate-800'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5 pb-24 lg:pb-6">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No notifications in this filter category.
          </div>
        ) : (
          filtered.map((item) => {
            const isReady = item.type === 'order_ready';
            const isReq = item.type === 'guest_request';
            const isOrd = item.type === 'new_order';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  !item.isRead
                    ? isDark
                      ? 'bg-[#181c2b] border-orange-500/40 shadow-sm'
                      : 'bg-orange-50/70 border-orange-300 shadow-sm'
                    : isDark
                    ? 'bg-[#121520] border-slate-800/80 opacity-80'
                    : 'bg-white border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isReady
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isReq
                        ? 'bg-amber-500/20 text-amber-400'
                        : isOrd
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {getIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                      {item.tableNumber && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {item.tableNumber}
                        </span>
                      )}
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />}
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium hidden sm:flex">
                    <Clock className="w-3 h-3" /> {item.timeAgo || 'Just now'}
                  </span>

                  {item.actionLabel && onAction && (
                    <button
                      onClick={() => onAction(item)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 shadow-xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDismiss(item.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-500 transition"
                    title="Dismiss"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
