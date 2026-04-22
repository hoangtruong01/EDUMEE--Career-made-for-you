import { apiClient } from '@/lib/api-client';
import type { UserRole } from '@/lib/auth-storage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  date_of_birth: string;
  phone_number?: string;
}

export interface LoginResponse {
  message: string;
  result: {
    access_token: string;
    refresh_token: string;
    role: UserRole;
  };
  redirectTo?: string;
}

export interface BasicMessageResponse {
  message: string;
}

export const authService = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login', payload);
  },

  register(payload: RegisterPayload) {
    return apiClient.post<BasicMessageResponse>('/auth/register', payload);
  },

  forgotPassword(email: string) {
    return apiClient.post<BasicMessageResponse>('/auth/forgot-password', { email });
  },

  verifyForgotPasswordToken(forgotPasswordToken: string) {
    return apiClient.post<BasicMessageResponse>('/auth/verify-forgot-password-token', {
      forgot_password_token: forgotPasswordToken,
    });
  },

  resetPassword(forgotPasswordToken: string, password: string) {
    return apiClient.post<BasicMessageResponse>('/auth/reset-password', {
      forgot_password_token: forgotPasswordToken,
      password,
    });
  },

  logout(refreshToken: string, accessToken: string) {
    return apiClient.post<BasicMessageResponse>(
      '/auth/logout',
      {
        refresh_token: refreshToken,
      },
      accessToken,
    );
  },
};
