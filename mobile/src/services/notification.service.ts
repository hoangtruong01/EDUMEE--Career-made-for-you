import { api, unwrapResponseData } from './api';

export interface AppNotification {
  id: string;
  _id?: string;
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
  async getNotifications() {
    const response = await api.get('/notifications');
    return unwrapResponseData<AppNotification[]>(response);
  },

  async markRead(id: string) {
    const response = await api.patch(`/notifications/${id}/read`);
    return unwrapResponseData<AppNotification>(response);
  },

  async markAllRead() {
    const response = await api.patch('/notifications/read-all');
    return unwrapResponseData<{ modifiedCount: number }>(response);
  },
};
