import { apiClient } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  userId: string;
  full_name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
  education_level?: string;
  major?: string;
  current_school?: string;
  city?: string;
  gender?: string;
  date_of_birth?: string;
  bio?: string;
  target_career?: string;
  current_level?: string;
  budget_level?: string;
  weekly_learning_hours?: number;
}

export const profileService = {
  async getMyProfile(accessToken: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profiles/my-profile', accessToken);
  },

  async updateMyProfile(accessToken: string, payload: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/profiles/my-profile', payload, accessToken);
  },
};
