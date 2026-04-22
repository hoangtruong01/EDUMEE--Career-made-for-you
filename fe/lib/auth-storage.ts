export type UserRole = 'admin' | 'user' | string;

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ROLE_KEY = 'user_role';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
}

export const authStorage = {
  getAccessToken(): string {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
  },

  getRefreshToken(): string {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
  },

  getRole(): UserRole {
    return localStorage.getItem(USER_ROLE_KEY) || '';
  },

  setSession(session: AuthTokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    localStorage.setItem(USER_ROLE_KEY, session.role);
    window.dispatchEvent(new StorageEvent('storage'));
  },

  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    window.dispatchEvent(new StorageEvent('storage'));
  },
};
