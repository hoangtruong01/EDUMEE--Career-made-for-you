'use client';

import { authStorage, type UserRole } from '@/lib/auth-storage';
import { authService, type LoginPayload, type RegisterPayload } from '@/lib/auth.service';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface LoginResult {
  redirectTo?: string;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<LoginResult>;
  adminLogin: (payload: LoginPayload) => Promise<LoginResult>;
  register: (payload: RegisterPayload) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyForgotPasswordToken: (token: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== 'number') {
    return true;
  }

  const expiresAtMs = payload.exp * 1000;
  return Date.now() >= expiresAtMs;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') {
      return {
        accessToken: '',
        refreshToken: '',
        role: '',
        isAuthenticated: false,
        isHydrated: false,
      };
    }

    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    const role = authStorage.getRole();

    if (!accessToken || isTokenExpired(accessToken)) {
      authStorage.clearSession();
      return {
        accessToken: '',
        refreshToken: '',
        role: '',
        isAuthenticated: false,
        isHydrated: true,
      };
    }

    return {
      accessToken,
      refreshToken,
      role,
      isAuthenticated: true,
      isHydrated: true,
    };
  });

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);

    authStorage.setSession({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
    });

    setState({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
      isAuthenticated: true,
      isHydrated: true,
    });

    return { redirectTo: response.redirectTo };
  }, []);

  const adminLogin = useCallback(async (payload: LoginPayload) => {
    const response = await authService.adminLogin(payload);

    authStorage.setSession({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
    });

    setState({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
      isAuthenticated: true,
      isHydrated: true,
    });

    return { redirectTo: response.redirectTo };
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await authService.register(payload);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authService.forgotPassword(email);
  }, []);

  const verifyForgotPasswordToken = useCallback(async (token: string) => {
    await authService.verifyForgotPasswordToken(token);
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await authService.resetPassword(token, password);
  }, []);

  const logout = useCallback(async () => {
    if (state.refreshToken && state.accessToken) {
      try {
        await authService.logout(state.refreshToken, state.accessToken);
      } catch {
        // If backend logout fails, we still clear local session.
      }
    }

    authStorage.clearSession();
    setState({
      accessToken: '',
      refreshToken: '',
      role: '',
      isAuthenticated: false,
      isHydrated: true,
    });
  }, [state.accessToken, state.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      adminLogin,
      register,
      forgotPassword,
      verifyForgotPasswordToken,
      resetPassword,
      logout,
    }),
    [state, login, adminLogin, register, forgotPassword, verifyForgotPasswordToken, resetPassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
