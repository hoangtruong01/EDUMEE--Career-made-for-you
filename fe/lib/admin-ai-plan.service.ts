import { apiClient } from '@/lib/api-client';

export type BillingCycle =
  | 'monthly'
  | 'three_months'
  | 'six_months'
  | 'five_months'
  | 'nine_months'
  | 'yearly';

export interface AiPlanLimits {
  assessmentsPerMonth?: number;
  assessmentsLifetimeLimit?: number;
  chatMessagesPerMonth?: number;
  simulationsPerMonth?: number;
  careerRecommendationRunsPerMonth?: number;
  maxCareerRecommendationsPerRun?: number;
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

export interface AdminAiPlanPayload {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  isDefaultPlan?: boolean;
  displayOrder?: number;
  billingCycleDiscounts?: Partial<Record<BillingCycle, number>>;
  allowedBillingCycles?: BillingCycle[];
  seatLimit?: number | null;
  limits?: AiPlanLimits;
  features?: AiPlanFeatures;
}

export interface AiPlanSubscriberStats {
  activeSubscribers: number;
  totalSubscribers: number;
  cancelledSubscribers: number;
  expiredSubscribers: number;
}

export interface AdminAiPlan extends AdminAiPlanPayload {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  subscriberStats?: AiPlanSubscriberStats;
  pricingByBillingCycle?: Partial<
    Record<
      BillingCycle,
      {
        billingCycle: BillingCycle;
        months: number;
        monthlyPrice: number;
        subtotal: number;
        discountPercentage: number;
        discountAmount: number;
        total: number;
        currency: string;
      }
    >
  >;
}

export interface AssignAiPlanUserPayload {
  userId?: string;
  identifier?: string;
  planId: string;
  billingCycle: BillingCycle;
  startDate?: string;
  endDate?: string;
}

export interface AssignedAiPlanSubscription {
  id: string;
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  startDate: string;
  endDate?: string;
  status: string;
}

export const adminAiPlanService = {
  getAdminAiPlans(token: string) {
    return apiClient.get<AdminAiPlan[]>('/ai-plans/admin', token);
  },

  getAdminAiPlanById(token: string, id: string) {
    return apiClient.get<AdminAiPlan>(`/ai-plans/${id}`, token);
  },

  createAdminAiPlan(token: string, payload: AdminAiPlanPayload) {
    return apiClient.post<AdminAiPlan>('/ai-plans', payload, token);
  },

  updateAdminAiPlan(token: string, id: string, payload: Partial<AdminAiPlanPayload>) {
    return apiClient.patch<AdminAiPlan>(`/ai-plans/${id}`, payload, token);
  },

  deleteAdminAiPlan(token: string, id: string) {
    return apiClient.delete<void>(`/ai-plans/${id}`, token);
  },

  assignUserToPlan(token: string, payload: AssignAiPlanUserPayload) {
    return apiClient.post<AssignedAiPlanSubscription>('/ai-subscriptions/admin/assign', payload, token);
  },
};
