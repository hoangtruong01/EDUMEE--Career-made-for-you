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

};

