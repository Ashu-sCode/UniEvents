'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Notification } from '@/types';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: (options?: { silent?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 30000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const refreshNotifications = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      hasLoadedOnceRef.current = false;
      seenIdsRef.current = new Set();
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await notificationsAPI.getAll({ limit: 12 });
      const nextNotifications = response.data.data.notifications || [];
      const nextUnreadCount = response.data.data.unreadCount || 0;

      if (hasLoadedOnceRef.current) {
        const unseenUnread = nextNotifications.filter(
          (item) => !item.isRead && !seenIdsRef.current.has(item._id)
        );

        if (unseenUnread.length > 0) {
          toast.info(unseenUnread[0].title);
        }
      }

      seenIdsRef.current = new Set(nextNotifications.map((item) => item._id));
      hasLoadedOnceRef.current = true;
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load notifications');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, toast, user]);

  useEffect(() => {
    refreshNotifications({ silent: false });
  }, [refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshNotifications({ silent: true });
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      refreshNotifications({ silent: true });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, refreshNotifications, user]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item._id === id
          ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsAPI.markRead(id);
    } catch {
      await refreshNotifications({ silent: true });
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now })));
    setUnreadCount(0);

    try {
      await notificationsAPI.markAllRead();
    } catch {
      await refreshNotifications({ silent: true });
    }
  }, [refreshNotifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  }), [isLoading, markAllAsRead, markAsRead, notifications, refreshNotifications, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
