import { apiClient } from '@/lib/api-client';

export interface UserMe {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role?: string;
}

export const userService = {
  async getMe(accessToken: string): Promise<UserMe> {
    return apiClient.get<UserMe>('/users/me', accessToken);
  },
};
