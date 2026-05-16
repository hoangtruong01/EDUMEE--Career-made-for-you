import type { UserRole } from '@/lib/auth-storage';

export const MENTOR_HOME_PATH = '/mentor-dashboard';

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
