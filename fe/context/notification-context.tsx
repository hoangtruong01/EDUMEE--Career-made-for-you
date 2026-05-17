'use client';

import { useAuth } from '@/context/auth-context';
import { dispatchOpenBookingChat } from '@/lib/booking-chat-events';
import { notificationService, type AppNotification } from '@/lib/notification.service';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  realtimeAlertsEnabled: boolean;
  setRealtimeAlertsEnabled: (enabled: boolean) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const REALTIME_ALERTS_STORAGE_KEY = 'edumee:realtime-notifications-enabled';

function getChatBookingId(notification: AppNotification) {
  if (notification.type !== 'mentor_booking_message' && notification.payload?.openChat !== true) {
    return '';
  }

  const bookingId = notification.payload?.bookingId;
  return typeof bookingId === 'string' ? bookingId : '';
}

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let notificationAudioContext: AudioContext | null = null;

function getNotificationAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const audioWindow = window as AudioWindow;
  const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;

  try {
    notificationAudioContext ??= new AudioContextConstructor();
    return notificationAudioContext;
  } catch {
    return null;
  }
}

async function playNotificationChime(): Promise<void> {
  const audioContext = getNotificationAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const now = audioContext.currentTime;
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    masterGain.connect(audioContext.destination);

    [880, 1174.66].forEach((frequency, index) => {
      const startAt = now + index * 0.11;
      const oscillator = audioContext.createOscillator();
      const toneGain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.04, startAt + 0.08);
      toneGain.gain.setValueAtTime(0.0001, startAt);
      toneGain.gain.exponentialRampToValueAtTime(0.8, startAt + 0.015);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

      oscillator.connect(toneGain);
      toneGain.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.18);
    });

    window.setTimeout(() => {
      try {
        masterGain.disconnect();
      } catch {
        // Audio nodes may already be disconnected by the browser.
      }
    }, 500);
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated, expireSession } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [realtimeAlertsEnabledState, setRealtimeAlertsEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(REALTIME_ALERTS_STORAGE_KEY) !== 'false';
  });
  const realtimeAlertsEnabledRef = useRef(realtimeAlertsEnabledState);

  useEffect(() => {
    realtimeAlertsEnabledRef.current = realtimeAlertsEnabledState;
  }, [realtimeAlertsEnabledState]);

  const setRealtimeAlertsEnabled = useCallback((enabled: boolean) => {
    setRealtimeAlertsEnabledState(enabled);
    realtimeAlertsEnabledRef.current = enabled;

    try {
      window.localStorage.setItem(REALTIME_ALERTS_STORAGE_KEY, String(enabled));
    } catch {
      // Storage can be unavailable in private browsing or restricted webviews.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setNotifications([]);
      return;
    }

    try {
      const items = await notificationService.getNotifications(accessToken);
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      return;
    }

    return notificationService.subscribe(
      accessToken,
      (notification) => {
        setNotifications((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ]);
        if (realtimeAlertsEnabledRef.current) {
          void playNotificationChime();
          const chatBookingId = getChatBookingId(notification);
          toast.info(notification.title, {
            description: notification.body,
            id: `notification:${notification.id}`,
            action: chatBookingId
              ? {
                  label: 'Mở chat',
                  onClick: () => {
                    dispatchOpenBookingChat({ bookingId: chatBookingId });
                    void notificationService
                      .markRead(accessToken, notification.id)
                      .then((updated) => {
                        setNotifications((current) => current.map((item) => (
                          item.id === updated.id ? updated : item
                        )));
                      })
                      .catch(() => undefined);
                  },
                }
              : undefined,
          });
        }
      },
      undefined,
      expireSession,
    );
  }, [accessToken, expireSession, isAuthenticated]);

  const markRead = useCallback(async (id: string) => {
    if (!accessToken) return;
    const updated = await notificationService.markRead(accessToken, id);
    setNotifications((current) => current.map((item) => (item.id === id ? updated : item)));
  }, [accessToken]);

  const markAllRead = useCallback(async () => {
    if (!accessToken) return;
    await notificationService.markAllRead(accessToken);
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
  }, [accessToken]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length,
    realtimeAlertsEnabled: realtimeAlertsEnabledState,
    setRealtimeAlertsEnabled,
    markRead,
    markAllRead,
    refresh,
  }), [markAllRead, markRead, notifications, realtimeAlertsEnabledState, refresh, setRealtimeAlertsEnabled]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}
