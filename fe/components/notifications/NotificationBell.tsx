'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/notification-context';
import { dispatchOpenBookingChat } from '@/lib/booking-chat-events';
import type { AppNotification } from '@/lib/notification.service';
import { cn } from '@/lib/utils';
import { Bell, CheckCheck, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

type NotificationAction = {
  href: string;
  label: string;
  external?: boolean;
  openChat?: boolean;
};
const roadmapNotificationTypes = new Set([
  'roadmap_generated',
  'roadmap_lesson_completed',
  'roadmap_test_failed',
  'roadmap_phase_completed',
  'roadmap_streak_milestone',
  'roadmap_inactivity_reminder',
]);
const bookingNotificationTypes = new Set([
  'mentor_booking_pending',
  'mentor_booking_confirmed',
  'mentor_booking_cancelled',
  'mentor_booking_rescheduled',
  'mentor_booking_reschedule_requested',
  'mentor_booking_reschedule_accepted',
  'mentor_booking_reschedule_declined',
  'mentor_session_completed',
]);

const walletNotificationTypes = new Set([
  'payment_paid',
  'wallet_credit_added',
  'wallet_credit_used',
  'mentor_booking_refunded',
  'mentor_booking_refund_pending',
]);

function getPayloadString(notification: AppNotification, key: string): string {
  const value = notification.payload?.[key];
  return typeof value === 'string' ? value : '';
}

function buildReviewHref(notification: AppNotification): string {
  const reviewUrl = getPayloadString(notification, 'reviewUrl');
  if (reviewUrl) return reviewUrl;

  const bookingId = getPayloadString(notification, 'bookingId');
  if (bookingId) return `/mentor-matching?reviewBooking=${encodeURIComponent(bookingId)}`;

  return '/mentor-matching';
}

function buildChatHref(notification: AppNotification, role?: string): string {
  const bookingId = getPayloadString(notification, 'bookingId');
  const baseHref = role === 'mentor' ? '/mentor-dashboard/bookings' : '/mentor-matching';
  if (!bookingId) return baseHref;
  return `${baseHref}?chatBooking=${encodeURIComponent(bookingId)}`;
}

function resolveNotificationAction(
  notification: AppNotification,
  role?: string,
): NotificationAction | null {
  if (notification.type === 'mentor_booking_message' || notification.payload?.openChat === true) {
    return { href: buildChatHref(notification, role), label: 'Mở chat', openChat: true };
  }

  const meetingLink = getPayloadString(notification, 'meetingLink');
  if (meetingLink) {
    return {
      href: meetingLink,
      label: 'Vào phòng meet',
      external: /^https?:\/\//i.test(meetingLink),
    };
  }

  if (notification.type === 'mentor_review_requested') {
    return { href: buildReviewHref(notification), label: 'Đánh giá mentor' };
  }

  if (notification.type === 'mentor_review_submitted') {
    return { href: '/mentor-dashboard/reviews', label: 'Xem đánh giá' };
  }

  if (walletNotificationTypes.has(notification.type)) {
    return { href: getPayloadString(notification, 'walletUrl') || '/wallet', label: 'Xem ví' };
  }

  if (notification.type === 'mentor_availability_bulk_created') {
    return { href: '/mentor-dashboard/availability', label: 'Xem lịch trống' };
  }

  if (bookingNotificationTypes.has(notification.type)) {
    return {
      href: role === 'mentor' ? '/mentor-dashboard/bookings' : '/mentor-matching',
      label: role === 'mentor' ? 'Xem booking' : 'Xem lịch mentor',
    };
  }
  if (roadmapNotificationTypes.has(notification.type)) {
    const roadmapId = getPayloadString(notification, 'roadmapId');
    const taskId = getPayloadString(notification, 'taskId');
    let href = '/learning-roadmap';

    if (roadmapId) {
      href += `?id=${encodeURIComponent(roadmapId)}`;
      if (taskId && notification.payload?.autoOpenTest === true) {
        href += `&activeTask=${encodeURIComponent(taskId)}`; // Đính kèm tham số bẻ chặng
      }
    }

    return {
      href,
      label: notification.type === 'roadmap_test_failed' ? 'Làm lại bài thi' : 'Vào xem tiến độ',
    };
  }
  return null;
}

export default function NotificationBell({ className }: { className?: string }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { role } = useAuth();
  const ariaLabel = unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={ariaLabel}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] leading-none font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="border-border flex items-center justify-between border-b p-4">
          <div>
            <p className="font-bold">Thông báo</p>
            <p className="text-muted-foreground text-xs">{unreadCount} chưa đọc</p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void markAllRead()}
              aria-label="Đánh dấu đã đọc"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-sm">Chưa có thông báo.</div>
          ) : (
            notifications.slice(0, 10).map((notification) => {
              const action = resolveNotificationAction(notification, role);
              const content = (
                <>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{notification.body}</p>
                  {action ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600">
                      <LinkIcon className="h-3.5 w-3.5" />
                      {action.label}
                    </span>
                  ) : null}
                </>
              );
              const itemClassName = cn(
                'block w-full border-b border-border p-4 text-left last:border-b-0',
                notification.readAt ? 'bg-background' : 'bg-sky-50 dark:bg-sky-500/10',
              );
              const handleNavigate = () => {
                if (!notification.readAt) void markRead(notification.id);
              };

              if (action?.external) {
                return (
                  <a
                    key={notification.id}
                    href={action.href}
                    onClick={handleNavigate}
                    className={itemClassName}
                  >
                    {content}
                  </a>
                );
              }

              if (action?.openChat) {
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      handleNavigate();
                      const bookingId = getPayloadString(notification, 'bookingId');
                      if (bookingId) dispatchOpenBookingChat({ bookingId });
                    }}
                    className={itemClassName}
                  >
                    {content}
                  </button>
                );
              }

              return action ? (
                <Link
                  key={notification.id}
                  href={action.href}
                  onClick={handleNavigate}
                  className={itemClassName}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => !notification.readAt && void markRead(notification.id)}
                  className={itemClassName}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
