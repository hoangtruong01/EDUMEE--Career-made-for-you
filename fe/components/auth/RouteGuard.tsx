'use client';

import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api-client';
import { profileService } from '@/lib/profile.service';
import { MENTOR_HOME_PATH } from '@/lib/role-redirect';
import { userService } from '@/lib/user.service';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isHydrated, role, onboardingCompleted, accessToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const surveyPages = ['/onboarding', '/personality-test', '/assessment-result'];
  const isSurveyPage = surveyPages.some((page) => pathname?.startsWith(page));

  const profilePages = ['/complete-profile'];
  const isProfilePage = profilePages.some((page) => pathname?.startsWith(page));

  const [profileGate, setProfileGate] = useState({
    loading: true,
    needsProfile: false,
    onboardingCompleted: onboardingCompleted,
  });

  useEffect(() => {
     
    setMounted(true);
  }, []);

  const isDemoUserUnlocked =
    typeof window !== 'undefined' && window.localStorage.getItem('demo_user_unlocked') === '1';

  const canAccessUserDemo = !requiredRole && isDemoUserUnlocked;

  const hasRoleAccess = !requiredRole || role === requiredRole;
  const isAuthorized = (isAuthenticated && hasRoleAccess) || canAccessUserDemo;

  const isMissingRequiredProfile = (
    user: Awaited<ReturnType<typeof userService.getMe>> | null,
    profile: Awaited<ReturnType<typeof profileService.getMyProfile>> | null,
  ) => {
    const name = user?.name?.trim();
    const phone = user?.phone_number?.trim();
    const dobValue = user?.date_of_birth;
    const dob = dobValue ? new Date(dobValue) : null;
    const educationLevel = profile?.educationLevel?.trim();

    const hasDob = !!dob && !Number.isNaN(dob.getTime());

    return !name || !phone || !hasDob || !educationLevel;
  };

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated || !accessToken || role === 'admin' || canAccessUserDemo) {
      setProfileGate({
        loading: false,
        needsProfile: false,
        onboardingCompleted,
      });
      return;
    }

    let isActive = true;

    const checkProfile = async () => {
      try {
        const user = await userService.getMe(accessToken);
        let profile = null;

        try {
          profile = await profileService.getMyProfile(accessToken);
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 404) {
            profile = null;
          } else {
            throw error;
          }
        }

        const needsProfile = isMissingRequiredProfile(user, profile);
        const serverOnboardingCompleted =
          typeof user?.onboarding_completed === 'boolean'
            ? user.onboarding_completed
            : onboardingCompleted;

        if (isActive) {
          setProfileGate({
            loading: false,
            needsProfile,
            onboardingCompleted: serverOnboardingCompleted,
          });
        }
      } catch {
        if (isActive) {
          setProfileGate({
            loading: false,
            needsProfile: false,
            onboardingCompleted,
          });
        }
      }
    };

    void checkProfile();

    return () => {
      isActive = false;
    };
  }, [accessToken, canAccessUserDemo, isAuthenticated, isHydrated, onboardingCompleted, role]);

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
    isSurveyPage,
    pathname,
    profileGate.loading,
    profileGate.needsProfile,
    profileGate.onboardingCompleted,
    router,
    role,
  ]);

  if (!mounted || !isHydrated || !isAuthorized || profileGate.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
