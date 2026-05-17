import { apiClient } from '@/lib/api-client';
import type { CareerSkillTagInput } from '@/lib/career-tags.service';

export interface DashboardStats {
  stats: {
    title: string;
    value: string;
    delta: string;
    iconType: string;
    deltaType?: 'up' | 'down';
  }[];
  recentActivities: {
    title: string;
    user: string;
    time: string;
    type: 'users' | 'test' | 'mentor';
  }[];
  popularCareers: {
    name: string;
    views: string;
    matches: string;
    delta: string;
  }[];
}

export type AdminUserRole = 'user' | 'mentor' | 'admin' | string;
export type AdminUserPlan = 'Free' | 'Plus' | 'Business' | string;
export type AdminUserStatus = 'Hoạt động' | 'Bị khóa';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  role: AdminUserRole;
  plan: AdminUserPlan;
  status: AdminUserStatus;
  joined: string;
  tests: number;
  login_type: 'Google' | 'Password';
}

export interface AdminUsersFilters {
  search?: string;
  role?: string;
  plan?: string;
  status?: string;
  loginType?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface SkillRequirement {
  skillName: string;
  importance: number;
  minimumLevel: number;
}

export interface MarketInfo {
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  growthProjection: string;
}

export interface AdminCareer {
  id?: string;
  _id?: string;
  title: string;
  category: string;
  description: string;
  skillRequirements?: {
    technical: SkillRequirement[];
    soft: SkillRequirement[];
  };
  skillTags?: CareerSkillTagInput[];
  marketInfo?: MarketInfo;
  discoveryData?: {
    pros: string[];
    cons: string[];
    topCompanies: string[];
    trends: { year: string; description: string }[];
    salarySummary?: string;
  };
  careerLevels?: Array<Record<string, unknown>>;
  isDraft?: boolean;
}

export interface AdminFinanceSummary {
  range: 'month' | 'quarter' | 'year';
  currency: string;
  totalRevenue: number;
  revenueDelta: number;
  transactionCount: number;
  transactionDelta: number;
  systemBalance: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  refundedCount: number;
}

export interface AdminFinancePayment {
  id: string;
  checkoutReference?: string;
  providerPaymentId?: string;
  userName: string;
  userEmail: string;
  planName: string;
  purpose: 'ai_plan' | 'mentor_booking' | string;
  billingCycle?: string;
  amount: number;
  subtotalAmount?: number;
  creditAppliedAmount?: number;
  totalAmount: number;
  currency: string;
  provider: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | string;
  createdAt: string;
  paidAt?: string;
  refundedAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  eventDate?: string;
}

export interface AdminFinancePaymentsResponse {
  payments: AdminFinancePayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsMetric {
  value: number;
  delta: number;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface CareerDistributionPoint {
  name: string;
  value: number;
  count: number;
}

export interface AnalyticsEventRecord {
  id: string;
  eventType: string;
  path: string;
  anonymousId: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  createdAt: string;
}

export interface AdminAnalyticsResponse {
  range: '6m' | '12m';
  stats: {
    totalVisits: AnalyticsMetric;
    activeUsers: AnalyticsMetric;
    assessmentCompletionRate: AnalyticsMetric;
    mentorBookings: AnalyticsMetric;
  };
  userGrowth: AnalyticsPoint[];
  assessmentCompletions: AnalyticsPoint[];
  careerDistribution: CareerDistributionPoint[];
}

export interface AnalyticsEventsResponse {
  events: AnalyticsEventRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogRecord {
  id: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  category: 'user_action' | 'security' | 'system';
  status: 'success' | 'failed';
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ActivityLogRecord extends Omit<AuditLogRecord, 'category'> {
  source: 'audit' | 'tracking';
  category: AuditLogRecord['category'] | 'tracking';
}

export interface AuditLogsResponse {
  logs: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLogsResponse {
  logs: ActivityLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrackEventPayload {
  eventType: string;
  path: string;
  anonymousId: string;
  metadata?: Record<string, unknown>;
}

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export const adminService = {
  getDashboardStats(token: string) {
    return apiClient.get<DashboardStats>('/admin/dashboard-stats', token);
  },

  getAllUsers(
    token: string,
    page: number = 1,
    limit: number = 10,
    filters: AdminUsersFilters = {},
  ) {
    const query = queryString({
      page,
      limit,
      search: filters.search,
      role: filters.role,
      plan: filters.plan,
      status: filters.status,
      loginType: filters.loginType,
    });
    return apiClient.get<AdminUsersResponse>(`/admin/users${query}`, token);
  },

  updateUserStatus(token: string, userId: string, status: string) {
    return apiClient.patch<void>(`/admin/users/${userId}/status`, { status }, token);
  },

  updateUserRole(token: string, userId: string, role: string) {
    return apiClient.patch<void>(`/admin/users/${userId}/role`, { role }, token);
  },

  deleteUser(token: string, userId: string) {
    return apiClient.delete<void>(`/admin/users/${userId}`, token);
  },

  bulkDeleteUsers(token: string, userIds: string[]) {
    return apiClient.delete<void>('/admin/users/bulk-delete', token, { ids: userIds });
  },

  getAllCareers(
    token: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
  ) {
    const query = queryString({ page, limit, search, category });
    return apiClient.get<{ careers: AdminCareer[]; total: number }>(`/admin/careers${query}`, token);
  },

  checkCareerDuplicate(token: string, title: string) {
    return apiClient.get<{ exists: boolean }>(
      `/admin/careers/check-duplicate?title=${encodeURIComponent(title)}`,
      token,
    );
  },

  generateCareerWithAI(token: string, title: string) {
    return apiClient.post<AdminCareer>('/admin/careers/generate-ai', { title }, token);
  },

  createCareer(token: string, data: Partial<AdminCareer>) {
    return apiClient.post<AdminCareer>('/admin/careers', data, token);
  },

  updateCareer(token: string, id: string, data: Partial<AdminCareer>) {
    return apiClient.patch<AdminCareer>(`/admin/careers/${id}`, data, token);
  },

  deleteCareer(token: string, id: string) {
    return apiClient.delete<void>(`/admin/careers/${id}`, token);
  },

  fillMissingData(token: string, id: string) {
    return apiClient.post<AdminCareer>(`/admin/careers/${id}/fill-missing`, {}, token);
  },

  getFinanceSummary(token: string, range: 'month' | 'quarter' | 'year' = 'month') {
    return apiClient.get<AdminFinanceSummary>(`/admin/finance/summary${queryString({ range })}`, token);
  },

  getFinancePayments(
    token: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      purpose?: string;
      plan?: string;
      search?: string;
    } = {},
  ) {
    return apiClient.get<AdminFinancePaymentsResponse>(
      `/admin/finance/payments${queryString(params)}`,
      token,
    );
  },

  getAnalytics(token: string, range: '6m' | '12m' = '12m') {
    return apiClient.get<AdminAnalyticsResponse>(`/admin/analytics${queryString({ range })}`, token);
  },

  getTrackingEvents(
    token: string,
    params: { page?: number; limit?: number; eventType?: string; path?: string } = {},
  ) {
    return apiClient.get<AnalyticsEventsResponse>(
      `/admin/analytics/tracking-events${queryString(params)}`,
      token,
    );
  },

  getAuditLogs(
    token: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    return apiClient.get<AuditLogsResponse>(`/admin/audit-logs${queryString(params)}`, token);
  },

  getActivityLogs(
    token: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      source?: 'all' | 'audit' | 'tracking';
      search?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    return apiClient.get<ActivityLogsResponse>(`/admin/activity-logs${queryString(params)}`, token);
  },

  trackEvent(payload: TrackEventPayload) {
    return apiClient.post<{ received: boolean }>('/tracking/events', payload);
  },
};
