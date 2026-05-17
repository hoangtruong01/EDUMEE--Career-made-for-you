import { API_BASE_URL, apiClient } from '@/lib/api-client';
import { isJwtExpired } from '@/lib/jwt';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  payload?: {
    bookingId?: string;
    meetingLink?: string;
    paymentId?: string;
    purpose?: string;
    reviewId?: string;
    reviewUrl?: string;
    status?: string;
    tutoringSessionId?: string;
    walletUrl?: string;
    openChat?: boolean;
    senderId?: string;
    senderName?: string;
    senderRole?: string;
    amount?: number;
    currency?: string;
    [key: string]: unknown;
  };
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const notificationService = {
  getNotifications(token: string) {
    return apiClient.get<AppNotification[]>('/notifications', token);
  },

  markRead(token: string, id: string) {
    return apiClient.patch<AppNotification>(`/notifications/${id}/read`, undefined, token);
  },

  markAllRead(token: string) {
    return apiClient.patch<{ modifiedCount: number }>('/notifications/read-all', undefined, token);
  },

  subscribe(
    token: string,
    onNotification: (notification: AppNotification) => void,
    onStatusChange?: (status: 'connecting' | 'live' | 'closed') => void,
    onSessionExpired?: () => void,
  ) {
    if (isJwtExpired(token)) {
      onStatusChange?.('closed');
      onSessionExpired?.();
      return () => undefined;
    }

    const source = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`);
    let closed = false;
    onStatusChange?.('connecting');

    const closeSource = () => {
      if (closed) return;
      closed = true;
      source.close();
      onStatusChange?.('closed');
    };

    source.addEventListener('connected', () => {
      if (!closed) onStatusChange?.('live');
    });

    source.addEventListener('notification', (event) => {
      try {
        onNotification(JSON.parse((event as MessageEvent).data) as AppNotification);
      } catch {
        // Ignore malformed realtime events; the next fetch will reconcile state.
      }
    });

    source.onerror = () => {
      if (isJwtExpired(token)) {
        onSessionExpired?.();
        closeSource();
        return;
      }
      onStatusChange?.('closed');
    };

    return closeSource;
  },
};
