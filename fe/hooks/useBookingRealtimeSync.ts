'use client';

import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';
import type { AppNotification } from '@/lib/notification.service';
import { type BookingSession, mentorService } from '@/lib/mentor.service';
import { useEffect, useRef } from 'react';

const BOOKING_REALTIME_NOTIFICATION_TYPES = new Set([
  'mentor_booking_pending',
  'mentor_booking_confirmed',
  'mentor_booking_cancelled',
  'mentor_booking_rescheduled',
  'mentor_booking_reschedule_requested',
  'mentor_booking_reschedule_accepted',
  'mentor_booking_reschedule_declined',
  'mentor_booking_message',
  'mentor_session_completed',
  'mentor_booking_refunded',
  'mentor_booking_refund_pending',
  'payment_paid',
]);

type BookingRealtimeSyncOptions = {
  enabled?: boolean;
  onBookingUpdated: (booking: BookingSession, notification: AppNotification) => void;
  onRefresh?: () => unknown | Promise<unknown>;
};

function getNotificationBookingId(notification: AppNotification) {
  const bookingId = notification.payload?.bookingId;
  return typeof bookingId === 'string' ? bookingId : '';
}

export function useBookingRealtimeSync({
  enabled = true,
  onBookingUpdated,
  onRefresh,
}: BookingRealtimeSyncOptions) {
  const { accessToken, isAuthenticated, isHydrated } = useAuth();
  const { notifications } = useNotifications();
  const mountedAtRef = useRef<number | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !isHydrated || !isAuthenticated || !accessToken) {
      mountedAtRef.current = null;
      seenNotificationIdsRef.current.clear();
      return;
    }

    const mountedAtMs = mountedAtRef.current ?? Date.now();
    mountedAtRef.current = mountedAtMs;
    const notificationsByBookingId = new Map<string, AppNotification>();

    notifications.forEach((notification) => {
      if (seenNotificationIdsRef.current.has(notification.id)) return;
      seenNotificationIdsRef.current.add(notification.id);
      if (!BOOKING_REALTIME_NOTIFICATION_TYPES.has(notification.type)) return;

      const createdAtMs = notification.createdAt ? new Date(notification.createdAt).getTime() : Number.NaN;
      if (!Number.isNaN(createdAtMs) && createdAtMs < mountedAtMs - 5_000) return;

      const bookingId = getNotificationBookingId(notification);
      if (!bookingId || notificationsByBookingId.has(bookingId)) return;
      notificationsByBookingId.set(bookingId, notification);
    });

    if (notificationsByBookingId.size === 0) return;

    let cancelled = false;

    void Promise.all(
      Array.from(notificationsByBookingId.entries()).map(async ([bookingId, notification]) => {
        try {
          const booking = await mentorService.getBooking(accessToken, bookingId);
          if (!cancelled) onBookingUpdated(booking, notification);
        } catch {
          // The background refresh below reconciles state if a single booking fetch fails.
        }
      }),
    ).finally(() => {
      if (!cancelled) void onRefresh?.();
    });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    enabled,
    isAuthenticated,
    isHydrated,
    notifications,
    onBookingUpdated,
    onRefresh,
  ]);
}
