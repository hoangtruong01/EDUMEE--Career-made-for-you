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
  status: PaymentStatus;
  checkoutReference: string;
  purpose: 'ai_plan' | 'mentor_booking' | string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency: string;
  expiresAt: string;
  paidAt?: string;
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

export interface PaymentCheckoutStatus {
  paymentId: string;
  status: PaymentStatus;
  checkoutReference: string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  currency: string;
  purpose: 'ai_plan' | 'mentor_booking' | string;
  expiresAt: string;
  paidAt?: string;
  bookingStatus?: string;
}

export interface CreatePaymentPurchasePayload {
  purpose: 'ai_plan' | 'mentor_booking';
  targetId: string;
  provider?: 'sepay';
  billingCycle?: string;
  paymentMethod?: string;
  returnUrls?: {
    success?: string;
    error?: string;
    cancel?: string;
  };
  useEdumeeCredit?: boolean;
}

export interface CreatePaymentPurchaseResult {
  paymentId: string;
  checkoutReference: string;
  redirectUrl: string;
  purpose: 'ai_plan' | 'mentor_booking';
  provider: 'sepay' | string;
}

export interface TestBankTransferRequest {
  amount: number;
  content: string;
}

export interface TestBankTransferResult {
  processed: boolean;
  paymentId: string;
  status: PaymentStatus;
  checkoutReference: string;
  testBank: {
    beforeBalance: number;
    afterBalance: number;
    transactionId: string;
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

export interface MentorIncomeEntry {
  paymentId: string;
  bookingSessionId?: string;
  checkoutReference?: string;
  menteeName: string;
  sessionType: string;
  bookingStatus: string;
  settlementBaseAmount: number;
  platformFeeRate: number;
  platformFeeAmount: number;
  mentorPayoutAmount: number;
  settlementStatus: 'pending' | 'ready' | 'withheld' | 'refunded' | string;
  currency: string;
  paidAt?: string;
  settledAt?: string;
}

export interface MentorIncomeResponse {
  range: 'month' | 'quarter' | 'year';
  summary: {
    grossRevenue: number;
    platformFeeAmount: number;
    mentorPayoutAmount: number;
    readyPayoutAmount: number;
    pendingPayoutAmount: number;
    currency: string;
    completedSessionCount: number;
  };
  entries: MentorIncomeEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const paymentService = {
  createPurchase(token: string, payload: CreatePaymentPurchasePayload) {
    return apiClient.post<CreatePaymentPurchaseResult>('/payments/purchase', payload, token);
  },

  getCheckoutSession(token: string) {
    return apiClient.get<PaymentCheckoutSession>(
      `/payments/checkout/${encodeURIComponent(token)}/session`,
    );
  },

  getCheckoutStatus(token: string) {
    return apiClient.get<PaymentCheckoutStatus>(
      `/payments/checkout/${encodeURIComponent(token)}/status`,
    );
  },

  simulateTestBankTransfer(token: string, body: TestBankTransferRequest) {
    return apiClient.post<TestBankTransferResult>(
      `/payments/checkout/${encodeURIComponent(token)}/test-bank/transfer`,
      body,
    );
  },

  syncPayment(token: string, paymentId: string) {
    return apiClient.post<SyncPaymentResult>(`/payments/${paymentId}/sepay/sync`, undefined, token);
  },

  getPayment(token: string, paymentId: string) {
    return apiClient.get<PaymentDetail>(`/payments/${paymentId}`, token);
  },

  getMentorIncome(
    token: string,
    params: {
      range?: 'month' | 'quarter' | 'year';
      page?: number;
      limit?: number;
      settlementStatus?: string;
    } = {},
  ) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        search.set(key, String(value));
      }
    });
    const query = search.toString();
    return apiClient.get<MentorIncomeResponse>(
      `/payments/mentor/income${query ? `?${query}` : ''}`,
      token,
    );
  },
};
