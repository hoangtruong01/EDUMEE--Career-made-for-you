import type { UserRole } from '@/lib/auth-storage';

export const MENTOR_PORTAL_PATH = '/mentor-dashboard';
export const MENTOR_HOME_PATH = MENTOR_PORTAL_PATH;

export function getHomePathByRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'mentor':
      return MENTOR_HOME_PATH;
    default:
      return '/dashboard';
  }
}
