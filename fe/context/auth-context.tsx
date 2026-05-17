'use client';

import { authStorage, type UserRole } from '@/lib/auth-storage';
import { authService, type LoginPayload, type RegisterPayload } from '@/lib/auth.service';
import {
  TOKEN_EXPIRY_SKEW_MS,
  decodeJwtPayload,
  getJwtExpiryDelayMs,
  isJwtExpired,
} from '@/lib/jwt';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  isAuthenticated: boolean;
  isHydrated: boolean;
  onboardingCompleted: boolean;
}

interface LoginResult {
  role: UserRole;
  redirectTo?: string;
}

interface OAuthLoginPayload {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<LoginResult>;
  adminLogin: (payload: LoginPayload) => Promise<LoginResult>;
  completeOAuthLogin: (payload: OAuthLoginPayload) => void;
  register: (payload: RegisterPayload) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyForgotPasswordToken: (token: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
}


const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const loggedOutState: AuthState = {
  accessToken: '',
  refreshToken: '',
  role: '',
  isAuthenticated: false,
  isHydrated: true,
  onboardingCompleted: false,
};

function redirectToExpiredLogin() {
  if (typeof window === 'undefined' || window.location.pathname.includes('/login')) {
    return;
  }

  window.location.href = '/login?expired=true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') {
      return {
        accessToken: '',
        refreshToken: '',
        role: '' as UserRole,
        isAuthenticated: false,
        isHydrated: false,
        onboardingCompleted: false,
      };

    }

    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    const role = authStorage.getRole();

    if (!accessToken || isJwtExpired(accessToken)) {
      authStorage.clearSession();
      return loggedOutState;
    }


    const payload = decodeJwtPayload(accessToken);
    return {
      accessToken,
      refreshToken,
      role,
      isAuthenticated: true,
      isHydrated: true,
      onboardingCompleted: (payload?.onboarding_completed as boolean) || false,
    };

  });

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload);

    authStorage.setSession({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
    });

    const payloadDecoded = decodeJwtPayload(response.result.access_token);
    setState({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
      isAuthenticated: true,
      isHydrated: true,
      onboardingCompleted: (payloadDecoded?.onboarding_completed as boolean) || false,
    });

    toast.success('Đăng nhập thành công');

    return { role: response.result.role, redirectTo: response.redirectTo };
  }, []);

  const adminLogin = useCallback(async (payload: LoginPayload) => {
    const response = await authService.adminLogin(payload);

    authStorage.setSession({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
    });

    const payloadDecoded = decodeJwtPayload(response.result.access_token);
    setState({
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      role: response.result.role,
      isAuthenticated: true,
      isHydrated: true,
      onboardingCompleted: (payloadDecoded?.onboarding_completed as boolean) || false,
    });

    toast.success('Đăng nhập admin thành công');

    return { role: response.result.role, redirectTo: response.redirectTo };
  }, []);

  const completeOAuthLogin = useCallback((payload: OAuthLoginPayload) => {
    authStorage.setSession(payload);

    const payloadDecoded = decodeJwtPayload(payload.accessToken);
    setState({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      role: payload.role,
      isAuthenticated: true,
      isHydrated: true,
      onboardingCompleted: (payloadDecoded?.onboarding_completed as boolean) || false,
    });

    toast.success('Đăng nhập Google thành công');
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

  const expireSession = useCallback(() => {
    authStorage.clearSession();
    setState(loggedOutState);
    toast.warning('Phiên đăng nhập đã hết hạn');
    redirectToExpiredLogin();
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
    setState(loggedOutState);
    toast.success('Đã đăng xuất');

  }, [state.accessToken, state.refreshToken]);

  useEffect(() => {
    if (!state.isHydrated || !state.isAuthenticated || !state.accessToken) {
      return;
    }

    const expiryDelayMs = getJwtExpiryDelayMs(state.accessToken, TOKEN_EXPIRY_SKEW_MS);
    if (expiryDelayMs === null || expiryDelayMs <= 0) {
      expireSession();
      return;
    }

    const timeoutId = window.setTimeout(expireSession, expiryDelayMs);
    return () => window.clearTimeout(timeoutId);
  }, [expireSession, state.accessToken, state.isAuthenticated, state.isHydrated]);
  
  const setOnboardingCompleted = useCallback((completed: boolean) => {
    setState((prev) => ({ ...prev, onboardingCompleted: completed }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      adminLogin,
      completeOAuthLogin,
      register,
      forgotPassword,
      verifyForgotPasswordToken,
      resetPassword,
      logout,
      expireSession,
      setOnboardingCompleted,
    }),
    [
      state,
      login,
      adminLogin,
      completeOAuthLogin,
      register,
      forgotPassword,
      verifyForgotPasswordToken,
      resetPassword,
      logout,
      expireSession,
      setOnboardingCompleted,
    ],
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
