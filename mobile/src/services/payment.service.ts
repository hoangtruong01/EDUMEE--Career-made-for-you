import { api, unwrapResponseData } from './api';

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
  async getMentorIncome(
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
    const response = await api.get(`/payments/mentor/income${query ? `?${query}` : ''}`);
    return unwrapResponseData<MentorIncomeResponse>(response);
  },
};
