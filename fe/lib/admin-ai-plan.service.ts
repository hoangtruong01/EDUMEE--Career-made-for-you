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

export type ImportAiPlanUserStatus = 'created_assigned' | 'existing_assigned' | 'failed';

export interface ImportAiPlanUserResultRow {
  rowNumber: number;
  email?: string;
  name?: string;
  userId?: string;
  subscriptionId?: string;
  status: ImportAiPlanUserStatus;
  message: string;
  warnings?: string[];
}

export interface ImportAiPlanUsersResult {
  totalRows: number;
  createdUsers: number;
  assignedExistingUsers: number;
  failedRows: number;
  emailWarningRows: number;
  rows: ImportAiPlanUserResultRow[];
}

export type AdminAiPlanSubscriberStatusFilter = 'active' | 'all' | 'cancelled' | 'expired';

export interface AdminAiPlanSubscriber {
  userId: string;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  userStatus: string;
  subscriptionId?: string;
  subscriptionStatus: string;
  billingCycle?: BillingCycle;
  startDate?: string;
  endDate?: string;
  isCurrentPlanUser: boolean;
}

export interface AdminAiPlanSubscribersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminAiPlanSubscriberStatusFilter;
}

export interface AdminAiPlanSubscribersResponse {
  subscribers: AdminAiPlanSubscriber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: AiPlanSubscriberStats;
}

export const adminAiPlanService = {
  getAdminAiPlans(token: string) {
    return apiClient.get<AdminAiPlan[]>('/ai-plans/admin', token);
  },

  getAdminAiPlanById(token: string, id: string) {
    return apiClient.get<AdminAiPlan>(`/ai-plans/${id}`, token);
  },

  getPlanSubscribers(
    token: string,
    planId: string,
    params: AdminAiPlanSubscribersParams = {},
  ) {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.search?.trim()) search.set('search', params.search.trim());
    if (params.status) search.set('status', params.status);
    const query = search.toString();
    return apiClient.get<AdminAiPlanSubscribersResponse>(
      `/ai-plans/${planId}/subscribers${query ? `?${query}` : ''}`,
      token,
    );
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

  importUsersToPlan(
    token: string,
    payload: {
      file: File;
      planId: string;
      billingCycle: BillingCycle;
    },
  ) {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('planId', payload.planId);
    formData.append('billingCycle', payload.billingCycle);
    return apiClient.uploadPost<ImportAiPlanUsersResult>(
      '/ai-subscriptions/admin/import-users',
      formData,
      token,
    );
  },
};
