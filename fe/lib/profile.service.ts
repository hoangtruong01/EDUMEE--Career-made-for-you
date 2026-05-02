import { apiClient } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  userId: {
    id: string;
    name: string;
    email: string;
  };
  dob?: string;
  phone?: string;
  city?: string;
  gender?: string;
  educationLevel?: string;
  weeklyHours?: number;
  budgetLevel?: string;
  bio?: string;
  target_career?: string; // We can use this for specific purposes
  avatar_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  dob?: string;
  phone?: string;
  city?: string;
  gender?: string;
  educationLevel?: string;
  weeklyHours?: number;
  budgetLevel?: string;
  bio?: string;
}

export const profileService = {
  async getMyProfile(accessToken: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profiles/my-profile', accessToken);
  },

  async updateMyProfile(accessToken: string, payload: UpdateProfilePayload): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/profiles/my-profile', payload, accessToken);
  },
};
