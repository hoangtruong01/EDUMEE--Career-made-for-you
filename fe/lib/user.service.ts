import { apiClient } from '@/lib/api-client';

export interface UserMe {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role?: string;
  date_of_birth?: string;
  phone_number?: string;
  onboarding_completed?: boolean;
}

export interface UpdateMePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  avatar?: string;
  phone_number?: string;
  onboarding_completed?: boolean;
}

export const userService = {
  async getMe(accessToken: string): Promise<UserMe> {
    return apiClient.get<UserMe>('/users/me', accessToken);
  },

  async updateMe(accessToken: string, payload: UpdateMePayload): Promise<UserMe> {
    return apiClient.patch<UserMe>('/users/me', payload, accessToken);
  },
};
