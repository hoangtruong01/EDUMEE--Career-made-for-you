export type AppRole = 'user' | 'admin' | 'mentor' | 'employer' | 'hr' | 'recruiter' | string;

export type AppHomeRoute = '/(mentor-tabs)/availability' | '/(tabs)';

export function getRoleHomeRoute(role?: AppRole | null): AppHomeRoute {
  return role === 'mentor' ? '/(mentor-tabs)/availability' : '/(tabs)';
}
