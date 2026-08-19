import React, { useEffect, useState } from 'react';
import {
  Search,
  User,
  Bell,
  Menu,
  Check,
  X,
  Info,
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  fetchNotifications,
  markNotificationRead,
  type Notification,
} from '../lib/api';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  onMenuToggle?: () => void;
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  if (type === 'SUCCESS') {
    return <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
  }

  if (type === 'WARNING') {
    return <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />;
  }

  if (type === 'ALERT') {
    return <OctagonAlert className="w-4 h-4 text-red-500 shrink-0" />;
  }

  return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  showSearch,
  onMenuToggle,
}: HeaderProps) {
  const {
    currentUserRole,
    setCurrentUserRole,
    employees,
    currentEmployeeId,
  } = useApp();

  const me = employees.find((e) => e.id === currentEmployeeId);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const loadNotifications = async () => {
    if (!currentEmployeeId) return;

    try {
      setLoadingNotifications(true);

      const data = await fetchNotifications(currentEmployeeId);

      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentEmployeeId]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      const updated = await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleBellClick = () => {
    const nextState = !showNotifications;

    setShowNotifications(nextState);

    if (nextState) {
      loadNotifications();
    }
  };

  const formatNotificationDate = (date: string) => {
    return new Date(date).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center justify-between shrink-0 select-none gap-4">
      {/* Search Bar or empty */}
      <div className="flex-1 max-w-sm flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {showSearch ? (
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              placeholder="Search employee roster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Workspace Active
          </div>
        )}
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-6">
        {/* Role Switcher */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-gray-400">
            View Mode
          </span>

          <div className="p-1 bg-gray-100 border border-gray-200/60 rounded-xl flex gap-0.5 relative">
            <button
              onClick={() => setCurrentUserRole('manager')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all relative z-10 cursor-pointer ${
                currentUserRole === 'manager'
                  ? 'text-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {currentUserRole === 'manager' && (
                <motion.div
                  layoutId="role-bg"
                  className="absolute inset-0 bg-white rounded-lg border border-gray-200/50 shadow-xs"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 25,
                  }}
                />
              )}

              <span className="relative z-10">Manager</span>
            </button>

            <button
              onClick={() => setCurrentUserRole('employee')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all relative z-10 cursor-pointer ${
                currentUserRole === 'employee'
                  ? 'text-indigo-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {currentUserRole === 'employee' && (
                <motion.div
                  layoutId="role-bg"
                  className="absolute inset-0 bg-white rounded-lg border border-gray-200/50 shadow-xs"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 25,
                  }}
                />
              )}

              <span className="relative z-10">Employee</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-11 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notifications
                  </h3>

                <p className="text-[11px] text-gray-400 mt-0.5">
  {unreadCount === 0
    ? "You're all caught up"
    : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
</p>
                </div>

                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notifications */}
              <div className="max-h-96 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-500">
                      No notifications
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      New alerts will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() =>
                        handleNotificationClick(notification)
                      }
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="pt-0.5">
                          <NotificationIcon type={notification.type} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-xs ${
                                notification.isRead
                                  ? 'font-medium text-gray-700'
                                  : 'font-semibold text-gray-900'
                              }`}
                            >
                              {notification.title}
                            </p>

                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-gray-400">
                              {formatNotificationDate(
                                notification.createdAt
                              )}
                            </span>

                            {!notification.isRead && (
                              <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Click to mark read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {me
              ? me.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
              : 'FA'}
          </div>

          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-gray-800 leading-tight">
              {me?.name || 'Fardin Ahmed'}
            </span>

            <span className="text-[10px] text-gray-400 leading-tight">
              {me?.role || 'Financial Analyst'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}