import { apiClient } from '@/lib/api-client';
import { paymentService } from '@/lib/payment.service';

export type BillingCycle =
  | 'monthly'
  | 'three_months'
  | 'six_months'
  | 'five_months'
  | 'nine_months'
  | 'yearly';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'refund_pending';

export interface AiPlanPricingSummary {
  billingCycle: BillingCycle;
  months: number;
  monthlyPrice: number;
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  currency: string;
}

export interface AiPlanLimits {
  assessmentsPerMonth?: number;
  assessmentsLifetimeLimit?: number;
  chatMessagesPerMonth?: number;
  simulationsPerMonth?: number;
  careerRecommendationRunsPerMonth?: number;
  maxCareerRecommendationsPerRun?: number;
  visibleCareerRecommendationsPerRun?: number;
  careerComparisonsPerMonth?: number;
  maxCareersPerComparison?: number;
  personalizedRoadmapsPerMonth?: number;
  mentorBookingsPerMonth?: number;
}

export interface AiPlanFeatures {
  careerRecommendation?: boolean;
  jobSimulation?: boolean;
  mentorBooking?: boolean;
  careerComparison?: boolean;
  aiChatbot?: boolean;
  personalizedRoadmap?: boolean;
  teamDashboard?: boolean;
  reportExport?: boolean;
  multiUserManagement?: boolean;
}

export interface AiPlanCatalogItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isActive?: boolean;
  isDefaultPlan?: boolean;
  displayOrder?: number;
  billingCycleDiscounts?: Partial<Record<BillingCycle, number>>;
  allowedBillingCycles?: BillingCycle[];
  limits?: AiPlanLimits;
  features?: AiPlanFeatures;
  seatLimit?: number;
  pricingByBillingCycle?: Partial<Record<BillingCycle, AiPlanPricingSummary>>;
}

export interface QuotaView {
  used: number;
  limit: number;
  remaining: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  nextResetAt?: string | null;
  resetPolicy?: 'periodic' | 'lifetime' | 'unlimited';
}

export interface MyAiSubscription {
  currentPlan: 'free' | 'plus' | 'business';
  source: 'default' | 'personal_subscription' | 'business_subscription';
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | null;
  billingCycle: BillingCycle | null;
  expiresAt: string | null;
  seatLimit: number | null;
  plan: AiPlanCatalogItem | null;
  quotas: Record<string, QuotaView>;
  features: {
    careerComparison: boolean;
    aiChatbot?: boolean;
    personalizedRoadmap: boolean;
    jobSimulation: boolean;
    mentorBooking: boolean;
    teamDashboard: boolean;
    reportExport: boolean;
    multiUserManagement: boolean;
  };
  subscription: {
    status: 'active' | 'cancelled' | 'expired';
    billingCycle: BillingCycle;
    startDate: string;
    endDate?: string;
    quotaPeriodStart?: string | null;
    quotaPeriodEnd?: string | null;
    nextQuotaResetAt?: string | null;
  } | null;
  quotaPeriodStart?: string | null;
  quotaPeriodEnd?: string | null;
  nextQuotaResetAt?: string | null;
  availableBillingCycles: BillingCycle[];
}

export interface PaymentRecord {
  id: string;
  userId: string;
  planId?: string;
  purpose: 'ai_plan' | 'mentor_booking';
  billingCycle?: BillingCycle;
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

export interface PaymentDetail {
  payment: PaymentRecord;
  transactions: Array<{
    id?: string;
    eventId: string;
    eventType: string;
    status: string;
    providerTransactionId?: string;
    createdAt?: string;
  }>;
}

export interface PurchaseAiPlanPayload {
  planId: string;
  billingCycle: BillingCycle;
  returnUrls?: {
    success?: string;
    error?: string;
    cancel?: string;
  };
  useEdumeeCredit?: boolean;
}

export interface PurchaseAiPlanResult {
  paymentId: string;
  checkoutReference: string;
  redirectUrl: string;
  purpose?: 'ai_plan' | 'mentor_booking';
  provider?: string;
}

export interface SyncPaymentResult {
  payment: PaymentRecord;
  idempotent: boolean;
  order: Record<string, unknown>;
}

export const aiBillingService = {
  getCatalog() {
    return apiClient.get<AiPlanCatalogItem[]>('/ai-plans');
  },

  getMyAiSubscription(token: string) {
    return apiClient.get<MyAiSubscription>('/ai-subscriptions/me', token);
  },

  purchaseAiPlan(token: string, payload: PurchaseAiPlanPayload) {
    return paymentService.createPurchase(token, {
      purpose: 'ai_plan',
      targetId: payload.planId,
      provider: 'sepay',
      billingCycle: payload.billingCycle,
      returnUrls: payload.returnUrls,
      useEdumeeCredit: payload.useEdumeeCredit,
    });
  },

  syncPayment(token: string, paymentId: string) {
    return apiClient.post<SyncPaymentResult>(`/payments/${paymentId}/sepay/sync`, undefined, token);
  },

  getPayment(token: string, paymentId: string) {
    return apiClient.get<PaymentDetail>(`/payments/${paymentId}`, token);
  },

  getMyPayments(token: string) {
    return apiClient.get<PaymentRecord[]>('/payments/me', token);
  },
};
