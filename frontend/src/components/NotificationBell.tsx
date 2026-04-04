'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getAccent(notification: Notification) {
  switch (notification.type) {
    case 'waitlist_promoted':
    case 'certificate_ready':
      return 'border-emerald-200 bg-emerald-50';
    case 'event_cancelled':
    case 'registration_cancelled':
      return 'border-rose-200 bg-rose-50';
    case 'event_updated':
    case 'event_published':
      return 'border-sky-200 bg-sky-50';
    default:
      return 'border-neutral-200 bg-white';
  }
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasNotifications = notifications.length > 0;
  const panelTitle = useMemo(() => (
    unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'
  ), [unreadCount]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-xl p-2 text-neutral-700 transition-colors hover:bg-neutral-100"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isMounted && isOpen && createPortal(
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-[85] bg-neutral-950/20 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-[90] max-h-[min(32rem,calc(100dvh-env(safe-area-inset-top,0px)-6rem))] overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white shadow-2xl sm:right-4 sm:top-20 sm:left-auto sm:max-h-none sm:w-[24rem] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Notifications</h3>
                <p className="text-xs text-neutral-500">{panelTitle}</p>
              </div>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>

            <div className="max-h-[calc(min(32rem,100dvh-env(safe-area-inset-top,0px)-6rem)-4.5rem)] overflow-y-auto p-3 sm:max-h-[26rem]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
                  ))}
                </div>
              ) : !hasNotifications ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-neutral-700">No notifications yet</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Registrations, waitlist changes, and certificates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-left transition-all hover:shadow-sm',
                        getAccent(notification),
                        !notification.isRead && 'ring-1 ring-neutral-900/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-neutral-900">{notification.title}</p>
                            {!notification.isRead && (
                              <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-900" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-neutral-700">{notification.message}</p>
                        </div>
                        <span className="shrink-0 text-xs text-neutral-500">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
