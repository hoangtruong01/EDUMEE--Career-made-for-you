import { apiClient } from '@/lib/api-client';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'refund_pending';

export interface PaymentRecord {
  id: string;
  userId: string;
  bookingSessionId?: string;
  planId?: string;
  purpose: 'ai_plan' | 'mentor_booking' | string;
  billingCycle?: string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency: string;
  provider: string;
  paymentMethod?: string;
  checkoutReference?: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  paidAt?: string;
  failureReason?: string;
  refundedAt?: string;
  refundedAmount?: number;
  refundReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentCheckoutSession {
  paymentId: string;
  checkoutReference: string;
  purpose: 'ai_plan' | 'mentor_booking' | string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency: string;
  expiresAt: string;
  method: 'POST';
  actionUrl: string;
  fields: Record<string, string | number>;
  booking?: {
    id: string;
    mentorId: string;
    tutorProfileId: string;
    sessionType: string;
    requestedDateTime: string;
    duration: number;
    topicsToDiscuss: string[];
  };
}

export interface PaymentDetail {
  payment: PaymentRecord;
  transactions?: unknown[];
}

export interface SyncPaymentResult {
  payment: PaymentRecord;
  idempotent: boolean;
  order: Record<string, unknown>;
}

export const paymentService = {
  getCheckoutSession(token: string) {
    return apiClient.get<PaymentCheckoutSession>(
      `/payments/sepay/checkout/${encodeURIComponent(token)}/session`,
    );
  },

  syncPayment(token: string, paymentId: string) {
    return apiClient.post<SyncPaymentResult>(`/payments/${paymentId}/sepay/sync`, undefined, token);
  },

  getPayment(token: string, paymentId: string) {
    return apiClient.get<PaymentDetail>(`/payments/${paymentId}`, token);
  },
};
