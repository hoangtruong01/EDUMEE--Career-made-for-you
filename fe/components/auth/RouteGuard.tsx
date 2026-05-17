'use client';

import { useAuth } from '@/context/auth-context';
import { useMeQuery, useMyProfileQuery } from '@/hooks/useProfileData';
import type { UserProfile } from '@/lib/profile.service';
import { MENTOR_HOME_PATH } from '@/lib/role-redirect';
import type { UserMe } from '@/lib/user.service';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

function isMissingRequiredProfile(user: UserMe | null, profile: UserProfile | null) {
  const name = user?.name?.trim();
  const phone = user?.phone_number?.trim();
  const dobValue = user?.date_of_birth;
  const dob = dobValue ? new Date(dobValue) : null;
  const educationLevel = profile?.educationLevel?.trim();

  const hasDob = !!dob && !Number.isNaN(dob.getTime());

  return !name || !phone || !hasDob || !educationLevel;
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const { isAuthenticated, isHydrated, role, onboardingCompleted, accessToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const surveyPages = ['/onboarding', '/personality-test', '/assessment-result'];
  const isSurveyPage = surveyPages.some((page) => pathname?.startsWith(page));

  const profilePages = ['/complete-profile'];
  const isProfilePage = profilePages.some((page) => pathname?.startsWith(page));

  const isDemoUserUnlocked =
    typeof window !== 'undefined' && window.localStorage.getItem('demo_user_unlocked') === '1';

  const canAccessUserDemo = !requiredRole && isDemoUserUnlocked;

  const hasRoleAccess = !requiredRole || role === requiredRole;
  const isAuthorized = (isAuthenticated && hasRoleAccess) || canAccessUserDemo;
  const isRoleRedirectPath =
    (role === 'mentor' && (pathname === '/profile' || pathname === '/mentor-matching')) ||
    (role === 'admin' && (pathname === '/profile' || pathname === '/mentor-matching'));
  const shouldCheckProfile =
    isHydrated &&
    isAuthenticated &&
    Boolean(accessToken) &&
    role !== 'admin' &&
    !canAccessUserDemo &&
    !isRoleRedirectPath;
  const meQuery = useMeQuery(shouldCheckProfile);
  const myProfileQuery = useMyProfileQuery(shouldCheckProfile);

  const profileGate = useMemo(() => {
    if (!shouldCheckProfile) {
      return {
        loading: false,
        needsProfile: false,
        onboardingCompleted,
      };
    }

    if (meQuery.isLoading || myProfileQuery.isLoading) {
      return {
        loading: true,
        needsProfile: false,
        onboardingCompleted,
      };
    }

    if (meQuery.isError || myProfileQuery.isError) {
      return {
        loading: false,
        needsProfile: false,
        onboardingCompleted,
      };
    }

    const user = meQuery.data ?? null;
    const profile = myProfileQuery.data ?? null;
    return {
      loading: false,
      needsProfile: isMissingRequiredProfile(user, profile),
      onboardingCompleted:
        typeof user?.onboarding_completed === 'boolean'
          ? user.onboarding_completed
          : onboardingCompleted,
    };
  }, [
    meQuery.data,
    meQuery.isError,
    meQuery.isLoading,
    myProfileQuery.data,
    myProfileQuery.isError,
    myProfileQuery.isLoading,
    onboardingCompleted,
    shouldCheckProfile,
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated && !canAccessUserDemo) {
      const redirectTo = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?redirect=${redirectTo}`);
      return;
    }

    if (!hasRoleAccess && !canAccessUserDemo) {
      router.replace('/unauthorized');
      return;
    }

    if (isAuthenticated && role === 'admin') {
      if (pathname === '/profile' || pathname === '/mentor-matching') {
        router.replace('/admin/dashboard');
      }
      return;
    }

    if (isAuthenticated && role === 'mentor') {
      if (pathname === '/profile') {
        router.replace('/mentor-dashboard/profile');
        return;
      }

      if (pathname === '/mentor-matching') {
        router.replace(MENTOR_HOME_PATH);
        return;
      }
    }

    if (isAuthenticated && role !== 'admin') {
      if (profileGate.loading) {
        return;
      }

      if (profileGate.needsProfile && !isProfilePage) {
        router.replace('/complete-profile');
        return;
      }

      if (!profileGate.needsProfile && !profileGate.onboardingCompleted && !isSurveyPage) {
        router.replace('/onboarding');
        return;
      }

      if (
        role === 'mentor' &&
        pathname === '/dashboard' &&
        !profileGate.needsProfile &&
        profileGate.onboardingCompleted
      ) {
        router.replace(MENTOR_HOME_PATH);
      }
    }
  }, [
    canAccessUserDemo,
    hasRoleAccess,
    isAuthenticated,
    isHydrated,
    isProfilePage,
    isRoleRedirectPath,
    isSurveyPage,
    pathname,
    profileGate.loading,
    profileGate.needsProfile,
    profileGate.onboardingCompleted,
    router,
    role,
  ]);

  if (!isHydrated || !isAuthorized || profileGate.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
