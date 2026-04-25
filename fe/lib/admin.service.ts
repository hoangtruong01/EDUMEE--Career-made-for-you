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
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export const adminService = {
  getDashboardStats(token: string) {
    return apiClient.get<DashboardStats>('/admin/dashboard-stats', token);
  },

  getAllUsers(token: string, page: number = 1, limit: number = 10) {
    return apiClient.get<AdminUsersResponse>(`/admin/users?page=${page}&limit=${limit}`, token);
  },

  updateUserStatus(token: string, userId: string, status: string) {
    return apiClient.patch<void>(`/admin/users/${userId}/status`, { status }, token);
  },

  updateUserRole(token: string, userId: string, role: string) {
    return apiClient.patch<void>(`/admin/users/${userId}/role`, { role }, token);
  },
};
