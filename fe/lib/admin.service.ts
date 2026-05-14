import { apiClient } from '@/lib/api-client';

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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: 'Free' | 'Plus' | 'Pro';
  status: 'Hoạt động' | 'Bị khóa';
  joined: string;
  tests: number;
  login_type: 'Google' | 'Password';
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
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

export const adminService = {
  getDashboardStats(token: string) {
    return apiClient.get<DashboardStats>('/admin/dashboard-stats', token);
  },

  getAllUsers(token: string, page: number = 1, limit: number = 10, loginType?: string) {
    const url = `/admin/users?page=${page}&limit=${limit}${loginType ? `&loginType=${loginType}` : ''}`;
    return apiClient.get<AdminUsersResponse>(url, token);
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
    const url = `/admin/careers?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}${category ? `&category=${category}` : ''}`;
    return apiClient.get<{ careers: AdminCareer[]; total: number }>(url, token);
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
};
